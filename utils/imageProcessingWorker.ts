import { performanceOptimizer } from './performanceOptimizer';

interface ImageProcessingOptions {
    operation: 'resize' | 'watermark' | 'compress' | 'faceDetection';
    width?: number;
    height?: number;
    quality?: number;
    watermarkText?: string;
    watermarkOptions?: {
        font?: string;
        color?: string;
        align?: CanvasTextAlign;
        baseline?: CanvasTextBaseline;
        x?: number;
        y?: number;
    };
}

interface ImageProcessingResult {
    success: boolean;
    result?: string | any;
    error?: string;
    requestId: number;
}

export class ImageProcessingWorker {
    private static instance: ImageProcessingWorker;
    private worker: Worker | null = null;
    private requestCounter = 0;
    private pendingRequests = new Map<number, { resolve: (result: any) => void; reject: (error: Error) => void }>();

    private constructor() {
        this.initializeWorker();
    }

    public static getInstance(): ImageProcessingWorker {
        if (!ImageProcessingWorker.instance) {
            ImageProcessingWorker.instance = new ImageProcessingWorker();
        }
        return ImageProcessingWorker.instance;
    }

    private initializeWorker(): void {
        try {
            this.worker = performanceOptimizer.getWorker(
                'imageProcessing',
                '/workers/imageProcessingWorker.js'
            );

            this.worker.onmessage = (e: MessageEvent) => {
                const data = e.data as ImageProcessingResult;
                const requestId = data.requestId;

                if (requestId !== undefined && this.pendingRequests.has(requestId)) {
                    const { resolve, reject } = this.pendingRequests.get(requestId)!;
                    this.pendingRequests.delete(requestId);

                    if (data.success) {
                        resolve(data.result);
                    } else {
                        reject(new Error(data.error || 'Image processing failed'));
                    }
                }
            };

            this.worker.onerror = (error) => {
                console.error('Web Worker error:', error);
            };
        } catch (error) {
            console.error('Failed to initialize image processing worker:', error);
        }
    }

    public async processImage(
        imageData: string,
        options: ImageProcessingOptions
    ): Promise<string> {
        if (!this.worker) {
            throw new Error('Image processing worker not initialized');
        }

        this.requestCounter++;
        const requestId = this.requestCounter;

        return new Promise((resolve, reject) => {
            this.pendingRequests.set(requestId, { resolve, reject });

            this.worker?.postMessage({
                imageData,
                options,
                requestId: this.requestCounter
            });
        });
    }

    public async resizeImage(
        imageData: string,
        width: number,
        height: number,
        quality: number = 0.8
    ): Promise<string> {
        return this.processImage(imageData, {
            operation: 'resize',
            width,
            height,
            quality
        });
    }

    public async applyWatermark(
        imageData: string,
        text: string,
        options: ImageProcessingOptions['watermarkOptions'] = {}
    ): Promise<string> {
        return this.processImage(imageData, {
            operation: 'watermark',
            watermarkText: text,
            watermarkOptions: options
        });
    }

    public async compressImage(
        imageData: string,
        quality: number = 0.7
    ): Promise<string> {
        return this.processImage(imageData, {
            operation: 'compress',
            quality
        });
    }

    public async detectFaces(
        imageData: string
    ): Promise<any> {
        try {
            // Try Web Worker first
            return await this.processImage(imageData, {
                operation: 'faceDetection'
            });
        } catch (error) {
            console.warn('Web Worker face detection failed, falling back to basic implementation:', error);

            // Fallback to basic implementation
            return detectFacesFallback(imageData);
        }
    }

    public terminate(): void {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
            this.pendingRequests.clear();
        }
    }
}

// Singleton instance
export const imageProcessingWorker = ImageProcessingWorker.getInstance();

// Fallback implementation for environments without Web Workers
export async function processImageFallback(
    imageData: string,
    operation: ImageProcessingOptions['operation'],
    options: any = {}
): Promise<string | any> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    reject(new Error('Could not get canvas context'));
                    return;
                }

                canvas.width = img.width;
                canvas.height = img.height;

                // Draw original image
                ctx.drawImage(img, 0, 0);

                // Apply operation
                if (operation === 'watermark' && options.watermarkText) {
                    ctx.font = options.font || '30px Arial';
                    ctx.fillStyle = options.color || 'rgba(255, 255, 255, 0.5)';
                    ctx.textAlign = options.align || 'center';
                    ctx.textBaseline = options.baseline || 'middle';

                    const x = options.x !== undefined ? options.x : canvas.width / 2;
                    const y = options.y !== undefined ? options.y : canvas.height / 2;

                    ctx.fillText(options.watermarkText, x, y);
                }

                resolve(canvas.toDataURL('image/jpeg', options.quality || 0.8));
            } catch (error) {
                reject(error);
            }
        };

        img.onerror = reject;
        img.src = imageData;
    });
}

// Face detection fallback for when Web Worker FaceAPI fails
export async function detectFacesFallback(
    imageData: string
): Promise<any> {
    return new Promise((resolve) => {
        // For now, return empty detections as a fallback
        // In a real implementation, you could use a simpler face detection library
        // or implement basic face detection using canvas operations
        console.warn('Using fallback face detection - no actual face detection performed');

        resolve({
            detections: [],
            imageData: imageData,
            error: 'FaceAPI not available - using fallback',
            success: false
        });
    });
}