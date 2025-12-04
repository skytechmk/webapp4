import { getMobilePerformanceProfile, createOptimizedTouchHandler } from '../utils/mobilePerformance';

/**
 * Mobile Performance Service
 * Handles mobile-specific optimizations and network handling
 */
class MobilePerformanceService {
    private static instance: MobilePerformanceService;
    private performanceProfile: ReturnType<typeof getMobilePerformanceProfile>;
    private networkListeners: Set<() => void> = new Set();
    private touchHandlers: Map<string, (e: TouchEvent) => void> = new Map();

    private constructor() {
        this.performanceProfile = getMobilePerformanceProfile();
        this.setupNetworkMonitoring();
        this.setupWindowListeners();
    }

    public static getInstance(): MobilePerformanceService {
        if (!MobilePerformanceService.instance) {
            MobilePerformanceService.instance = new MobilePerformanceService();
        }
        return MobilePerformanceService.instance;
    }

    /**
     * Setup network monitoring for mobile devices
     */
    private setupNetworkMonitoring(): void {
        if (typeof window === 'undefined' || typeof navigator === 'undefined') return;

        const updateNetworkStatus = () => {
            this.performanceProfile = getMobilePerformanceProfile();
            this.networkListeners.forEach(listener => listener());
        };

        // Initial update
        updateNetworkStatus();

        // Listen for network changes
        if ('connection' in navigator) {
            (navigator as any).connection.addEventListener('change', updateNetworkStatus);
        }

        // Listen for online/offline events
        window.addEventListener('online', updateNetworkStatus);
        window.addEventListener('offline', updateNetworkStatus);
    }

    /**
     * Setup window event listeners
     */
    private setupWindowListeners(): void {
        if (typeof window === 'undefined') return;

        const handleResize = () => {
            this.performanceProfile = getMobilePerformanceProfile();
        };

        window.addEventListener('resize', handleResize);
    }

    /**
     * Get current performance profile
     */
    public getPerformanceProfile(): ReturnType<typeof getMobilePerformanceProfile> {
        return this.performanceProfile;
    }

    /**
     * Check if device is mobile
     */
    public isMobile(): boolean {
        return this.performanceProfile.isMobile;
    }

    /**
     * Check if network is slow
     */
    public isSlowNetwork(): boolean {
        return this.performanceProfile.isSlowNetwork;
    }

    /**
     * Check if device has low memory
     */
    public isLowMemory(): boolean {
        return this.performanceProfile.memoryStatus === 'low';
    }

    /**
     * Check if device has low battery
     */
    public isLowBattery(): boolean {
        return this.performanceProfile.batteryStatus === 'low';
    }

    /**
     * Add network status change listener
     */
    public addNetworkListener(listener: () => void): void {
        this.networkListeners.add(listener);
    }

    /**
     * Remove network status change listener
     */
    public removeNetworkListener(listener: () => void): void {
        this.networkListeners.delete(listener);
    }

    /**
     * Create optimized touch handler with debouncing
     */
    public createTouchHandler(callback: (e: TouchEvent) => void, debounceTime = 100, handlerId: string): () => void {
        // Remove existing handler if it exists
        if (this.touchHandlers.has(handlerId)) {
            const existingHandler = this.touchHandlers.get(handlerId);
            if (existingHandler) {
                window.removeEventListener('touchstart', existingHandler);
                window.removeEventListener('touchmove', existingHandler);
                window.removeEventListener('touchend', existingHandler);
            }
        }

        // Create new optimized handler
        const optimizedHandler = createOptimizedTouchHandler(callback, debounceTime);

        // Store the handler
        this.touchHandlers.set(handlerId, optimizedHandler);

        // Add event listeners
        window.addEventListener('touchstart', optimizedHandler);
        window.addEventListener('touchmove', optimizedHandler);
        window.addEventListener('touchend', optimizedHandler);

        // Return cleanup function
        return () => {
            window.removeEventListener('touchstart', optimizedHandler);
            window.removeEventListener('touchmove', optimizedHandler);
            window.removeEventListener('touchend', optimizedHandler);
            this.touchHandlers.delete(handlerId);
        };
    }

    /**
     * Get optimized image loading strategy
     */
    public getImageLoadingStrategy(): {
        loading: 'eager' | 'lazy';
        fetchPriority: 'high' | 'medium' | 'low';
        useWebP: boolean;
        quality: 'high' | 'medium' | 'low';
        usePlaceholder: boolean;
    } {
        const isMobile = this.isMobile();
        const isSlowNetwork = this.isSlowNetwork();

        if (!isMobile) {
            return {
                loading: 'eager',
                fetchPriority: 'high',
                useWebP: true,
                quality: 'high',
                usePlaceholder: false
            };
        }

        if (isSlowNetwork) {
            return {
                loading: 'lazy',
                fetchPriority: 'low',
                useWebP: true,
                quality: 'medium',
                usePlaceholder: true
            };
        }

        return {
            loading: 'lazy',
            fetchPriority: 'medium',
            useWebP: true,
            quality: 'high',
            usePlaceholder: false
        };
    }

    /**
     * Get optimized video strategy
     */
    public getVideoStrategy(): {
        autoPlay: boolean;
        preload: 'auto' | 'metadata' | 'none';
        useIntersectionObserver: boolean;
        maxResolution: '480p' | '720p' | '1080p' | '4k';
        useLowBitrate: boolean;
    } {
        const isMobile = this.isMobile();
        const isSlowNetwork = this.isSlowNetwork();

        if (!isMobile) {
            return {
                autoPlay: true,
                preload: 'auto',
                useIntersectionObserver: true,
                maxResolution: '1080p',
                useLowBitrate: false
            };
        }

        if (isSlowNetwork) {
            return {
                autoPlay: false,
                preload: 'metadata',
                useIntersectionObserver: false,
                maxResolution: '480p',
                useLowBitrate: true
            };
        }

        return {
            autoPlay: false,
            preload: 'metadata',
            useIntersectionObserver: true,
            maxResolution: '720p',
            useLowBitrate: false
        };
    }

    /**
     * Get optimized animation settings
     */
    public getAnimationSettings(): {
        useCSSAnimations: boolean;
        useJavascriptAnimations: boolean;
        animationDuration: 'fast' | 'normal' | 'slow';
        useTransforms: boolean;
    } {
        const isMobile = this.isMobile();
        const isLowMemory = this.isLowMemory();

        if (!isMobile) {
            return {
                useCSSAnimations: true,
                useJavascriptAnimations: true,
                animationDuration: 'normal',
                useTransforms: true
            };
        }

        if (isLowMemory) {
            return {
                useCSSAnimations: true,
                useJavascriptAnimations: false,
                animationDuration: 'fast',
                useTransforms: true
            };
        }

        return {
            useCSSAnimations: true,
            useJavascriptAnimations: true,
            animationDuration: 'normal',
            useTransforms: true
        };
    }

    /**
     * Optimize resource loading based on network conditions
     */
    public optimizeResourceLoading<T extends HTMLImageElement | HTMLVideoElement>(
        element: T,
        src: string,
        options?: {
            priority?: 'high' | 'medium' | 'low';
            type?: 'image' | 'video';
        }
    ): Promise<T> {
        return new Promise((resolve, reject) => {
            const isMobile = this.isMobile();
            const isSlowNetwork = this.isSlowNetwork();
            const priority = options?.priority || 'medium';

            if (element instanceof HTMLImageElement) {
                // Image optimization
                if (isMobile && isSlowNetwork && priority !== 'high') {
                    element.loading = 'lazy';
                } else {
                    element.loading = 'eager';
                }

                element.src = src;
                element.onerror = () => reject(new Error('Failed to load image'));
                element.onload = () => resolve(element);

                // Use intersection observer for lazy loading on mobile
                if (isMobile && priority !== 'high') {
                    const observer = new IntersectionObserver((entries) => {
                        if (entries[0].isIntersecting) {
                            element.decode().then(() => resolve(element)).catch(reject);
                            observer.disconnect();
                        }
                    }, { threshold: 0.1 });

                    observer.observe(element);
                } else {
                    element.decode().then(() => resolve(element)).catch(reject);
                }
            } else if (element instanceof HTMLVideoElement) {
                // Video optimization
                if (isMobile && isSlowNetwork) {
                    element.preload = 'metadata';
                    element.autoplay = false;
                } else {
                    element.preload = 'auto';
                    element.autoplay = options?.type === 'video' && priority === 'high';
                }

                element.src = src;
                element.muted = true;
                element.playsInline = true;

                element.onerror = () => reject(new Error('Failed to load video'));
                element.onloadedmetadata = () => resolve(element);
                element.oncanplay = () => resolve(element);
            } else {
                reject(new Error('Unsupported element type'));
            }
        });
    }

    /**
     * Get mobile-optimized touch settings
     */
    public getTouchSettings(): {
        touchAction: 'auto' | 'none' | 'pan-x' | 'pan-y';
        passive: boolean;
        capture: boolean;
    } {
        const isMobile = this.isMobile();

        if (!isMobile) {
            return {
                touchAction: 'auto',
                passive: true,
                capture: false
            };
        }

        return {
            touchAction: 'pan-y',
            passive: true,
            capture: true
        };
    }

    /**
     * Cleanup all event listeners
     */
    public cleanup(): void {
        this.networkListeners.clear();
        this.touchHandlers.forEach((handler, id) => {
            window.removeEventListener('touchstart', handler);
            window.removeEventListener('touchmove', handler);
            window.removeEventListener('touchend', handler);
        });
        this.touchHandlers.clear();
    }
}

// Export singleton instance
export const mobilePerformanceService = MobilePerformanceService.getInstance();