/**
 * UI Store - Zustand Implementation
 * Manages UI state and modal visibility
 */

import { create } from 'zustand';
import { TierLevel } from '../types';

interface UIState {
    // Modal visibility state
    showGuestLogin: boolean;
    showCreateModal: boolean;
    showContactModal: boolean;
    showStudioSettings: boolean;
    showSupportChat: boolean;
    showBetaFeedback: boolean;
    showBetaAccess: boolean;
    showBetaSettings: boolean;

    // Pending actions
    pendingAction: 'upload' | 'camera' | null;
    selectedTier: TierLevel | undefined;

    // UI actions
    setShowGuestLogin: (show: boolean) => void;
    setShowCreateModal: (show: boolean) => void;
    setShowContactModal: (show: boolean) => void;
    setShowStudioSettings: (show: boolean) => void;
    setShowSupportChat: (show: boolean) => void;
    setShowBetaFeedback: (show: boolean) => void;
    setShowBetaAccess: (show: boolean) => void;
    setShowBetaSettings: (show: boolean) => void;
    setPendingAction: (action: 'upload' | 'camera' | null) => void;
    setSelectedTier: (tier: TierLevel | undefined) => void;

    // File input management for mobile
    fileInputKey: string;
    cameraInputKey: string;
    setFileInputKey: (key: string) => void;
    setCameraInputKey: (key: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
    // Initial state
    showGuestLogin: false,
    showCreateModal: false,
    showContactModal: false,
    showStudioSettings: false,
    showSupportChat: false,
    showBetaFeedback: false,
    showBetaAccess: false,
    showBetaSettings: false,
    pendingAction: null,
    selectedTier: undefined,
    fileInputKey: 'file-input-v1',
    cameraInputKey: 'camera-input-v1',

    // State setters
    setShowGuestLogin: (show) => set({ showGuestLogin: show }),
    setShowCreateModal: (show) => set({ showCreateModal: show }),
    setShowContactModal: (show) => set({ showContactModal: show }),
    setShowStudioSettings: (show) => set({ showStudioSettings: show }),
    setShowSupportChat: (show) => set({ showSupportChat: show }),
    setShowBetaFeedback: (show) => set({ showBetaFeedback: show }),
    setShowBetaAccess: (show) => set({ showBetaAccess: show }),
    setShowBetaSettings: (show) => set({ showBetaSettings: show }),
    setPendingAction: (action) => set({ pendingAction: action }),
    setSelectedTier: (tier) => set({ selectedTier: tier }),
    setFileInputKey: (key) => set({ fileInputKey: key }),
    setCameraInputKey: (key) => set({ cameraInputKey: key })
}));

// Selectors for optimized performance
export const selectShowGuestLogin = () => useUIStore((state) => state.showGuestLogin);
export const selectShowCreateModal = () => useUIStore((state) => state.showCreateModal);
export const selectShowContactModal = () => useUIStore((state) => state.showContactModal);
export const selectShowStudioSettings = () => useUIStore((state) => state.showStudioSettings);
export const selectPendingAction = () => useUIStore((state) => state.pendingAction);
export const selectSelectedTier = () => useUIStore((state) => state.selectedTier);
export const selectFileInputKey = () => useUIStore((state) => state.fileInputKey);
export const selectCameraInputKey = () => useUIStore((state) => state.cameraInputKey);