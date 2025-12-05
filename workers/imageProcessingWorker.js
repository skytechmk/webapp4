/**
 * Image Processing Web Worker with Face Detection
 * Handles image processing operations with proper error handling for CDN failures
 */

// Error handling for importScripts failures
let faceApiLoaded = false;
let faceApiLoadError = null;

// List of fallback CDN URLs for face-api with timeout handling
const FACE_API_CDNS = [
    'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.min.js',
    'https://unpkg.com/@vladmandic/face-api/dist/face-api.min.js',
    'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js',
    // Additional fallback URLs
    'https://cdnjs.cloudflare.com/ajax/libs/face-api.js/0.22.2/face-api.min.js'
];

// Try to load face-api from CDN with fallback mechanisms and timeout
async function loadFaceApiWithFallback() {
    for (let i = 0; i < FACE_API_CDNS.length; i++) {
        try {
            console.log(`Attempting to load face-api from CDN ${i + 1}: ${FACE_API_CDNS[i]}`);

            // Create a timeout promise
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('CDN load timeout')), 10000); // 10 second timeout
            });

            // Race between importScripts and timeout
            await Promise.race([
                new Promise((resolve, reject) => {
                    try {
                        importScripts(FACE_API_CDNS[i]);
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                }),
                timeoutPromise
            ]);

            faceApiLoaded = true;
            console.log('Successfully loaded face-api from CDN:', FACE_API_CDNS[i]);

            // Report success to main thread
            self.postMessage({
                type: 'workerStatus',
                message: 'Successfully loaded face-api from CDN',
                cdnUrl: FACE_API_CDNS[i],
                severity: 'info'
            });

            return true;
        } catch (error) {
            faceApiLoadError = error;
            console.error(`Failed to load face-api from CDN ${i + 1}:`, error);

            // Report failure but continue to next CDN
            self.postMessage({
                type: 'workerWarning',
                error: `Failed to load face-api from CDN ${i + 1}: ${error.message}`,
                cdnUrl: FACE_API_CDNS[i],
                severity: 'warning',
                source: 'importScripts'
            });

            // Add delay between attempts to avoid overwhelming CDNs
            if (i < FACE_API_CDNS.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    // If all CDNs failed, try one final attempt with a different approach
    if (!faceApiLoaded) {
        try {
            console.log('Attempting final fallback: trying to load from local cache or alternative method');
            // This could be enhanced to check for locally cached versions
        } catch (finalError) {
            console.error('Final fallback also failed:', finalError);
        }

        self.postMessage({
            type: 'workerError',
            error: 'All CDN attempts failed to load face-api. Using fallback implementation.',
            severity: 'critical',
            source: 'importScripts'
        });
    }

    return faceApiLoaded;
}

// Load face-api with fallback
loadFaceApiWithFallback();

// Worker message handler
self.onmessage = async function(e) {
    const { imageData, operation, options, requestId } = e.data;

    try {
        let result;

        switch (operation) {
            case 'resize':
                result = await resizeImage(imageData, options);
                break;
            case 'watermark':
                result = await applyWatermark(imageData, options);
                break;
            case 'compress':
                result = await compressImage(imageData, options);
                break;
            case 'faceDetection':
                if (faceApiLoaded) {
                    result = await detectFaces(imageData, options);
                } else {
                    // Fallback for face detection when face-api fails to load
                    result = {
                        detections: [],
                        imageData: imageData,
                        error: 'FaceAPI not available - using fallback',
                        success: false
                    };
                }
                break;
            default:
                throw new Error('Unknown operation: ' + operation);
        }

        self.postMessage({
            success: true,
            result: result,
            requestId: requestId
        });
    } catch (error) {
        console.error('Image processing error:', error);

        // Report error to main thread
        self.postMessage({
            success: false,
            error: error.message,
            requestId: requestId,
            type: 'processingError'
        });
    }
};

// Image processing functions
async function resizeImage(imageData, options) {
    return new Promise((resolve, reject) => {
        try {
            const img = new Image();
            img.onload = () => {
                try {
                    const canvas = new OffscreenCanvas(options.width || img.width, options.height || img.height);
                    const ctx = canvas.getContext('2d');

                    if (!ctx) {
                        reject(new Error('Could not get canvas context'));
                        return;
                    }

                    // Draw image
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    // Convert to data URL
                    const result = canvas.convertToBlob({
                        type: 'image/jpeg',
                        quality: options.quality || 0.8
                    });

                    // Convert blob to data URL
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(result);
                } catch (error) {
                    reject(error);
                }
            };

            img.onerror = reject;
            img.src = imageData;
        } catch (error) {
            reject(error);
        }
    });
}

async function applyWatermark(imageData, options) {
    return new Promise((resolve, reject) => {
        try {
            const img = new Image();
            img.onload = () => {
                try {
                    const canvas = new OffscreenCanvas(img.width, img.height);
                    const ctx = canvas.getContext('2d');

                    if (!ctx) {
                        reject(new Error('Could not get canvas context'));
                        return;
                    }

                    // Draw original image
                    ctx.drawImage(img, 0, 0);

                    // Apply watermark
                    if (options.watermarkText) {
                        ctx.font = options.font || '30px Arial';
                        ctx.fillStyle = options.color || 'rgba(255, 255, 255, 0.5)';
                        ctx.textAlign = options.align || 'center';
                        ctx.textBaseline = options.baseline || 'middle';

                        const x = options.x !== undefined ? options.x : canvas.width / 2;
                        const y = options.y !== undefined ? options.y : canvas.height / 2;

                        ctx.fillText(options.watermarkText, x, y);
                    }

                    // Convert to data URL
                    const result = canvas.convertToBlob({
                        type: 'image/jpeg',
                        quality: options.quality || 0.8
                    });

                    // Convert blob to data URL
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(result);
                } catch (error) {
                    reject(error);
                }
            };

            img.onerror = reject;
            img.src = imageData;
        } catch (error) {
            reject(error);
        }
    });
}

async function compressImage(imageData, options) {
    return new Promise((resolve, reject) => {
        try {
            const img = new Image();
            img.onload = () => {
                try {
                    const canvas = new OffscreenCanvas(img.width, img.height);
                    const ctx = canvas.getContext('2d');

                    if (!ctx) {
                        reject(new Error('Could not get canvas context'));
                        return;
                    }

                    // Draw image
                    ctx.drawImage(img, 0, 0);

                    // Convert to data URL with compression
                    const result = canvas.convertToBlob({
                        type: 'image/jpeg',
                        quality: options.quality || 0.7
                    });

                    // Convert blob to data URL
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(result);
                } catch (error) {
                    reject(error);
                }
            };

            img.onerror = reject;
            img.src = imageData;
        } catch (error) {
            reject(error);
        }
    });
}

// Face detection with fallback
async function detectFaces(imageData, options) {
    if (!faceApiLoaded) {
        // Return fallback result when face-api is not available
        return {
            detections: [],
            imageData: imageData,
            error: 'FaceAPI not available - CDN loading failed',
            success: false
        };
    }

    try {
        // Load face-api models
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');

        const img = new Image();
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = imageData;
        });

        // Perform face detection
        const detections = await faceapi.detectAllFaces(
            img,
            new faceapi.TinyFaceDetectorOptions()
        ).withFaceLandmarks();

        return {
            detections: detections,
            imageData: imageData,
            success: true
        };
    } catch (error) {
        console.error('Face detection error:', error);
        return {
            detections: [],
            imageData: imageData,
            error: 'Face detection failed: ' + error.message,
            success: false
        };
    }
}

// Error reporting to main thread
function reportErrorToMainThread(errorType, errorMessage, severity = 'error') {
    self.postMessage({
        type: 'workerError',
        error: errorMessage,
        severity: severity,
        source: errorType,
        timestamp: Date.now()
    });
}

// Handle unhandled promise rejections
self.onunhandledrejection = (event) => {
    console.error('Unhandled rejection in worker:', event.reason);
    reportErrorToMainThread('unhandledRejection', event.reason.toString(), 'critical');
};

// Handle uncaught exceptions
self.onerror = (event) => {
    console.error('Uncaught error in worker:', event.message);
    reportErrorToMainThread('uncaughtError', event.message, 'critical');
};