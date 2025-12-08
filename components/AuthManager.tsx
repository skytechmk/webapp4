import * as React from "react";
const { useState, useEffect, useCallback } = React;
import { User, Event, TierLevel, Language, TranslateFn, UserRole } from '../types';
import { api } from '../services/api';
import { TRANSLATIONS } from '../constants';
import { validateGuestName, sanitizeInput, validateEmail, validatePassword, validateEventTitle, validateEventDescription } from '../utils/validation';
import { socketService } from '../services/socketService';
import { clearDeviceFingerprint } from '../utils/deviceFingerprint';
import { TIER_CONFIG, getTierConfigForUser, getTierConfig } from '../types';
import { safePostMessage, handlePostMessageError, postMessageFallbacks } from '../utils/postMessageUtils';

interface AuthManagerReturnType {
    currentUser: User | null;
    guestName: string;
    isLoggingIn: boolean;
    authError: string;
    language: Language;
    handleEmailAuth: (data: any, isSignUp: boolean) => Promise<void>;
    handleGuestLogin: (name: string) => void;
    handleSignInRequest: () => void;
    handleLogout: () => Promise<void>;
    handleBack: () => void;
    changeLanguage: (lang: Language) => void;
    t: TranslateFn;
    fetchHostUser: (hostId: string) => Promise<void>;
    loadInitialData: () => Promise<void>;
}

interface AuthManagerProps {
    currentUser: User | null;
    setCurrentUser: (user: User | null | ((prev: User | null) => User | null)) => void;
    guestName: string;
    setGuestName: (name: string) => void;
    language: Language;
    setLanguage: (lang: Language) => void;
    setView: (view: 'landing' | 'dashboard' | 'event' | 'admin' | 'live') => void;
    setCurrentEventId: (eventId: string | null) => void;
    setEvents: (events: Event[] | ((prev: Event[]) => Event[])) => void;
    setAllUsers: (users: User[] | ((prev: User[]) => User[])) => void;
    setShowGuestLogin: (show: boolean) => void;
    setPendingAction: (action: 'upload' | 'camera' | null) => void;
    setLastUsedInput: (input: 'upload' | 'camera') => void;
    setShowCreateModal: (show: boolean) => void;
    setShowContactModal: (show: boolean) => void;
    setSelectedTier: (tier: TierLevel | undefined) => void;
    setShowStudioSettings: (show: boolean) => void;
    setFetchedHostUsers: (users: Record<string, User> | ((prev: Record<string, User>) => Record<string, User>)) => void;
    t: TranslateFn;
}

declare global {
    interface Window {
        google?: any;
        googleSignInInitialized?: boolean;
    }
}

// GSI Initialization Validation Utility
export const validateGsiInitialization = (): { isValid: boolean; error?: string } => {
    if (!window.google) {
        return {
            isValid: false,
            error: 'Google API not loaded'
        };
    }

    if (!window.google.accounts || !window.google.accounts.id) {
        return {
            isValid: false,
            error: 'Google Identity Services not available'
        };
    }

    if (!window.googleSignInInitialized) {
        return {
            isValid: false,
            error: 'Google Sign-In not initialized - call initialize() first'
        };
    }

    return { isValid: true };
};

// GSI Error Handler
export const handleGsiError = (error: any, context: string) => {
    console.error(`[GSI_ERROR] ${context}:`, error);

    // Dispatch error event for global handling
    const errorEvent = new CustomEvent('gsiError', {
        detail: {
            error: error,
            context: context,
            timestamp: new Date().toISOString()
        }
    });
    window.dispatchEvent(errorEvent);
};

export const AuthManager: React.FC<AuthManagerProps> = ({
    currentUser,
    setCurrentUser,
    guestName,
    setGuestName,
    language,
    setLanguage,
    setView,
    setCurrentEventId,
    setEvents,
    setAllUsers,
    setShowGuestLogin,
    setPendingAction,
    setLastUsedInput,
    setShowCreateModal,
    setShowContactModal,
    setSelectedTier,
    setShowStudioSettings,
    setFetchedHostUsers,
    t
}) => {
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [authError, setAuthError] = useState('');

    // Safe localStorage operations
    const safeSetItem = (key: string, value: string) => {
        try { localStorage.setItem(key, value); } catch (error) { console.warn('Failed to save to localStorage:', error); }
    };

    const safeGetItem = (key: string): string => {
        try { return localStorage.getItem(key) || ''; } catch (error) { return ''; }
    };

    const safeRemoveItem = (key: string) => {
        try { localStorage.removeItem(key); } catch (error) { }
    };

    // Fetch host user with caching
    const fetchHostUser = useCallback(async (hostId: string) => {
        if (!hostId || currentUser?.id === hostId) return;

        try {
            const cachedUser = await api.fetchUser(hostId);
            setFetchedHostUsers(prev => ({ ...prev, [hostId]: cachedUser }));
        } catch (error) {
            console.warn('Failed to fetch host user:', error);
        }
    }, [currentUser?.id, setFetchedHostUsers]);

    // Handle Google response with postMessage error handling
    const handleGoogleResponse = async (response: any) => {
        try {
            const credential = response.credential;

            // Wrap API call with postMessage error handling
            try {
                const res = await api.googleLogin(credential);
                await finalizeLogin(res.user, res.token);
            } catch (e) {
                // Check if this is a postMessage-related error
                if (e instanceof Error && (e.message.includes('postMessage') || e.message.includes('Cross-Origin-Opener-Policy'))) {
                    console.error('PostMessage error during Google authentication:', e);

                    // Handle the postMessage error with fallback
                    handlePostMessageError(
                        {
                            type: 'BLOCKED_BY_COOP',
                            message: 'Google authentication postMessage blocked',
                            name: 'PostMessageError'
                        } as any,
                        'Google Authentication',
                        postMessageFallbacks.googleSignIn
                    );

                    setAuthError("Google authentication blocked by security policy. Please try again.");
                } else {
                    setAuthError("Authentication failed");
                }
            }
        } catch (error) {
            setAuthError(t('authErrorInvalid'));
        }
    };

    // Finalize login process
    const finalizeLogin = async (user: User, token: string) => {
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

    // Handle email authentication
    const handleEmailAuth = async (data: any, isSignUp: boolean) => {
        if (isLoggingIn) return;
        setAuthError('');
        setIsLoggingIn(true);

        try {
            const { email, password, name, isPhotographer, studioName } = data;
            if (!email || !password) return setAuthError(t('authErrorRequired'));
            if (!validateEmail(email)) return setAuthError(t('authErrorInvalidEmail'));
            if (!validatePassword(password)) return setAuthError(t('authErrorPasswordLength'));

            if (isSignUp) {
                if (!name || !validateGuestName(name)) return setAuthError(t('authErrorNameRequired'));
                const sanitizedName = sanitizeInput(name);
                const sanitizedStudioName = isPhotographer && studioName ? sanitizeInput(studioName) : undefined;

                const newUser: User = {
                    id: `user-${Date.now()}`,
                    name: sanitizedName,
                    email: email.toLowerCase().trim(),
                    role: UserRole.USER,
                    tier: TierLevel.FREE,
                    storageUsedMb: 0,
                    storageLimitMb: 100,
                    joinedDate: new Date().toISOString().split('T')[0],
                    studioName: sanitizedStudioName
                };

                const res = await api.createUser(newUser);
                await finalizeLogin(res.user, res.token);
            } else {
                const res = await api.login(email.toLowerCase().trim(), password);
                await finalizeLogin(res.user, res.token);
            }
        } catch (e) { setAuthError(t('authErrorInvalid')); } finally { setIsLoggingIn(false); }
    };

    // Handle guest login
    const handleGuestLogin = (name: string) => {
        if (!validateGuestName(name)) {
            alert(t('authErrorNameRequired'));
            return;
        }
        const sanitizedName = sanitizeInput(name);
        setGuestName(sanitizedName);
        safeSetItem('snapify_guest_name', sanitizedName);
        setShowGuestLogin(false);
    };

    // Handle logout
    const handleLogout = async () => {
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

    // Handle sign in request
    const handleSignInRequest = () => {
        setShowGuestLogin(false);
        setView('landing');
    };

    // Handle back navigation
    const handleBack = () => {
        if (currentUser) {
            handleLogout();
        } else {
            setView('landing');
        }
    };

    // Language management
    useEffect(() => {
        safeSetItem('snapify_lang', language);
    }, [language]);

    const changeLanguage = (lang: Language) => setLanguage(lang);

    // Initialize Google Sign-In
    useEffect(() => {
        const initGoogle = () => {
            // Validate initialization prerequisites
            const validation = validateGsiInitialization();

            if (!validation.isValid) {
                if (validation.error === 'Google API not loaded') {
                    console.warn('Google API not loaded yet, waiting...');
                    return;
                }
                handleGsiError(validation.error, 'Initialization validation failed');
                return;
            }

            if (!process.env.VITE_GOOGLE_CLIENT_ID) {
                handleGsiError('Missing Google Client ID', 'Configuration error');
                return;
            }

            if (window.googleSignInInitialized) {
                console.log('Google Sign-In already initialized');
                return;
            }

            try {
                // Validate that we can call initialize
                if (typeof window.google.accounts.id.initialize !== 'function') {
                    throw new Error('Google Sign-In initialize method not available');
                }

                // Initialize Google Sign-In client
                window.google.accounts.id.initialize({
                    client_id: process.env.VITE_GOOGLE_CLIENT_ID,
                    callback: handleGoogleResponse,
                    ux_mode: 'popup',
                    use_fedcm_for_prompt: false,
                    auto_select: false,
                    cancel_on_tap_outside: false
                });

                // Validate initialization was successful
                const postInitValidation = validateGsiInitialization();
                if (!postInitValidation.isValid) {
                    throw new Error(`Initialization failed: ${postInitValidation.error}`);
                }

                // Mark initialization as complete
                window.googleSignInInitialized = true;

                // Dispatch event to notify that GSI is ready
                const event = new CustomEvent('gsiInitialized', {
                    detail: {
                        initialized: true,
                        timestamp: new Date().toISOString()
                    }
                });
                window.dispatchEvent(event);

                console.log('Google Sign-In initialized successfully');
            } catch (e) {
                handleGsiError(e, 'Google Sign-In initialization failed');
            }
        };

        let googleInitInterval: NodeJS.Timeout | null = null;

        if (window.google) {
            initGoogle();
        } else {
            googleInitInterval = setInterval(() => {
                if (window.google) {
                    initGoogle();
                    if (googleInitInterval) {
                        clearInterval(googleInitInterval);
                        googleInitInterval = null;
                    }
                }
            }, 500);
            setTimeout(() => {
                if (googleInitInterval) {
                    clearInterval(googleInitInterval);
                    googleInitInterval = null;
                    handleGsiError('Google Sign-In script failed to load within timeout', 'Script load timeout');
                }
            }, 15000);
        }

        return () => {
            // Clean up Google Sign-In initialization interval
            if (googleInitInterval) {
                clearInterval(googleInitInterval);
            }
        };
    }, [handleGoogleResponse]);

    // Socket.IO authentication and event handling
    useEffect(() => {
        const token = localStorage.getItem('snapify_token');
        if (token && currentUser) {
            socketService.connect(token);

            // User update handler
            const handleUserUpdate = (updatedUser: User) => {
                if (updatedUser.id === currentUser.id) {
                    setCurrentUser(prev => {
                        if (!prev) return null;
                        const updated = { ...prev, ...updatedUser };
                        localStorage.setItem('snapify_user_obj', JSON.stringify(updated));
                        return updated;
                    });
                }
                setAllUsers(prev => prev.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u));
                setFetchedHostUsers(prev => {
                    if (prev[updatedUser.id]) {
                        return { ...prev, [updatedUser.id]: updatedUser };
                    }
                    return prev;
                });
            };

            socketService.on('user_updated', handleUserUpdate);

            return () => {
                // Clean up socket event listeners
                socketService.off('user_updated', handleUserUpdate);

                // Disconnect socket if no longer needed
                if (!currentUser) {
                    socketService.disconnect();
                }
            };
        }

        // Clean up socket connection if user logs out
        return () => {
            if (!currentUser) {
                socketService.disconnect();
            }
        };
    }, [currentUser?.id]);

    // Load initial data
    const loadInitialData = async () => {
        try {
            const token = localStorage.getItem('snapify_token');
            const storedUserId = localStorage.getItem('snapify_user_id');
            let currentUserFromStorage: User | null = null;
            let hasValidAuth = false;

            if (token && storedUserId) {
                try {
                    const savedUserStr = localStorage.getItem('snapify_user_obj');
                    if (savedUserStr) {
                        currentUserFromStorage = JSON.parse(savedUserStr);
                        setCurrentUser(currentUserFromStorage);
                        hasValidAuth = true;
                    }

                    if (hasValidAuth) {
                        const eventsData = await api.fetchEvents();
                        setEvents(eventsData);

                        if (currentUserFromStorage?.role === UserRole.ADMIN) {
                            const usersData = await api.fetchUsers();
                            setAllUsers(usersData);
                        }
                    }
                } catch (e) {
                    console.warn('Auth validation failed, logging out:', e);
                    handleLogout();
                    currentUserFromStorage = null;
                    hasValidAuth = false;
                }
            }

            const params = new URLSearchParams(window.location.search);
            const sharedEventId = params.get('event');
            if (sharedEventId) {
                try {
                    const sharedEvent = await api.fetchEventById(sharedEventId);
                    if (sharedEvent) {
                        setEvents(prev => {
                            if (!prev.find(e => e.id === sharedEventId)) return [...prev, sharedEvent];
                            return prev;
                        });
                        setCurrentEventId(sharedEventId);
                        setView('event');
                        await incrementEventViews(sharedEventId, [sharedEvent]);
                        return;
                    }
                } catch (error) {
                    console.warn('Failed to load shared event:', error);
                }
            }

            if (hasValidAuth && currentUserFromStorage) {
                setView(currentUserFromStorage.role === UserRole.ADMIN ? 'admin' : 'dashboard');
            } else {
                setView('landing');
            }
        } catch (err) {
            console.error('Error in loadInitialData:', err);
            setView('landing');
        }
    };

    // Increment event views
    const incrementEventViews = async (id: string, currentEvents: Event[]) => {
        const updated = currentEvents.map(e => {
            if (e.id === id) return { ...e, views: (e.views || 0) + 1 };
            return e;
        });
        setEvents(updated);
        await fetch(`${process.env.VITE_API_URL || ''}/api/events/${id}/view`, { method: 'POST' });
    };

    // Initialize data loading
    useEffect(() => {
        loadInitialData();
    }, []);

    return null;
};

export default AuthManager;
