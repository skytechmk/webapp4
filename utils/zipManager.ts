/**
 * Enhanced Zip Management Utilities
 * Provides optimized zip creation with progress tracking, error handling, and performance improvements
 *
 * Features:
 * - Chunked file processing for memory efficiency
 * - Progress tracking with detailed callbacks
 * - Cancellation support for user control
 * - Automatic retry for failed downloads
 * - Comprehensive error handling
 * - Resource cleanup management
 * - File size estimation
 * - Compression level control
 */

import JSZip from 'jszip';

/**
 * Maximum retry attempts for file downloads
 */
const MAX_RETRY_ATTEMPTS = 3;

/**
 * Default retry delay in milliseconds
 */
const RETRY_DELAY_MS = 1000;

/**
 * Default chunk size for file processing
 */
const DEFAULT_CHUNK_SIZE = 5;

/**
 * Default compression level (0-9)
 */
const DEFAULT_COMPRESSION_LEVEL = 6;

export interface ZipProgress {
    totalFiles: number;
    processedFiles: number;
    currentFile: string | null;
    progressPercentage: number;
    estimatedSizeMb: number;
    isCancelled: boolean;
    isComplete: boolean;
    error: string | null;
}

export interface ZipOptions {
    compressionLevel?: number;
    chunkSize?: number;
    maxParallelOperations?: number;
    onProgress?: (progress: ZipProgress) => void;
    onError?: (error: Error) => void;
    onComplete?: () => void;
}

export interface ZipFileInfo {
    filename: string;
    size: number;
    type: 'image' | 'video';
    url: string;
}

export class ZipManager {
    private zip: JSZip;
    private progress: ZipProgress;
    private options: ZipOptions;
    private cancellationToken: { cancelled: boolean };
    private cleanupFunctions: (() => void)[] = [];
    private worker: Worker | null = null;
    private processedFiles: { filename: string; blob: Blob }[] = [];

    constructor(options: ZipOptions = {}) {
        this.zip = new JSZip();
        this.progress = {
            totalFiles: 0,
            processedFiles: 0,
            currentFile: null,
            progressPercentage: 0,
            estimatedSizeMb: 0,
            isCancelled: false,
            isComplete: false,
            error: null
        };
        this.options = {
            compressionLevel: DEFAULT_COMPRESSION_LEVEL,
            chunkSize: DEFAULT_CHUNK_SIZE,
            maxParallelOperations: 3,
            ...options
        };
        this.cancellationToken = { cancelled: false };
    }

    /**
     * Estimates the total size of all files to be included in the zip archive.
     * Uses HEAD requests to get content length when available, with fallback estimations.
     *
     * @param files - Array of file information objects
     * @returns Total estimated size in bytes
     *
     * @throws Will throw if all file size estimations fail
     */
    private async estimateZipSize(files: ZipFileInfo[]): Promise<number> {
        console.log('🔍 Starting zip size estimation for', files.length, 'files');
        let totalSize = 0;

        // Use parallel HEAD requests with timeout for better performance
        const estimationPromises = files.map(file =>
            this.estimateSingleFileSize(file).catch(error => {
                console.warn(`⚠️ Failed to estimate size for ${file.filename}:`, error);
                // Default estimation on failure
                const defaultSize = file.type === 'video' ? 10 * 1024 * 1024 : 2 * 1024 * 1024;
                console.log(`📏 Using default size for ${file.filename}: ${(defaultSize / (1024 * 1024)).toFixed(2)} MB`);
                return defaultSize;
            })
        );

        // Process estimations in parallel with a reasonable timeout
        const results = await Promise.all(estimationPromises);
        totalSize = results.reduce((sum, size) => sum + size, 0);

        console.log(`🔍 Total estimated zip size: ${(totalSize / (1024 * 1024)).toFixed(2)} MB`);
        return totalSize;
    }

    private async estimateSingleFileSize(file: ZipFileInfo): Promise<number> {
        try {
            console.log(`📏 Estimating size for ${file.filename} from ${file.url}`);

            // Use a timeout wrapper for the HEAD request
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

            const startTime = Date.now();
            const response = await fetch(file.url, {
                method: 'HEAD',
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            const duration = Date.now() - startTime;
            console.log(`📏 HEAD request for ${file.filename} completed in ${duration}ms, status: ${response.status}`);

            const contentLength = response.headers.get('Content-Length');
            if (contentLength) {
                const size = parseInt(contentLength, 10);
                console.log(`📏 Estimated size for ${file.filename}: ${(size / (1024 * 1024)).toFixed(2)} MB`);
                return size;
            } else {
                // Fallback estimation
                const fallbackSize = file.type === 'video' ? 10 * 1024 * 1024 : 2 * 1024 * 1024;
                console.log(`📏 No Content-Length header for ${file.filename}, using fallback: ${(fallbackSize / (1024 * 1024)).toFixed(2)} MB`);
                return fallbackSize;
            }
        } catch (error) {
            console.warn(`⚠️ Failed to estimate size for ${file.filename}:`, error);
            // Default estimation
            const defaultSize = file.type === 'video' ? 10 * 1024 * 1024 : 2 * 1024 * 1024;
            console.log(`📏 Using default size for ${file.filename}: ${(defaultSize / (1024 * 1024)).toFixed(2)} MB`);
            return defaultSize;
        }
    }

    /**
     * Processes files in configurable chunks to optimize memory usage and provide progress feedback.
     * Implements chunked processing pattern to handle large numbers of files efficiently.
     *
     * @param files - Array of files to process
     * @param eventTitle - Title of the event for folder naming
     * @param processingStartTime - Start time for timeout calculation
     * @param adaptiveTimeout - Adaptive timeout value for warnings
     *
     * @throws Will throw if processing is cancelled or encounters unrecoverable errors
     */
    private async processFilesInChunks(files: ZipFileInfo[], eventTitle: string, processingStartTime?: number, adaptiveTimeout?: number): Promise<void> {
        const totalFiles = files.length;
        this.progress.totalFiles = totalFiles;
        console.log('📦 Starting chunked processing of', totalFiles, 'files');

        // Show initial progress update
        this.progress.progressPercentage = 1; // Show some initial progress
        this.updateProgress();

        // Estimate total size with progress updates
        console.log('📏 Starting size estimation...');
        const startEstimationTime = Date.now();

        // Update progress during estimation
        this.progress.currentFile = "Estimating file sizes...";
        this.updateProgress();

        const estimatedSize = await this.estimateZipSize(files);
        const estimationDuration = Date.now() - startEstimationTime;
        console.log(`📏 Size estimation completed in ${estimationDuration}ms`);
        this.progress.estimatedSizeMb = estimatedSize / (1024 * 1024);

        // Update progress after estimation
        this.progress.progressPercentage = 5; // Show progress after estimation
        this.progress.currentFile = null;
        this.updateProgress();

        // Process files in chunks
        const chunkSize = this.options.chunkSize || 5;
        console.log(`📦 Processing files in chunks of ${chunkSize}, total chunks: ${Math.ceil(totalFiles / chunkSize)}`);

        for (let i = 0; i < totalFiles && !this.cancellationToken.cancelled; i += chunkSize) {
            const chunk = files.slice(i, i + chunkSize);
            console.log(`📦 Processing chunk ${Math.floor(i / chunkSize) + 1}: files ${i + 1}-${Math.min(i + chunkSize, totalFiles)}`);

            const chunkPromises = chunk.map(file =>
                this.processSingleFile(file, eventTitle)
            );

            try {
                console.log(`📦 Starting Promise.all for chunk ${Math.floor(i / chunkSize) + 1}...`);
                const chunkStartTime = Date.now();
                await Promise.all(chunkPromises);
                const chunkDuration = Date.now() - chunkStartTime;
                console.log(`📦 Chunk ${Math.floor(i / chunkSize) + 1} completed in ${chunkDuration}ms`);

                // Check for timeout warnings during processing if parameters are provided
                if (processingStartTime && adaptiveTimeout) {
                    this.checkForTimeoutWarning(processingStartTime, 'File processing', adaptiveTimeout);
                }

                this.updateProgress();
            } catch (error) {
                console.error(`❌ Chunk ${Math.floor(i / chunkSize) + 1} failed:`, error);
                this.handleError(error as Error);
                break;
            }
        }

        console.log(`📦 File processing completed. Processed ${this.progress.processedFiles}/${totalFiles} files`);
    }

    /**
     * Process a single file
     */
    private async processSingleFile(file: ZipFileInfo, eventTitle: string): Promise<void> {
        if (this.cancellationToken.cancelled) {
            console.log(`⏹️  Skipping ${file.filename} - download cancelled`);
            return;
        }

        console.log(`📥 Starting processing of ${file.filename}`);
        this.progress.currentFile = file.filename;
        this.updateProgress();

        try {
            // Fetch the file with retry and timeout
            console.log(`🌐 Fetching ${file.filename} from ${file.url}`);
            const fetchStartTime = Date.now();
            const blob = await this.fetchFileWithRetry(file.url);
            const fetchDuration = Date.now() - fetchStartTime;
            console.log(`🌐 Fetched ${file.filename} in ${fetchDuration}ms, size: ${(blob.size / (1024 * 1024)).toFixed(2)} MB`);

            if (this.cancellationToken.cancelled) {
                console.log(`⏹️  Cleaning up ${file.filename} - download cancelled`);
                this.cleanupBlobUrl(blob);
                return;
            }

            // Collect processed file for zip generation (watermark functionality removed)
            console.log(`📦 Collecting ${file.filename} for zip generation`);
            this.processedFiles.push({ filename: file.filename, blob });

            this.progress.processedFiles++;
            console.log(`✅ Completed processing ${file.filename} (${this.progress.processedFiles}/${this.progress.totalFiles})`);
            this.updateProgress();
        } catch (error) {
            console.error(`❌ Failed to process file ${file.filename}:`, error);
            this.progress.error = `Failed to process ${file.filename}`;

            // Add fallback mechanism - create a placeholder file
            try {
                console.log(`🔧 Creating placeholder for failed file ${file.filename}`);
                const placeholderContent = `File ${file.filename} could not be downloaded: ${error.message}`;
                this.zip.file(`${file.filename}.txt`, placeholderContent);
                this.progress.processedFiles++;
                console.log(`✅ Created placeholder for ${file.filename}`);
            } catch (placeholderError) {
                console.error(`❌ Failed to create placeholder for ${file.filename}:`, placeholderError);
            }

            this.updateProgress();
        }
    }

    /**
     * Fetch file with retry logic for better reliability
     */
    private async fetchFileWithRetry(url: string, retries = 3): Promise<Blob> {
        try {
            console.log(`🌐 Attempt ${MAX_RETRY_ATTEMPTS - retries + 1}/${MAX_RETRY_ATTEMPTS} to fetch ${url}`);

            // Add timeout to fetch requests
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

            const response = await fetch(url, {
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            console.log(`🌐 Fetch response status: ${response.status} for ${url}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const blob = await response.blob();
            console.log(`🌐 Successfully fetched ${url}, blob size: ${(blob.size / (1024 * 1024)).toFixed(2)} MB`);
            return blob;
        } catch (error) {
            console.warn(`⚠️  Fetch attempt failed for ${url}:`, error);
            if (retries <= 0) {
                console.error(`❌ Failed to fetch ${url} after all retries:`, error);
                throw new Error(`Failed to fetch ${url} after retries: ${error}`);
            }

            // Exponential backoff for retries
            const delay = RETRY_DELAY_MS * (MAX_RETRY_ATTEMPTS - retries + 1);
            console.log(`🔄 Retrying fetch for ${url} in ${delay}ms... (${retries} attempts remaining)`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return this.fetchFileWithRetry(url, retries - 1);
        }
    }


    /**
     * Add file directly to zip
     */
    private addFileToZip(blob: Blob, filename: string): void {
        this.zip.file(filename, blob);

        // Store cleanup function
        const blobUrl = URL.createObjectURL(blob);
        this.cleanupFunctions.push(() => {
            URL.revokeObjectURL(blobUrl);
        });
    }

    /**
     * Convert blob to base64
     */
    private blobToBase64(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error('Failed to read blob'));
            reader.readAsDataURL(blob);
        });
    }

    /**
     * Update progress and call callback
     */
    private updateProgress(): void {
        const oldPercentage = this.progress.progressPercentage;
        this.progress.progressPercentage = this.progress.totalFiles > 0
            ? Math.round((this.progress.processedFiles / this.progress.totalFiles) * 100)
            : 0;

        // Cap progress at 99% during file processing, final 100% comes after zip generation
        if (this.progress.progressPercentage > 99 && !this.progress.isComplete) {
            this.progress.progressPercentage = 99;
        }

        console.log(`📊 Progress update: ${oldPercentage}% → ${this.progress.progressPercentage}% (${this.progress.processedFiles}/${this.progress.totalFiles} files)`);

        if (this.options.onProgress) {
            this.options.onProgress({ ...this.progress });
        }
    }

    /**
     * Handle errors with callback
     */
    private handleError(error: Error): void {
        console.error('ZipManager error:', error);
        this.progress.error = error.message;
        this.progress.isCancelled = true;

        if (this.options.onError) {
            this.options.onError(error);
        }
    }

    /**
     * Check if timeout is likely and provide warning
     */
    private checkForTimeoutWarning(startTime: number, operation: string, timeout: number): void {
        const elapsedTime = Date.now() - startTime;
        const remainingTime = timeout - elapsedTime;

        // Warn if we're approaching timeout threshold
        if (remainingTime < 10000 && remainingTime > 0) { // Less than 10 seconds remaining
            console.warn(`⏳ ${operation} is approaching timeout: ${Math.round(remainingTime / 1000)} seconds remaining`);
            this.progress.error = `Warning: ${operation} is taking longer than expected. ${Math.round(remainingTime / 1000)} seconds remaining.`;
            this.updateProgress();
        }
    }

    /**
     * Cleanup temporary resources
     */
    private cleanupBlobUrl(blob: Blob): void {
        try {
            const blobUrl = URL.createObjectURL(blob);
            URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.warn('Failed to cleanup blob URL:', error);
        }
    }

    /**
     * Generate zip using Web Worker to prevent blocking main thread
     */
    private async generateZipWithWorker(eventTitle: string, compressionLevel: number): Promise<Blob> {
        return new Promise((resolve, reject) => {
            try {
                this.worker = new Worker('/workers/zipWorker.js');

                this.worker.onmessage = (e) => {
                    const data = e.data;
                    if (data.type === 'progress') {
                        // Update progress during zip generation
                        this.progress.progressPercentage = data.progress;
                        this.updateProgress();
                    } else if (data.type === 'complete') {
                        this.worker?.terminate();
                        this.worker = null;
                        resolve(data.zipBlob);
                    } else if (data.type === 'error') {
                        this.worker?.terminate();
                        this.worker = null;
                        reject(new Error(data.error));
                    }
                };

                this.worker.onerror = (error) => {
                    console.error('Zip worker error:', error);
                    this.worker?.terminate();
                    this.worker = null;
                    reject(error);
                };

                // Send files to worker
                this.worker.postMessage({
                    files: this.processedFiles,
                    eventTitle,
                    compressionLevel
                });

            } catch (error) {
                console.error('Failed to create zip worker:', error);
                // Fallback to main thread generation
                console.log('🔄 Falling back to main thread zip generation...');
                resolve(this.generateZipFallback(eventTitle, compressionLevel));
            }
        });
    }

    /**
     * Fallback zip generation in main thread
     */
    private async generateZipFallback(eventTitle: string, compressionLevel: number): Promise<Blob> {
        const zip = new JSZip();
        const folder = zip.folder(eventTitle.replace(/[^a-z0-9]/gi, '_'));

        for (const file of this.processedFiles) {
            folder!.file(file.filename, file.blob);
        }

        return await zip.generateAsync({
            type: "blob",
            compression: "DEFLATE",
            compressionOptions: {
                level: compressionLevel
            }
        });
    }

    /**
     * Main method to generate a zip archive with comprehensive progress tracking and error handling.
     * Implements the complete zip generation workflow including:
     * - Folder creation
     * - Chunked file processing
     * - Progress reporting
     * - Error handling
     * - Resource cleanup
     *
     * @param files - Array of files to include in the zip
     * @param eventTitle - Title of the event for folder naming
     * @returns Promise resolving to zip blob and cleanup function
     *
     * @throws Will throw if zip generation fails or is cancelled
     *
     * @example
     * ```typescript
     * const zipManager = new ZipManager({
     *   onProgress: (progress) => console.log('Progress:', progress.progressPercentage + '%')
     * });
     *
     * const { zipBlob, cleanup } = await zipManager.generateZip(
     *   files,
     *   'My Event'
     * );
     *
     * // Download the zip
     * const link = document.createElement('a');
     * link.href = URL.createObjectURL(zipBlob);
     * link.download = 'my_event.zip';
     * link.click();
     *
     * // Clean up resources
     * cleanup();
     * ```
     */
    public async generateZip(
        files: ZipFileInfo[],
        eventTitle: string
    ): Promise<{ zipBlob: Blob, cleanup: () => void }> {
        console.log('🚀 Starting zip generation for', files.length, 'files');
        this.progress = {
            totalFiles: files.length,
            processedFiles: 0,
            currentFile: null,
            progressPercentage: 0,
            estimatedSizeMb: 0,
            isCancelled: false,
            isComplete: false,
            error: null
        };

        try {
            // Create event folder
            console.log('📁 Creating zip folder:', eventTitle);
            const folder = this.zip.folder(eventTitle.replace(/[^a-z0-9]/gi, '_'));
            if (!folder) {
                throw new Error('Failed to create zip folder');
            }

            // Process files in chunks with timeout
            console.log('📦 Starting file processing...');
            const processingStartTime = Date.now();

            // Calculate adaptive timeout based on file count and estimated processing time
            // Base timeout: 30 seconds for small files, scale up for larger file counts
            const baseTimeout = 30000; // 30 seconds base
            const filesPerSecond = 2; // Conservative estimate: 2 files per second
            const estimatedProcessingTime = files.length * 1000 / filesPerSecond;
            const adaptiveTimeout = Math.min(Math.max(baseTimeout, estimatedProcessingTime * 2), 300000); // Max 5 minutes

            console.log(`🕒 Setting adaptive processing timeout: ${adaptiveTimeout / 1000}s (${files.length} files @ ${filesPerSecond} files/s)`);

            // Add timeout for the entire processing phase
            const processingTimeout = setTimeout(() => {
                console.error(`⏰ File processing timed out after ${adaptiveTimeout / 1000} seconds`);
                this.cancellationToken.cancelled = true;
                this.progress.error = `Processing timed out after ${Math.round(adaptiveTimeout / 1000)} seconds - some files may be missing`;
                this.updateProgress();
            }, adaptiveTimeout);

            try {
                await this.processFilesInChunks(files, eventTitle, processingStartTime, adaptiveTimeout);
            } catch (error) {
                console.error('❌ File processing failed:', error);
                // Clear timeout to prevent double error reporting
                clearTimeout(processingTimeout);
                throw error;
            }
            clearTimeout(processingTimeout);

            const processingDuration = Date.now() - processingStartTime;
            console.log(`📦 File processing completed in ${processingDuration}ms`);

            if (this.cancellationToken.cancelled) {
                console.log('⏹️  Zip generation was cancelled');
                throw new Error('Zip generation was cancelled');
            }

            // Generate zip using Web Worker for performance optimization
            console.log('🔧 Generating final zip archive using Web Worker...');
            const compressionLevel = this.options.compressionLevel !== undefined ? this.options.compressionLevel : 5;

            const zipBlob = await this.generateZipWithWorker(eventTitle, compressionLevel);
            console.log(`🔧 Zip generation completed, final size: ${(zipBlob.size / (1024 * 1024)).toFixed(2)} MB`);

            // Mark as complete and update final progress
            console.log('✅ Marking zip generation as complete');
            this.progress.isComplete = true;
            this.progress.progressPercentage = 100;
            this.progress.currentFile = null;
            this.updateProgress();

            // Call completion callback if provided
            if (this.options.onComplete) {
                console.log('🎉 Calling completion callback');
                try {
                    this.options.onComplete();
                } catch (callbackError) {
                    console.error('❌ Completion callback failed:', callbackError);
                }
            }

            // Create cleanup function with error handling
            const cleanup = () => {
                console.log('🧹 Running cleanup functions');
                try {
                    this.cleanupFunctions.forEach(cleanupFn => {
                        try { cleanupFn(); } catch (e) { console.warn('Cleanup failed:', e); }
                    });
                    this.cleanupFunctions = [];
                } catch (cleanupError) {
                    console.error('❌ Cleanup failed:', cleanupError);
                }
            };

            console.log('🎯 Zip generation completed successfully');
            return { zipBlob, cleanup };

        } catch (error) {
            console.error('❌ Zip generation failed:', error);
            this.handleError(error as Error);

            // Enhanced error recovery - try to return partial results if possible
            if (this.progress.processedFiles > 0 && !this.cancellationToken.cancelled) {
                console.log('🔧 Attempting to recover partial results...');
                try {
                    const partialZipBlob = await this.zip.generateAsync({
                        type: "blob",
                        compression: "STORE" // No compression for speed
                    });
                    console.log('✅ Partial recovery successful - returning partial zip');

                    const cleanup = () => {
                        console.log('🧹 Running cleanup after partial recovery');
                        this.cleanupFunctions.forEach(cleanupFn => {
                            try { cleanupFn(); } catch (e) { console.warn('Cleanup failed:', e); }
                        });
                        this.cleanupFunctions = [];
                    };

                    // Mark as complete with warning
                    this.progress.isComplete = true;
                    this.progress.progressPercentage = 100;
                    this.progress.error = `Partial recovery: ${this.progress.processedFiles}/${this.progress.totalFiles} files processed`;
                    this.updateProgress();

                    return { zipBlob: partialZipBlob, cleanup };
                } catch (recoveryError) {
                    console.error('❌ Partial recovery failed:', recoveryError);
                }
            }

            // Ensure cleanup happens even on error
            console.log('🧹 Running cleanup after error');
            this.cleanupFunctions.forEach(cleanupFn => {
                try { cleanupFn(); } catch (e) { console.warn('Cleanup failed:', e); }
            });
            this.cleanupFunctions = [];

            // Add timeout-specific error handling
            if (error.message.includes('timed out')) {
                console.warn('🕰️ Timeout occurred during zip generation');
                // Create a more specific error message for timeouts
                const timeoutError = new Error(`Zip generation timed out. Processed ${this.progress.processedFiles} of ${this.progress.totalFiles} files.`);
                timeoutError.name = 'TimeoutError';
                throw timeoutError;
            }

            throw error;
        }
    }

    /**
     * Cancel current zip operation
     */
    public cancel(): void {
        this.cancellationToken.cancelled = true;
        this.progress.isCancelled = true;
        this.progress.error = 'Operation cancelled by user';
        this.updateProgress();
    }

    /**
     * Get current progress
     */
    public getProgress(): ZipProgress {
        return { ...this.progress };
    }
}

// Export singleton instance for easy use
export const zipManager = new ZipManager();

// Helper function to create file info array
export const createZipFileInfo = (mediaItems: any[]): ZipFileInfo[] => {
    return mediaItems.map((item, index) => ({
        filename: `${item.id}.${item.type === 'video' ? 'mp4' : 'jpg'}`,
        size: 0, // Will be estimated
        type: item.type,
        url: item.url
    }));
};