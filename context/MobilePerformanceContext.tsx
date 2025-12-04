import React, { createContext, useContext, useState, useEffect } from 'react';
import { mobilePerformanceService } from '../services/mobilePerformanceService';

interface MobilePerformanceContextType {
    isMobile: boolean;
    isSlowNetwork: boolean;
    isLowMemory: boolean;
    isLowBattery: boolean;
    imageLoadingStrategy: {
        loading: 'eager' | 'lazy';
        fetchPriority: 'high' | 'medium' | 'low';
        useWebP: boolean;
        quality: 'high' | 'medium' | 'low';
        usePlaceholder: boolean;
    };
    videoStrategy: {
        autoPlay: boolean;
        preload: 'auto' | 'metadata' | 'none';
        useIntersectionObserver: boolean;
        maxResolution: '480p' | '720p' | '1080p' | '4k';
        useLowBitrate: boolean;
    };
    animationSettings: {
        useCSSAnimations: boolean;
        useJavascriptAnimations: boolean;
        animationDuration: 'fast' | 'normal' | 'slow';
        useTransforms: boolean;
    };
    touchSettings: {
        touchAction: 'auto' | 'none' | 'pan-x' | 'pan-y';
        passive: boolean;
        capture: boolean;
    };
    optimizeResourceLoading: <T extends HTMLImageElement | HTMLVideoElement>(
        element: T,
        src: string,
        options?: {
            priority?: 'high' | 'medium' | 'low';
            type?: 'image' | 'video';
        }
    ) => Promise<T>;
    createTouchHandler: (callback: (e: TouchEvent) => void, debounceTime?: number, handlerId?: string) => () => void;
}

const MobilePerformanceContext = createContext<MobilePerformanceContextType | undefined>(undefined);

export const MobilePerformanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [performanceState, setPerformanceState] = useState({
        isMobile: mobilePerformanceService.isMobile(),
        isSlowNetwork: mobilePerformanceService.isSlowNetwork(),
        isLowMemory: mobilePerformanceService.isLowMemory(),
        isLowBattery: mobilePerformanceService.isLowBattery(),
        imageLoadingStrategy: mobilePerformanceService.getImageLoadingStrategy(),
        videoStrategy: mobilePerformanceService.getVideoStrategy(),
        animationSettings: mobilePerformanceService.getAnimationSettings(),
        touchSettings: mobilePerformanceService.getTouchSettings()
    });

    // Update performance state when network conditions change
    useEffect(() => {
        const updatePerformanceState = () => {
            setPerformanceState({
                isMobile: mobilePerformanceService.isMobile(),
                isSlowNetwork: mobilePerformanceService.isSlowNetwork(),
                isLowMemory: mobilePerformanceService.isLowMemory(),
                isLowBattery: mobilePerformanceService.isLowBattery(),
                imageLoadingStrategy: mobilePerformanceService.getImageLoadingStrategy(),
                videoStrategy: mobilePerformanceService.getVideoStrategy(),
                animationSettings: mobilePerformanceService.getAnimationSettings(),
                touchSettings: mobilePerformanceService.getTouchSettings()
            });
        };

        // Add network listener
        mobilePerformanceService.addNetworkListener(updatePerformanceState);

        // Cleanup on unmount
        return () => {
            mobilePerformanceService.removeNetworkListener(updatePerformanceState);
        };
    }, []);

    const optimizeResourceLoading = <T extends HTMLImageElement | HTMLVideoElement>(
        element: T,
        src: string,
        options?: {
            priority?: 'high' | 'medium' | 'low';
            type?: 'image' | 'video';
        }
    ): Promise<T> => {
        return mobilePerformanceService.optimizeResourceLoading(element, src, options);
    };

    const createTouchHandler = (callback: (e: TouchEvent) => void, debounceTime = 100, handlerId = 'default') => {
        return mobilePerformanceService.createTouchHandler(callback, debounceTime, handlerId);
    };

    return (
        <MobilePerformanceContext.Provider
            value={{
                ...performanceState,
                optimizeResourceLoading,
                createTouchHandler
            }}
        >
            {children}
        </MobilePerformanceContext.Provider>
    );
};

export const useMobilePerformance = () => {
    const context = useContext(MobilePerformanceContext);
    if (!context) {
        throw new Error('useMobilePerformance must be used within a MobilePerformanceProvider');
    }
    return context;
};

// Mobile-optimized image component
interface MobileOptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    priority?: 'high' | 'medium' | 'low';
    useWebP?: boolean;
    quality?: 'high' | 'medium' | 'low';
}

export const MobileOptimizedImage: React.FC<MobileOptimizedImageProps> = ({
    src,
    priority = 'medium',
    useWebP = true,
    quality = 'high',
    alt = '',
    ...props
}) => {
    const { imageLoadingStrategy, optimizeResourceLoading } = useMobilePerformance();
    const [imageSrc, setImageSrc] = useState('');
    const [isLoaded, setIsLoaded] = useState(false);
    const imgRef = React.useRef<HTMLImageElement>(null);

    useEffect(() => {
        const loadImage = async () => {
            try {
                // Apply WebP optimization if supported
                let optimizedSrc = src;
                if (useWebP && 'image/webp' in document.createElement('canvas')) {
                    optimizedSrc = src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
                }

                // Apply quality optimization
                if (quality !== 'high') {
                    if (quality === 'medium') {
                        optimizedSrc = optimizedSrc.replace(/(\.jpg|\.jpeg|\.png|\.webp)/i, (match) => {
                            if (match.includes('?')) return match + '&quality=75';
                            return match + '?quality=75';
                        });
                    } else if (quality === 'low') {
                        optimizedSrc = optimizedSrc.replace(/(\.jpg|\.jpeg|\.png|\.webp)/i, (match) => {
                            if (match.includes('?')) return match + '&quality=50';
                            return match + '?quality=50';
                        });
                    }
                }

                setImageSrc(optimizedSrc);

                if (imgRef.current) {
                    await optimizeResourceLoading(imgRef.current, optimizedSrc, {
                        priority,
                        type: 'image'
                    });
                    setIsLoaded(true);
                }
            } catch (error) {
                console.error('Failed to load optimized image:', error);
                setImageSrc(src);
            }
        };

        loadImage();
    }, [src, priority, useWebP, quality, optimizeResourceLoading]);

    return (
        <img
            ref={imgRef}
            src={imageSrc || src}
            alt={alt}
            loading={imageLoadingStrategy.loading}
            style={{
                opacity: isLoaded ? 1 : 0,
                transition: 'opacity 0.3s ease-in-out',
                ...props.style
            }}
            {...props}
        />
    );
};

// Mobile-optimized video component
interface MobileOptimizedVideoProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
    src: string;
    priority?: 'high' | 'medium' | 'low';
    useLowBitrate?: boolean;
}

export const MobileOptimizedVideo: React.FC<MobileOptimizedVideoProps> = ({
    src,
    priority = 'medium',
    useLowBitrate = false,
    ...props
}) => {
    const { videoStrategy, optimizeResourceLoading } = useMobilePerformance();
    const [videoSrc, setVideoSrc] = useState('');
    const [isLoaded, setIsLoaded] = useState(false);
    const videoRef = React.useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const loadVideo = async () => {
            try {
                // Apply bitrate optimization
                let optimizedSrc = src;
                if (useLowBitrate && videoStrategy.useLowBitrate) {
                    optimizedSrc = optimizedSrc.replace(/(\.mp4|\.webm)/i, (match) => {
                        if (match.includes('?')) return match + '&bitrate=low';
                        return match + '?bitrate=low';
                    });
                }

                setVideoSrc(optimizedSrc);

                if (videoRef.current) {
                    await optimizeResourceLoading(videoRef.current, optimizedSrc, {
                        priority,
                        type: 'video'
                    });
                    setIsLoaded(true);
                }
            } catch (error) {
                console.error('Failed to load optimized video:', error);
                setVideoSrc(src);
            }
        };

        loadVideo();
    }, [src, priority, useLowBitrate, videoStrategy.useLowBitrate, optimizeResourceLoading]);

    return (
        <video
            ref={videoRef}
            src={videoSrc || src}
            preload={videoStrategy.preload}
            autoPlay={videoStrategy.autoPlay}
            playsInline
            muted
            style={{
                opacity: isLoaded ? 1 : 0,
                transition: 'opacity 0.3s ease-in-out',
                ...props.style
            }}
            {...props}
        />
    );
};