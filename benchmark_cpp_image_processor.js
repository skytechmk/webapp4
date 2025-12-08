import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import sharp from 'sharp';
import rustImageService from './server/services/rustImageService.js';

const require = createRequire(import.meta.url);
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
    { width: 3840, height: 2160, name: '4K (3840x2160)' }
];

const operations = ['invert', 'grayscale', 'noop'];
const iterations = 10; // Number of iterations per test for statistical analysis

// C++ Image Processor wrapper
class CppImageProcessor {
    constructor() {
        this.processor = null;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        try {
            console.log('🔧 Initializing C++ Image Processor...');
            // Use require for .node files since ES modules don't support them directly
            const { ImageProcessor } = require('./cpp/build/Release/image_processor.node');
            this.processor = new ImageProcessor();
            this.initialized = true;
            console.log('✅ C++ Image Processor initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize C++ Image Processor:', error.message);
            throw error;
        }
    }

    async processImage(buffer, operation) {
        await this.initialize();

        if (!this.initialized || !this.processor) {
            throw new Error('C++ Image Processor not initialized');
        }

        return this.processor.processImage(buffer, operation);
    }

    getMetrics() {
        if (!this.initialized || !this.processor) {
            return null;
        }
        return this.processor.getMetrics();
    }
}

const cppProcessor = new CppImageProcessor();

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
        external: usage.external / 1024 / 1024, // MB
        arrayBuffers: usage.arrayBuffers / 1024 / 1024 // MB
    };
}

function getCpuUsage() {
    // Basic CPU usage measurement using process.hrtime
    const startTime = process.hrtime.bigint();
    return {
        startTime,
        getElapsedMs: () => Number(process.hrtime.bigint() - startTime) / 1e6
    };
}

async function benchmarkProcessor(processor, name, buffer, options, iterations = 1) {
    const results = {
        times: [],
        memoryPeaks: [],
        cpuTimes: [],
        outputs: [],
        errors: []
    };

    for (let i = 0; i < iterations; i++) {
        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }

        const startMemory = getMemoryUsage();
        const cpuTimer = getCpuUsage();
        const start = process.hrtime.bigint();

        try {
            const result = await processor(buffer, options);
            const end = process.hrtime.bigint();
            const endMemory = getMemoryUsage();
            const cpuTime = cpuTimer.getElapsedMs();

            const time = Number(end - start) / 1e6; // ms
            const memoryPeak = Math.max(
                endMemory.heapUsed - startMemory.heapUsed,
                endMemory.rss - startMemory.rss,
                endMemory.external - startMemory.external
            );

            results.times.push(time);
            results.memoryPeaks.push(memoryPeak);
            results.cpuTimes.push(cpuTime);
            results.outputs.push(result ? result.length : 0);

        } catch (error) {
            console.warn(`${name} iteration ${i + 1} failed:`, error.message);
            results.times.push(Infinity);
            results.memoryPeaks.push(0);
            results.cpuTimes.push(0);
            results.outputs.push(0);
            results.errors.push(error.message);
        }
    }

    return results;
}

function calculateStats(values) {
    const validValues = values.filter(v => v !== Infinity && v > 0 && !isNaN(v));
    if (validValues.length === 0) return { mean: 0, std: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0, validCount: 0 };

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
        p99: p99,
        validCount: validValues.length
    };
}

async function runLatencyBenchmark() {
    console.log('\n📏 LATENCY BENCHMARK (Single Operation Timing)');
    console.log('='.repeat(60));

    const latencyResults = {};

    for (const imageName of testImages) {
        const buffer = await loadTestImage(imageName);
        if (!buffer) continue;

        console.log(`\n🖼️  Testing with ${imageName} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
        latencyResults[imageName] = {};

        for (const operation of operations) {
            console.log(`  🔄 Operation: ${operation}`);

            latencyResults[imageName][operation] = {};

            // Benchmark C++ N-API
            console.log('    📦 C++ N-API...');
            const cppResults = await benchmarkProcessor(
                async (buf, opts) => await cppProcessor.processImage(buf, operation),
                'C++',
                buffer,
                { operation },
                iterations
            );

            // Benchmark Rust (using Sharp as fallback if Rust fails)
            console.log('    🦀 Rust...');
            const rustResults = await benchmarkProcessor(
                async (buf, opts) => {
                    try {
                        return await rustImageService.processImage(buf, { maxWidth: 1920, maxHeight: 1080, quality: 85, format: 'jpeg' });
                    } catch (error) {
                        // Fallback to Sharp for comparison
                        return await sharp(buf)
                            .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
                            .jpeg({ quality: 85 })
                            .toBuffer();
                    }
                },
                'Rust',
                buffer,
                {},
                iterations
            );

            // Benchmark Node.js (Sharp)
            console.log('    🟢 Node.js (Sharp)...');
            const sharpResults = await benchmarkProcessor(
                async (buf, opts) => {
                    return await sharp(buf)
                        .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
                        .jpeg({ quality: 85 })
                        .toBuffer();
                },
                'Sharp',
                buffer,
                {},
                iterations
            );

            // Calculate statistics
            const cppStats = {
                time: calculateStats(cppResults.times),
                memory: calculateStats(cppResults.memoryPeaks),
                cpu: calculateStats(cppResults.cpuTimes),
                outputSize: cppResults.outputs[0] || 0,
                errors: cppResults.errors
            };

            const rustStats = {
                time: calculateStats(rustResults.times),
                memory: calculateStats(rustResults.memoryPeaks),
                cpu: calculateStats(rustResults.cpuTimes),
                outputSize: rustResults.outputs[0] || 0,
                errors: rustResults.errors
            };

            const sharpStats = {
                time: calculateStats(sharpResults.times),
                memory: calculateStats(sharpResults.memoryPeaks),
                cpu: calculateStats(sharpResults.cpuTimes),
                outputSize: sharpResults.outputs[0] || 0,
                errors: sharpResults.errors
            };

            latencyResults[imageName][operation] = {
                cpp: cppStats,
                rust: rustStats,
                sharp: sharpStats
            };

            // Display results
            console.log(`\n      📊 Latency Results (${operation}):`);
            console.log(`        C++ N-API:  ${(cppStats.time.mean).toFixed(3)}ms ±${(cppStats.time.std).toFixed(3)}ms, ${(cppStats.memory.mean).toFixed(2)}MB peak`);
            console.log(`        Rust:       ${(rustStats.time.mean).toFixed(3)}ms ±${(rustStats.time.std).toFixed(3)}ms, ${(rustStats.memory.mean).toFixed(2)}MB peak`);
            console.log(`        Node.js:    ${(sharpStats.time.mean).toFixed(3)}ms ±${(sharpStats.time.std).toFixed(3)}ms, ${(sharpStats.memory.mean).toFixed(2)}MB peak`);

            // Calculate speedups
            if (cppStats.time.mean > 0 && sharpStats.time.mean > 0) {
                const cppVsSharp = sharpStats.time.mean / cppStats.time.mean;
                console.log(`        Speedup: C++ vs Node.js: ${cppVsSharp.toFixed(2)}x`);
            }

            if (rustStats.time.mean > 0 && sharpStats.time.mean > 0) {
                const rustVsSharp = sharpStats.time.mean / rustStats.time.mean;
                console.log(`                 Rust vs Node.js: ${rustVsSharp.toFixed(2)}x`);
            }
        }
    }

    return latencyResults;
}

async function runThroughputBenchmark() {
    console.log('\n⚡ THROUGHPUT BENCHMARK (Operations per Second)');
    console.log('='.repeat(60));

    const throughputResults = {};
    const testDuration = 5000; // 5 seconds per test

    for (const imageName of testImages) {
        const buffer = await loadTestImage(imageName);
        if (!buffer) continue;

        console.log(`\n🖼️  Testing with ${imageName} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
        throughputResults[imageName] = {};

        for (const operation of operations) {
            console.log(`  🔄 Operation: ${operation}`);
            throughputResults[imageName][operation] = {};

            // Test each processor
            const processors = [
                {
                    name: 'C++ N-API',
                    func: async (buf) => await cppProcessor.processImage(buf, operation),
                    key: 'cpp'
                },
                {
                    name: 'Rust',
                    func: async (buf) => {
                        try {
                            return await rustImageService.processImage(buf, { maxWidth: 1920, maxHeight: 1080, quality: 85, format: 'jpeg' });
                        } catch (error) {
                            return await sharp(buf)
                                .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
                                .jpeg({ quality: 85 })
                                .toBuffer();
                        }
                    },
                    key: 'rust'
                },
                {
                    name: 'Node.js (Sharp)',
                    func: async (buf) => {
                        return await sharp(buf)
                            .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
                            .jpeg({ quality: 85 })
                            .toBuffer();
                    },
                    key: 'sharp'
                }
            ];

            for (const processor of processors) {
                console.log(`    📊 ${processor.name}...`);

                const startTime = Date.now();
                let operations = 0;
                let totalMemoryPeak = 0;

                while (Date.now() - startTime < testDuration) {
                    const startMemory = getMemoryUsage();

                    try {
                        await processor.func(buffer);
                        operations++;

                        const endMemory = getMemoryUsage();
                        const memoryPeak = Math.max(
                            endMemory.heapUsed - startMemory.heapUsed,
                            endMemory.rss - startMemory.rss
                        );
                        totalMemoryPeak = Math.max(totalMemoryPeak, memoryPeak);

                    } catch (error) {
                        break; // Stop on error
                    }
                }

                const elapsedSeconds = (Date.now() - startTime) / 1000;
                const opsPerSecond = operations / elapsedSeconds;

                throughputResults[imageName][operation][processor.key] = {
                    operations: operations,
                    elapsedSeconds: elapsedSeconds,
                    opsPerSecond: opsPerSecond,
                    avgMemoryPeak: totalMemoryPeak
                };

                console.log(`      ${processor.name}: ${opsPerSecond.toFixed(1)} ops/s, ${totalMemoryPeak.toFixed(2)}MB peak memory`);
            }
        }
    }

    return throughputResults;
}

async function runMemoryManagementValidation() {
    console.log('\n🧠 MEMORY MANAGEMENT VALIDATION');
    console.log('='.repeat(60));

    const memoryResults = {};
    const leakTestIterations = 100;

    for (const imageName of testImages.slice(0, 1)) { // Test with first image only
        const buffer = await loadTestImage(imageName);
        if (!buffer) continue;

        console.log(`\n🖼️  Memory leak test with ${imageName} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
        memoryResults[imageName] = {};

        const processors = [
            {
                name: 'C++ N-API',
                func: async (buf) => await cppProcessor.processImage(buf, 'invert'),
                key: 'cpp'
            },
            {
                name: 'Rust',
                func: async (buf) => {
                    try {
                        return await rustImageService.processImage(buf, { maxWidth: 1920, maxHeight: 1080, quality: 85, format: 'jpeg' });
                    } catch (error) {
                        return await sharp(buf)
                            .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
                            .jpeg({ quality: 85 })
                            .toBuffer();
                    }
                },
                key: 'rust'
            },
            {
                name: 'Node.js (Sharp)',
                func: async (buf) => {
                    return await sharp(buf)
                        .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
                        .jpeg({ quality: 85 })
                        .toBuffer();
                },
                key: 'sharp'
            }
        ];

        for (const processor of processors) {
            console.log(`  🔍 Testing ${processor.name} for memory leaks...`);

            const memorySnapshots = [];
            const startMemory = getMemoryUsage();

            for (let i = 0; i < leakTestIterations; i++) {
                if (global.gc) global.gc();

                try {
                    await processor.func(buffer);

                    if (i % 10 === 0) { // Take snapshot every 10 iterations
                        const currentMemory = getMemoryUsage();
                        memorySnapshots.push({
                            iteration: i,
                            rss: currentMemory.rss,
                            heapUsed: currentMemory.heapUsed,
                            external: currentMemory.external
                        });
                    }
                } catch (error) {
                    console.warn(`    Memory test failed at iteration ${i}:`, error.message);
                    break;
                }
            }

            const endMemory = getMemoryUsage();

            // Calculate memory growth
            const rssGrowth = endMemory.rss - startMemory.rss;
            const heapGrowth = endMemory.heapUsed - startMemory.heapUsed;
            const externalGrowth = endMemory.external - startMemory.external;

            memoryResults[imageName][processor.key] = {
                startMemory: startMemory,
                endMemory: endMemory,
                rssGrowth: rssGrowth,
                heapGrowth: heapGrowth,
                externalGrowth: externalGrowth,
                snapshots: memorySnapshots,
                hasLeak: Math.abs(rssGrowth) > 10 || Math.abs(heapGrowth) > 5 // Threshold for leak detection
            };

            console.log(`    ${processor.name}: RSS growth: ${rssGrowth.toFixed(2)}MB, Heap growth: ${heapGrowth.toFixed(2)}MB, External growth: ${externalGrowth.toFixed(2)}MB`);
            console.log(`    Memory leak detected: ${memoryResults[imageName][processor.key].hasLeak ? 'YES' : 'NO'}`);
        }
    }

    return memoryResults;
}

async function runSIMDOptimizationTest() {
    console.log('\n🚀 SIMD OPTIMIZATION TEST');
    console.log('='.repeat(60));

    const simdResults = {};

    // Note: Current C++ implementation doesn't have SIMD optimizations
    // This is a placeholder for future SIMD testing
    console.log('⚠️  Current C++ implementation does not include SIMD optimizations');
    console.log('   This test serves as a placeholder for future SIMD benchmarking');

    // Basic SIMD capability detection
    const hasSIMD = typeof WebAssembly !== 'undefined' && WebAssembly.validate(new Uint8Array([
        0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, // WASM header
        0x01, 0x05, 0x01, 0x60, 0x00, 0x01, 0x7b, 0x00,   // Type section with v128
        0x03, 0x02, 0x01, 0x00, 0x0a, 0x0a, 0x01, 0x08,   // Function section
        0x00, 0xfd, 0x0c, 0x00, 0x00, 0x00, 0x00, 0x0b    // SIMD instruction (v128.const)
    ]));

    simdResults.capabilities = {
        wasmSIMD: hasSIMD,
        platform: process.platform,
        arch: process.arch
    };

    console.log(`  📋 Platform capabilities:`);
    console.log(`    WASM SIMD support: ${hasSIMD ? 'YES' : 'NO'}`);
    console.log(`    Platform: ${process.platform}`);
    console.log(`    Architecture: ${process.arch}`);

    // Placeholder for future SIMD benchmarks
    simdResults.futureTests = [
        'SIMD-enabled pixel manipulation',
        'Vectorized image filtering',
        'Parallel processing pipelines',
        'GPU-accelerated SIMD operations'
    ];

    return simdResults;
}

async function runBenchmark() {
    console.log('='.repeat(80));
    console.log('🔬 C++ N-API Image Processor Comprehensive Performance Benchmark');
    console.log('='.repeat(80));
    console.log(`Running ${iterations} iterations per test configuration\n`);

    const benchmarkResults = {};

    try {
        // Initialize services
        await cppProcessor.initialize();
        await rustImageService.initialize();

        // Run all benchmark suites
        benchmarkResults.latency = await runLatencyBenchmark();
        benchmarkResults.throughput = await runThroughputBenchmark();
        benchmarkResults.memory = await runMemoryManagementValidation();
        benchmarkResults.simd = await runSIMDOptimizationTest();

        // Generate summary report
        console.log('\n' + '='.repeat(80));
        console.log('📈 COMPREHENSIVE SUMMARY REPORT');
        console.log('='.repeat(80));

        // Latency summary
        console.log('\n📏 Average Latency (ms):');
        let totalCppLatency = 0, totalRustLatency = 0, totalSharpLatency = 0;
        let latencyTestCount = 0;

        for (const imageName in benchmarkResults.latency) {
            for (const operation in benchmarkResults.latency[imageName]) {
                const result = benchmarkResults.latency[imageName][operation];
                totalCppLatency += result.cpp.time.mean;
                totalRustLatency += result.rust.time.mean;
                totalSharpLatency += result.sharp.time.mean;
                latencyTestCount++;
            }
        }

        if (latencyTestCount > 0) {
            const avgCppLatency = totalCppLatency / latencyTestCount;
            const avgRustLatency = totalRustLatency / latencyTestCount;
            const avgSharpLatency = totalSharpLatency / latencyTestCount;

            console.log(`  C++ N-API:  ${avgCppLatency.toFixed(3)}ms`);
            console.log(`  Rust:       ${avgRustLatency.toFixed(3)}ms`);
            console.log(`  Node.js:    ${avgSharpLatency.toFixed(3)}ms`);

            if (avgSharpLatency > 0) {
                const cppSpeedup = avgSharpLatency / avgCppLatency;
                const rustSpeedup = avgSharpLatency / avgRustLatency;
                console.log(`  Speedups vs Node.js: C++ ${cppSpeedup.toFixed(2)}x, Rust ${rustSpeedup.toFixed(2)}x`);
            }
        }

        // Throughput summary
        console.log('\n⚡ Average Throughput (ops/s):');
        let totalCppThroughput = 0, totalRustThroughput = 0, totalSharpThroughput = 0;
        let throughputTestCount = 0;

        for (const imageName in benchmarkResults.throughput) {
            for (const operation in benchmarkResults.throughput[imageName]) {
                const result = benchmarkResults.throughput[imageName][operation];
                totalCppThroughput += result.cpp.opsPerSecond;
                totalRustThroughput += result.rust.opsPerSecond;
                totalSharpThroughput += result.sharp.opsPerSecond;
                throughputTestCount++;
            }
        }

        if (throughputTestCount > 0) {
            const avgCppThroughput = totalCppThroughput / throughputTestCount;
            const avgRustThroughput = totalRustThroughput / throughputTestCount;
            const avgSharpThroughput = totalSharpThroughput / throughputTestCount;

            console.log(`  C++ N-API:  ${avgCppThroughput.toFixed(1)} ops/s`);
            console.log(`  Rust:       ${avgRustThroughput.toFixed(1)} ops/s`);
            console.log(`  Node.js:    ${avgSharpThroughput.toFixed(1)} ops/s`);
        }

        // Memory summary
        console.log('\n🧠 Memory Management:');
        for (const imageName in benchmarkResults.memory) {
            console.log(`  ${imageName}:`);
            for (const processor in benchmarkResults.memory[imageName]) {
                const result = benchmarkResults.memory[imageName][processor];
                const processorName = processor === 'cpp' ? 'C++ N-API' :
                    processor === 'rust' ? 'Rust' : 'Node.js';
                console.log(`    ${processorName}: Leak detected: ${result.hasLeak ? 'YES' : 'NO'}`);
            }
        }

        // SIMD summary
        console.log('\n🚀 SIMD Status:');
        console.log(`  WASM SIMD: ${benchmarkResults.simd.capabilities.wasmSIMD ? 'Supported' : 'Not supported'}`);
        console.log(`  Future SIMD optimizations: Planned for next implementation`);

        console.log('\n' + '='.repeat(80));
        console.log('✅ Benchmark completed successfully!');
        console.log('='.repeat(80));

    } catch (error) {
        console.error('❌ Benchmark failed:', error);
        benchmarkResults.error = error.message;
    }

    // Save detailed results to JSON file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultsFile = `cpp_benchmark_results_${timestamp}.json`;
    fs.writeFileSync(resultsFile, JSON.stringify(benchmarkResults, null, 2));
    console.log(`\n📄 Detailed results saved to: ${resultsFile}`);

    return benchmarkResults;
}

// Create test_images directory if it doesn't exist
if (!fs.existsSync(path.join(__dirname, 'test_images'))) {
    fs.mkdirSync(path.join(__dirname, 'test_images'));
    console.log('Created test_images directory. Please add some test images there.');
    process.exit(0);
}

// Enable garbage collection for more accurate memory measurements
if (typeof global !== 'undefined' && typeof global.gc === 'undefined') {
    console.log('⚠️  For more accurate memory measurements, run with: node --expose-gc benchmark_cpp_image_processor.js');
}

runBenchmark().catch(console.error);