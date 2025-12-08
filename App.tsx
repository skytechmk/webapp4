import React, { useState, useEffect, useRef, Suspense } from 'react';
// @ts-ignore
import JSZip from 'jszip';
// @ts-ignore
import { jwtDecode } from 'jwt-decode';
import { User, Event, MediaItem, UserRole, TierLevel, Language, TranslateFn, TIER_CONFIG, getTierConfigForUser, getTierConfig } from './types';
import { api } from './services/api';
import { TRANSLATIONS } from './constants';
// CameraCapture import removed - switching to native camera
import { Navigation } from './components/Navigation';
import { CreateEventModal } from './components/CreateEventModal';
import { ContactModal } from './components/ContactModal';
import { GuestLoginModal } from './components/GuestLoginModal';
import { StudioSettingsModal } from './components/StudioSettingsModal';
import { MediaReviewModal } from './components/MediaReviewModal';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { OfflineBanner } from './components/OfflineBanner';
import { ShareTargetHandler } from './components/ShareTargetHandler';
import { ReloadPrompt } from './components/ReloadPrompt';
import { ErrorBoundary } from './components/ErrorBoundary';
import { EventSkeleton } from './components/LoadingSkeleton';
import { ShieldAlert } from 'lucide-react';
import { lazy } from 'react';

import { DashboardView } from './components/views/DashboardView';

const LandingView = lazy(() => import('./components/views/LandingView').then(module => ({ default: module.LandingView })));
const EventView = lazy(() => import('./components/views/EventView').then(module => ({ default: module.EventView })));
import { applyWatermark } from './utils/imageProcessing';
import { getStoredUserId, isKnownDevice, clearDeviceFingerprint } from './utils/deviceFingerprint';
import { isMobileDevice } from './utils/deviceDetection';
import { socketService } from './services/socketService';

// Safe access to env variables
// @ts-ignore
const env: any = (import.meta as any).env || {};

// Security: API URL configuration
const API_URL = env.VITE_API_URL || 'http://localhost:3001';

// Security: Input validation helper
const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const sanitizeInput = (input: string): string => {
    return input.replace(/[<>]/g, '').trim();
};

const safeSetItem = (key: string, value: string) => {
    try {
        localStorage.setItem(key, value);
    } catch (error) {
        console.warn('Failed to save to localStorage:', error);
    }
};

const safeGetItem = (key: string): string => {
    try {
        return localStorage.getItem(key) || '';
    } catch (error) {
        console.warn('Failed to read from localStorage:', error);
        return '';
    }
};

const safeRemoveItem = (key: string) => {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.warn('Failed to remove from localStorage:', error);
    }
};

declare global {
    interface Window {
        google?: any;
        googleSignInInitialized?: boolean;
    }
}

export default function App() {
    console.log('🚀 Snapify App v4.0 loaded at:', new Date().toISOString());

    // -- State --
    const [view, setView] = useState<'landing' | 'dashboard' | 'event' | 'admin' | 'live'>('landing');
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [events, setEvents] = useState<Event[]>([]);
    const [currentEventId, setCurrentEventId] = useState<string | null>(null);
    // isCameraOpen state removed as we use native camera now
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [language, setLanguage] = useState<Language>('en');
    const [authError, setAuthError] = useState('');

    // Guest Mode State
    const [guestName, setGuestName] = useState(() => safeGetItem('snapify_guest_name') || '');
    const [showGuestLogin, setShowGuestLogin] = useState(false);
    const [pendingAction, setPendingAction] = useState<'upload' | 'camera' | null>(null);
    const [lastUsedInput, setLastUsedInput] = useState<'upload' | 'camera'>('upload'); // To handle retakes correctly

    // Modals State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showContactModal, setShowContactModal] = useState(false);
    const [showStudioSettings, setShowStudioSettings] = useState(false);

    // Media / Studio State
    const [applyWatermarkState, setApplyWatermarkState] = useState(false);
    const [downloadingZip, setDownloadingZip] = useState(false);

    // Preview & Upload State
    const [previewMedia, setPreviewMedia] = useState<{ type: 'image' | 'video', src: string, file?: File } | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null); // NEW: Dedicated ref for camera input

    // -- FIX: Auto-Persistence --
    useEffect(() => {
        if (currentUser) {
            localStorage.setItem('snapify_user_obj', JSON.stringify(currentUser));
        }
    }, [currentUser]);

    // -- NEW: Listen for Admin Forced Reloads --
    useEffect(() => {
        socketService.connect();

        const handleForceReload = async () => {
            console.log("Received force reload signal from admin.");

            // 1. Unregister Service Workers
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const registration of registrations) {
                    await registration.unregister();
                }
            }

            // 2. Clear specific caches if possible (optional, reload usually handles it if SW is gone)
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                cacheNames.forEach(cacheName => {
                    caches.delete(cacheName);
                });
            }

            // 3. Hard Reload
            window.location.reload();
        };

        socketService.on('force_client_reload', handleForceReload);

        // AUTO FORCE RELOAD ON VERSION MISMATCH (for development)
        const checkVersion = async () => {
            try {
                const response = await fetch('/version.json?' + Date.now());
                if (response.ok) {
                    const data = await response.json();
                    const currentVersion = data.version;
                    const storedVersion = localStorage.getItem('snapify_version');

                    if (storedVersion !== currentVersion) {
                        console.log('Version mismatch detected, forcing cache clear and reload');
                        localStorage.setItem('snapify_version', currentVersion);

                        // 1. Unregister all Service Workers
                        if ('serviceWorker' in navigator) {
                            const registrations = await navigator.serviceWorker.getRegistrations();
                            for (const registration of registrations) {
                                await registration.unregister();
                            }
                        }

                        // 2. Clear all Caches
                        if ('caches' in window) {
                            const cacheNames = await caches.keys();
                            await Promise.all(cacheNames.map(name => caches.delete(name)));
                        }

                        // 3. Force Reload from Server
                        window.location.reload();
                    }
                }
            } catch (e) {
                // Version check failed, continue normally
            }
        };

        checkVersion();

        return () => {
            socketService.off('force_client_reload', handleForceReload);
        };
    }, []);

    // -- FIX: Force cache refresh for iOS PWA issues --
    useEffect(() => {
        const forceCacheRefresh = async () => {
            // Check if this is an iOS device with potential cache issues
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
            const isPWA = window.matchMedia('(display-mode: standalone)').matches;

            if (isIOS && isPWA) {
                // Force refresh cache on app launch for iOS PWA
                try {
                    const cacheNames = await caches.keys();
                    await Promise.all(cacheNames.map(name => caches.delete(name)));
                    console.log('iOS PWA cache cleared');
                } catch (error) {
                    console.warn('Failed to clear iOS PWA cache:', error);
                }
            }
        };

        forceCacheRefresh();
    }, []);

    // -- Real-time User Updates --
    useEffect(() => {
        if (currentUser?.id) {
            socketService.connect();

            const handleUserUpdate = (updatedUser: User) => {
                if (updatedUser.id === currentUser.id) {
                    setCurrentUser(prev => {
                        if (!prev) return null;
                        return { ...prev, ...updatedUser };
                    });
                }
                setAllUsers(prev => prev.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u));
            };

            socketService.on('user_updated', handleUserUpdate);

            return () => {
                socketService.off('user_updated', handleUserUpdate);
            };
        }
    }, [currentUser?.id]);

    // -- Initialization --
    const loadInitialData = async () => {
        console.log('🚀 loadInitialData starting...');
        try {
            console.log('🚀 Inside try block of loadInitialData');
            const token = localStorage.getItem('snapify_token');
            const storedUserId = localStorage.getItem('snapify_user_id');

            console.log('loadInitialData: Checking authentication', { token: !!token, storedUserId });

            let currentUserFromStorage: User | null = null;

            // Handle shared event from URL first (works for both authenticated and guest users)
            const params = new URLSearchParams(window.location.search);
            const sharedEventId = params.get('event');
            let sharedEventLoaded = false;

            console.log("App initialization - URL params:", { sharedEventId, fullUrl: window.location.href });

            if (sharedEventId) {
                console.log("Detected shared event ID in URL:", sharedEventId);
                try {
                    console.log("Loading shared event:", sharedEventId);
                    const sharedEvent = await api.fetchEventById(sharedEventId);
                    if (sharedEvent) {
                        console.log("Shared event loaded successfully:", sharedEvent.title);
                        setEvents(prev => {
                            if (!prev.find(e => e.id === sharedEventId)) return [...prev, sharedEvent];
                            return prev;
                        });
                        setCurrentEventId(sharedEventId);
                        incrementEventViews(sharedEventId, [sharedEvent]);
                        sharedEventLoaded = true;

                        // FIX: Don't return early - continue with authentication check
                        // This ensures logged-in users maintain their session when scanning QR codes
                        // The view will be set to 'event' but authentication will still be checked
                    } else {
                        console.warn("Shared event returned null for ID:", sharedEventId);
                        alert("Event not found. Please check the link and try again.");
                        // Clear the invalid event parameter from URL
                        const url = new URL(window.location.href);
                        url.searchParams.delete('event');
                        window.history.replaceState({}, '', url.toString());
                    }
                } catch (error: any) {
                    console.error("Failed to fetch shared event", error);
                    // CRITICAL FIX: Don't clear the URL parameter on API failure
                    // This allows users to refresh and try again
                    console.log("Keeping event parameter in URL for retry on refresh");

                    // Show specific error messages but keep URL for retry
                    if (error.message?.includes('404') || error.message?.includes('Not Found')) {
                        alert("Event not found. Please check the link and try again.");
                    } else if (error.message?.includes('410') || error.message?.includes('expired')) {
                        alert("This event has expired and is no longer accessible.");
                    } else {
                        alert("Unable to load event. Please try again later.");
                    }

                    // DON'T clear the URL - allow refresh to retry
                    // const url = new URL(window.location.href);
                    // url.searchParams.delete('event');
                    // window.history.replaceState({}, '', url.toString());
                }
            }

            // Handle authenticated user flow
            if (token && storedUserId) {
                console.log('loadInitialData: Found authentication tokens, attempting to authenticate');
                try {
                    const savedUserStr = localStorage.getItem('snapify_user_obj');
                    if (savedUserStr) {
                        currentUserFromStorage = JSON.parse(savedUserStr);
                        console.log('loadInitialData: Loaded user from storage', { userId: currentUserFromStorage.id, role: currentUserFromStorage.role });
                        setCurrentUser(currentUserFromStorage);
                    }
                    const eventsData = await api.fetchEvents();
                    console.log('loadInitialData: Fetched events data', eventsData.length);
                    setEvents(prevEvents => {
                        // Merge with existing events, avoiding duplicates
                        const merged = [...prevEvents];
                        eventsData.forEach(event => {
                            if (!merged.find(e => e.id === event.id)) {
                                merged.push(event);
                            }
                        });
                        return merged;
                    });

                    if (currentUserFromStorage?.role === 'ADMIN') {
                        // FIXED: Safe users fetching with validation
                        try {
                            const usersData = await api.fetchUsers();
                            // FIXED: Validate users array to prevent filter/map errors
                            const validatedUsers: User[] = Array.isArray(usersData) ? usersData.map(u => ({
                                ...u,
                                role: (u.role as UserRole) || UserRole.USER,
                                tier: (u.tier as TierLevel) || TierLevel.FREE,
                                storageUsedMb: u.storageUsedMb || 0,
                                storageLimitMb: u.storageLimitMb || 100
                            })) : [];
                            setAllUsers(validatedUsers);
                        } catch (usersError) {
                            console.warn('Failed to fetch users data:', usersError);
                            setAllUsers([]); // Fallback to empty array
                        }
                    }

                    // FIX: If we have a shared event loaded, stay on event view for authenticated users
                    // This prevents QR code scanning from requiring re-authentication
                    if (sharedEventId && currentEventId) {
                        setView('event');
                    } else {
                        const targetView = currentUserFromStorage.role === 'ADMIN' ? 'admin' : 'dashboard';
                        setView(targetView);
                    }
                } catch (e) {
                    console.warn("Session expired or invalid", e);
                    handleLogout();
                    currentUserFromStorage = null;
                    setView('landing');
                }
            } else {
                // CRITICAL FIX: For guests, if there's ANY shared event ID in URL, force event view
                console.log("🎯 GUEST USER - sharedEventId:", sharedEventId, "currentEventId:", currentEventId);
                if (sharedEventId) {
                    console.log("🎉 GUEST ACCESS GRANTED - Setting view to event");
                    setCurrentEventId(sharedEventId);
                    setView('event');
                } else {
                    console.log("No shared event for guest, going to landing");
                    setView('landing');
                }
            }

        } catch (err) {
            console.error("Failed to load data", err);
            setView('landing');
        }
    };

    // Handle QR code deep linking and URL parameter changes
    useEffect(() => {
        const handleUrlChange = () => {
            const params = new URLSearchParams(window.location.search);
            const eventId = params.get('event');
            if (eventId && eventId !== currentEventId) {
                console.log("URL changed with event parameter:", eventId);
                // Load the event if it's different from current
                api.fetchEventById(eventId).then(event => {
                    if (event) {
                        setEvents(prev => prev.some(e => e.id === eventId) ? prev : [...prev, event]);
                        setCurrentEventId(eventId);
                        setView('event');
                        incrementEventViews(eventId, [event]);
                    }
                }).catch(error => {
                    console.error("Failed to load event from URL change:", error);
                });
            }
        };

        // Listen for popstate events (browser back/forward)
        window.addEventListener('popstate', handleUrlChange);

        return () => {
            window.removeEventListener('popstate', handleUrlChange);
        };
    }, [currentEventId]);

    useEffect(() => {
        loadInitialData();
        const initGoogle = () => {
            if (window.google && env.VITE_GOOGLE_CLIENT_ID) {
                try {
                    window.google.accounts.id.initialize({
                        client_id: env.VITE_GOOGLE_CLIENT_ID,
                        callback: handleGoogleResponse,
                        ux_mode: 'popup',
                        use_fedcm_for_prompt: false,
                        auto_select: false,
                        cancel_on_tap_outside: false
                    });
                    window.googleSignInInitialized = true;

                    // Dispatch event to notify components that GSI is ready
                    const event = new CustomEvent('gsiInitialized', {
                        detail: { initialized: true }
                    });
                    window.dispatchEvent(event);
                } catch (e) {
                    console.error("Error initializing Google Auth", e);
                }
            }
        };
        if (window.google) initGoogle();
        else {
            const interval = setInterval(() => {
                if (window.google) { initGoogle(); clearInterval(interval); }
            }, 200);
            setTimeout(() => clearInterval(interval), 10000);
        }
    }, []);

    const handleGoogleResponse = async (response: any) => {
        try {
            const credential = response.credential;
            try {
                const res = await api.googleLogin(credential);
                finalizeLogin(res.user, res.token);
            } catch (e) {
                console.error("Backend auth failed", e);
                setAuthError("Authentication failed");
            }
        } catch (error) {
            console.error("Google Login Error", error);
            setAuthError(t('authErrorInvalid'));
        }
    };

    const finalizeLogin = async (user: User, token: string) => {
        setCurrentUser(user);
        localStorage.setItem('snapify_token', token);
        localStorage.setItem('snapify_user_id', user.id);
        localStorage.setItem('snapify_user_obj', JSON.stringify(user));

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
                        console.error("Could not load URL event after login", err);
                        setView('dashboard');
                    }
                }
            } else if (currentEventId) {
                const targetEvent = eventsData.find(e => e.id === currentEventId);
                if (targetEvent) {
                    setView('event');
                } else {
                    try {
                        const sharedEvent = await api.fetchEventById(currentEventId);
                        setEvents(prev => {
                            if (prev.some(e => e.id === currentEventId)) return prev;
                            return [...prev, sharedEvent];
                        });
                        setView('event');
                    } catch {
                        setView('dashboard');
                    }
                }
            } else if (user.role === 'ADMIN') {
                // FIXED: Validate admin user data to prevent array operation errors
                const validatedUser: User = {
                    ...user,
                    role: (user.role as UserRole) || UserRole.ADMIN,
                    tier: (user.tier as TierLevel) || TierLevel.STUDIO,
                    storageUsedMb: user.storageUsedMb || 0,
                    storageLimitMb: user.storageLimitMb || -1, // Unlimited for admin
                    joinedDate: user.joinedDate || new Date().toISOString().split('T')[0]
                };

                setCurrentUser(validatedUser);
                localStorage.setItem('snapify_token', token);
                localStorage.setItem('snapify_user_id', validatedUser.id);
                localStorage.setItem('snapify_user_obj', JSON.stringify(validatedUser));

                try {
                    const eventsData = await api.fetchEvents();
                    setEvents(eventsData);

                    // FIXED: Safe users fetching with error handling
                    try {
                        const usersData = await api.fetchUsers();
                        // FIXED: Validate users array to prevent filter/map errors
                        const validatedUsers: User[] = Array.isArray(usersData) ? usersData.map(u => ({
                            ...u,
                            role: (u.role as UserRole) || UserRole.USER,
                            tier: (u.tier as TierLevel) || TierLevel.FREE,
                            storageUsedMb: u.storageUsedMb || 0,
                            storageLimitMb: u.storageLimitMb || 100
                        })) : [];
                        setAllUsers(validatedUsers);
                    } catch (usersError) {
                        console.warn('Failed to fetch users data:', usersError);
                        setAllUsers([]); // Fallback to empty array
                    }

                    setView('admin');
                } catch (error) {
                    console.error('Error during admin login:', error);
                    setView('dashboard'); // Fallback to regular dashboard
                }
            } else {
                setView('dashboard');
            }
        } catch (error) {
            console.error("Error during finalizeLogin", error);
            setView('dashboard');
        }
    };

    const incrementEventViews = async (id: string, currentEvents: Event[]) => {
        const updated = currentEvents.map(e => {
            if (e.id === id) return { ...e, views: (e.views || 0) + 1 };
            return e;
        });
        setEvents(updated);

        // Only update server view count if user is authenticated
        // Guests can see local view count but it won't persist
        if (currentUser) {
            const evt = currentEvents.find(e => e.id === id);
            if (evt) {
                try {
                    await api.updateEvent({ ...evt, views: (evt.views || 0) + 1 });
                } catch (error) {
                    console.warn('Failed to update event views (guest user):', error);
                    // Don't show error to user - view counting is not critical
                }
            }
        }
    };

    useEffect(() => { localStorage.setItem('snapify_lang', language); }, [language]);
    const t: TranslateFn = (key: string) => {
        return TRANSLATIONS[language][key] || TRANSLATIONS['en'][key] || key;
    };
    const changeLanguage = (lang: Language) => setLanguage(lang);

    const activeEvent = events.find(e => e.id === currentEventId);
    const isOwner = currentUser && activeEvent && currentUser.id === activeEvent.hostId;
    const isEventExpired = activeEvent?.expiresAt ? new Date() > new Date(activeEvent.expiresAt) : false;
    const hostUser = allUsers.find(u => u.id === activeEvent?.hostId) || (currentUser?.id === activeEvent?.hostId ? currentUser : undefined);
    const isHostPhotographer = hostUser?.role === UserRole.PHOTOGRAPHER;

    const handleEmailAuth = async (data: any, isSignUp: boolean) => {
        if (isLoggingIn) return;
        setAuthError('');
        setIsLoggingIn(true);

        try {
            const { email, password, name, isPhotographer, studioName } = data;
            if (!email || !password) {
                setAuthError(t('authErrorRequired'));
                return;
            }
            if (!validateEmail(email)) {
                setAuthError(t('authErrorInvalidEmail'));
                return;
            }
            if (password.length < 6) {
                setAuthError(t('authErrorPasswordLength'));
                return;
            }
            if (isSignUp) {
                if (!name || name.trim().length < 2) {
                    setAuthError(t('authErrorNameRequired'));
                    return;
                }
                const sanitizedName = sanitizeInput(name);
                const sanitizedStudioName = studioName ? sanitizeInput(studioName) : undefined;
                const newUser: User = {
                    id: `user-${Date.now()}`,
                    name: sanitizedName,
                    email: email.toLowerCase().trim(),
                    role: UserRole.USER,
                    tier: TierLevel.FREE,
                    storageUsedMb: 0,
                    storageLimitMb: 100,
                    joinedDate: new Date().toISOString().split('T')[0],
                    studioName: isPhotographer ? sanitizedStudioName : undefined
                };
                const res = await api.createUser(newUser);
                await finalizeLogin(res.user, res.token);
            } else {
                const res = await api.login(email.toLowerCase().trim(), password);
                await finalizeLogin(res.user, res.token);
            }
        } catch (e) {
            console.error(e);
            setAuthError(t('authErrorInvalid'));
        } finally {
            setIsLoggingIn(false);
        }
    };

    const handleGuestLogin = (name: string) => {
        setGuestName(name);
        safeSetItem('snapify_guest_name', name);
        setShowGuestLogin(false);

        if (currentEventId) setView('event');

        // UPDATED: Handle camera vs upload pending actions
        if (pendingAction === 'camera') cameraInputRef.current?.click();
        else if (pendingAction === 'upload') fileInputRef.current?.click();
        setPendingAction(null);
    };

    const handleSignInRequest = () => {
        setShowGuestLogin(false);
        setView('landing');
    };

    const handleCreateEvent = async (data: any) => {
        if (!currentUser) return;
        const { title, date, theme, description, pin, adminOptions } = data;

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

    const handleUpdateEvent = async (updatedEvent: Event) => {
        await api.updateEvent(updatedEvent);
        setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
    };

    const handleSetCoverImage = async (item: MediaItem) => {
        if (!currentEventId || !activeEvent) return;
        const updated = { ...activeEvent, coverImage: item.url, coverMediaType: item.type };
        await api.updateEvent(updated);
        setEvents(prev => prev.map(e => e.id === currentEventId ? updated : e));
        alert(t('coverSet'));
    };

    const handleLikeMedia = async (item: MediaItem) => {
        if (!currentEventId) return;
        setEvents(prev => prev.map(e => {
            if (e.id === currentEventId) {
                return { ...e, media: e.media.map(m => m.id === item.id ? { ...m, likes: (m.likes || 0) + 1 } : m) };
            }
            return e;
        }));
        await api.likeMedia(item.id);
    };

    const handleDeleteEvent = async (id: string) => {
        await api.deleteEvent(id);
        setEvents(prev => prev.filter(e => e.id !== id));
        if (currentEventId === id) setCurrentEventId(null);
    };

    const handleUpdateUser = async (updatedUser: User) => {
        const limit = TIER_CONFIG[updatedUser.tier].storageLimitMb;
        const userWithLimit = { ...updatedUser, storageLimitMb: limit };
        await api.updateUser(userWithLimit);
        setAllUsers(prev => prev.map(u => u.id === updatedUser.id ? userWithLimit : u));
        if (currentUser && currentUser.id === updatedUser.id) {
            setCurrentUser(userWithLimit);
            localStorage.setItem('snapify_user_obj', JSON.stringify(userWithLimit));
        }
    };

    const handleDeleteMedia = async (eventId: string, mediaId: string) => {
        await api.deleteMedia(mediaId);
        setEvents(prev => prev.map(event =>
            event.id === eventId
                ? { ...event, media: event.media.filter(media => media.id !== mediaId) }
                : event
        ));
    };

    const handleUpdateStudioSettings = async (updates: Partial<User>) => {
        if (!currentUser) return;
        const updatedUser = { ...currentUser, ...updates };
        await api.updateUser(updatedUser);
        setCurrentUser(updatedUser);
        setAllUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
        localStorage.setItem('snapify_user_obj', JSON.stringify(updatedUser));
    };

    const initiateMediaAction = (action: 'upload' | 'camera') => {
        console.log('initiateMediaAction called:', { action, hasCurrentUser: !!currentUser, currentUserRole: currentUser?.role, guestName, isMobile: isMobileDevice() });

        setLastUsedInput(action); // Keep track for retakes
        if (currentUser || guestName) {
            console.log('Proceeding with upload for authenticated user or guest');

            // CRITICAL FIX: On mobile, programmatic click() doesn't work
            // We need to use a different approach for mobile devices
            if (isMobileDevice()) {
                console.log('Mobile device detected, using mobile-specific upload flow');

                if (action === 'camera') {
                    // For mobile camera, we need to show a permission dialog first
                    // Then let the user manually trigger the camera
                    setPendingAction('camera');
                    setShowGuestLogin(true); // Reuse this modal to get user gesture
                } else {
                    // For file upload on mobile, same issue
                    setPendingAction('upload');
                    setShowGuestLogin(true); // This will trigger the file picker
                }
                return;
            }

            // Desktop flow (works fine)
            if (action === 'camera') {
                // Check if we're in a secure context (required for camera access)
                if (!window.isSecureContext && !window.location.href.startsWith('https://')) {
                    alert('Camera access requires HTTPS. Please use the secure version of the app.');
                    return;
                }

                // Desktop: directly trigger camera input
                cameraInputRef.current?.click();
            } else {
                // File upload - trigger immediately
                fileInputRef.current?.click();
            }
        } else {
            console.log('No authentication found, showing guest login modal');
            setPendingAction(action);
            setShowGuestLogin(true);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0] || !activeEvent) return;
        const file = e.target.files[0];
        const type = file.type.startsWith('video') ? 'video' : 'image';
        const url = URL.createObjectURL(file);
        setPreviewMedia({ type, src: url, file });
    };

    // CameraCapture related handler removed as component is removed

    const confirmUpload = async (userCaption: string, userPrivacy: 'public' | 'private') => {
        if (!activeEvent || !previewMedia) return;
        setIsUploading(true);
        setUploadProgress(0);

        console.log('🚀 Starting upload process:', { userCaption, userPrivacy, guestName, currentUser: !!currentUser });

        try {
            const { type, src, file } = previewMedia;
            const uploader = currentUser ? (currentUser.studioName || currentUser.name) : guestName || "Guest";
            const fileSizeMb = file ? file.size / (1024 * 1024) : (src.length * (3 / 4)) / (1024 * 1024);

            if (type === 'video') {
                let config;
                if (currentUser && activeEvent.hostId === currentUser.id) {
                    config = getTierConfigForUser(currentUser);
                } else if (activeEvent.hostTier) {
                    config = getTierConfig(activeEvent.hostTier);
                } else {
                    config = TIER_CONFIG[TierLevel.FREE];
                }

                if (!config.allowVideo) {
                    alert(t('videoRestricted'));
                    setIsUploading(false);
                    return;
                }
            }

            if (currentUser) {
                if (currentUser.storageUsedMb + fileSizeMb > currentUser.storageLimitMb) {
                    alert(t('storageLimit'));
                    setIsUploading(false);
                    return;
                }
            }

            let finalCaption = userCaption;
            if (!finalCaption && type === 'image' && currentUser) {
                // Only generate AI captions for authenticated users
                finalCaption = await api.generateImageCaption(src);
            }
            const config = currentUser ? getTierConfigForUser(currentUser) : TIER_CONFIG[TierLevel.FREE];
            const canWatermark = currentUser?.role === UserRole.PHOTOGRAPHER && config.allowWatermark;
            const shouldWatermark = applyWatermarkState && canWatermark;
            let uploadFile = file;

            if ((shouldWatermark && type === 'image' && currentUser) || (!file && type === 'image')) {
                let source = src;
                if (shouldWatermark && currentUser) {
                    source = await applyWatermark(src, currentUser.studioName || null, currentUser.logoUrl || null, currentUser.watermarkOpacity, currentUser.watermarkSize, currentUser.watermarkPosition, currentUser.watermarkOffsetX, currentUser.watermarkOffsetY);
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
                watermarkText: currentUser?.studioName,
                privacy: userPrivacy
            };

            console.log('📤 Upload metadata prepared:', { metadata, hasFile: !!uploadFile, eventId: activeEvent.id });

            if (uploadFile) {
                console.log('📤 Starting API upload call...');
                await api.uploadMedia(uploadFile, metadata, activeEvent.id, (percent) => {
                    setUploadProgress(percent);
                });
                console.log('✅ API upload completed successfully');
            }
            if (currentUser) {
                updateUserStorage(currentUser.id, fileSizeMb);
            }
            setPreviewMedia(null);
            // Clear BOTH inputs to ensure change event fires next time
            if (fileInputRef.current) fileInputRef.current.value = '';
            if (cameraInputRef.current) cameraInputRef.current.value = '';
        } catch (e) {
            console.error("❌ Upload failed with error:", e);
            console.error("❌ Error details:", {
                message: e.message,
                stack: e.stack,
                name: e.name
            });
            alert("Upload failed. Please try again.");
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    const downloadEventZip = async (targetEvent: Event) => {
        if (!targetEvent || targetEvent.media.length === 0) return;
        setDownloadingZip(true);
        try {
            const zip = new JSZip();
            const folder = zip.folder(targetEvent.title.replace(/[^a-z0-9]/gi, '_'));
            const eventHost = allUsers.find(u => u.id === targetEvent.hostId);
            const isFreeTier = !eventHost || eventHost.tier === TierLevel.FREE;
            const fetchFile = async (url: string) => {
                const fetchUrl = url.startsWith('http') || url.startsWith('data:') ? url : `${(env.VITE_API_URL || '')}${url}`;
                const res = await fetch(fetchUrl);
                return res.blob();
            };
            const blobToBase64 = (blob: Blob): Promise<string> => new Promise(resolve => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
            });
            for (const item of targetEvent.media) {
                const filename = `${item.id}.${item.type === 'video' ? 'mp4' : 'jpg'}`;
                if (!item.url) continue;
                let blob = await fetchFile(item.url);
                if (isFreeTier && item.type === 'image') {
                    try {
                        const base64 = await blobToBase64(blob);
                        const watermarkedDataUrl = await applyWatermark(base64, "SnapifY", null, 0.5, 30, 'center', 0, 0);
                        const cleanData = watermarkedDataUrl.split(',')[1];
                        if (folder) folder.file(filename, cleanData, { base64: true });
                        continue;
                    } catch (e) { console.warn("Failed to watermark image for zip", e); }
                }
                if (folder) folder.file(filename, blob);
            }
            const content = await zip.generateAsync({ type: "blob" });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = `${targetEvent.title.replace(/[^a-z0-9]/gi, '_')}_memories.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            await api.updateEvent({ ...targetEvent, downloads: (targetEvent.downloads || 0) + 1 });
            setEvents(prev => prev.map(e => e.id === targetEvent.id ? { ...e, downloads: (e.downloads || 0) + 1 } : e));
        } catch (err) {
            console.error("Failed to zip", err);
            alert(t('zipError'));
        } finally {
            setDownloadingZip(false);
        }
    };

    const handleLogout = () => {
        setCurrentUser(null);
        setGuestName('');
        setView('landing');
        setCurrentEventId(null);
        localStorage.removeItem('snapify_token');
        localStorage.removeItem('snapify_user_id');
        localStorage.removeItem('snapify_user_obj');
        safeRemoveItem('snapify_guest_name');
        clearDeviceFingerprint();
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.search = "";
            window.history.pushState({}, '', url.toString());
            window.location.href = '/';
        }
    };

    const handleBack = () => {
        if (view === 'event') {
            setCurrentEventId(null);
            const url = new URL(window.location.href);
            if (url.searchParams.has('event')) {
                url.searchParams.delete('event');
                window.history.replaceState({}, '', url.toString());
            }
            setView(currentUser ? (currentUser.role === 'ADMIN' ? 'admin' : 'dashboard') : 'landing');
        } else if (view === 'dashboard' || view === 'admin') {
            handleLogout();
        }
    };

    const updateUserStorage = async (userId: string, fileSizeMb: number) => {
        const user = allUsers.find(u => u.id === userId);
        if (user) {
            const updatedUser = { ...user, storageUsedMb: user.storageUsedMb + fileSizeMb };
            await api.updateUser(updatedUser);
            setAllUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));
            if (currentUser && currentUser.id === userId) {
                setCurrentUser(updatedUser);
                localStorage.setItem('snapify_user_obj', JSON.stringify(updatedUser));
            }
        }
    };

    const handleIncomingShare = (text: string) => {
        if (currentEventId) {
            alert(`Shared to SnapifY: ${text}`);
        } else {
            localStorage.setItem('snapify_shared_pending', text);
        }
    };

    return (
        <ErrorBoundary>
            <div className="h-[100dvh] w-full flex flex-col bg-slate-50">
                <OfflineBanner t={t} />
                <ShareTargetHandler onShareReceive={handleIncomingShare} />
                <ReloadPrompt />

                {view !== 'landing' && (
                    <div className="flex-shrink-0 z-50 w-full bg-slate-50/95 backdrop-blur-md border-b border-slate-200">
                        <Navigation
                            currentUser={currentUser}
                            guestName={guestName}
                            view={view}
                            currentEventTitle={activeEvent?.title}
                            language={language}
                            onChangeLanguage={changeLanguage}
                            onLogout={handleLogout}
                            onSignIn={handleSignInRequest}
                            onHome={() => {
                                setCurrentEventId(null);
                                if (currentUser) setView(currentUser.role === 'ADMIN' ? 'admin' : 'dashboard');
                                else setView('landing');
                            }}
                            onBack={handleBack}
                            onToAdmin={() => setView('admin')}
                            onOpenSettings={() => setShowStudioSettings(true)}
                            t={t}
                        />
                    </div>
                )}

                <div className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth w-full relative no-scrollbar">
                    {view === 'landing' ? (
                        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-pulse text-slate-500">Loading...</div></div>}>
                            <LandingView
                                onGoogleLogin={() => { if (window.google) window.google.accounts.id.prompt(); }}
                                onEmailAuth={handleEmailAuth}
                                onContactSales={() => setShowContactModal(true)}
                                isLoggingIn={isLoggingIn}
                                authError={authError}
                                language={language}
                                onChangeLanguage={changeLanguage}
                                t={t}
                                showContactModal={showContactModal}
                                onCloseContactModal={() => setShowContactModal(false)}
                            />
                        </Suspense>
                    ) : (
                        <div className="flex flex-col min-h-full">
                            <div className="flex-1 pb-32">
                                {(view === 'admin' || view === 'dashboard') && (
                                    <DashboardView
                                        view={view as 'admin' | 'dashboard'}
                                        currentUser={currentUser}
                                        allUsers={allUsers}
                                        events={events}
                                        onClose={() => setView('dashboard')}
                                        onLogout={handleLogout}
                                        onDeleteUser={async (id) => { await api.deleteUser(id); setAllUsers(prev => prev.filter(u => u.id !== id)); }}
                                        onDeleteEvent={handleDeleteEvent}
                                        onDeleteMedia={handleDeleteMedia}
                                        onUpdateEvent={handleUpdateEvent}
                                        onUpdateUser={handleUpdateUser}
                                        onNewEvent={() => setShowCreateModal(true)}
                                        onDownloadEvent={downloadEventZip}
                                        onSelectEvent={(id) => { setCurrentEventId(id); setView('event'); }}
                                        onRequestUpgrade={() => setShowContactModal(true)}
                                        t={t}
                                    />
                                )}

                                {(view === 'event' || view === 'live') && (
                                    <Suspense fallback={<EventSkeleton />}>
                                        <EventView
                                            view={view as 'event' | 'live'}
                                            activeEvent={activeEvent}
                                            currentUser={currentUser}
                                            hostUser={hostUser}
                                            isEventExpired={isEventExpired}
                                            isOwner={Boolean(isOwner)}
                                            isHostPhotographer={Boolean(isHostPhotographer)}
                                            downloadingZip={downloadingZip}
                                            applyWatermark={applyWatermarkState}
                                            setApplyWatermark={setApplyWatermarkState}
                                            onDownloadAll={(media) => downloadEventZip({ ...activeEvent!, media: media || activeEvent!.media })}
                                            onSetCover={handleSetCoverImage}
                                            onUpload={initiateMediaAction}
                                            onLike={handleLikeMedia}
                                            onOpenLiveSlideshow={() => setView('live')}
                                            onCloseLiveSlideshow={() => setView('event')}
                                            t={t}
                                        />
                                    </Suspense>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {view !== 'landing' && <PWAInstallPrompt t={t} />}

                {/* INPUTS: One for general upload, one for camera snap */}
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*,video/*"
                    onChange={handleFileUpload}
                />

                {/* Camera Specific Input: uses capture='environment' to force native camera */}
                {/* FIX: RESTRICT TO IMAGE TO FORCE CAMERA ON iOS */}
                <input
                    key="camera-input-v2" // Force re-render
                    type="file"
                    ref={cameraInputRef}
                    className="hidden"
                    accept="image/*" // STRICTLY IMAGE
                    capture="environment" // REAR CAMERA
                    onChange={handleFileUpload}
                />

                {previewMedia && (
                    <MediaReviewModal
                        type={previewMedia.type}
                        src={previewMedia.src}
                        onConfirm={confirmUpload}
                        onRetake={() => {
                            setPreviewMedia(null);
                            // Use state to determine which input to re-trigger
                            if (lastUsedInput === 'camera') cameraInputRef.current?.click();
                            else fileInputRef.current?.click();
                        }}
                        onCancel={() => setPreviewMedia(null)}
                        isUploading={isUploading}
                        uploadProgress={uploadProgress}
                        isRegistered={!!currentUser}
                        t={t}
                        file={previewMedia.file} // Pass file for EXIF
                    />
                )}

                {/* UPDATED: High-visibility version debug badge */}
                <div className="fixed bottom-4 left-4 z-[9999] pointer-events-none bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg opacity-80">
                    Beta Testing v4.0
                </div>

                {/* CameraCapture component removed entirely */}
                {showContactModal && <ContactModal onClose={() => setShowContactModal(false)} t={t} />}
                {showGuestLogin && <GuestLoginModal onLogin={handleGuestLogin} onRegister={handleSignInRequest} onCancel={() => setShowGuestLogin(false)} t={t} />}
                {showCreateModal && currentUser && <CreateEventModal currentUser={currentUser} onClose={() => setShowCreateModal(false)} onCreate={handleCreateEvent} t={t} />}
                {showStudioSettings && currentUser && <StudioSettingsModal currentUser={currentUser} onClose={() => setShowStudioSettings(false)} onSave={handleUpdateStudioSettings} t={t} />}
            </div>
        </ErrorBoundary>
    );
}
