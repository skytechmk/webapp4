// Image Processing Web Worker
// Handles CPU-intensive image operations off the main thread

self.importScripts('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.min.js');

let faceapi;
let modelsLoaded = false;

// Load FaceAPI models
async function loadModels() {
    try {
        await faceapi.nets.ssdMobilenetv1.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model');
        await faceapi.nets.faceLandmark68Net.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model');
        await faceapi.nets.faceRecognitionNet.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model');
        modelsLoaded = true;
        console.log('FaceAPI models loaded in worker');
    } catch (error) {
        console.error('Failed to load FaceAPI models:', error);
    }
}

// Initialize FaceAPI
function initFaceAPI() {
    if (typeof faceapi === 'undefined') {
        faceapi = self.faceapi;
        if (faceapi) {
            loadModels();
        }
    }
}

// Image processing functions
async function processImageData(imageData, options) {
    const { operation, width, height, quality, watermarkText, watermarkOptions } = options;

    try {
        switch (operation) {
            case 'resize':
                return await resizeImage(imageData, width, height, quality);
            case 'watermark':
                return await applyWatermark(imageData, watermarkText, watermarkOptions);
            case 'compress':
                return await compressImage(imageData, quality);
            case 'faceDetection':
                initFaceAPI();
                if (!modelsLoaded) {
                    await new Promise(resolve => {
                        const checkLoaded = () => {
                            if (modelsLoaded) resolve();
                            else setTimeout(checkLoaded, 100);
                        };
                        checkLoaded();
                    });
                }
                return await detectFaces(imageData);
            default:
                throw new Error('Unknown operation: ' + operation);
        }
    } catch (error) {
        console.error('Image processing error:', error);
        throw error;
    }
}

async function resizeImage(imageData, width, height, quality = 0.8) {
    // Convert data URL to image
    const img = await createImageFromDataURL(imageData);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = width;
    canvas.height = height;

    ctx.drawImage(img, 0, 0, width, height);

    return canvas.toDataURL('image/jpeg', quality);
}

async function applyWatermark(imageData, text, options = {}) {
    const img = await createImageFromDataURL(imageData);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = img.width;
    canvas.height = img.height;

    // Draw original image
    ctx.drawImage(img, 0, 0);

    // Apply watermark
    if (text) {
        ctx.font = options.font || '30px Arial';
        ctx.fillStyle = options.color || 'rgba(255, 255, 255, 0.5)';
        ctx.textAlign = options.align || 'center';
        ctx.textBaseline = options.baseline || 'middle';

        const x = options.x !== undefined ? options.x : canvas.width / 2;
        const y = options.y !== undefined ? options.y : canvas.height / 2;

        ctx.fillText(text, x, y);
    }

    return canvas.toDataURL('image/jpeg', options.quality || 0.8);
}

async function compressImage(imageData, quality = 0.7) {
    const img = await createImageFromDataURL(imageData);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = img.width;
    canvas.height = img.height;

    ctx.drawImage(img, 0, 0);

    return canvas.toDataURL('image/jpeg', quality);
}

async function detectFaces(imageData) {
    const img = await createImageFromDataURL(imageData);
    const detections = await faceapi.detectAllFaces(img)
        .withFaceLandmarks()
        .withFaceDescriptors();

    return {
        detections: detections.map(detection => ({
            box: detection.detection.box,
            landmarks: detection.landmarks,
            descriptor: Array.from(detection.descriptor)
        })),
        imageData: imageData
    };
}

function createImageFromDataURL(dataURL) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = dataURL;
    });
}

// Message handler
self.onmessage = async function (e) {
    const { imageData, options, requestId } = e.data;

    try {
        const result = await processImageData(imageData, options);

        self.postMessage({
            success: true,
            result,
            requestId
        });
    } catch (error) {
        self.postMessage({
            success: false,
            error: error.message,
            requestId
        });
    }
};

// Initialize FaceAPI when worker starts
initFaceAPI();