/**
 * Media Management Utilities Module
 * Focused utility functions for media-related operations
 */

import { MediaItem, Event, User, UserRole, TierLevel } from '../types';
import { api } from '../services/api';
import { TIER_CONFIG, getTierConfigForUser } from '../types';
import { safeGetItem } from './storageUtils';

export const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    activeEvent: Event | null,
    setPreviewMedia: (media: { type: 'image' | 'video', src: string, file?: File } | null) => void,
    setFileInputKey: (key: string) => void
): void => {
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

    setTimeout(() => {
        e.target.value = '';
    }, 100);
};

export const confirmUpload = async (
    previewMedia: { type: 'image' | 'video', src: string, file?: File } | null,
    activeEvent: Event | null,
    currentUser: User | null,
    guestName: string,
    applyWatermark: boolean,
    setIsUploading: (uploading: boolean) => void,
    setUploadProgress: (progress: number) => void,
    setPreviewMedia: (media: { type: 'image' | 'video', src: string, file?: File } | null) => void,
    setFileInputKey: (key: string) => void,
    setCameraInputKey: (key: string) => void,
    t: (key: string) => string
): Promise<void> => {
    if (!previewMedia || !previewMedia.file || !activeEvent) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
        const { type, src, file } = previewMedia;
        const uploader = currentUser ? (TIER_CONFIG[currentUser.tier].allowBranding && currentUser.studioName ? currentUser.studioName : currentUser.name) : guestName || "Guest";

        let finalCaption = '';
        if (type === 'image') {
            try {
                finalCaption = await api.generateImageCaption(src);
            } catch (aiError) {
                finalCaption = 'Captured moment';
            }
        }

        const config = currentUser ? getTierConfigForUser(currentUser) : TIER_CONFIG[TierLevel.FREE];
        const canWatermark = currentUser?.role === UserRole.PHOTOGRAPHER && config.allowWatermark;
        const shouldWatermark = applyWatermark && canWatermark;
        let uploadFile = file;

        if ((shouldWatermark && type === 'image' && currentUser) || (!file && type === 'image')) {
            let source = src;
            if (shouldWatermark && currentUser) {
                // Apply watermark logic would go here
            }
            const res = await fetch(source);
            const blob = await res.blob();
            uploadFile = new File([blob], "capture.jpg", { type: "image/jpeg" });
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
            privacy: 'public'
        };

        if (uploadFile) {
            await api.uploadMedia(uploadFile, metadata, activeEvent.id, (percent) => {
                setUploadProgress(percent);
            });
        }

        setPreviewMedia(null);

        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile) {
            setFileInputKey(`file-input-v${Date.now()}`);
            setCameraInputKey(`camera-input-v${Date.now()}`);
        }

    } catch (e: any) {
        console.error("Upload failed", e);
        const errorMessage = "Upload failed. Please try again.";
        alert(errorMessage);
    } finally {
        setIsUploading(false);
        setUploadProgress(0);
    }
};