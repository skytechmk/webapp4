// Zip Processing Web Worker
// Handles zip generation in a separate thread to prevent blocking the main UI
// Performance optimization: Moves heavy zip compression to background thread

// Import JSZip in the worker
importScripts('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');

self.onmessage = async function (e) {
    const { files, eventTitle, compressionLevel } = e.data;

    try {
        console.log('Worker: Starting zip generation for', files.length, 'files');

        const zip = new JSZip();

        // Create folder
        const folder = zip.folder(eventTitle.replace(/[^a-z0-9]/gi, '_'));

        // Add files to zip (files are already blobs from main thread)
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            console.log(`Worker: Adding file ${i + 1}/${files.length}: ${file.filename}`);

            // Add blob directly to zip
            folder.file(file.filename, file.blob);

            // Report progress
            self.postMessage({
                type: 'progress',
                progress: Math.round((i + 1) / files.length * 100)
            });
        }

        console.log('Worker: Generating final zip...');

        // Generate zip
        const zipBlob = await zip.generateAsync({
            type: "blob",
            compression: "DEFLATE",
            compressionOptions: {
                level: compressionLevel || 6
            }
        });

        console.log('Worker: Zip generation complete, size:', zipBlob.size);

        self.postMessage({
            type: 'complete',
            zipBlob: zipBlob
        });

    } catch (error) {
        console.error('Worker: Error during zip generation:', error);
        self.postMessage({
            type: 'error',
            error: error.message
        });
    }
};