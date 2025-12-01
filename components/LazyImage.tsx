import React, { useState, useRef, useEffect } from 'react';

interface LazyImageProps {
    src: string;
    alt: string;
    className?: string;
    placeholder?: string;
}

export const LazyImage: React.FC<LazyImageProps> = ({
    src,
    alt,
    className = '',
    placeholder
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isInView, setIsInView] = useState(false);
    const [supportsWebP, setSupportsWebP] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        // Check WebP support
        const checkWebP = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 1;
            canvas.height = 1;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillRect(0, 0, 1, 1);
                canvas.toBlob((blob) => {
                    setSupportsWebP(blob?.type === 'image/webp');
                }, 'image/webp', 0.5);
            }
        };
        checkWebP();
    }, []);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.1 }
        );

        if (imgRef.current) {
            observer.observe(imgRef.current);
        }

        return () => observer.disconnect();
    }, []);

    const handleLoad = () => {
        setIsLoaded(true);
    };

    // Convert to WebP if supported
    const getOptimizedSrc = (src: string) => {
        if (!supportsWebP || !src) return src;
        // Simple conversion - in production, you'd use a service or pre-generate WebP
        return src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    };

    return (
        <picture>
            {supportsWebP && (
                <source srcSet={getOptimizedSrc(isInView ? src : placeholder || '')} type="image/webp" />
            )}
            <img
                ref={imgRef}
                src={isInView ? src : placeholder}
                alt={alt}
                className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500`}
                onLoad={handleLoad}
                loading="lazy"
            />
        </picture>
    );
};