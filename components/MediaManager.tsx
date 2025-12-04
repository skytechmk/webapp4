import * as React from "react";
const { useState, useRef, useCallback, useEffect } = React;
import { MediaItem, Event, User, TierLevel, TranslateFn } from '../types';
import { api } from '../services/api';
import { applyWatermark as applyWatermarkUtil } from '../utils/imageProcessing';
import { canUploadVideos } from '../utils/videoPermissions';
import { TIER_CONFIG, getTierConfigForUser } from '../types';

interface MediaManagerProps {
    currentUser: User | null;
    guestName: string;
    activeEvent: Event | null;
    isOwner: boolean;
    isHostPhotographer: boolean;
    applyWatermark: boolean;
    setApplyWatermark: (apply: boolean) => void;
    setPreviewMedia: (media: { type: 'image' | 'video', src: string, file?: File } | null) => void;
    setIsUploading: (uploading: boolean) => void;
    setUploadProgress: (progress: number) => void;
    setLastUsedInput: (input: 'upload' | 'camera') => void;
    setFileInputKey: (key: string) => void;
    setCameraInputKey: (key: string) => void;
    setPendingAction: (action: 'upload' | 'camera' | null) => void;
    setEvents: (events: Event[] | ((prev: Event[]) => Event[])) => void;
    t: TranslateFn;
}

export const MediaManager: React.FC<MediaManagerProps> = ({
    currentUser,
    guestName,
    activeEvent,
    isOwner,
    isHostPhotographer,
    applyWatermark,
    setApplyWatermark,
    setPreviewMedia,
    setIsUploading,
    setUploadProgress,
    setLastUsedInput,
    setFileInputKey,
    setCameraInputKey,
    setPendingAction,
    setEvents,
    t
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const [previewMedia, setPreviewMediaState] = useState<{ type: 'image' | 'video', src: string, file?: File } | null>(null);

    // Handle file upload
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0] || !activeEvent) {
            return;
        }

        const file = e.target.files[0];
        const maxSize = 50 * 1024 * 1024; // 50MB

        if (file.size > maxSize) {
            alert('File is too large. Please select a file smaller than 50MB.');
            e.target.value = '';
            return;
        }

        const type = file.type.startsWith('video') ? 'video' : 'image';
        const url = URL.createObjectURL(file);
        setPreviewMedia({ type, src: url, file });

        // Clean up file input after processing
        const cleanupFileInput = () => {
            e.target.value = '';
            // Revoke object URL when no longer needed
            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 10000); // Revoke after 10 seconds to ensure it's no longer needed
        };

        setTimeout(cleanupFileInput, 100);
    };

    // Initiate media action
    const initiateMediaAction = (action: 'upload' | 'camera') => {
        setLastUsedInput(action);

        if (currentUser || guestName) {
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

            if (isMobile) {
                setTimeout(() => {
                    if (action === 'camera') {
                        cameraInputRef.current?.click();
                    } else {
                        fileInputRef.current?.click();
                    }
                }, 100);
            } else {
                if (action === 'camera') cameraInputRef.current?.click();
                else fileInputRef.current?.click();
            }
        } else {
            setPendingAction(action);
            // Show guest login would be handled by parent component
        }
    };

    // Confirm upload
    const confirmUpload = async (userCaption: string, userPrivacy: 'public' | 'private', rotation: number = 0) => {
        if (!previewMedia || !previewMedia.file || !activeEvent) return;

        setIsUploading(true);
        setUploadProgress(0);

        try {
            const { type, src, file } = previewMedia;
            const uploader = currentUser ? (TIER_CONFIG[currentUser.tier].allowBranding && currentUser.studioName ? currentUser.studioName : currentUser.name) : guestName || "Guest";

            let finalCaption = userCaption;
            if (!finalCaption && type === 'image') {
                try {
                    finalCaption = await api.generateImageCaption(src);
                } catch (aiError) {
                    finalCaption = 'Captured moment';
                }
            }

            const config = currentUser ? getTierConfigForUser(currentUser) : TIER_CONFIG[TierLevel.FREE];
            const canWatermark = currentUser?.role === 'PHOTOGRAPHER' && config.allowWatermark;
            const shouldWatermark = applyWatermark && canWatermark;
            let uploadFile = file;

            if ((shouldWatermark && type === 'image' && currentUser) || (!file && type === 'image')) {
                let source = src;
                if (shouldWatermark && currentUser) {
                    source = await applyWatermarkUtil(
                        src,
                        canWatermark ? (currentUser.studioName || null) : null,
                        canWatermark ? (currentUser.logoUrl || null) : null,
                        canWatermark ? currentUser.watermarkOpacity : undefined,
                        canWatermark ? currentUser.watermarkSize : undefined,
                        canWatermark ? currentUser.watermarkPosition : undefined,
                        canWatermark ? currentUser.watermarkOffsetX : undefined,
                        canWatermark ? currentUser.watermarkOffsetY : undefined
                    );
                }
                const res = await fetch(source);
                const blob = await res.blob();
                uploadFile = new File([blob], "capture.jpg", { type: "image/jpeg" });
            }

            // Apply rotation
            if (type === 'image' && uploadFile && rotation !== 0) {
                const img = new Image();
                const objectUrl = URL.createObjectURL(uploadFile);
                img.src = objectUrl;

                try {
                    await new Promise(resolve => { img.onload = resolve; });

                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        const needsSwap = Math.abs(rotation) === 90 || Math.abs(rotation) === 270;
                        canvas.width = needsSwap ? img.height : img.width;
                        canvas.height = needsSwap ? img.width : img.height;

                        ctx.save();
                        ctx.translate(canvas.width / 2, canvas.height / 2);
                        ctx.rotate((rotation * Math.PI) / 180);
                        ctx.drawImage(img, -img.width / 2, -img.height / 2);
                        ctx.restore();

                        const rotatedBlob = await new Promise<Blob | null>(resolve => {
                            canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.85);
                        });
                        if (rotatedBlob) uploadFile = new File([rotatedBlob], "final.jpg", { type: "image/jpeg" });
                    }
                } finally {
                    // Clean up resources
                    URL.revokeObjectURL(objectUrl);
                    if (img) {
                        img.onload = null;
                        img.onerror = null;
                    }
                }
            }

            const metadata: Partial<MediaItem> = {
                id: `media-${Date.now()}`,
                type,
                caption: finalCaption,
                uploadedAt: new Date().toISOString(),
                uploaderName: uploader,
                uploaderId: currentUser ? currentUser.id : `guest-${guestName}-${Date.now()}`,
                isWatermarked: shouldWatermark,
                watermarkText: shouldWatermark && canWatermark ? currentUser?.studioName : undefined,
                privacy: userPrivacy
            };

            if (uploadFile) {
                await api.uploadMedia(uploadFile, metadata, activeEvent.id, (percent) => {
                    setUploadProgress(percent);
                });
            }

            setPreviewMedia(null);

            // Reset file inputs
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            if (isMobile) {
                setFileInputKey(`file-input-v${Date.now()}`);
                setCameraInputKey(`camera-input-v${Date.now()}`);
            } else {
                if (fileInputRef.current) fileInputRef.current.value = '';
                if (cameraInputRef.current) cameraInputRef.current.value = '';
            }

        } catch (e: any) {
            console.error("Upload failed", e);
            let errorMessage = "Upload failed. Please try again.";

            if (e.message === 'Storage limit exceeded' || (e.response && e.response.status === 413)) {
                errorMessage = t('storageLimit') || "Storage limit exceeded. Please upgrade your plan.";
            } else if (e.message?.includes('NetworkError') || e.message?.includes('Failed to fetch')) {
                errorMessage = "Network connection issue. Please check your internet connection and try again.";
            } else if (e.message?.includes('timeout') || e.code === 'ECONNABORTED') {
                errorMessage = "Upload timed out. Please try again with a smaller file.";
            }

            alert(errorMessage);
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    // Handle like media
    const handleLikeMedia = async (item: MediaItem) => {
        if (!activeEvent) return;
        setEvents(prev => prev.map(e => {
            if (e.id === activeEvent.id) {
                return { ...e, media: e.media.map(m => m.id === item.id ? { ...m, likes: (m.likes || 0) + 1 } : m) };
            }
            return e;
        }));
        await api.likeMedia(item.id);
    };

    // Handle set cover image
    const handleSetCoverImage = async (item: MediaItem) => {
        if (!activeEvent) return;
        const updated = { ...activeEvent, coverImage: item.url, coverMediaType: item.type };
        await api.updateEvent(updated);
        setEvents(prev => prev.map(e => e.id === activeEvent.id ? updated : e));
        alert(t('coverSet'));
    };

    // Cleanup effect for memory management
    useEffect(() => {
        return () => {
            // Clean up any pending object URLs when component unmounts
            if (previewMedia?.src && previewMedia.src.startsWith('blob:')) {
                URL.revokeObjectURL(previewMedia.src);
            }
        };
    }, [previewMedia]);

    return (
        <>
            {/* MediaManager component content */}
        </>
    );
};

export default MediaManager;