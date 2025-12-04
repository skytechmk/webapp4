import { mobilePerformanceService } from '../services/mobilePerformanceService';

/**
 * Mobile Performance Test Utilities
 */
export class MobilePerformanceTest {
    private static instance: MobilePerformanceTest;
    private testResults: Record<string, any> = {};
    private startTimes: Record<string, number> = {};

    private constructor() {
        this.testResults = {};
        this.startTimes = {};
    }

    public static getInstance(): MobilePerformanceTest {
        if (!MobilePerformanceTest.instance) {
            MobilePerformanceTest.instance = new MobilePerformanceTest();
        }
        return MobilePerformanceTest.instance;
    }

    /**
     * Start a performance test
     */
    public startTest(testName: string): void {
        this.startTimes[testName] = performance.now();
    }

    /**
     * End a performance test
     */
    public endTest(testName: string): number {
        const endTime = performance.now();
        const startTime = this.startTimes[testName] || endTime;
        const duration = endTime - startTime;

        this.testResults[testName] = {
            duration,
            timestamp: new Date().toISOString()
        };

        return duration;
    }

    /**
     * Test mobile performance profile
     */
    public testPerformanceProfile(): Record<string, any> {
        const profile = mobilePerformanceService.getPerformanceProfile();
        return {
            isMobile: profile.isMobile,
            isIOS: profile.isIOS,
            isAndroid: profile.isAndroid,
            isSlowNetwork: profile.isSlowNetwork,
            memoryStatus: profile.memoryStatus,
            batteryStatus: profile.batteryStatus
        };
    }

    /**
     * Test image loading performance
     */
    public async testImageLoading(src: string, priority: 'high' | 'medium' | 'low' = 'medium'): Promise<{
        loadTime: number;
        strategy: any;
        success: boolean;
        error?: string;
    }> {
        const strategy = mobilePerformanceService.getImageLoadingStrategy();
        const startTime = performance.now();

        try {
            const img = new Image();
            await mobilePerformanceService.optimizeResourceLoading(img, src, {
                priority,
                type: 'image'
            });

            const loadTime = performance.now() - startTime;
            return {
                loadTime,
                strategy,
                success: true
            };
        } catch (error) {
            const loadTime = performance.now() - startTime;
            return {
                loadTime,
                strategy,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Test video loading performance
     */
    public async testVideoLoading(src: string, priority: 'high' | 'medium' | 'low' = 'medium'): Promise<{
        loadTime: number;
        strategy: any;
        success: boolean;
        error?: string;
    }> {
        const strategy = mobilePerformanceService.getVideoStrategy();
        const startTime = performance.now();

        try {
            const video = document.createElement('video');
            await mobilePerformanceService.optimizeResourceLoading(video, src, {
                priority,
                type: 'video'
            });

            const loadTime = performance.now() - startTime;
            return {
                loadTime,
                strategy,
                success: true
            };
        } catch (error) {
            const loadTime = performance.now() - startTime;
            return {
                loadTime,
                strategy,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Test touch event performance
     */
    public testTouchPerformance(callback: () => void, iterations = 10): Promise<{
        averageTime: number;
        minTime: number;
        maxTime: number;
        success: boolean;
    }> {
        return new Promise((resolve) => {
            const times: number[] = [];
            let completed = 0;

            const testCallback = () => {
                const start = performance.now();
                callback();
                const end = performance.now();
                times.push(end - start);

                completed++;
                if (completed >= iterations) {
                    const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
                    const minTime = Math.min(...times);
                    const maxTime = Math.max(...times);

                    resolve({
                        averageTime,
                        minTime,
                        maxTime,
                        success: true
                    });
                }
            };

            // Create touch handler
            const cleanup = mobilePerformanceService.createTouchHandler(testCallback, 50, 'test-handler');

            // Simulate touch events
            for (let i = 0; i < iterations; i++) {
                const touchEvent = new TouchEvent('touchstart', {
                    touches: [new Touch({ identifier: 1, target: document, clientX: 100, clientY: 100 })]
                });
                window.dispatchEvent(touchEvent);
            }

            // Cleanup
            cleanup();
        });
    }

    /**
     * Test network performance
     */
    public async testNetworkPerformance(url: string): Promise<{
        downloadSpeed: number;
        latency: number;
        success: boolean;
        error?: string;
    }> {
        const startTime = performance.now();

        try {
            const response = await fetch(url);
            const data = await response.blob();
            const endTime = performance.now();

            const fileSize = data.size; // in bytes
            const duration = endTime - startTime; // in milliseconds
            const downloadSpeed = (fileSize / (duration / 1000)) / 1024; // in KB/s

            return {
                downloadSpeed,
                latency: duration,
                success: true
            };
        } catch (error) {
            return {
                downloadSpeed: 0,
                latency: performance.now() - startTime,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Get all test results
     */
    public getTestResults(): Record<string, any> {
        return this.testResults;
    }

    /**
     * Clear all test results
     */
    public clearTestResults(): void {
        this.testResults = {};
        this.startTimes = {};
    }

    /**
     * Generate performance report
     */
    public generatePerformanceReport(): string {
        const report: string[] = [];
        const results = this.getTestResults();

        report.push('=== Mobile Performance Test Report ===');
        report.push(`Generated: ${new Date().toISOString()}`);
        report.push('');

        // Add performance profile
        const profile = this.testPerformanceProfile();
        report.push('Performance Profile:');
        report.push(`- Mobile: ${profile.isMobile}`);
        report.push(`- iOS: ${profile.isIOS}`);
        report.push(`- Android: ${profile.isAndroid}`);
        report.push(`- Slow Network: ${profile.isSlowNetwork}`);
        report.push(`- Memory Status: ${profile.memoryStatus}`);
        report.push(`- Battery Status: ${profile.batteryStatus}`);
        report.push('');

        // Add test results
        report.push('Test Results:');
        for (const [testName, result] of Object.entries(results)) {
            report.push(`- ${testName}: ${result.duration.toFixed(2)}ms`);
        }

        return report.join('\n');
    }

    /**
     * Log performance report to console
     */
    public logPerformanceReport(): void {
        console.log(this.generatePerformanceReport());
    }
}

// Export singleton instance
export const mobilePerformanceTest = MobilePerformanceTest.getInstance();