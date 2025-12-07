import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import rustImageService from './server/services/rustImageService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test image paths
const testImages = [
    'test_image1.jpg',
    'test_image2.png',
    'test_image3.webp'
];

async function loadTestImage(filename) {
    const imagePath = path.join(__dirname, 'test_images', filename);
    if (!fs.existsSync(imagePath)) {
        console.log(`Test image ${filename} not found, skipping`);
        return null;
    }
    return fs.readFileSync(imagePath);
}

async function benchmarkSharp(buffer, options) {
    const start = process.hrtime.bigint();
    const result = await sharp(buffer)
        .rotate()
        .resize(options.maxWidth, options.maxHeight, {
            fit: 'inside',
            withoutEnlargement: true
        })
        .jpeg({ quality: options.quality })
        .toBuffer();
    const end = process.hrtime.bigint();
    return {
        time: Number(end - start) / 1e6, // ms
        size: result.length
    };
}

async function benchmarkRust(buffer, options) {
    const start = process.hrtime.bigint();
    const result = await rustImageService.processImage(buffer, options);
    const end = process.hrtime.bigint();
    return {
        time: Number(end - start) / 1e6, // ms
        size: result.length
    };
}

async function runBenchmark() {
    console.log('Starting Image Processing Benchmark\n');

    const options = {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 85,
        format: 'jpeg'
    };

    let totalSharpTime = 0;
    let totalRustTime = 0;
    let totalImages = 0;

    for (const imageName of testImages) {
        const buffer = await loadTestImage(imageName);
        if (!buffer) continue;

        console.log(`Processing ${imageName} (${buffer.length} bytes)`);

        // Benchmark Sharp
        const sharpResult = await benchmarkSharp(buffer, options);
        console.log(`  Sharp:  ${sharpResult.time.toFixed(2)}ms, ${sharpResult.size} bytes`);

        // Benchmark Rust
        const rustResult = await benchmarkRust(buffer, options);
        console.log(`  Rust:   ${rustResult.time.toFixed(2)}ms, ${rustResult.size} bytes`);

        const speedup = sharpResult.time / rustResult.time;
        console.log(`  Speedup: ${speedup.toFixed(2)}x\n`);

        totalSharpTime += sharpResult.time;
        totalRustTime += rustResult.time;
        totalImages++;
    }

    if (totalImages > 0) {
        const avgSharpTime = totalSharpTime / totalImages;
        const avgRustTime = totalRustTime / totalImages;
        const avgSpeedup = avgSharpTime / avgRustTime;

        console.log('Average Results:');
        console.log(`  Sharp: ${avgSharpTime.toFixed(2)}ms`);
        console.log(`  Rust:  ${avgRustTime.toFixed(2)}ms`);
        console.log(`  Average Speedup: ${avgSpeedup.toFixed(2)}x`);
    }
}

// Create test_images directory if it doesn't exist
if (!fs.existsSync(path.join(__dirname, 'test_images'))) {
    fs.mkdirSync(path.join(__dirname, 'test_images'));
    console.log('Created test_images directory. Please add some test images there.');
    process.exit(0);
}

runBenchmark().catch(console.error);