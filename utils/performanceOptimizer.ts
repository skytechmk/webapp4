import { useEffect, useRef, useCallback } from 'react';

// Request Cache Interface
interface RequestCache {
    [key: string]: {
        promise: Promise<any>;
        timestamp: number;
        data: any;
    };
}

// Memory Monitor Interface
interface MemoryMonitor {
    checkInterval: number;
    cleanupThreshold: number;
    lastCheck: number;
    memoryUsage: number[];
}

// Performance Optimizer Class
class PerformanceOptimizer {
    private static instance: PerformanceOptimizer;
    private requestCache: RequestCache;
    private memoryMonitor: MemoryMonitor;
    private eventListeners: Map<string, Set<Function>>;
    private workerPool: Map<string, Worker>;
    private cleanupFunctions: Set<() => void>;

    private constructor() {
        this.requestCache = {};
        this.memoryMonitor = {
            checkInterval: 5000, // 5 seconds
            cleanupThreshold: 100, // MB
            lastCheck: Date.now(),
            memoryUsage: []
        };
        this.eventListeners = new Map();
        this.workerPool = new Map();
        this.cleanupFunctions = new Set();
    }

    public static getInstance(): PerformanceOptimizer {
        if (!PerformanceOptimizer.instance) {
            PerformanceOptimizer.instance = new PerformanceOptimizer();
        }
        return PerformanceOptimizer.instance;
    }

    // Request Deduplication and Caching
    public async cachedRequest<T>(key: string, requestFn: () => Promise<T>, ttl: number = 300000): Promise<T> {
        const now = Date.now();

        // Check if we have a cached request that's still valid
        if (this.requestCache[key] && this.requestCache[key].data !== null && (now - this.requestCache[key].timestamp) < ttl) {
            return this.requestCache[key].data;
        }

        // If there's an in-flight request, return its promise
        if (this.requestCache[key] && this.requestCache[key].promise) {
            return this.requestCache[key].promise;
        }

        // Create new request
        const promise = requestFn()
            .then(data => {
                this.requestCache[key] = {
                    promise: null,
                    timestamp: Date.now(),
                    data
                };
                return data;
            })
            .catch(error => {
                // Remove failed requests from cache
                delete this.requestCache[key];
                throw error;
            });

        this.requestCache[key] = {
            promise: promise,
            timestamp: now,
            data: null
        };

        return promise;
    }

    // Clear expired cache entries
    public clearExpiredCache(ttl: number = 300000): void {
        const now = Date.now();
        Object.keys(this.requestCache).forEach(key => {
            if (this.requestCache[key] && (now - this.requestCache[key].timestamp) > ttl) {
                delete this.requestCache[key];
            }
        });
    }

    // Memory Monitoring
    public startMemoryMonitoring(): void {
        if (typeof window !== 'undefined') {
            this.memoryMonitor.lastCheck = Date.now();

            const checkMemory = () => {
                const now = Date.now();
                if (now - this.memoryMonitor.lastCheck < this.memoryMonitor.checkInterval) {
                    return;
                }

                this.memoryMonitor.lastCheck = now;

                // Use performance.memory if available (non-standard, Chrome-only)
                if ((window as any).performance && (window as any).performance.memory) {
                    const memory = (window as any).performance.memory;
                    const usedMB = memory.usedJSHeapSize / (1024 * 1024);

                    this.memoryMonitor.memoryUsage.push(usedMB);
                    if (this.memoryMonitor.memoryUsage.length > 10) {
                        this.memoryMonitor.memoryUsage.shift();
                    }

                    // Trigger cleanup if memory usage is high
                    if (usedMB > this.memoryMonitor.cleanupThreshold) {
                        this.triggerGarbageCollection();
                    }
                }
            };

            // Check memory periodically
            const intervalId = setInterval(checkMemory, this.memoryMonitor.checkInterval);
            this.cleanupFunctions.add(() => clearInterval(intervalId));
        }
    }

    // Trigger garbage collection (browser hint)
    public triggerGarbageCollection(): void {
        if (typeof window !== 'undefined') {
            // This is a hint to the browser to run garbage collection
            if (window.gc) {
                window.gc();
            }

            // Force cleanup of object URLs to prevent memory leaks
            this.cleanupObjectURLs();

            // Clear expired cache
            this.clearExpiredCache();
        }
    }

    // Cleanup object URLs to prevent memory leaks
    public cleanupObjectURLs(): void {
        // This would be called when navigating away or when memory is high
        // In practice, this should be handled in component cleanup
        console.log('Cleaning up object URLs...');
    }

    // Event Listener Management
    public addEventListener(event: string, callback: Function): void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set());
        }
        this.eventListeners.get(event)?.add(callback);
    }

    public removeEventListener(event: string, callback: Function): void {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event)?.delete(callback);
            if (this.eventListeners.get(event)?.size === 0) {
                this.eventListeners.delete(event);
            }
        }
    }

    public dispatchEvent(event: string, ...args: any[]): void {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event)?.forEach(callback => {
                try {
                    callback(...args);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }

    // Web Worker Management
    public getWorker(workerName: string, workerUrl: string): Worker {
        if (!this.workerPool.has(workerName)) {
            const worker = new Worker(workerUrl);
            this.workerPool.set(workerName, worker);
            return worker;
        }
        const worker = this.workerPool.get(workerName);
        if (!worker) {
            throw new Error(`Worker ${workerName} not found`);
        }
        return worker;
    }

    public terminateWorker(workerName: string): void {
        if (this.workerPool.has(workerName)) {
            const worker = this.workerPool.get(workerName);
            if (worker) {
                worker.terminate();
                this.workerPool.delete(workerName);
            }
        }
    }

    public terminateAllWorkers(): void {
        this.workerPool.forEach(worker => worker.terminate());
        this.workerPool.clear();
    }

    // Storage Quota Management
    public checkStorageQuota(): Promise<{ quota: number; usage: number; percentage: number }> {
        return new Promise((resolve, reject) => {
            if (typeof navigator === 'undefined' || !navigator.storage) {
                reject(new Error('Storage API not available'));
                return;
            }

            navigator.storage.estimate().then(estimate => {
                const quotaMB = estimate.quota ? estimate.quota / (1024 * 1024) : 0;
                const usageMB = estimate.usage ? estimate.usage / (1024 * 1024) : 0;
                const percentage = quotaMB > 0 ? (usageMB / quotaMB) * 100 : 0;

                resolve({
                    quota: quotaMB,
                    usage: usageMB,
                    percentage: Math.round(percentage)
                });
            }).catch(reject);
        });
    }

    public async cleanupStorage(threshold: number = 80): Promise<void> {
        try {
            const { percentage } = await this.checkStorageQuota();

            if (percentage > threshold) {
                // Implement storage cleanup logic
                console.log(`Storage usage at ${percentage}%, triggering cleanup...`);

                // Clear old caches
                if ('caches' in window) {
                    const cacheNames = await caches.keys();
                    for (const cacheName of cacheNames) {
                        if (cacheName.includes('old-') || cacheName.includes('deprecated-')) {
                            await caches.delete(cacheName);
                        }
                    }
                }

                // Clear old localStorage items
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && (key.startsWith('old-') || key.includes('temp-'))) {
                        localStorage.removeItem(key);
                    }
                }
            }
        } catch (error) {
            console.error('Storage cleanup failed:', error);
        }
    }

    // Cleanup all resources
    public cleanupAll(): void {
        this.terminateAllWorkers();
        this.cleanupFunctions.forEach(cleanup => cleanup());
        this.cleanupFunctions.clear();
        this.eventListeners.clear();
        this.requestCache = {};
    }
}

// React Hook for Performance Optimization
export function usePerformanceOptimizer() {
    const optimizerRef = useRef<PerformanceOptimizer | null>(null);

    useEffect(() => {
        optimizerRef.current = PerformanceOptimizer.getInstance();
        optimizerRef.current.startMemoryMonitoring();

        return () => {
            optimizerRef.current?.cleanupAll();
        };
    }, []);

    const cachedRequest = useCallback(
        <T>(key: string, requestFn: () => Promise<T>, ttl?: number): Promise<T> => {
            if (!optimizerRef.current) {
                return requestFn();
            }
            return optimizerRef.current.cachedRequest(key, requestFn, ttl);
        },
        []
    );

    const getWorker = useCallback(
        (workerName: string, workerUrl: string): Worker => {
            if (!optimizerRef.current) {
                throw new Error('Performance optimizer not initialized');
            }
            return optimizerRef.current.getWorker(workerName, workerUrl);
        },
        []
    );

    const checkStorageQuota = useCallback(
        (): Promise<{ quota: number; usage: number; percentage: number }> => {
            if (!optimizerRef.current) {
                return Promise.reject(new Error('Performance optimizer not initialized'));
            }
            return optimizerRef.current.checkStorageQuota();
        },
        []
    );

    return {
        cachedRequest,
        getWorker,
        checkStorageQuota,
        optimizer: optimizerRef.current
    };
}

// Web Worker for Image Processing
const imageProcessingWorkerCode = `
  self.onmessage = async function(e) {
    const { imageData, operation, options } = e.data;

    try {
      let result;

      switch (operation) {
        case 'resize':
          result = await resizeImage(imageData, options);
          break;
        case 'watermark':
          result = await applyWatermark(imageData, options);
          break;
        case 'compress':
          result = await compressImage(imageData, options);
          break;
        default:
          throw new Error('Unknown operation');
      }

      self.postMessage({ success: true, result });
    } catch (error) {
      self.postMessage({ success: false, error: error.message });
    }
  };

  async function resizeImage(imageData, options) {
    // Implement image resizing logic
    return imageData; // Placeholder
  }

  async function applyWatermark(imageData, options) {
    // Implement watermark logic
    return imageData; // Placeholder
  }

  async function compressImage(imageData, options) {
    // Implement compression logic
    return imageData; // Placeholder
  }
`;

// Export the optimizer instance
export const performanceOptimizer = PerformanceOptimizer.getInstance();