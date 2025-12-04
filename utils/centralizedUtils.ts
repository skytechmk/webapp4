/**
 * Centralized Utilities Module
 * Main utility hub that re-exports focused utility modules
 * This serves as a single import point for all utility functions
 */

import { User, Event, MediaItem, UserRole, TierLevel } from '../types';
import { api } from '../services/api';
import { TRANSLATIONS } from '../constants';
import { socketService } from '../services/socketService';
import { clearDeviceFingerprint } from './deviceFingerprint';
import { TIER_CONFIG, getTierConfigForUser } from '../types';
import * as React from 'react';

// Import from focused utility modules
import { validateEmail, validatePassword, validateEventTitle, validateEventDescription, validateGuestName, sanitizeInput } from './validation';
import { safeSetItem, safeGetItem, safeRemoveItem, safeSetObject, safeGetObject } from './storageUtils';
import { handleUserUpdate } from './userManagementUtils';
import { incrementEventViews, handleLikeMedia, handleSetCoverImage } from './eventManagementUtils';
import { finalizeLogin, handleLogout } from './authenticationUtils';
import { handleError } from './errorHandlingUtils';
import { handleFileUpload, confirmUpload } from './mediaManagementUtils';

declare const process: {
    env: {
        VITE_API_URL?: string;
    };
};

// Re-export all utility functions for backward compatibility
export {
    // Validation utilities
    validateEmail,
    validatePassword,
    validateEventTitle,
    validateEventDescription,
    validateGuestName,
    sanitizeInput,

    // Storage utilities
    safeSetItem,
    safeGetItem,
    safeRemoveItem,
    safeSetObject,
    safeGetObject,

    // User management utilities
    handleUserUpdate,

    // Event management utilities
    incrementEventViews,
    handleLikeMedia,
    handleSetCoverImage,

    // Authentication utilities
    finalizeLogin,
    handleLogout,

    // Error handling utilities
    handleError,

    // Media management utilities
    handleFileUpload,
    confirmUpload
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
): Promise<void> => {
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
    } catch (e) {
        alert("Failed to create event");
    }
};

// Socket.IO event handlers
export const setupSocketHandlers = (
    currentUser: User | null,
    setCurrentUser: (value: User | null | ((prev: User | null) => User | null)) => void,
    setAllUsers: (value: User[] | ((prev: User[]) => User[])) => void,
    setFetchedHostUsers: (value: Record<string, User> | ((prev: Record<string, User>) => Record<string, User>)) => void
): (() => void) | undefined => {
    if (currentUser) {
        const handleUserUpdate = (updatedUser: User) => {
            // Update current user
            setCurrentUser(prev => {
                if (!prev) return null;
                const updated = { ...prev, ...updatedUser };
                safeSetObject('snapify_user_obj', updated);
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