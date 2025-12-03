import * as React from 'react';
import { useState, useEffect, useRef, Suspense, lazy, useCallback } from 'react';
// @ts-ignore
import JSZip from 'jszip';
// @ts-ignore
import { jwtDecode } from 'jwt-decode';
import { User, Event, MediaItem, UserRole, TierLevel, Language, TranslateFn, TIER_CONFIG, getTierConfigForUser, getTierConfig } from './types';
import { api } from './services/api';
import { TRANSLATIONS } from './constants';
import { ZipManager, ZipProgress } from './utils/zipManager';

// Lazy load heavy components for code splitting
const AdminDashboard = lazy<React.ComponentType<AdminDashboardProps>>(() => import('./components/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const Navigation = lazy<React.ComponentType<NavigationProps>>(() => import('./components/Navigation').then(module => ({ default: module.Navigation })));
const LandingPage = lazy<React.ComponentType<LandingPageProps>>(() => import('./components/LandingPage').then(module => ({ default: module.LandingPage })));
const UserDashboard = lazy<React.ComponentType<UserDashboardProps>>(() => import('./components/UserDashboard').then(module => ({ default: module.UserDashboard })));
const EventGallery = lazy<React.ComponentType<EventGalleryProps>>(() => import('./components/EventGallery').then(module => ({ default: module.EventGallery })));
const CreateEventModal = lazy<React.ComponentType<CreateEventModalProps>>(() => import('./components/CreateEventModal').then(module => ({ default: module.CreateEventModal })));
const ContactModal = lazy<React.ComponentType<ContactModalProps>>(() => import('./components/ContactModal').then(module => ({ default: module.ContactModal })));
const GuestLoginModal = lazy<React.ComponentType<GuestLoginModalProps>>(() => import('./components/GuestLoginModal').then(module => ({ default: module.GuestLoginModal })));
const StudioSettingsModal = lazy<React.ComponentType<StudioSettingsModalProps>>(() => import('./components/StudioSettingsModal').then(module => ({ default: module.StudioSettingsModal })));
const MediaReviewModal = lazy<React.ComponentType<MediaReviewModalProps>>(() => import('./components/MediaReviewModal').then(module => ({ default: module.MediaReviewModal })));
const LiveSlideshow = lazy<React.ComponentType<LiveSlideshowProps>>(() => import('./components/LiveSlideshow').then(module => ({ default: module.LiveSlideshow })));
const PWAInstallPrompt = lazy<React.ComponentType<PWAInstallPromptProps>>(() => import('./components/PWAInstallPrompt').then(module => ({ default: module.PWAInstallPrompt })));
const OfflineBanner = lazy<React.ComponentType<OfflineBannerProps>>(() => import('./components/OfflineBanner').then(module => ({ default: module.OfflineBanner })));
const ShareTargetHandler = lazy<React.ComponentType<ShareTargetHandlerProps>>(() => import('./components/ShareTargetHandler').then(module => ({ default: module.ShareTargetHandler })));
const ReloadPrompt = lazy<React.ComponentType<ReloadPromptProps>>(() => import('./components/ReloadPrompt').then(module => ({ default: module.ReloadPrompt })));
const SupportChat = lazy<React.ComponentType<SupportChatProps>>(() => import('./components/SupportChat').then(module => ({ default: module.SupportChat })));
const BetaFeedbackModal = lazy<React.ComponentType<BetaFeedbackModalProps>>(() => import('./components/BetaFeedbackModal').then(module => ({ default: module.BetaFeedbackModal })));
const BetaAccessModal = lazy<React.ComponentType<BetaAccessModalProps>>(() => import('./components/BetaAccessModal').then(module => ({ default: module.BetaAccessModal })));
const BetaSettings = lazy<React.ComponentType<BetaSettingsProps>>(() => import('./components/BetaSettings').then(module => ({ default: module.BetaSettings })));

// Keep lightweight utilities as direct imports
import { applyWatermark, processImage } from './utils/imageProcessing';
import { clearDeviceFingerprint } from './utils/deviceFingerprint';
import { socketService } from './services/socketService';
import { validateGuestName, sanitizeInput, validateEmail, validatePassword, validateEventTitle, validateEventDescription } from './utils/validation';
import { clearAllCaches } from './utils/cacheManager';
import { canUploadVideos } from './utils/videoPermissions';
import { Skeleton, SkeletonGrid, SkeletonCard } from './components/Skeleton';
import { ToastProvider } from './components/Toast';
import { BetaBadge, VersionIndicator } from './components/BetaBadge';
import { DownloadProgress } from './components/DownloadProgress';

// Component Prop Types
interface OfflineBannerProps {
  t: TranslateFn;
}

interface ShareTargetHandlerProps {
  onShareReceive: (text: string) => void;
}

interface NavigationProps {
  currentUser: User | null;
  guestName: string;
  view: 'landing' | 'dashboard' | 'event' | 'admin' | 'live';
  currentEventTitle: string;
  language: Language;
  onChangeLanguage: (lang: Language) => void;
  onLogout: () => Promise<void>;
  onSignIn: () => void;
  onHome: () => void;
  onBack: () => void;
  onToAdmin: () => void;
  onOpenSettings: () => void;
  t: TranslateFn;
}

interface LandingPageProps {
  onGoogleLogin: () => void;
  onEmailAuth: (data: any, isSignUp: boolean) => Promise<void>;
  onContactSales: (tier?: TierLevel) => void;
  isLoggingIn: boolean;
  authError: string;
  language: Language;
  onChangeLanguage: (lang: Language) => void;
  t: TranslateFn;
}

interface PWAInstallPromptProps {
  t: TranslateFn;
}

interface ReloadPromptProps {
  // ReloadPrompt doesn't seem to need any props based on usage
}

interface ContactModalProps {
  onClose: () => void;
  t: TranslateFn;
  tier?: TierLevel;
}

interface AdminDashboardProps {
  users: User[];
  events: Event[];
  onClose: () => void;
  onLogout: () => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
  onDeleteMedia: (eventId: string, mediaId: string) => Promise<void>;
  onUpdateEvent: (updatedEvent: Event) => Promise<void>;
  onUpdateUser: (updatedUser: User) => Promise<void>;
  onNewEvent: () => void;
  onDownloadEvent: (event: Event) => Promise<void>;
  t: TranslateFn;
}

interface UserDashboardProps {
  events: Event[];
  currentUser: User;
  onNewEvent: () => void;
  onSelectEvent: (id: string) => void;
  onRequestUpgrade: () => void;
  t: TranslateFn;
}

interface EventGalleryProps {
  key?: string;
  event: Event;
  currentUser: User | null;
  hostUser: User | null;
  isEventExpired: boolean;
  isOwner: boolean;
  isHostPhotographer: boolean;
  downloadingZip: boolean;
  applyWatermark: boolean;
  setApplyWatermark: (value: boolean) => void;
  onSetCover: (item: MediaItem) => Promise<void>;
  onUpload: (action: 'upload' | 'camera') => void;
  onDownloadAll: (media?: MediaItem[]) => Promise<void>;
  onLike: (item: MediaItem) => Promise<void>;
  onOpenLiveSlideshow: () => void;
  onRefresh: () => Promise<void>;
  t: TranslateFn;
}

interface LiveSlideshowProps {
  event: Event;
  currentUser: User | null;
  hostUser: User | null;
  onClose: () => void;
  t: TranslateFn;
}

interface MediaReviewModalProps {
  type: 'image' | 'video';
  src: string;
  onConfirm: (userCaption: string, userPrivacy: 'public' | 'private', rotation?: number) => Promise<void>;
  onRetake: () => void;
  onCancel: () => void;
  isUploading: boolean;
  uploadProgress: number;
  isRegistered: boolean;
  t: TranslateFn;
  file?: File;
}

interface SupportChatProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  t: TranslateFn;
}

interface BetaFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  t: TranslateFn;
}

interface BetaAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  t: TranslateFn;
}

interface BetaSettingsProps {
  currentUser: User | null;
  t: TranslateFn;
  isAdmin: boolean;
}

interface GuestLoginModalProps {
  onLogin: (name: string) => void;
  onRegister: () => void;
  onCancel: () => void;
  t: TranslateFn;
}

interface CreateEventModalProps {
  currentUser: User;
  onClose: () => void;
  onCreate: (data: any) => Promise<void>;
  t: TranslateFn;
}

interface StudioSettingsModalProps {
  currentUser: User;
  onClose: () => void;
  onSave: (updates: Partial<User>) => Promise<void>;
  t: TranslateFn;
}

// @ts-ignore
const env: any = (import.meta as any).env || {};

const API_URL = env.DEV ? (env.VITE_API_URL || 'http://localhost:3001') : '';

// Using imported validation functions from utils/validation.ts


const safeSetItem = (key: string, value: string) => {
  try { localStorage.setItem(key, value); } catch (error) { console.warn('Failed to save to localStorage:', error); }
};

const safeGetItem = (key: string): string => {
  try { return localStorage.getItem(key) || ''; } catch (error) { return ''; }
};

const safeRemoveItem = (key: string) => {
  try { localStorage.removeItem(key); } catch (error) { }
};

declare global {
  interface Window {
    google: any;
    googleSignInInitialized?: boolean;
  }
}

export default function App() {
  const [view, setView] = useState<'landing' | 'dashboard' | 'event' | 'admin' | 'live'>('landing');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [currentEventId, setCurrentEventId] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [language, setLanguage] = useState<Language>('en');
  const [authError, setAuthError] = useState('');

  const [guestName, setGuestName] = useState(() => safeGetItem('snapify_guest_name') || '');
  const [showGuestLogin, setShowGuestLogin] = useState(false);
  const [pendingAction, setPendingAction] = useState<'upload' | 'camera' | null>(null);
  const [lastUsedInput, setLastUsedInput] = useState<'upload' | 'camera'>('upload');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState<TierLevel | undefined>(undefined);
  const [showStudioSettings, setShowStudioSettings] = useState(false);

  const [applyWatermarkState, setApplyWatermarkState] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState<ZipProgress | null>(null);
  const [estimatedZipSize, setEstimatedZipSize] = useState<number>(0);

  const [previewMedia, setPreviewMedia] = useState<{ type: 'image' | 'video', src: string, file?: File } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [adminStatus, setAdminStatus] = useState<{ adminId: string, online: boolean, lastSeen: number }[]>([]);
  const [showSupportChat, setShowSupportChat] = useState(false);

  const [fetchedHostUsers, setFetchedHostUsers] = useState<Record<string, User>>({});

  // Beta testing state
  const [showBetaFeedback, setShowBetaFeedback] = useState(false);
  const [showBetaAccess, setShowBetaAccess] = useState(false);
  const [showBetaSettings, setShowBetaSettings] = useState(false);

  const fetchHostUser = useCallback(async (hostId: string) => {
    if (fetchedHostUsers[hostId] || currentUser?.id === hostId) return;
    try {
      const user = await api.fetchUser(hostId);
      setFetchedHostUsers(prev => ({ ...prev, [hostId]: user }));
    } catch (error) {
      console.warn('Failed to fetch host user:', error);
    }
  }, [fetchedHostUsers, currentUser?.id]);

  // Mobile-specific state for file input management
  const [fileInputKey, setFileInputKey] = useState('file-input-v1');
  const [cameraInputKey, setCameraInputKey] = useState('camera-input-v1');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('snapify_user_obj', JSON.stringify(currentUser));
    }
  }, [currentUser]);

  useEffect(() => {
    // Only connect socket when page becomes visible (important for mobile)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const token = localStorage.getItem('snapify_token');
        socketService.connect(token || undefined);
      }
    };

    // Handle online/offline transitions for data sync
    const handleOnline = async () => {
      console.log('User came back online, re-syncing data...');
      // Re-sync user data when coming back online
      if (currentUser?.id) {
        try {
          // This will trigger a re-fetch of user data if needed
          await loadInitialData();
        } catch (error) {
          console.warn('Failed to re-sync data on reconnect:', error);
        }
      }
    };

    // Connect initially if page is visible
    if (!document.hidden) {
      const token = localStorage.getItem('snapify_token');
      socketService.connect(token || undefined);
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    let lastReloadTime = 0;
    const handleForceReload = async () => {
      const now = Date.now();
      // Prevent reloads more frequent than once per 30 seconds
      if (now - lastReloadTime < 30000) {
        console.log('Ignoring rapid reload request');
        return;
      }
      lastReloadTime = now;

      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        cacheNames.forEach(cacheName => caches.delete(cacheName));
      }
      window.location.reload();
    };
    socketService.on('force_client_reload', handleForceReload);

    // Admin status tracking
    const handleAdminStatusUpdate = (update: { adminId: string, online: boolean, lastSeen: number }) => {
      setAdminStatus(prev => {
        const existing = prev.find(a => a.adminId === update.adminId);
        if (existing) {
          return prev.map(a => a.adminId === update.adminId ? update : a);
        } else {
          return [...prev, update];
        }
      });
    };

    socketService.on('admin_status_update', handleAdminStatusUpdate);

    // CACHE INVALIDATION: Listen for cache invalidation events
    const handleCacheInvalidate = async (data: any) => {
      console.log('Cache invalidation received:', data);

      if (data.type === 'full_reset') {
        // Clear all caches and reload everything
        await clearAllCaches({
          clearLocalStorage: true,
          clearServiceWorker: true
        });
        // Clear React state
        setEvents([]);
        setCurrentEventId(null);
        setCurrentUser(null);
        setAllUsers([]);
        setGuestName('');
        // Reload initial data
        loadInitialData();
      } else if (data.type === 'force_refresh') {
        // Clear service worker caches and refresh data
        await clearAllCaches({
          clearServiceWorker: true
        });
        console.log('Admin triggered data refresh');
        loadInitialData();
      }
    };

    socketService.on('cache_invalidate', handleCacheInvalidate);

    // Helper function to build proxy URLs
    const buildProxyUrl = (key: string): string => {
      if (!key) return '';
      // If it's already a proxy URL, return as-is
      if (key.startsWith('/api/proxy-media') || key.startsWith('http')) {
        return key;
      }
      // Otherwise, construct the proxy URL
      return `/api/proxy-media?key=${encodeURIComponent(key)}`;
    };

    // MEDIA UPLOAD REAL-TIME UPDATES
    const handleMediaUploaded = (newItem: MediaItem) => {
      console.log('App: Received media_uploaded event for event', newItem.eventId);
      setEvents(prev => prev.map(event => {
        if (event.id === newItem.eventId) {
          console.log('App: Adding media to event', event.id, 'current media count:', event.media.length);
          // Add new media item to the event with proper URLs
          const processedItem = {
            ...newItem,
            url: buildProxyUrl(newItem.url),
            previewUrl: newItem.previewUrl ? buildProxyUrl(newItem.previewUrl) : buildProxyUrl(newItem.url)
          };
          const updatedEvent = {
            ...event,
            media: [processedItem, ...event.media]
          };
          console.log('App: Updated event media count:', updatedEvent.media.length);
          return updatedEvent;
        }
        return event;
      }));
    };

    const handleMediaProcessed = (data: { id: string, previewUrl: string, url?: string }) => {
      console.log('Media processed event received:', data);
      setEvents(prev => prev.map(event => {
        if (event.media.some(m => m.id === data.id)) {
          return {
            ...event,
            media: event.media.map(m =>
              m.id === data.id ? {
                ...m,
                isProcessing: false,
                previewUrl: buildProxyUrl(data.previewUrl),
                url: data.url ? buildProxyUrl(data.url) : m.url
              } : m
            )
          };
        }
        return event;
      }));
    };

    socketService.on('media_uploaded', handleMediaUploaded);
    socketService.on('media_processed', handleMediaProcessed);

    // Load initial admin status
    const loadAdminStatus = async () => {
      try {
        const token = localStorage.getItem('snapify_token');
        const headers: HeadersInit = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        const response = await fetch(`${API_URL}/api/admin/status`, { headers });
        if (response.status === 401) {
          setAdminStatus([]);
          return;
        }
        const data = await response.json();
        setAdminStatus(data.admins || []);
      } catch (error) {
        console.warn('Failed to load admin status:', error);
        setAdminStatus([]);
      }
    };

    loadAdminStatus();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      socketService.off('force_client_reload', handleForceReload);
      socketService.off('admin_status_update', handleAdminStatusUpdate);
      socketService.off('cache_invalidate', handleCacheInvalidate);
      socketService.off('media_uploaded', handleMediaUploaded);
      socketService.off('media_processed', handleMediaProcessed);
    };
  }, []);

  useEffect(() => {
    if (currentUser?.id) {
      const handleUserUpdate = (updatedUser: User) => {
        console.log('Real-time user update received:', updatedUser);
        if (updatedUser.id === currentUser.id) {
          // Update current user and persist to localStorage
          setCurrentUser(prev => {
            if (!prev) return null;
            const updated = { ...prev, ...updatedUser };
            localStorage.setItem('snapify_user_obj', JSON.stringify(updated));
            return updated;
          });
        }
        // Update in allUsers array for admin views
        setAllUsers(prev => prev.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u));
        // Also update fetchedHostUsers if this user is cached there
        setFetchedHostUsers(prev => {
          if (prev[updatedUser.id]) {
            return { ...prev, [updatedUser.id]: updatedUser };
          }
          return prev;
        });
      };
      socketService.on('user_updated', handleUserUpdate);
      return () => { socketService.off('user_updated', handleUserUpdate); };
    }
  }, [currentUser?.id]);


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

          // Only fetch data if we have valid auth
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
            incrementEventViews(sharedEventId, [sharedEvent]);
            return; // Exit early, view is set
          }
        } catch (error) {
          console.warn('Failed to load shared event:', error);
          // Fall through to normal view logic
        }
      }

      // Set appropriate view based on auth status
      if (hasValidAuth && currentUserFromStorage) {
        setView(currentUserFromStorage.role === UserRole.ADMIN ? 'admin' : 'dashboard');
      } else {
        setView('landing');
      }
    } catch (err) {
      console.error('Error in loadInitialData:', err);
      // On error, default to landing but don't logout unnecessarily
      setView('landing');
    }
  };

  useEffect(() => {
    loadInitialData();
    const initGoogle = () => {
      if (window.google && env.VITE_GOOGLE_CLIENT_ID && !window.googleSignInInitialized) {
        try {
          window.google.accounts.id.initialize({
            client_id: env.VITE_GOOGLE_CLIENT_ID,
            callback: handleGoogleResponse
          });
          window.googleSignInInitialized = true;
        } catch (e) {
          console.warn('Google Sign-In initialization failed:', e);
        }
      }
    };
    if (window.google) initGoogle();
    else {
      const interval = setInterval(() => {
        if (window.google) {
          initGoogle();
          clearInterval(interval);
        }
      }, 500); // Increased interval to reduce polling frequency
      setTimeout(() => clearInterval(interval), 15000); // Increased timeout
    }
  }, []);

  const handleGoogleResponse = async (response: any) => {
    try {
      const credential = response.credential;
      try {
        const res = await api.googleLogin(credential);
        finalizeLogin(res.user, res.token);
      } catch (e) { setAuthError("Authentication failed"); }
    } catch (error) { setAuthError(TRANSLATIONS[language]['authErrorInvalid']); }
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
          } catch (err) { setView('dashboard'); }
        }
      } else if (user.role === UserRole.ADMIN) {
        api.fetchUsers().then(setAllUsers);
        setView('admin');
      } else {
        setView('dashboard');
      }
    } catch (error) { setView('dashboard'); }
  };

  // FIX: Atomic view increment
  const incrementEventViews = async (id: string, currentEvents: Event[]) => {
    // Optimistic UI update
    const updated = currentEvents.map(e => {
      if (e.id === id) return { ...e, views: (e.views || 0) + 1 };
      return e;
    });
    setEvents(updated);
    // Call server endpoint
    await fetch(`${API_URL}/api/events/${id}/view`, { method: 'POST' });
  };

  useEffect(() => { localStorage.setItem('snapify_lang', language); }, [language]);
  const t: TranslateFn = (key: string) => {
    return TRANSLATIONS[language][key] || TRANSLATIONS['en'][key] || key;
  };
  const changeLanguage = (lang: Language) => setLanguage(lang);

  const activeEvent = events.find(e => e.id === currentEventId);
  const isOwner = currentUser && activeEvent && currentUser.id === activeEvent.hostId;
  const isEventExpired = activeEvent?.expiresAt ? new Date() > new Date(activeEvent.expiresAt) : false;
  // Use event.hostUser if available (from API), otherwise fall back to allUsers lookup
  const hostUser = activeEvent?.hostUser || allUsers.find(u => u.id === activeEvent?.hostId) || fetchedHostUsers[activeEvent?.hostId || ''] || (currentUser?.id === activeEvent?.hostId ? currentUser : undefined);
  const isHostPhotographer = hostUser?.role === UserRole.PHOTOGRAPHER;

  useEffect(() => {
    if (activeEvent?.hostId && !allUsers.find(u => u.id === activeEvent.hostId) && activeEvent.hostId !== currentUser?.id) {
      fetchHostUser(activeEvent.hostId);
    }
  }, [activeEvent?.hostId, allUsers, currentUser?.id, fetchHostUser]);

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

  const handleGuestLogin = (name: string) => {
    if (!validateGuestName(name)) {
      alert(t('authErrorNameRequired'));
      return;
    }
    const sanitizedName = sanitizeInput(name);
    setGuestName(sanitizedName);
    safeSetItem('snapify_guest_name', sanitizedName);
    setShowGuestLogin(false);
    if (currentEventId) setView('event');
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

    // Validate input
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
    console.log('initiateMediaAction called:', { action, currentUser: !!currentUser, guestName });
    setLastUsedInput(action);

    if (currentUser || guestName) {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      console.log('Device type:', isMobile ? 'mobile' : 'desktop');

      if (isMobile) {
        // Add a small delay for mobile devices to ensure UI is ready
        setTimeout(() => {
          console.log('Triggering file input click for:', action);
          if (action === 'camera') {
            cameraInputRef.current?.click();
          } else {
            fileInputRef.current?.click();
          }
        }, 100);
      } else {
        // Immediate action for desktop
        console.log('Triggering file input click for:', action);
        if (action === 'camera') cameraInputRef.current?.click();
        else fileInputRef.current?.click();
      }
    } else {
      console.log('No user/guest, showing login modal');
      setPendingAction(action);
      setShowGuestLogin(true);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('handleFileUpload called:', {
      files: e.target.files,
      filesLength: e.target.files?.length,
      activeEvent: activeEvent?.id
    });

    if (!e.target.files || !e.target.files[0] || !activeEvent) {
      console.log('File upload cancelled or no file selected');
      return;
    }

    const file = e.target.files[0];
    console.log('File selected:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    });

    // Validate file size (mobile devices might have different limits)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      alert('File is too large. Please select a file smaller than 50MB.');
      // Reset input for mobile devices
      e.target.value = '';
      return;
    }

    const type = file.type.startsWith('video') ? 'video' : 'image';
    const url = URL.createObjectURL(file);
    console.log('Setting preview media:', { type, url, hasFile: !!file });
    setPreviewMedia({ type, src: url, file });

    // Reset input immediately for mobile devices to allow re-selection
    setTimeout(() => {
      e.target.value = '';
    }, 100);
  };

  const refreshCurrentEvent = async () => {
    if (!currentEventId) return;

    console.log('Pull-to-refresh: Refreshing current event', currentEventId);

    try {
      // Ensure WebSocket connection is active (especially important on mobile)
      const token = localStorage.getItem('snapify_token');
      socketService.connect(token || undefined);

      // Re-join the event room to ensure we receive updates
      socketService.joinEvent(currentEventId);

      const updatedEvent = await api.fetchEventById(currentEventId);

      // Update events state without changing view - FIXED: Ensure view state is preserved
      setEvents(prev => {
        const existingEvent = prev.find(e => e.id === currentEventId);
        if (existingEvent) {
          // Preserve the current view and only update event data
          return prev.map(e => e.id === currentEventId ? updatedEvent : e);
        } else {
          // If event doesn't exist in current state, add it
          return [...prev, updatedEvent];
        }
      });

      // FIX: Explicitly ensure we stay on the event view
      if (view !== 'event') {
        console.log('Pull-to-refresh: Restoring event view');
        setView('event');
      }

      console.log('Pull-to-refresh: Successfully refreshed event with', updatedEvent.media.length, 'media items');
    } catch (err) {
      console.error('Pull-to-refresh: Failed to refresh event:', err);
      // On mobile, if WebSocket fails, we still have the HTTP fallback
    }
  };

  const confirmUpload = async (userCaption: string, userPrivacy: 'public' | 'private', rotation: number = 0) => {
    if (!previewMedia || !previewMedia.file) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const { type, src, file } = previewMedia;
      const uploader = currentUser ? (TIER_CONFIG[currentUser.tier].allowBranding && currentUser.studioName ? currentUser.studioName : currentUser.name) : guestName || "Guest";

      let finalCaption = userCaption;
      if (!finalCaption && type === 'image') {
        try {
          console.log('Attempting AI caption generation...');
          finalCaption = await api.generateImageCaption(src);
          console.log('AI caption generated:', finalCaption);
        } catch (aiError) {
          console.warn('AI caption generation failed, using default caption:', aiError);
          finalCaption = 'Captured moment'; // Fallback caption
        }
      }

      const config = currentUser ? getTierConfigForUser(currentUser) : TIER_CONFIG[TierLevel.FREE];
      const canWatermark = currentUser?.role === UserRole.PHOTOGRAPHER && config.allowWatermark;
      const canUseBranding = currentUser ? TIER_CONFIG[currentUser.tier].allowBranding : false;
      const shouldWatermark = applyWatermarkState && canWatermark;
      let uploadFile = file;

      if ((shouldWatermark && type === 'image' && currentUser) || (!file && type === 'image')) {
        let source = src;
        if (shouldWatermark && currentUser) {
          source = await applyWatermark(
            src,
            canUseBranding ? (currentUser.studioName || null) : null,
            canUseBranding ? (currentUser.logoUrl || null) : null,
            canUseBranding ? currentUser.watermarkOpacity : undefined,
            canUseBranding ? currentUser.watermarkSize : undefined,
            canUseBranding ? currentUser.watermarkPosition : undefined,
            canUseBranding ? currentUser.watermarkOffsetX : undefined,
            canUseBranding ? currentUser.watermarkOffsetY : undefined
          );
        }
        const res = await fetch(source);
        const blob = await res.blob();
        uploadFile = new File([blob], "capture.jpg", { type: "image/jpeg" });
      }

      // Apply manual rotation only (browser handles EXIF orientation automatically)
      if (type === 'image' && uploadFile && rotation !== 0) {
        const img = new Image();
        img.src = URL.createObjectURL(uploadFile);
        await new Promise(resolve => { img.onload = resolve; });

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Set canvas size based on rotation
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
          if (!rotatedBlob) throw new Error('Failed to create rotated blob');
          uploadFile = new File([rotatedBlob], "final.jpg", { type: "image/jpeg" });
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
        watermarkText: shouldWatermark && canUseBranding ? currentUser?.studioName : undefined,
        privacy: userPrivacy
      };

      if (uploadFile) {
        console.log('Starting upload:', {
          source: file ? 'photo_library' : 'camera_capture',
          fileSize: uploadFile.size,
          fileType: uploadFile.type,
          fileName: uploadFile.name,
          metadata
        });
        await api.uploadMedia(uploadFile, metadata, activeEvent!.id, (percent) => {
          setUploadProgress(percent);
        });
      }

      setPreviewMedia(null);

      // Mobile-specific file input reset
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      if (isMobile) {
        // Force re-render of file inputs on mobile by changing keys
        setFileInputKey(`file-input-v${Date.now()}`);
        setCameraInputKey(`camera-input-v${Date.now()}`);
      } else {
        // Standard reset for desktop
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (cameraInputRef.current) cameraInputRef.current.value = '';
      }
    } catch (e: any) {
      console.error("Upload failed", e);

      // Enhanced error handling for mobile devices
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      let errorMessage = "Upload failed. Please try again.";

      if (e.message === 'Storage limit exceeded' || (e.response && e.response.status === 413)) {
        errorMessage = t('storageLimit') || "Storage limit exceeded. Please upgrade your plan.";
      } else if (e.message?.includes('NetworkError') || e.message?.includes('Failed to fetch')) {
        errorMessage = isMobile
          ? "Network connection issue. Please check your internet connection and try again."
          : "Network error. Please check your connection and try again.";
      } else if (e.message?.includes('timeout') || e.code === 'ECONNABORTED') {
        errorMessage = "Upload timed out. Please try again with a smaller file.";
      } else if (isMobile && e.message?.includes('file')) {
        errorMessage = "File access issue. Please try selecting the file again.";
      }

      alert(errorMessage);

      // Log additional debugging info for mobile
      if (isMobile) {
        console.log('Mobile upload error details:', {
          userAgent: navigator.userAgent,
          error: e.message,
          fileSize: previewMedia?.file?.size,
          fileType: previewMedia?.file?.type,
          timestamp: new Date().toISOString()
        });
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const downloadEventZip = async (targetEvent: Event) => {
    if (!targetEvent || targetEvent.media.length === 0) return;
    setDownloadingZip(true);
    setZipProgress({
      totalFiles: targetEvent.media.length,
      processedFiles: 0,
      currentFile: null,
      progressPercentage: 0,
      estimatedSizeMb: 0,
      isCancelled: false,
      isComplete: false,
      error: null
    });

    try {
      const eventHost = allUsers.find(u => u.id === targetEvent.hostId);
      const isFreeTier = !eventHost || eventHost.tier === TierLevel.FREE;

      // Create file info array
      const files = targetEvent.media
        .filter(item => item.url)
        .map(item => ({
          filename: `${item.id}.${item.type === 'video' ? 'mp4' : 'jpg'}`,
          size: 0,
          type: item.type as 'image' | 'video',
          url: item.url
        }));

      if (files.length === 0) {
        throw new Error('No valid files to download');
      }

      // Create zip manager with progress tracking
      const zipManagerInstance = new ZipManager({
        compressionLevel: 6,
        chunkSize: 3,
        onProgress: (progress) => {
          setZipProgress({ ...progress });
          setEstimatedZipSize(progress.estimatedSizeMb);
        },
        onError: (error) => {
          console.error('Zip error:', error);
          setZipProgress(prev => prev ? { ...prev, error: error.message } : null);
        },
        onComplete: () => {
          console.log('Zip generation completed successfully');
          // The download will be triggered after this completes
        }
      });

      // Generate zip with progress tracking
      const { zipBlob, cleanup } = await zipManagerInstance.generateZip(
        files,
        targetEvent.title
      );

      // Download the zip file
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `${targetEvent.title.replace(/[^a-z0-9]/gi, '_')}_memories.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Update download count
      await api.updateEvent({ ...targetEvent, downloads: (targetEvent.downloads || 0) + 1 });
      setEvents(prev => prev.map(e => e.id === targetEvent.id ? { ...e, downloads: (e.downloads || 0) + 1 } : e));

      // Cleanup resources after a small delay to ensure download completes
      setTimeout(() => {
        cleanup();
        URL.revokeObjectURL(link.href);
      }, 2000);

    } catch (err) {
      console.error('Zip download failed:', err);
      setZipProgress(prev => prev ? { ...prev, error: err instanceof Error ? err.message : 'Unknown error' } : null);
      alert(t('zipError'));
    } finally {
      setDownloadingZip(false);
      // Keep progress visible for a few seconds after completion
      setTimeout(() => {
        setZipProgress(null);
        setEstimatedZipSize(0);
      }, 3000);
    }
  };

  const cancelZipDownload = () => {
    // This would be implemented in the ZipManager if we had a reference to the active instance
    setZipProgress(prev => prev ? { ...prev, isCancelled: true, error: 'Download cancelled by user' } : null);
    setDownloadingZip(false);
  };

  const handleLogout = async () => {
    // Call logout API if user is logged in
    if (currentUser) {
      try {
        await fetch(`${API_URL}/api/auth/logout`, {
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
      setView(currentUser ? (currentUser.role === UserRole.ADMIN ? 'admin' : 'dashboard') : 'landing');
    } else if (view === 'dashboard' || view === 'admin') {
      handleLogout();
    }
  };

  const handleIncomingShare = (text: string) => {
    if (currentEventId) {
      alert(`Shared to SnapifY: ${text}`);
    } else {
      localStorage.setItem('snapify_shared_pending', text);
    }
  };

  // Loading component for Suspense fallback
  const LoadingSpinner = () => (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  );

  // Skeleton loading for dashboard
  const DashboardSkeleton = () => (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="space-y-2">
          <Skeleton variant="text" className="h-8 w-64" />
          <Skeleton variant="text" className="h-4 w-48" />
        </div>
        <div className="flex gap-3">
          <Skeleton variant="rectangular" className="h-10 w-32" />
          <Skeleton variant="rectangular" className="h-10 w-24" />
        </div>
      </div>
      <div className="flex items-center gap-1 bg-white p-1 rounded-xl shadow-sm border border-slate-200 mb-6">
        <Skeleton variant="rectangular" className="h-10 w-20" />
        <Skeleton variant="rectangular" className="h-10 w-20" />
      </div>
      <SkeletonGrid count={3} />
    </main>
  );

  return (
    <ToastProvider>
      <div className="h-[100dvh] w-full flex flex-col bg-slate-50">
        {/* Skip Links for Accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-indigo-600 text-white px-4 py-2 rounded-md z-50 font-medium shadow-lg"
        >
          Skip to main content
        </a>
        <a
          href="#navigation"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-48 bg-indigo-600 text-white px-4 py-2 rounded-md z-50 font-medium shadow-lg"
        >
          Skip to navigation
        </a>

        <Suspense fallback={<LoadingSpinner />}>
          <OfflineBanner t={t} />
        </Suspense>
        <Suspense fallback={null}>
          <ShareTargetHandler onShareReceive={handleIncomingShare} />
        </Suspense>
        <Suspense fallback={null}>
          <ReloadPrompt />
        </Suspense>

        <div id="navigation" className="flex-shrink-0 z-50 w-full bg-slate-50/95 backdrop-blur-md border-b border-slate-200">
          <Suspense fallback={<div className="h-16 bg-slate-50/95"></div>}>
            <Navigation
              currentUser={currentUser || null}
              guestName={guestName}
              view={view}
              currentEventTitle={activeEvent?.title || ''}
              language={language}
              onChangeLanguage={changeLanguage}
              onLogout={handleLogout}
              onSignIn={handleSignInRequest}
              onHome={() => {
                setCurrentEventId(null);
                if (currentUser) setView(currentUser.role === UserRole.ADMIN ? 'admin' : 'dashboard');
                else setView('landing');
              }}
              onBack={handleBack}
              onToAdmin={() => setView('admin')}
              onOpenSettings={() => setShowStudioSettings(true)}
              t={t}
            />
          </Suspense>


        </div>

        <main id="main-content" className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth w-full relative no-scrollbar">
          {view === 'landing' ? (
            <div className="min-h-full w-full">
              <Suspense fallback={<LoadingSpinner />}>
                <LandingPage
                  onGoogleLogin={() => { if (window.google) window.google.accounts.id.prompt(); }}
                  onEmailAuth={handleEmailAuth}
                  onContactSales={(tier?: TierLevel) => { setSelectedTier(tier); setShowContactModal(true); }}
                  isLoggingIn={isLoggingIn}
                  authError={authError}
                  language={language}
                  onChangeLanguage={changeLanguage}
                  t={t}
                />
              </Suspense>
              <Suspense fallback={null}>
                <PWAInstallPrompt t={t} />
              </Suspense>
              {showContactModal && (
                <Suspense fallback={null}>
                  <ContactModal onClose={() => { setShowContactModal(false); setSelectedTier(undefined); }} t={t} tier={selectedTier} />
                </Suspense>
              )}
            </div>
          ) : (
            <div className="flex flex-col min-h-full">
              <div className="flex-1 pb-32">
                {view === 'admin' && currentUser?.role === UserRole.ADMIN && (
                  <Suspense fallback={<LoadingSpinner />}>
                    <AdminDashboard
                      users={allUsers}
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
                      t={t}
                    />
                  </Suspense>
                )}

                {view === 'dashboard' && currentUser && (
                  <Suspense fallback={<DashboardSkeleton />}>
                    <UserDashboard
                      events={events}
                      currentUser={currentUser}
                      onNewEvent={() => setShowCreateModal(true)}
                      onSelectEvent={(id) => { setCurrentEventId(id); setView('event'); }}
                      onRequestUpgrade={() => setShowContactModal(true)}
                      t={t}
                    />
                  </Suspense>
                )}

                {view === 'event' && activeEvent && (
                  <Suspense fallback={<LoadingSpinner />}>
                    <EventGallery
                      key={activeEvent.id}
                      event={activeEvent}
                      currentUser={currentUser}
                      hostUser={hostUser}
                      isEventExpired={isEventExpired}
                      isOwner={Boolean(isOwner)}
                      isHostPhotographer={Boolean(isHostPhotographer)}
                      downloadingZip={downloadingZip}
                      applyWatermark={applyWatermarkState}
                      setApplyWatermark={setApplyWatermarkState}
                      onSetCover={handleSetCoverImage}
                      onUpload={initiateMediaAction}
                      onDownloadAll={(media) => downloadEventZip({ ...activeEvent, media: media || activeEvent.media })}
                      onLike={handleLikeMedia}
                      onOpenLiveSlideshow={() => setView('live')}
                      onRefresh={refreshCurrentEvent}
                      t={t}
                    />
                  </Suspense>
                )}
              </div>
            </div>
          )}

          {view === 'live' && activeEvent && (
            <Suspense fallback={<LoadingSpinner />}>
              <LiveSlideshow
                event={activeEvent}
                currentUser={currentUser}
                hostUser={hostUser}
                onClose={() => setView('event')}
                t={t}
              />
            </Suspense>
          )}
        </main>
      </div>

      <PWAInstallPrompt t={t} />

      <input key={fileInputKey} id="file-upload-input" name="file-upload" type="file" ref={fileInputRef} className="hidden" accept={canUploadVideos(currentUser, activeEvent?.hostTier).allowed ? "image/*,video/*" : "image/*"} onChange={handleFileUpload} autoComplete="off" />
      <input key={cameraInputKey} id="camera-upload-input" name="camera-upload" type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleFileUpload} autoComplete="off" />

      {
        previewMedia && (
          <Suspense fallback={null}>
            <MediaReviewModal
              type={previewMedia.type}
              src={previewMedia.src}
              onConfirm={confirmUpload}
              onRetake={() => {
                setPreviewMedia(null);
                if (lastUsedInput === 'camera') cameraInputRef.current?.click();
                else fileInputRef.current?.click();
              }}
              onCancel={() => setPreviewMedia(null)}
              isUploading={isUploading}
              uploadProgress={uploadProgress}
              isRegistered={!!currentUser}
              t={t}
              file={previewMedia.file}
            />
          </Suspense>
        )
      }

      <div className="fixed bottom-4 left-4 z-[9999] pointer-events-none">
        <BetaBadge className="opacity-80 shadow-lg" />
      </div>

      {
        showContactModal && (
          <Suspense fallback={null}>
            <ContactModal onClose={() => { setShowContactModal(false); setSelectedTier(undefined); }} t={t} tier={selectedTier} />
          </Suspense>
        )
      }
      {
        showGuestLogin && (
          <Suspense fallback={null}>
            <GuestLoginModal onLogin={handleGuestLogin} onRegister={handleSignInRequest} onCancel={() => setShowGuestLogin(false)} t={t} />
          </Suspense>
        )
      }
      {
        showCreateModal && currentUser && (
          <Suspense fallback={null}>
            <CreateEventModal currentUser={currentUser} onClose={() => setShowCreateModal(false)} onCreate={handleCreateEvent} t={t} />
          </Suspense>
        )
      }
      {
        showStudioSettings && currentUser && (
          <Suspense fallback={null}>
            <StudioSettingsModal currentUser={currentUser} onClose={() => setShowStudioSettings(false)} onSave={handleUpdateStudioSettings} t={t} />
          </Suspense>
        )
      }
      <Suspense fallback={null}>
        <SupportChat isOpen={showSupportChat} onClose={() => setShowSupportChat(false)} currentUser={currentUser} t={t} />
      </Suspense>

      {/* Beta Testing Modals */}
      {showBetaFeedback && (
        <Suspense fallback={null}>
          <BetaFeedbackModal
            isOpen={showBetaFeedback}
            onClose={() => setShowBetaFeedback(false)}
            currentUser={currentUser}
            t={t}
          />
        </Suspense>
      )}

      {showBetaAccess && (
        <Suspense fallback={null}>
          <BetaAccessModal
            isOpen={showBetaAccess}
            onClose={() => setShowBetaAccess(false)}
            currentUser={currentUser}
            t={t}
          />
        </Suspense>
      )}

      {showBetaSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {t('betaSettings') || 'Beta Settings'}
                </h2>
                <button
                  onClick={() => setShowBetaSettings(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              <Suspense fallback={<div className="text-center py-8">Loading...</div>}>
                <BetaSettings
                  currentUser={currentUser}
                  t={t}
                  isAdmin={currentUser?.role === UserRole.ADMIN}
                />
              </Suspense>
            </div>
          </div>
        </div>
      )}

      {/* Download Progress Modal */}
      {zipProgress && (
        <DownloadProgress
          progress={zipProgress}
          estimatedSizeMb={estimatedZipSize}
          onCancel={cancelZipDownload}
          t={t}
        />
      )}
    </ToastProvider>
  );
}