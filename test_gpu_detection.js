import gpuImageService from './server/services/gpuImageService.js';

async function testGpuDetection() {
    console.log('Testing GPU Detection...');

    await gpuImageService.initialize();

    const stats = gpuImageService.getGpuStats();
    console.log('GPU Stats:', stats);

    const isAvailable = gpuImageService.isGpuAvailable();
    console.log('GPU Available:', isAvailable);

    // Try to process a small image to test fallback
    const testBuffer = Buffer.from('fake image data');
    try {
        const result = await gpuImageService.processImage(testBuffer, { maxWidth: 100, maxHeight: 100 });
        console.log('Fallback processing successful, result size:', result.length);
    } catch (error) {
        console.log('Processing failed:', error.message);
    }
}

testGpuDetection().catch(console.error);