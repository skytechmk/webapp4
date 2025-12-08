import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the C++ addon
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const cppImageProcessor = require('./cpp/build/Release/image_processor.node');

async function testCppImageProcessor() {
    console.log('Testing Enhanced C++ Image Processor\n');

    // Create a simple test image (256x256 RGB)
    const width = 256;
    const height = 256;
    const channels = 3;
    const imageSize = width * height * channels;
    const imageBuffer = Buffer.alloc(imageSize);

    // Fill with a gradient pattern
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * channels;
            imageBuffer[idx] = Math.floor((x / width) * 255);     // R
            imageBuffer[idx + 1] = Math.floor((y / height) * 255); // G
            imageBuffer[idx + 2] = 128;                            // B
        }
    }

    console.log(`Created test image: ${width}x${height}, ${imageSize} bytes`);

    // Test operations
    const operations = [
        'invert',
        'grayscale',
        'hdr',
        'tone_mapping',
        'exposure_fusion',
        'edge_detection',
        'feature_detection',
        'simd_optimize'
    ];

    const processor = new cppImageProcessor.ImageProcessor();

    for (const operation of operations) {
        try {
            console.log(`\nTesting operation: ${operation}`);
            const start = process.hrtime.bigint();

            const result = processor.processImage(imageBuffer, operation);

            const end = process.hrtime.bigint();
            const time = Number(end - start) / 1e6; // ms

            console.log(`  ✓ Success: ${result.length} bytes, ${time.toFixed(2)}ms`);
        } catch (error) {
            console.log(`  ✗ Failed: ${error.message}`);
        }
    }

    // Test metrics
    console.log('\nProcessor Metrics:');
    const metrics = processor.getMetrics();
    console.log(JSON.stringify(metrics, null, 2));

    console.log('\nC++ Image Processor test completed!');
}

testCppImageProcessor().catch(console.error);