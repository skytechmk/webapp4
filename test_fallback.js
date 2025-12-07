import gpuImageService from './server/services/gpuImageService.js';
import fs from 'fs';
import path from 'path';

async function testFallback() {
    console.log('Testing automatic fallback to CPU processing...');

    // Load a test image
    const testImagePath = path.join('test_images', 'test_image1.jpg');
    if (!fs.existsSync(testImagePath)) {
        console.log('Test image not found, creating fake buffer for testing');
        // Create a minimal valid JPEG header for testing
        const buffer = Buffer.from([
            0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
            0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xC0, 0x00, 0x11,
            0x08, 0x00, 0x10, 0x00, 0x10, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01,
            0x03, 0x11, 0x01, 0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x08, 0xFF, 0xC4, 0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF,
            0xDA, 0x00, 0x0C, 0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3F,
            0x00, 0x00, 0xFF, 0xD9
        ]);
        console.log('Using minimal JPEG buffer for testing');
    } else {
        const buffer = fs.readFileSync(testImagePath);
        console.log(`Loaded test image: ${buffer.length} bytes`);
    }

    // Test normal fallback (GPU not available)
    console.log('\n1. Testing normal fallback (GPU unavailable):');
    try {
        const result = await gpuImageService.processImage(buffer, { maxWidth: 400, maxHeight: 400 });
        console.log(`✅ Fallback successful! Output size: ${result.length} bytes`);
    } catch (error) {
        console.log(`❌ Fallback failed: ${error.message}`);
    }

    // Test error recovery by temporarily making GPU "available" but forcing error
    console.log('\n2. Testing error recovery:');
    const originalIsGpuAvailable = gpuImageService.isGpuAvailable;
    const originalProcessImage = gpuImageService.processImage;

    // Mock GPU as available but make it throw error
    gpuImageService.isGpuAvailable = () => true;
    gpuImageService.processImage = async () => {
        throw new Error('Simulated GPU processing error');
    };

    try {
        const result = await gpuImageService.processImage(buffer, { maxWidth: 400, maxHeight: 400 });
        console.log(`✅ Error recovery successful! Output size: ${result.length} bytes`);
    } catch (error) {
        console.log(`❌ Error recovery failed: ${error.message}`);
    }

    // Restore original methods
    gpuImageService.isGpuAvailable = originalIsGpuAvailable;
    gpuImageService.processImage = originalProcessImage;

    console.log('\nFallback testing completed.');
}

testFallback().catch(console.error);