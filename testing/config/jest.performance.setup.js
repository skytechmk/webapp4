/**
 * Performance Test Setup
 * Performance benchmarking configuration
 */

// Performance test utilities
global.startPerformanceTimer = () => {
    return process.hrtime();
};

global.endPerformanceTimer = (startTime) => {
    const diff = process.hrtime(startTime);
    return (diff[0] * 1e9 + diff[1]) / 1e6; // Convert to milliseconds
};

global.measureFunctionPerformance = (fn, iterations = 1000) => {
    const startTime = process.hrtime();
    for (let i = 0; i < iterations; i++) {
        fn();
    }
    const endTime = process.hrtime(startTime);
    const totalTime = (endTime[0] * 1e9 + endTime[1]) / 1e6;
    return {
        totalTime,
        averageTime: totalTime / iterations,
        iterations,
        opsPerSecond: (iterations / totalTime) * 1000
    };
};

// Memory measurement utilities
global.getMemoryUsage = () => {
    return process.memoryUsage();
};

// Performance thresholds
global.PERFORMANCE_THRESHOLDS = {
    CRITICAL: 100, // ms - Critical operations should be under 100ms
    HIGH: 500,     // ms - High priority operations should be under 500ms
    MEDIUM: 1000,  // ms - Medium priority operations should be under 1000ms
    LOW: 2000      // ms - Low priority operations should be under 2000ms
};

// Performance test assertions
global.assertPerformance = (actualTime, thresholdType, operationName) => {
    const threshold = global.PERFORMANCE_THRESHOLDS[thresholdType];
    if (actualTime > threshold) {
        throw new Error(`Performance threshold exceeded for ${operationName}: ${actualTime}ms > ${threshold}ms`);
    }
    console.log(`✅ Performance test passed: ${operationName} completed in ${actualTime}ms (threshold: ${threshold}ms)`);
};