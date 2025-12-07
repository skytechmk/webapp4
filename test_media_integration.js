import mediaService from './server/services/mediaService.js';
import fs from 'fs';
import path from 'path';

async function testMediaIntegration() {
    console.log('Testing Media Service Integration with GPU processing...');

    // Use a test image
    const testImagePath = path.join('test_images', 'test_image1.jpg');
    if (!fs.existsSync(testImagePath)) {
        console.log('Test image not found, skipping integration test');
        return;
    }

    const buffer = fs.readFileSync(testImagePath);
    console.log(`Loaded test image: ${buffer.length} bytes`);

    // Test processing through media service
    try {
        console.log('Processing image through media service...');
        const processed = await mediaService.processImage(buffer, {
            maxWidth: 800,
            maxHeight: 600,
            quality: 85,
            format: 'jpeg'
        });

        console.log(`Processing successful! Output size: ${processed.length} bytes`);

        // Test processing stats
        const stats = mediaService.getProcessingStats();
        console.log('Processing stats:', JSON.stringify(stats, null, 2));

    } catch (error) {
        console.error('Media service processing failed:', error);
    }
}

testMediaIntegration().catch(console.error);