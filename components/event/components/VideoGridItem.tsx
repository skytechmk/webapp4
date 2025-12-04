/**
 * Video Grid Item Component
 * Handles video item rendering with intersection observer
 */

import * as React from 'react';
import { useState, useEffect, useRef, memo } from 'react';
import { MediaItem } from '../../../types';
import { Video, Play } from 'lucide-react';
import { isMobileDevice } from '../../../utils/deviceDetection';

interface VideoGridItemProps {
    item: MediaItem;
    onClick: () => void;
}

export const VideoGridItem: React.FC<VideoGridItemProps> = memo(({ item, onClick }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const isMobile = isMobileDevice();

    useEffect(() => {
        if (isMobile) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (videoRef.current) {
                        if (entry.isIntersecting) {
                            const playPromise = videoRef.current.play();
                            if (playPromise !== undefined) {
                                playPromise
                                    .then(() => setIsPlaying(true))
                                    .catch(() => {
                                        setIsPlaying(false);
                                    });
                            }
                        } else {
                            videoRef.current.pause();
                            setIsPlaying(false);
                        }
                    }
                });
            },
            { threshold: 0.25 }
        );

        if (videoRef.current) {
            observer.observe(videoRef.current);
        }

        return () => {
            if (videoRef.current) observer.unobserve(videoRef.current);
        };
    }, [isMobile]);

    if (item.isProcessing) {
        return (
            <div className="w-full aspect-video bg-slate-200 flex flex-col items-center justify-center text-slate-500" onClick={onClick}>
                <div className="animate-spin border-2 border-slate-300 border-t-slate-600 rounded-full w-6 h-6 mb-2"></div>
                <span className="text-xs font-bold">Processing...</span>
            </div>
        );
    }

    return (
        <div className="relative group cursor-pointer" onClick={onClick}>
            <video
                ref={videoRef}
                src={item.previewUrl || item.url}
                className="w-full h-auto object-cover rounded-lg bg-black min-h-[150px]"
                muted
                playsInline
                loop
                preload="metadata"
                style={{ pointerEvents: 'none' }}
            />

            {/* Play Icon Overlay */}
            <div className={`absolute inset-0 flex items-center justify-center transition-colors pointer-events-none ${isMobile
                ? 'bg-black/10'
                : (isPlaying ? 'bg-transparent' : 'bg-black/20 group-hover:bg-black/30')
                }`}>
                {(!isPlaying || isMobile) && (
                    <div className="bg-black/40 rounded-full p-3 backdrop-blur-sm border border-white/20">
                        <Play className="text-white fill-white" size={24} />
                    </div>
                )}
            </div>

            <div className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-md pointer-events-none z-10 backdrop-blur-md">
                <Video className="text-white" size={12} />
            </div>
        </div>
    );
});