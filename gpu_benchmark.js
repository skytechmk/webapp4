import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import rustImageService from './server/services/rustImageService.js';
import gpuImageService from './server/services/gpuImageService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configurations
const testImages = [
    'test_image1.jpg',
    'test_image2.png',
    'test_image3.webp'
];

const imageSizes = [
    { width: 800, height: 600, name: 'Small (800x600)' },
    { width: 1920, height: 1080, name: 'HD (1920x1080)' },
    { width: 3840, height: 2160, name: '4K (3840x2160)' },
    { width: 7680, height: 4320, name: '8K (7680x4320)' }
];

const iterations = 5; // Number of iterations per test

async function loadTestImage(filename) {
    const imagePath = path.join(__dirname, 'test_images', filename);
    if (!fs.existsSync(imagePath)) {
        console.log(`Test image ${filename} not found, skipping`);
        return null;
    }
    return fs.readFileSync(imagePath);
}

function getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
        rss: usage.rss / 1024 / 1024, // MB
        heapUsed: usage.heapUsed / 1024 / 1024, // MB
        heapTotal: usage.heapTotal / 1024 / 1024, // MB
        external: usage.external / 1024 / 1024 // MB
    };
}

async function benchmarkProcessor(processor, name, buffer, options, iterations = 1) {
    const results = {
        times: [],
        memoryPeaks: [],
        outputs: []
    };

    for (let i = 0; i < iterations; i++) {
        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }

        const startMemory = getMemoryUsage();
        const start = process.hrtime.bigint();

        try {
            const result = await processor(buffer, options);
            const end = process.hrtime.bigint();
            const endMemory = getMemoryUsage();

            const time = Number(end - start) / 1e6; // ms
            const memoryPeak = Math.max(
                endMemory.heapUsed - startMemory.heapUsed,
                endMemory.rss - startMemory.rss
            );

            results.times.push(time);
            results.memoryPeaks.push(memoryPeak);
            results.outputs.push(result.length);

        } catch (error) {
            console.warn(`${name} iteration ${i + 1} failed:`, error.message);
            results.times.push(Infinity);
            results.memoryPeaks.push(0);
            results.outputs.push(0);
        }
    }

    return results;
}

function calculateStats(values) {
    const validValues = values.filter(v => v !== Infinity && v > 0);
    if (validValues.length === 0) return { mean: 0, std: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0 };

    const mean = validValues.reduce((a, b) => a + b, 0) / validValues.length;
    const variance = validValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / validValues.length;
    const std = Math.sqrt(variance);

    const sorted = [...validValues].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    return {
        mean: mean,
        std: std,
        min: Math.min(...validValues),
        max: Math.max(...validValues),
        p50: p50,
        p95: p95,
        p99: p99
    };
}

async function runBenchmark() {
    console.log('='.repeat(80));
    console.log('GPU vs CPU Image Processing Performance Benchmark');
    console.log('='.repeat(80));
    console.log(`Running ${iterations} iterations per test configuration\n`);

    const benchmarkResults = {};

    // Initialize services
    await gpuImageService.initialize();
    await rustImageService.initialize();

    for (const imageName of testImages) {
        const buffer = await loadTestImage(imageName);
        if (!buffer) continue;

        console.log(`\n📸 Testing with ${imageName} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
        console.log('-'.repeat(60));

        benchmarkResults[imageName] = {};

        for (const size of imageSizes) {
            console.log(`\n🎯 Target Size: ${size.name}`);

            const options = {
                maxWidth: size.width,
                maxHeight: size.height,
                quality: 85,
                format: 'jpeg'
            };

            benchmarkResults[imageName][size.name] = {};

            // Benchmark CPU (Sharp)
            console.log('  🔄 CPU (Sharp)...');
            const sharpResults = await benchmarkProcessor(
                async (buf, opts) => {
                    return await sharp(buf)
                        .rotate()
                        .resize(opts.maxWidth, opts.maxHeight, {
                            fit: 'inside',
                            withoutEnlargement: true
                        })
                        .jpeg({ quality: opts.quality })
                        .toBuffer();
                },
                'Sharp',
                buffer,
                options,
                iterations
            );

            // Benchmark CPU (Rust)
            console.log('  🦀 CPU (Rust)...');
            const rustResults = await benchmarkProcessor(
                async (buf, opts) => await rustImageService.processImage(buf, opts),
                'Rust',
                buffer,
                options,
                iterations
            );

            // Benchmark GPU (currently placeholder)
            console.log('  🎮 GPU (Placeholder)...');
            const gpuResults = await benchmarkProcessor(
                async (buf, opts) => await gpuImageService.processImage(buf, opts),
                'GPU',
                buffer,
                options,
                iterations
            );

            // Calculate statistics
            const sharpStats = {
                time: calculateStats(sharpResults.times),
                memory: calculateStats(sharpResults.memoryPeaks),
                outputSize: sharpResults.outputs[0] || 0
            };

            const rustStats = {
                time: calculateStats(rustResults.times),
                memory: calculateStats(rustResults.memoryPeaks),
                outputSize: rustResults.outputs[0] || 0
            };

            const gpuStats = {
                time: calculateStats(gpuResults.times),
                memory: calculateStats(gpuResults.memoryPeaks),
                outputSize: gpuResults.outputs[0] || 0
            };

            benchmarkResults[imageName][size.name] = {
                sharp: sharpStats,
                rust: rustStats,
                gpu: gpuStats
            };

            // Display results for this size
            console.log(`\n    📊 Results (${size.name}):`);
            console.log(`      CPU (Sharp): ${(sharpStats.time.mean).toFixed(2)}ms ±${(sharpStats.time.std).toFixed(2)}ms, ${(sharpStats.memory.mean).toFixed(2)}MB peak`);
            console.log(`      CPU (Rust):  ${(rustStats.time.mean).toFixed(2)}ms ±${(rustStats.time.std).toFixed(2)}ms, ${(rustStats.memory.mean).toFixed(2)}MB peak`);
            console.log(`      GPU:         ${(gpuStats.time.mean).toFixed(2)}ms ±${(gpuStats.time.std).toFixed(2)}ms, ${(gpuStats.memory.mean).toFixed(2)}MB peak`);

            // Calculate throughput (operations per second)
            const sharpThroughput = 1000 / sharpStats.time.mean;
            const rustThroughput = 1000 / rustStats.time.mean;
            const gpuThroughput = gpuStats.time.mean > 0 ? 1000 / gpuStats.time.mean : 0;

            console.log(`      Throughput: Sharp: ${sharpThroughput.toFixed(1)} ops/s, Rust: ${rustThroughput.toFixed(1)} ops/s, GPU: ${gpuThroughput.toFixed(1)} ops/s`);

            // Calculate speedups
            if (sharpStats.time.mean > 0 && rustStats.time.mean > 0) {
                const rustVsSharp = sharpStats.time.mean / rustStats.time.mean;
                console.log(`      Speedup: Rust vs Sharp: ${rustVsSharp.toFixed(2)}x`);
            }

            if (gpuStats.time.mean > 0 && sharpStats.time.mean > 0) {
                const gpuVsSharp = sharpStats.time.mean / gpuStats.time.mean;
                console.log(`               GPU vs Sharp: ${gpuVsSharp.toFixed(2)}x`);
            }
        }
    }

    // Generate summary report
    console.log('\n' + '='.repeat(80));
    console.log('📈 SUMMARY REPORT');
    console.log('='.repeat(80));

    console.log('\n🎯 Average Performance Across All Tests:');

    let totalSharpTime = 0, totalRustTime = 0, totalGpuTime = 0;
    let totalSharpMemory = 0, totalRustMemory = 0, totalGpuMemory = 0;
    let testCount = 0;

    for (const imageName in benchmarkResults) {
        for (const sizeName in benchmarkResults[imageName]) {
            const result = benchmarkResults[imageName][sizeName];
            totalSharpTime += result.sharp.time.mean;
            totalRustTime += result.rust.time.mean;
            totalGpuTime += result.gpu.time.mean;
            totalSharpMemory += result.sharp.memory.mean;
            totalRustMemory += result.rust.memory.mean;
            totalGpuMemory += result.gpu.memory.mean;
            testCount++;
        }
    }

    if (testCount > 0) {
        const avgSharpTime = totalSharpTime / testCount;
        const avgRustTime = totalRustTime / testCount;
        const avgGpuTime = totalGpuTime / testCount;
        const avgSharpMemory = totalSharpMemory / testCount;
        const avgRustMemory = totalRustMemory / testCount;
        const avgGpuMemory = totalGpuMemory / testCount;

        console.log(`\n⏱️  Average Execution Time:`);
        console.log(`  CPU (Sharp): ${avgSharpTime.toFixed(2)}ms`);
        console.log(`  CPU (Rust):  ${avgRustTime.toFixed(2)}ms`);
        console.log(`  GPU:         ${avgGpuTime.toFixed(2)}ms`);

        console.log(`\n💾 Average Memory Usage:`);
        console.log(`  CPU (Sharp): ${avgSharpMemory.toFixed(2)}MB`);
        console.log(`  CPU (Rust):  ${avgRustMemory.toFixed(2)}MB`);
        console.log(`  GPU:         ${avgGpuMemory.toFixed(2)}MB`);

        console.log(`\n⚡ Average Throughput:`);
        console.log(`  CPU (Sharp): ${(1000 / avgSharpTime).toFixed(1)} ops/s`);
        console.log(`  CPU (Rust):  ${(1000 / avgRustTime).toFixed(1)} ops/s`);
        console.log(`  GPU:         ${(1000 / avgGpuTime).toFixed(1)} ops/s`);

        console.log(`\n🏆 Performance Comparison:`);
        if (avgRustTime > 0) {
            const rustSpeedup = avgSharpTime / avgRustTime;
            console.log(`  Rust vs Sharp speedup: ${rustSpeedup.toFixed(2)}x`);
        }
        if (avgGpuTime > 0) {
            const gpuSpeedup = avgSharpTime / avgGpuTime;
            console.log(`  GPU vs Sharp speedup: ${gpuSpeedup.toFixed(2)}x`);
        }

        console.log(`\n💡 Note: GPU results are currently using CPU fallback (Sharp)`);
        console.log(`   Actual GPU acceleration will be measured once implemented.`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('Benchmark completed successfully!');
    console.log('='.repeat(80));

    // Save detailed results to JSON file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultsFile = `benchmark_results_${timestamp}.json`;
    fs.writeFileSync(resultsFile, JSON.stringify(benchmarkResults, null, 2));
    console.log(`\n📄 Detailed results saved to: ${resultsFile}`);
}

// Enable garbage collection for more accurate memory measurements
if (typeof global !== 'undefined' && typeof global.gc === 'undefined') {
    console.log('⚠️  For more accurate memory measurements, run with: node --expose-gc gpu_benchmark.js');
}

runBenchmark().catch(console.error);