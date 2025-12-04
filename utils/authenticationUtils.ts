/**
 * Authentication Utilities Module
 * Focused utility functions for authentication operations
 */

import { User, UserRole, TierLevel } from '../types';
import { api } from '../services/api';
import { safeSetItem, safeGetItem, safeRemoveItem, safeSetObject } from './storageUtils';
import { clearDeviceFingerprint } from './deviceFingerprint';

declare const process: {
    env: {
        VITE_API_URL?: string;
    };
};

export const finalizeLogin = async (
    user: User,
    token: string,
    setCurrentUser: (value: User | null | ((prev: User | null) => User | null)) => void,
    setEvents: (value: any[] | ((prev: any[]) => any[])) => void,
    setAllUsers: (value: User[] | ((prev: User[]) => User[])) => void,
    setView: (view: 'landing' | 'dashboard' | 'event' | 'admin' | 'live') => void,
    setCurrentEventId: (eventId: string | null) => void
): Promise<void> => {
    setCurrentUser(user);
    safeSetItem('snapify_token', token);
    safeSetItem('snapify_user_id', user.id);
    safeSetObject('snapify_user_obj', user);

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
                } catch (err) {
                    setView('dashboard');
                }
            }
        } else if (user.role === UserRole.ADMIN) {
            const usersData = await api.fetchUsers();
            setAllUsers(usersData);
            setView('admin');
        } else {
            setView('dashboard');
        }
    } catch (error) {
        setView('dashboard');
    }
};

export const handleLogout = async (
    currentUser: User | null,
    setCurrentUser: (value: User | null | ((prev: User | null) => User | null)) => void,
    setGuestName: (name: string) => void,
    setView: (view: 'landing' | 'dashboard' | 'event' | 'admin' | 'live') => void,
    setCurrentEventId: (eventId: string | null) => void
): Promise<void> => {
    if (currentUser) {
        try {
            await fetch(`${process.env.VITE_API_URL || ''}/api/auth/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${safeGetItem('snapify_token')}`,
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