import { User, Event, MediaItem, UserRole, TierLevel } from '../types';
import { api } from '../services/api';
import { TRANSLATIONS } from '../constants';
import { socketService } from '../services/socketService';
import { clearDeviceFingerprint } from './deviceFingerprint';
import { TIER_CONFIG, getTierConfigForUser } from '../types';
import * as React from 'react';

declare const process: {
    env: {
        VITE_API_URL?: string;
    };
};

// Safe localStorage operations
export const safeSetItem = (key: string, value: string) => {
    try { localStorage.setItem(key, value); } catch (error) { console.warn('Failed to save to localStorage:', error); }
};

export const safeGetItem = (key: string): string => {
    try { return localStorage.getItem(key) || ''; } catch (error) { return ''; }
};

export const safeRemoveItem = (key: string) => {
    try { localStorage.removeItem(key); } catch (error) { }
};

// Validation functions
export const validateGuestName = (name: string): boolean => {
    return name.length >= 2 && name.length <= 50;
};

export const sanitizeInput = (input: string): string => {
    return input.replace(/[<>&'"]/g, '');
};

export const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const validatePassword = (password: string): boolean => {
    return password.length >= 8;
};

export const validateEventTitle = (title: string): boolean => {
    return title.length >= 1 && title.length <= 100;
};

export const validateEventDescription = (description: string): boolean => {
    return description.length <= 500;
};

// User management functions
export const handleUserUpdate = (updatedUser: User, setCurrentUser: (value: User | null | ((prev: User | null) => User | null)) => void, setAllUsers: (value: User[] | ((prev: User[]) => User[])) => void) => {
    setCurrentUser(prev => {
        if (!prev) return null;
        const updated = { ...prev, ...updatedUser };
        localStorage.setItem('snapify_user_obj', JSON.stringify(updated));
        return updated;
    });

    setAllUsers(prev => prev.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u));
};

// Event management functions
export const incrementEventViews = async (id: string, currentEvents: Event[], setEvents: (value: Event[] | ((prev: Event[]) => Event[])) => void) => {
    const updated = currentEvents.map(e => {
        if (e.id === id) return { ...e, views: (e.views || 0) + 1 };
        return e;
    });
    setEvents(updated);
    await fetch(`${process.env.VITE_API_URL || ''}/api/events/${id}/view`, { method: 'POST' });
};

// Media management functions
export const handleLikeMedia = async (item: MediaItem, activeEvent: Event | null, setEvents: (value: Event[] | ((prev: Event[]) => Event[])) => void) => {
    if (!activeEvent) return;
    setEvents(prev => prev.map(e => {
        if (e.id === activeEvent.id) {
            return { ...e, media: e.media.map(m => m.id === item.id ? { ...m, likes: (m.likes || 0) + 1 } : m) };
        }
        return e;
    }));
    await api.likeMedia(item.id);
};

export const handleSetCoverImage = async (item: MediaItem, activeEvent: Event | null, setEvents: (value: Event[] | ((prev: Event[]) => Event[])) => void) => {
    if (!activeEvent) return;
    const updated = { ...activeEvent, coverImage: item.url, coverMediaType: item.type };
    await api.updateEvent(updated);
    setEvents(prev => prev.map(e => e.id === activeEvent.id ? updated : e));
    return "Cover image set successfully";
};

// Authentication functions
export const finalizeLogin = async (user: User, token: string,
    setCurrentUser: (value: User | null | ((prev: User | null) => User | null)) => void,
    setEvents: (value: Event[] | ((prev: Event[]) => Event[])) => void,
    setAllUsers: (value: User[] | ((prev: User[]) => User[])) => void,
    setView: (view: 'landing' | 'dashboard' | 'event' | 'admin' | 'live') => void,
    setCurrentEventId: (eventId: string | null) => void
) => {
    setCurrentUser(user);
    safeSetItem('snapify_token', token);
    safeSetItem('snapify_user_id', user.id);
    safeSetItem('snapify_user_obj', JSON.stringify(user));

    try {
        const eventsData = await api.fetchEvents();
        setEvents(eventsData);

        const params = new URLSearchParams(window.location.search);
        const urlEventId = params.get('event');

        if (urlEventId) {
            const targetEvent = eventsData.find(e => e.id === urlEventId);
            if (targetEvent) {
                setCurrentEventId(urlEventId);
                setView('event');
            } else {
                try {
                    const sharedEvent = await api.fetchEventById(urlEventId);
                    setEvents(prev => [...prev, sharedEvent]);
                    setCurrentEventId(urlEventId);
                    setView('event');
                } catch (err) { setView('dashboard'); }
            }
        } else if (user.role === UserRole.ADMIN) {
            const usersData = await api.fetchUsers();
            setAllUsers(usersData);
            setView('admin');
        } else {
            setView('dashboard');
        }
    } catch (error) { setView('dashboard'); }
};

export const handleLogout = async (
    currentUser: User | null,
    setCurrentUser: (value: User | null | ((prev: User | null) => User | null)) => void,
    setGuestName: (name: string) => void,
    setView: (view: 'landing' | 'dashboard' | 'event' | 'admin' | 'live') => void,
    setCurrentEventId: (eventId: string | null) => void
) => {
    if (currentUser) {
        try {
            await fetch(`${process.env.VITE_API_URL || ''}/api/auth/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('snapify_token')}`,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.warn('Logout API call failed:', error);
        }
    }

    setCurrentUser(null);
    setGuestName('');
    setView('landing');
    setCurrentEventId(null);
    safeRemoveItem('snapify_token');
    safeRemoveItem('snapify_user_id');
    safeRemoveItem('snapify_user_obj');
    clearDeviceFingerprint();

    if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.search = "";
        window.history.pushState({}, '', url.toString());
        window.location.href = '/';
    }
};

// Error handling functions
export const handleError = (error: any, defaultMessage: string, t: (key: string) => string): string => {
    let errorMessage = defaultMessage;

    if (error.message === 'Storage limit exceeded' || (error.response && error.response.status === 413)) {
        errorMessage = t('storageLimit') || "Storage limit exceeded. Please upgrade your plan.";
    } else if (error.message?.includes('NetworkError') || error.message?.includes('Failed to fetch')) {
        errorMessage = "Network connection issue. Please check your internet connection and try again.";
    } else if (error.message?.includes('timeout') || error.code === 'ECONNABORTED') {
        errorMessage = "Upload timed out. Please try again with a smaller file.";
    }

    return errorMessage;
};

// Event creation functions
export const createEvent = async (
    currentUser: User,
    data: any,
    setEvents: (value: Event[] | ((prev: Event[]) => Event[])) => void,
    setShowCreateModal: (show: boolean) => void,
    setCurrentEventId: (eventId: string) => void,
    setView: (view: 'landing' | 'dashboard' | 'event' | 'admin' | 'live') => void,
    t: (key: string) => string
) => {
    const { title, date, theme, description, pin, adminOptions } = data;

    if (!validateEventTitle(title)) {
        alert("Event title must be 1-100 characters long");
        return;
    }
    if (!validateEventDescription(description)) {
        alert("Event description must be less than 500 characters");
        return;
    }

    let expiresAt: string | null = null;
    const now = new Date().getTime();

    if (currentUser.role === UserRole.ADMIN && adminOptions) {
        const { expiryType, durationValue, durationUnit } = adminOptions;
        if (expiryType === 'unlimited') expiresAt = null;
        else if (expiryType === 'custom') {
            let multiplier = 1000;
            if (durationUnit === 'minutes') multiplier = 60 * 1000;
            if (durationUnit === 'hours') multiplier = 60 * 60 * 1000;
            if (durationUnit === 'days') multiplier = 24 * 60 * 60 * 1000;
            expiresAt = new Date(now + (durationValue * multiplier)).toISOString();
        } else {
            const days = parseInt(expiryType.replace('d', ''));
            expiresAt = new Date(now + (days || 30) * 24 * 60 * 60 * 1000).toISOString();
        }
    } else {
        const config = getTierConfigForUser(currentUser);
        if (config.maxDurationDays === null) expiresAt = null;
        else if (currentUser.tier === TierLevel.FREE && config.maxDurationHours) expiresAt = new Date(now + config.maxDurationHours * 60 * 60 * 1000).toISOString();
        else expiresAt = new Date(now + (config.maxDurationDays || 30) * 24 * 60 * 60 * 1000).toISOString();
    }

    const newEvent: Event = {
        id: crypto.randomUUID(),
        title: title,
        date: date,
        description: description,
        hostId: currentUser.id,
        code: Math.random().toString(36).substring(2, 8).toUpperCase(),
        media: [],
        expiresAt,
        pin: pin,
        views: 0,
        downloads: 0
    };

    try {
        const created = await api.createEvent(newEvent);
        setEvents(prev => [created, ...prev]);
        setShowCreateModal(false);
        setCurrentEventId(created.id);
        setView('event');
    } catch (e) { alert("Failed to create event"); }
};

// File upload functions
export const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    activeEvent: Event | null,
    setPreviewMedia: (media: { type: 'image' | 'video', src: string, file?: File } | null) => void,
    setFileInputKey: (key: string) => void
) => {
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

// Media upload confirmation
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
) => {
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
        const errorMessage = handleError(e, "Upload failed. Please try again.", t);
        alert(errorMessage);
    } finally {
        setIsUploading(false);
        setUploadProgress(0);
    }
};

// Socket.IO event handlers
export const setupSocketHandlers = (
    currentUser: User | null,
    setCurrentUser: (value: User | null | ((prev: User | null) => User | null)) => void,
    setAllUsers: (value: User[] | ((prev: User[]) => User[])) => void,
    setFetchedHostUsers: (value: Record<string, User> | ((prev: Record<string, User>) => Record<string, User>)) => void
) => {
    if (currentUser) {
        const handleUserUpdate = (updatedUser: User) => {
            // Update current user
            setCurrentUser(prev => {
                if (!prev) return null;
                const updated = { ...prev, ...updatedUser };
                localStorage.setItem('snapify_user_obj', JSON.stringify(updated));
                return updated;
            });

            // Update all users
            setAllUsers(prev => prev.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u));

            // Update fetched host users
            setFetchedHostUsers(prev => {
                if (prev[updatedUser.id]) {
                    return { ...prev, [updatedUser.id]: updatedUser };
                }
                return prev;
            });
        };

        socketService.on('user_updated', handleUserUpdate);

        return () => {
            socketService.off('user_updated', handleUserUpdate);
        };
    }
};

// No export block needed - all functions are already exported inline