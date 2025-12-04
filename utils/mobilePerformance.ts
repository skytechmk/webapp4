// Mobile Performance Optimization Utilities
import { isMobileDevice, isIOS, isAndroid } from './deviceDetection';

/**
 * Enhanced mobile device detection with performance considerations
 */
export const isMobileWithPerformanceCheck = (): boolean => {
    if (typeof window === 'undefined') return false;

    // Performance-optimized mobile detection
    const userAgent = navigator.userAgent.toLowerCase();
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth <= 768;

    // Check for mobile user agents with performance considerations
    const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
    const isMobileUA = mobileRegex.test(userAgent);

    // Additional performance checks
    const connection = (navigator as any).connection || ({ effectiveType: '4g' } as any);
    const isSlowConnection = connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g';

    return hasTouch && (isSmallScreen || isMobileUA);
};

/**
 * Get mobile performance profile
 */
export const getMobilePerformanceProfile = (): {
    isMobile: boolean;
    isIOS: boolean;
    isAndroid: boolean;
    isSlowNetwork: boolean;
    memoryStatus: 'low' | 'medium' | 'high';
    batteryStatus: 'low' | 'medium' | 'high' | 'unknown';
} => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
        return {
            isMobile: false,
            isIOS: false,
            isAndroid: false,
            isSlowNetwork: false,
            memoryStatus: 'high',
            batteryStatus: 'unknown'
        };
    }

    const isMobile = isMobileWithPerformanceCheck();
    const isIOSDevice = isIOS();
    const isAndroidDevice = isAndroid();

    // Check network status
    const connection = (navigator as any).connection || ({ effectiveType: '4g', saveData: false } as any);
    const isSlowNetwork = connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g' || connection.saveData;

    // Check memory status (if available)
    let memoryStatus: 'low' | 'medium' | 'high' = 'high';
    if ('deviceMemory' in navigator) {
        const memory = (navigator as any).deviceMemory;
        if (memory <= 2) memoryStatus = 'low';
        else if (memory <= 4) memoryStatus = 'medium';
    }

    // Check battery status (if available)
    let batteryStatus: 'low' | 'medium' | 'high' | 'unknown' = 'unknown';
    if ('getBattery' in navigator) {
        (navigator as any).getBattery().then((battery: any) => {
            if (battery.level <= 0.2) batteryStatus = 'low';
            else if (battery.level <= 0.5) batteryStatus = 'medium';
            else batteryStatus = 'high';
        });
    }

    return {
        isMobile,
        isIOS: isIOSDevice,
        isAndroid: isAndroidDevice,
        isSlowNetwork,
        memoryStatus,
        batteryStatus
    };
};

/**
 * Optimized touch event handler with debouncing
 */
export const createOptimizedTouchHandler = (callback: (e: TouchEvent) => void, debounceTime = 100) => {
    let lastCall = 0;
    let timeoutId: number | null = null;

    return (e: TouchEvent) => {
        const now = Date.now();
        const elapsed = now - lastCall;

        // If enough time has passed, call immediately
        if (elapsed >= debounceTime) {
            lastCall = now;
            callback(e);
        } else {
            // Otherwise, debounce the call
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            timeoutId = window.setTimeout(() => {
                lastCall = Date.now();
                callback(e);
            }, debounceTime - elapsed);
        }
    };
};

/**
 * Mobile network-aware image loading strategy
 */
export const getMobileImageLoadingStrategy = (isMobile: boolean, isSlowNetwork: boolean) => {
    if (!isMobile) {
        return {
            loading: 'eager',
            fetchPriority: 'high',
            useWebP: true,
            quality: 'high'
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
        quality: 'high'
    };
};

/**
 * Optimized mobile video handling
 */
export const getMobileVideoStrategy = (isMobile: boolean, isSlowNetwork: boolean) => {
    if (!isMobile) {
        return {
            autoPlay: true,
            preload: 'auto',
            useIntersectionObserver: true,
            maxResolution: '1080p'
        };
    }

    if (isSlowNetwork) {
        return {
            autoPlay: false,
            preload: 'metadata',
            useIntersectionObserver: false,
            maxResolution: '720p',
            useLowBitrate: true
        };
    }

    return {
        autoPlay: false,
        preload: 'metadata',
        useIntersectionObserver: true,
        maxResolution: '1080p'
    };
};

/**
 * Mobile-optimized touch gesture detection
 */
export const detectMobileGesture = (e: TouchEvent): {
    isSwipe: boolean;
    isPinch: boolean;
    isTap: boolean;
    direction?: 'left' | 'right' | 'up' | 'down';
    distance?: number;
} => {
    if (e.touches.length === 1) {
        // Single touch - could be swipe or tap
        return {
            isSwipe: true,
            isPinch: false,
            isTap: false
        };
    } else if (e.touches.length === 2) {
        // Two touches - could be pinch
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = Math.sqrt(
            Math.pow(touch2.clientX - touch1.clientX, 2) +
            Math.pow(touch2.clientY - touch1.clientY, 2)
        );

        return {
            isSwipe: false,
            isPinch: true,
            isTap: false,
            distance
        };
    }

    return {
        isSwipe: false,
        isPinch: false,
        isTap: true
    };
};

/**
 * Mobile performance-aware animation settings
 */
export const getMobileAnimationSettings = (isMobile: boolean, isSlowDevice: boolean) => {
    if (!isMobile) {
        return {
            useCSSAnimations: true,
            useJavascriptAnimations: true,
            animationDuration: 'normal',
            useTransforms: true
        };
    }

    if (isSlowDevice) {
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
};