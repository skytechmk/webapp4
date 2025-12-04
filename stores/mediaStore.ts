/**
 * Media Store - Zustand Implementation
 * Manages media upload and processing state
 */

import { create } from 'zustand';
import { MediaItem } from '../types';

interface MediaState {
    // Media upload state
    previewMedia: { type: 'image' | 'video', src: string, file?: File } | null;
    isUploading: boolean;
    uploadProgress: number;
    applyWatermark: boolean;
    lastUsedInput: 'upload' | 'camera';

    // Media actions
    setPreviewMedia: (media: { type: 'image' | 'video', src: string, file?: File } | null) => void;
    setIsUploading: (uploading: boolean) => void;
    setUploadProgress: (progress: number) => void;
    setApplyWatermark: (apply: boolean) => void;
    setLastUsedInput: (input: 'upload' | 'camera') => void;

    // Media operations
    resetMediaState: () => void;
}

export const useMediaStore = create<MediaState>((set) => ({
    // Initial state
    previewMedia: null,
    isUploading: false,
    uploadProgress: 0,
    applyWatermark: false,
    lastUsedInput: 'upload',

    // State setters
    setPreviewMedia: (media) => set({ previewMedia: media }),
    setIsUploading: (uploading) => set({ isUploading: uploading }),
    setUploadProgress: (progress) => set({ uploadProgress: progress }),
    setApplyWatermark: (apply) => set({ applyWatermark: apply }),
    setLastUsedInput: (input) => set({ lastUsedInput: input }),

    // Media operations
    resetMediaState: () => {
        set({
            previewMedia: null,
            isUploading: false,
            uploadProgress: 0,
            applyWatermark: false
        });
    }
}));

// Selectors for optimized performance
export const selectPreviewMedia = () => useMediaStore((state) => state.previewMedia);
export const selectIsUploading = () => useMediaStore((state) => state.isUploading);
export const selectUploadProgress = () => useMediaStore((state) => state.uploadProgress);
export const selectApplyWatermark = () => useMediaStore((state) => state.applyWatermark);
export const selectLastUsedInput = () => useMediaStore((state) => state.lastUsedInput);