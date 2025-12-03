import { useEffect, useMemo } from 'react';
import { performanceOptimizer } from './performanceOptimizer';
import { imageProcessingWorker } from './imageProcessingWorker';
import { performanceMonitor } from './performanceMonitor';
import { errorHandler, eventEmitter } from './optimizedStateManager';

// Performance Integration Context
export function createPerformanceIntegration() {
    // Initialize all performance systems
    const optimizer = performanceOptimizer;
    const monitor = performanceMonitor;
    const errorHandlerInstance = errorHandler;
    const emitter = eventEmitter;

    // Start all monitoring systems
    monitor.startMonitoring();
    optimizer.startMemoryMonitoring();

    return {
        optimizer,
        monitor,
        errorHandler: errorHandlerInstance,
        eventEmitter: emitter,
        imageProcessingWorker,
        cleanup: () => {
            monitor.stopMonitoring();
            optimizer.cleanupAll();
            imageProcessingWorker.terminate();
        }
    };
}

// React Hook for comprehensive performance integration
export function usePerformanceIntegration() {
    // Memoized performance utilities
    const performanceUtils = useMemo(() => ({
        // Optimized image processing
        processImageWithFallback: async (imageData: string, operation: 'resize' | 'watermark' | 'compress', options: any = {}) => {
            try {
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
            } catch (error) {
                errorHandler.handleError(error, 'image_processing');
                return imageData; // Fallback
            }
        },

        // Optimized API requests with caching
        fetchWithCache: async <T>(key: string, requestFn: () => Promise<T>, ttl: number = 300000) => {
            try {
                return await performanceOptimizer.cachedRequest(key, requestFn, ttl);
            } catch (error) {
                errorHandler.handleError(error, 'api_request');
                throw error;
            }
        },

        // Memory-efficient event handling
        emitEvent: (event: string, ...args: any[]) => {
            try {
                eventEmitter.emit(event, ...args);
            } catch (error) {
                errorHandler.handleError(error, 'event_emitter');
            }
        },

        // Performance monitoring
        getPerformanceMetrics: () => performanceMonitor.getCurrentMetrics()
    }), []);

    return {
        ...performanceUtils,
        metrics: performanceMonitor.getCurrentMetrics(),
        errorHandler: {
            handleError: errorHandler.handleError,
            addErrorListener: errorHandler.addErrorListener,
            getErrorHistory: errorHandler.getErrorHistory,
            clearErrorHistory: errorHandler.clearErrorHistory
        },
        eventEmitter,
        performanceMonitor,
        imageProcessingWorker
    };
}

// Performance optimization utilities
export const PerformanceUtils = {
    // Debounce function for performance optimization
    debounce: <T extends (...args: any[]) => any>(func: T, wait: number) => {
        let timeout: NodeJS.Timeout | null = null;
        return (...args: Parameters<T>): void => {
            if (timeout) {
                clearTimeout(timeout);
            }
            timeout = setTimeout(() => func(...args), wait);
        };
    },

    // Throttle function for performance optimization
    throttle: <T extends (...args: any[]) => any>(func: T, limit: number) => {
        let lastFunc: NodeJS.Timeout | null = null;
        let lastRan = 0;
        return (...args: Parameters<T>): void => {
            if (!lastFunc) {
                func(...args);
                lastRan = Date.now();
            } else {
                if (lastFunc) {
                    clearTimeout(lastFunc);
                }
                lastFunc = setTimeout(() => {
                    if (Date.now() - lastRan >= limit) {
                        func(...args);
                        lastRan = Date.now();
                    }
                }, limit - (Date.now() - lastRan));
            }
        };
    },

    // Memoize function results
    memoize: <T extends (...args: any[]) => any>(func: T) => {
        const cache = new Map<string, ReturnType<T>>();
        return (...args: Parameters<T>): ReturnType<T> => {
            const key = JSON.stringify(args);
            if (cache.has(key)) {
                return cache.get(key)!;
            }
            const result = func(...args);
            cache.set(key, result);
            return result;
        };
    },

    // Batch operations for performance
    batchOperations: <T>(operations: T[], batchSize: number = 10, processFn: (item: T) => Promise<void>) => {
        return async () => {
            for (let i = 0; i < operations.length; i += batchSize) {
                const batch = operations.slice(i, i + batchSize);
                await Promise.all(batch.map(processFn));
            }
        };
    }
};

// Export all performance utilities
export {
    performanceOptimizer,
    imageProcessingWorker,
    performanceMonitor,
    errorHandler,
    eventEmitter
};