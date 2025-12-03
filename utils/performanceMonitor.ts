import { useEffect, useRef, useState } from 'react';
import { performanceOptimizer, usePerformanceOptimizer } from './performanceOptimizer';
import { imageProcessingWorker, processImageFallback } from './imageProcessingWorker';

interface PerformanceMetrics {
    memoryUsage: number;
    cpuUsage: number;
    fps: number;
    networkLatency: number;
    storageUsage: number;
    activeWorkers: number;
    cacheHits: number;
    cacheMisses: number;
    timestamp: number;
}

interface PerformanceMonitorOptions {
    interval?: number;
    memoryThreshold?: number;
    storageThreshold?: number;
    logPerformance?: boolean;
}

export class PerformanceMonitor {
    private static instance: PerformanceMonitor;
    private metricsHistory: PerformanceMetrics[] = [];
    private options: PerformanceMonitorOptions;
    private isMonitoring = false;
    private monitorInterval: NodeJS.Timeout | null = null;
    private cleanupFunctions: Set<() => void> = new Set();

    private constructor(options: PerformanceMonitorOptions = {}) {
        this.options = {
            interval: 5000,
            memoryThreshold: 200,
            storageThreshold: 80,
            logPerformance: true,
            ...options
        };
    }

    public static getInstance(options: PerformanceMonitorOptions = {}): PerformanceMonitor {
        if (!PerformanceMonitor.instance) {
            PerformanceMonitor.instance = new PerformanceMonitor(options);
        }
        return PerformanceMonitor.instance;
    }

    public startMonitoring(): void {
        if (this.isMonitoring) return;
        this.isMonitoring = true;

        // Start performance monitoring loop
        this.monitorInterval = setInterval(() => {
            this.collectMetrics();
        }, this.options.interval || 5000);

        this.cleanupFunctions.add(() => {
            if (this.monitorInterval) {
                clearInterval(this.monitorInterval);
                this.monitorInterval = null;
            }
        });

        // Start memory monitoring
        performanceOptimizer.startMemoryMonitoring();

        // Initial metrics collection
        this.collectMetrics();
    }

    public stopMonitoring(): void {
        this.isMonitoring = false;
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }

        this.cleanupFunctions.forEach(cleanup => cleanup());
        this.cleanupFunctions.clear();
    }

    private async collectMetrics(): Promise<void> {
        const metrics: PerformanceMetrics = {
            memoryUsage: 0,
            cpuUsage: 0,
            fps: 0,
            networkLatency: 0,
            storageUsage: 0,
            activeWorkers: 0,
            cacheHits: 0,
            cacheMisses: 0,
            timestamp: Date.now()
        };

        try {
            // Memory usage (Chrome only)
            if ((window as any).performance && (window as any).performance.memory) {
                const memory = (window as any).performance.memory;
                metrics.memoryUsage = memory.usedJSHeapSize / (1024 * 1024); // MB

                // Trigger cleanup if memory is high
                if (metrics.memoryUsage > (this.options.memoryThreshold || 200)) {
                    performanceOptimizer.triggerGarbageCollection();
                }
            }

            // Storage usage
            try {
                const storage = await performanceOptimizer.checkStorageQuota();
                metrics.storageUsage = storage.percentage;

                // Trigger storage cleanup if usage is high
                if (metrics.storageUsage > (this.options.storageThreshold || 80)) {
                    await performanceOptimizer.cleanupStorage();
                }
            } catch (storageError) {
                console.warn('Storage monitoring failed:', storageError);
            }

            // Active workers
            metrics.activeWorkers = imageProcessingWorker ? 1 : 0;

            // Cache statistics (would need to be tracked)
            metrics.cacheHits = 0; // Placeholder
            metrics.cacheMisses = 0; // Placeholder

            // Add to history
            this.metricsHistory.push(metrics);
            if (this.metricsHistory.length > 100) {
                this.metricsHistory.shift();
            }

            if (this.options.logPerformance) {
                this.logPerformanceMetrics(metrics);
            }

        } catch (error) {
            console.error('Error collecting performance metrics:', error);
        }
    }

    private logPerformanceMetrics(metrics: PerformanceMetrics): void {
        console.groupCollapsed(`📊 Performance Metrics @ ${new Date(metrics.timestamp).toLocaleTimeString()}`);
        console.log(`🧠 Memory: ${metrics.memoryUsage.toFixed(2)} MB`);
        console.log(`💾 Storage: ${metrics.storageUsage.toFixed(1)}% used`);
        console.log(`👷 Workers: ${metrics.activeWorkers} active`);
        console.log(`🔄 Cache: ${metrics.cacheHits} hits, ${metrics.cacheMisses} misses`);
        console.groupEnd();
    }

    public getMetricsHistory(): PerformanceMetrics[] {
        return [...this.metricsHistory];
    }

    public getCurrentMetrics(): PerformanceMetrics | null {
        return this.metricsHistory.length > 0
            ? { ...this.metricsHistory[this.metricsHistory.length - 1] }
            : null;
    }

    public cleanup(): void {
        this.stopMonitoring();
        performanceOptimizer.cleanupAll();
        imageProcessingWorker.terminate();
    }
}

// React Hook for Performance Monitoring
export function usePerformanceMonitor(options: PerformanceMonitorOptions = {}) {
    const monitorRef = useRef<PerformanceMonitor | null>(null);
    const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);

    useEffect(() => {
        monitorRef.current = PerformanceMonitor.getInstance(options);
        monitorRef.current.startMonitoring();

        // Set up metrics update
        const updateMetrics = () => {
            const currentMetrics = monitorRef.current?.getCurrentMetrics();
            setMetrics(currentMetrics || null);
        };

        const intervalId = setInterval(updateMetrics, options.interval || 5000);
        updateMetrics(); // Initial update

        return () => {
            clearInterval(intervalId);
            monitorRef.current?.stopMonitoring();
        };
    }, [options]);

    return {
        metrics,
        monitor: monitorRef.current
    };
}

// Performance Optimization Hook
export function usePerformanceOptimizations() {
    const { cachedRequest } = usePerformanceOptimizer();
    const { metrics } = usePerformanceMonitor();

    // Optimized image processing with fallback
    const processImageOptimized = async (
        imageData: string,
        operation: 'resize' | 'watermark' | 'compress',
        options: any = {}
    ): Promise<string> => {
        try {
            // Try Web Worker first
            switch (operation) {
                case 'resize':
                    return await imageProcessingWorker.resizeImage(
                        imageData,
                        options.width || 1920,
                        options.height || 1080,
                        options.quality || 0.8
                    );
                case 'watermark':
                    return await imageProcessingWorker.applyWatermark(
                        imageData,
                        options.text || '',
                        options.watermarkOptions || {}
                    );
                case 'compress':
                    return await imageProcessingWorker.compressImage(
                        imageData,
                        options.quality || 0.7
                    );
                default:
                    throw new Error('Unsupported operation');
            }
        } catch (workerError) {
            console.warn('Web Worker processing failed, falling back:', workerError);

            // Fallback to main thread processing
            return processImageFallback(imageData, operation, options);
        }
    };

    return {
        cachedRequest,
        processImage: processImageOptimized,
        metrics,
        performanceOptimizer,
        imageProcessingWorker
    };
}

// Performance Context Provider
export function createPerformanceContext() {
    const monitor = PerformanceMonitor.getInstance();
    const optimizer = performanceOptimizer;

    return {
        monitor,
        optimizer,
        start: () => monitor.startMonitoring(),
        stop: () => monitor.stopMonitoring(),
        getMetrics: () => monitor.getCurrentMetrics(),
        cleanup: () => monitor.cleanup()
    };
}

// Export singleton instances
export const performanceMonitor = PerformanceMonitor.getInstance();