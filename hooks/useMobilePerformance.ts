import { useState, useEffect } from 'react';
import { getMobilePerformanceProfile, getMobileImageLoadingStrategy, getMobileVideoStrategy, getMobileAnimationSettings } from '../utils/mobilePerformance';

/**
 * Custom hook for mobile performance optimization
 */
export const useMobilePerformance = () => {
    const [performanceProfile, setPerformanceProfile] = useState(() => getMobilePerformanceProfile());
    const [imageLoadingStrategy, setImageLoadingStrategy] = useState(() => getMobileImageLoadingStrategy(performanceProfile.isMobile, performanceProfile.isSlowNetwork));
    const [videoStrategy, setVideoStrategy] = useState(() => getMobileVideoStrategy(performanceProfile.isMobile, performanceProfile.isSlowNetwork));
    const [animationSettings, setAnimationSettings] = useState(() => getMobileAnimationSettings(performanceProfile.isMobile, performanceProfile.memoryStatus === 'low'));

    // Update performance profile when window changes
    useEffect(() => {
        const handleResize = () => {
            const newProfile = getMobilePerformanceProfile();
            setPerformanceProfile(newProfile);
            setImageLoadingStrategy(getMobileImageLoadingStrategy(newProfile.isMobile, newProfile.isSlowNetwork));
            setVideoStrategy(getMobileVideoStrategy(newProfile.isMobile, newProfile.isSlowNetwork));
            setAnimationSettings(getMobileAnimationSettings(newProfile.isMobile, newProfile.memoryStatus === 'low'));
        };

        const handleNetworkChange = () => {
            const newProfile = getMobilePerformanceProfile();
            setPerformanceProfile(newProfile);
            setImageLoadingStrategy(getMobileImageLoadingStrategy(newProfile.isMobile, newProfile.isSlowNetwork));
            setVideoStrategy(getMobileVideoStrategy(newProfile.isMobile, newProfile.isSlowNetwork));
        };

        window.addEventListener('resize', handleResize);

        // Listen for network changes if available
        if ('connection' in navigator && navigator.connection) {
            (navigator.connection as any).addEventListener('change', handleNetworkChange);
        }

        return () => {
            window.removeEventListener('resize', handleResize);
            if ('connection' in navigator && navigator.connection) {
                (navigator.connection as any).removeEventListener('change', handleNetworkChange);
            }
        };
    }, []);

    return {
        performanceProfile,
        imageLoadingStrategy,
        videoStrategy,
        animationSettings,
        isMobile: performanceProfile.isMobile,
        isSlowNetwork: performanceProfile.isSlowNetwork,
        isLowMemory: performanceProfile.memoryStatus === 'low',
        isLowBattery: performanceProfile.batteryStatus === 'low'
    };
};

/**
 * Hook for optimized touch event handling
 */
export const useOptimizedTouchEvents = (onTouchStart?: (e: TouchEvent) => void, onTouchMove?: (e: TouchEvent) => void, onTouchEnd?: (e: TouchEvent) => void) => {
    const [touchStartTime, setTouchStartTime] = useState(0);
    const [touchStartPosition, setTouchStartPosition] = useState({ x: 0, y: 0 });

    const handleTouchStart = (e: TouchEvent) => {
        setTouchStartTime(Date.now());
        setTouchStartPosition({ x: e.touches[0].clientX, y: e.touches[0].clientY });
        onTouchStart?.(e);
    };

    const handleTouchMove = (e: TouchEvent) => {
        // Only process if we have a valid touch start
        if (touchStartTime === 0) return;

        // Calculate distance moved
        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const distance = Math.sqrt(
            Math.pow(currentX - touchStartPosition.x, 2) +
            Math.pow(currentY - touchStartPosition.y, 2)
        );

        // Only trigger move if significant movement detected (avoid jitter)
        if (distance > 5) {
            onTouchMove?.(e);
        }
    };

    const handleTouchEnd = (e: TouchEvent) => {
        const touchDuration = Date.now() - touchStartTime;

        // Only process if touch was long enough to be intentional
        if (touchDuration > 30) {
            onTouchEnd?.(e);
        }

        // Reset touch state
        setTouchStartTime(0);
        setTouchStartPosition({ x: 0, y: 0 });
    };

    return {
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd
    };
};

/**
 * Hook for mobile network-aware resource loading
 */
export const useMobileResourceLoading = () => {
    const { isMobile, isSlowNetwork } = useMobilePerformance();

    const loadImage = (src: string, options?: { priority?: 'high' | 'medium' | 'low' }) => {
        return new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();

            // Apply mobile-specific loading strategies
            if (isMobile && isSlowNetwork && options?.priority !== 'high') {
                img.loading = 'lazy';
            } else {
                img.loading = 'eager';
            }

            img.src = src;
            img.onerror = reject;

            // Use intersection observer for lazy loading on mobile
            if (isMobile && options?.priority !== 'high') {
                const observer = new IntersectionObserver((entries) => {
                    if (entries[0].isIntersecting) {
                        img.decode().then(() => resolve(img)).catch(reject);
                        observer.disconnect();
                    }
                }, { threshold: 0.1 });

                observer.observe(img);
            } else {
                img.decode().then(() => resolve(img)).catch(reject);
            }
        });
    };

    const loadVideo = (src: string, options?: { autoPlay?: boolean }) => {
        return new Promise<HTMLVideoElement>((resolve, reject) => {
            const video = document.createElement('video');

            // Apply mobile video strategy
            if (isMobile && isSlowNetwork) {
                video.preload = 'metadata';
                video.autoplay = false;
            } else {
                video.preload = 'auto';
                video.autoplay = options?.autoPlay || false;
            }

            video.src = src;
            video.muted = true;
            video.playsInline = true;

            video.onerror = reject;
            video.onloadedmetadata = () => resolve(video);
            video.oncanplay = () => resolve(video);
        });
    };

    return {
        loadImage,
        loadVideo
    };
};