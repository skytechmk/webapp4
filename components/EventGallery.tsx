import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { VirtuosoGrid } from 'react-virtuoso';
import { ShieldCheck, Download, Calendar, LayoutGrid, Camera, Video, Star, Share2, Upload, CheckCircle, Link as LinkIcon, Play, Heart, X, Pause, BookOpen, Send, Lock, Search, ScanFace, Loader2, Trash2, CheckSquare, Square, ChevronLeft, ChevronRight, MessageSquare, Globe, AlertTriangle, Plus, ImagePlus, MapPin, ArrowDown } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Event, User, UserRole, MediaItem, TranslateFn, TierLevel, GuestbookEntry, Comment, Vendor } from '../types';
import { api } from '../services/api';
import { socketService } from '../services/socketService';
import { isMobileDevice } from '../utils/deviceDetection';
import { downloadMediaForMobile, generateFilename } from '../utils/mobileDownload';
import { canUploadVideos, getVideoUploadUIState } from '../utils/videoPermissions';
import { ShareModal } from './ShareModal';
import { VendorAdCard } from './VendorAdCard';

// Helper function to get CSS transform for EXIF orientation
const getOrientationTransform = (orientation: number | undefined): string => {
    if (!orientation || orientation === 1) return '';

    switch (orientation) {
        case 2: return 'scaleX(-1)'; // Mirror horizontal
        case 3: return 'rotate(180deg)'; // Rotate 180
        case 4: return 'scaleY(-1)'; // Mirror vertical
        case 5: return 'scaleX(-1) rotate(90deg)'; // Mirror horizontal and rotate 90 CW
        case 6: return 'rotate(90deg)'; // Rotate 90 CW
        case 7: return 'scaleX(-1) rotate(-90deg)'; // Mirror horizontal and rotate 90 CCW
        case 8: return 'rotate(-90deg)'; // Rotate 90 CCW
        default: return '';
    }
};

declare global {
    interface Window {
        faceapi: any;
    }
}

// Internal Component for Video Item handling intersection
const VideoGridItem: React.FC<{ item: MediaItem; onClick: () => void }> = memo(({ item, onClick }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const isMobile = isMobileDevice(); // Check device type

    useEffect(() => {
        // On mobile, we disable the intersection observer entirely to prevent
        // auto-play issues and save battery/data. We just show the video element
        // which should display the first frame if preload="metadata" works.
        if (isMobile) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (videoRef.current) {
                        if (entry.isIntersecting) {
                            const playPromise = videoRef.current.play();
                            if (playPromise !== undefined) {
                                playPromise
                                    .then(() => setIsPlaying(true))
                                    .catch(() => {
                                        setIsPlaying(false);
                                    });
                            }
                        } else {
                            videoRef.current.pause();
                            setIsPlaying(false);
                        }
                    }
                });
            },
            { threshold: 0.25 }
        );

        if (videoRef.current) {
            observer.observe(videoRef.current);
        }

        return () => {
            if (videoRef.current) observer.unobserve(videoRef.current);
        };
    }, [isMobile]);

    if (item.isProcessing) {
        return (
            <div className="w-full aspect-video bg-slate-200 flex flex-col items-center justify-center text-slate-500" onClick={onClick}>
                <Loader2 className="animate-spin mb-2" />
                <span className="text-xs font-bold">Processing...</span>
            </div>
        );
    }

    return (
        <div className="relative group cursor-pointer" onClick={onClick}>
            <video
                ref={videoRef}
                src={item.previewUrl || item.url}
                className="w-full h-auto object-cover rounded-lg bg-black min-h-[150px]"
                muted
                playsInline
                loop
                preload="metadata"
                style={{ pointerEvents: 'none' }} // Disable interaction in grid
            />

            {/* Play Icon Overlay */}
            <div className={`absolute inset-0 flex items-center justify-center transition-colors pointer-events-none ${isMobile
                ? 'bg-black/10' // Always slight overlay on mobile
                : (isPlaying ? 'bg-transparent' : 'bg-black/20 group-hover:bg-black/30')
                }`}>
                {(!isPlaying || isMobile) && (
                    <div className="bg-black/40 rounded-full p-3 backdrop-blur-sm border border-white/20">
                        <Play className="text-white fill-white" size={24} />
                    </div>
                )}
            </div>

            <div className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-md pointer-events-none z-10 backdrop-blur-md">
                <Video className="text-white" size={12} />
            </div>
        </div>
    );
});

interface EventGalleryProps {
    event: Event;
    currentUser: User | null;
    hostUser: User | null | undefined;
    isEventExpired: boolean;
    isOwner: boolean;
    isHostPhotographer: boolean;
    downloadingZip: boolean;
    applyWatermark: boolean;
    setApplyWatermark: (val: boolean) => void;
    onDownloadAll: (media?: MediaItem[]) => void;
    onSetCover: (item: MediaItem) => void;
    onUpload: (type: 'camera' | 'upload') => void;
    onLike: (item: MediaItem) => void;
    onOpenLiveSlideshow: () => void;
    onRefresh: () => Promise<void>;
    t: TranslateFn;
}

const EventGalleryComponent: React.FC<EventGalleryProps> = ({
    event,
    currentUser,
    hostUser,
    isEventExpired,
    isOwner,
    isHostPhotographer,
    downloadingZip,
    applyWatermark,
    setApplyWatermark,
    onDownloadAll,
    onSetCover,
    onUpload,
    onLike,
    onOpenLiveSlideshow,
    onRefresh,
    t
}) => {
    // State
    const [localMedia, setLocalMedia] = useState<MediaItem[]>(event.media);
    const [localGuestbook, setLocalGuestbook] = useState<GuestbookEntry[]>(event.guestbook || []);
    const [activeTab, setActiveTab] = useState<'gallery' | 'guestbook'>('gallery');
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const [isSlideshowPlaying, setIsSlideshowPlaying] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);
    const [commentText, setCommentText] = useState('');
    const slideshowIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Pull to Refresh State
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const pullToRefreshTouchStartRef = useRef(0); // Renamed to avoid conflict
    const PULL_THRESHOLD = 80;

    const handleTouchStart = (e: React.TouchEvent) => {
        if (window.scrollY === 0) {
            pullToRefreshTouchStartRef.current = e.touches[0].clientY;
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (pullToRefreshTouchStartRef.current > 0 && window.scrollY === 0) {
            const currentY = e.touches[0].clientY;
            const diff = currentY - pullToRefreshTouchStartRef.current;
            if (diff > 0) {
                setPullDistance(diff);
            }
        }
    };

    const handleTouchEnd = async () => {
        if (pullDistance > PULL_THRESHOLD) {
            setIsRefreshing(true);
            setPullDistance(0);
            try {
                await onRefresh();
            } finally {
                setIsRefreshing(false);
            }
        }
        setPullDistance(0);
        pullToRefreshTouchStartRef.current = 0;
    };

    // Sliding Logic State
    const [dragOffset, setDragOffset] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isSnapping, setIsSnapping] = useState(false); // Prevent transition during index reset
    const touchStartRef = useRef<number | null>(null);

    // Guestbook State
    const [guestbookMessage, setGuestbookMessage] = useState('');
    const [guestbookName, setGuestbookName] = useState(currentUser?.name || '');

    // PIN State
    const PIN_STORAGE_KEY = `unlocked_event_${event.id}`;
    const [isPinLocked, setIsPinLocked] = useState(() => {
        // If owner or admin, never lock
        if (isOwner || currentUser?.role === UserRole.ADMIN) return false;

        // Check if already unlocked in this session
        if (sessionStorage.getItem(PIN_STORAGE_KEY) === 'true') return false;

        // Check if event actually has a PIN (using new hasPin flag for security)
        // We fall back to event.pin check for admins who receive the full object
        return !!event.hasPin || (!!event.pin && event.pin.length > 0);
    });

    const [pinInput, setPinInput] = useState('');
    const [pinError, setPinError] = useState('');

    // Find Me & Search State
    const [isFindMeOpen, setIsFindMeOpen] = useState(false);
    const [findMeImage, setFindMeImage] = useState<string | null>(null);
    const [filteredMedia, setFilteredMedia] = useState<MediaItem[] | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [modelsLoaded, setModelsLoaded] = useState(false);

    // My Uploads Filter State
    const [showMyUploads, setShowMyUploads] = useState(false);

    // Device detection
    const [isMobile, setIsMobile] = useState(false);

    // Bulk Delete State
    const [selectedMedia, setSelectedMedia] = useState<Set<string>>(new Set());
    const [isBulkDeleteMode, setIsBulkDeleteMode] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Download State
    const [downloadStatus, setDownloadStatus] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'info' } | null>(null);

    // Video Permissions State
    const [videoPermissions, setVideoPermissions] = useState(() => getVideoUploadUIState(currentUser, hostUser?.tier));

    // NEW: Vendors State for Ads
    const [vendors, setVendors] = useState<Vendor[]>([]);

    // Memoize helper functions to prevent unnecessary recalculations
    const canManageItem = useCallback((item: MediaItem) => {
        if (!currentUser) return false;
        // Admin can manage everything
        if (currentUser.role === UserRole.ADMIN) return true;
        // Event owner can manage everything
        if (isOwner) return true;
        // Regular user can manage ONLY their own uploads
        return item.uploaderId === currentUser.id;
    }, [currentUser, isOwner]);

    // --- REAL-TIME UPDATES & INIT ---
    useEffect(() => {
        socketService.connect();
        socketService.joinEvent(event.id);

        // Real-time media updates
        // Real-time media updates
        socketService.on('media_uploaded', (newItem: MediaItem) => {
            console.log('EventGallery: Received media_uploaded event', newItem);

            // Helper to process URLs (same as in App.tsx)
            const processUrl = (key: string) => {
                if (!key) return '';
                if (key.startsWith('/api/proxy-media') || key.startsWith('http')) return key;
                return `/api/proxy-media?key=${encodeURIComponent(key)}`;
            };

            const processedItem = {
                ...newItem,
                url: processUrl(newItem.url),
                previewUrl: newItem.previewUrl ? processUrl(newItem.previewUrl) : processUrl(newItem.url)
            };

            setLocalMedia(prev => {
                // Prevent duplicates
                if (prev.some(m => m.id === processedItem.id)) return prev;
                return [processedItem, ...prev];
            });
        });

        socketService.on('media_processed', (data: { id: string, previewUrl: string, url?: string }) => {
            console.log('EventGallery: Received media_processed event', data);
            setLocalMedia(prev => prev.map(item =>
                item.id === data.id ? { ...item, isProcessing: false, previewUrl: data.previewUrl, url: data.url || item.url } : item
            ));
        });

        socketService.on('new_like', (data: { id: string, likes: number }) => {
            setLocalMedia(prev => prev.map(m =>
                m.id === data.id ? { ...m, likes: data.likes } : m
            ));
        });

        socketService.on('new_message', (msg: GuestbookEntry) => {
            setLocalGuestbook(prev => {
                if (prev.some(m => m.id === msg.id)) return prev;
                return [msg, ...prev];
            });
        });

        socketService.on('new_comment', (comment: Comment) => {
            setLocalMedia(prev => prev.map(m => {
                if (m.id === comment.mediaId) {
                    return { ...m, comments: [...(m.comments || []), comment] };
                }
                return m;
            }));
        });

        // Listen for user updates to refresh video permissions
        const handleUserUpdate = (updatedUser: User) => {
            console.log('EventGallery: Received user update', updatedUser);
            // Force re-calculation of video permissions
            setVideoPermissions(getVideoUploadUIState(currentUser, updatedUser.id === event.hostId ? updatedUser.tier : hostUser?.tier));
        };
        socketService.on('user_updated', handleUserUpdate);

        setIsMobile(isMobileDevice());

        return () => {
            socketService.off('user_updated', handleUserUpdate);
            socketService.disconnect();
        };
    }, [event.id, currentUser, hostUser?.tier, event.hostId]);

    useEffect(() => {
        console.log('EventGallery: syncing localMedia with event.media:', event.media.length, 'items for event', event.id);
        setLocalMedia(event.media);
    }, [event.media, event.id]);

    useEffect(() => {
        setLocalGuestbook(event.guestbook || []);
    }, [event.guestbook, event.id]);

    // Ensure admins/owners bypass lock immediately if context changes
    useEffect(() => {
        if (isOwner || currentUser?.role === UserRole.ADMIN) {
            setIsPinLocked(false);
        }
    }, [isOwner, currentUser]);

    // NEW: Fetch Vendors matching city
    useEffect(() => {
        const fetchLocalVendors = async () => {
            if (event.city) {
                try {
                    const fetchedVendors = await api.fetchVendors(event.city);
                    setVendors(fetchedVendors);
                } catch (e) {
                    console.error("Failed to fetch vendors", e);
                }
            }
        };
        fetchLocalVendors();
    }, [event.city]);

    useEffect(() => {
        const loadModels = async () => {
            if (window.faceapi && !modelsLoaded) {
                try {
                    await Promise.all([
                        window.faceapi.nets.ssdMobilenetv1.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model'),
                        window.faceapi.nets.faceLandmark68Net.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model'),
                        window.faceapi.nets.faceRecognitionNet.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model')
                    ]);
                    setModelsLoaded(true);
                } catch (e) {
                    console.error("Failed to load FaceAPI models", e);
                }
            }
        };
        loadModels();
    }, []);

    // Update video permissions when user changes (real-time updates)
    useEffect(() => {
        setVideoPermissions(getVideoUploadUIState(currentUser, hostUser?.tier));
    }, [currentUser, hostUser]);

    // Update video permissions when coming back online
    useEffect(() => {
        const handleOnline = () => {
            setVideoPermissions(getVideoUploadUIState(currentUser, hostUser?.tier));
        };

        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [currentUser, hostUser]);

    const getDisplayMedia = () => {
        let media = filteredMedia || localMedia;

        // Filter for Privacy
        if (!isOwner && currentUser?.role !== UserRole.ADMIN) {
            // Show public items OR items owned by the current user
            media = media.filter(item => item.privacy !== 'private' || (currentUser && item.uploaderId === currentUser.id));
        }

        // Filter for My Uploads toggle
        if (showMyUploads && currentUser) {
            media = media.filter(item => item.uploaderId === currentUser.id);
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            media = media.filter(item =>
                (item.caption && item.caption.toLowerCase().includes(q)) ||
                (item.uploaderName && item.uploaderName.toLowerCase().includes(q))
            );
        }
        return media;
    };

    // Memoize expensive displayMedia calculation
    const displayMedia = useMemo(() => {
        let media = filteredMedia || localMedia;
        console.log('EventGallery: computing displayMedia from', media.length, 'items (filteredMedia:', !!filteredMedia, 'localMedia:', localMedia.length, ')');
        console.log('EventGallery: isOwner=', isOwner, 'currentUser.role=', currentUser?.role, 'showMyUploads=', showMyUploads);

        // Filter for Privacy
        if (!isOwner && currentUser?.role !== UserRole.ADMIN) {
            console.log('EventGallery: Applying privacy filter (not owner/admin)');
            const beforeFilter = media.length;
            // Show public items OR items owned by the current user
            media = media.filter(item => {
                const isPublic = item.privacy !== 'private';
                const isOwnedByUser = currentUser && item.uploaderId === currentUser.id;
                const shouldShow = isPublic || isOwnedByUser;
                if (!shouldShow) {
                    console.log('EventGallery: Filtering out item', item.id, 'privacy=', item.privacy, 'uploaderId=', item.uploaderId, 'currentUserId=', currentUser?.id);
                }
                return shouldShow;
            });
            console.log('EventGallery: Privacy filter removed', beforeFilter - media.length, 'items');
        } else {
            console.log('EventGallery: Skipping privacy filter (owner or admin)');
        }

        // Filter for My Uploads toggle
        if (showMyUploads && currentUser) {
            media = media.filter(item => item.uploaderId === currentUser.id);
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            media = media.filter(item =>
                (item.caption && item.caption.toLowerCase().includes(q)) ||
                (item.uploaderName && item.uploaderName.toLowerCase().includes(q))
            );
        }
        console.log('EventGallery: displayMedia computed to', media.length, 'items');
        return media;
    }, [filteredMedia, localMedia, isOwner, currentUser, showMyUploads, searchQuery]);

    // Memoize manageable items check
    const hasManageableItems = useMemo(() => {
        if (!currentUser) return false;
        return displayMedia.some(item => canManageItem(item));
    }, [currentUser, displayMedia, canManageItem]);

    const isStudioTier = hostUser?.tier === TierLevel.STUDIO;
    const qrFgColor = isStudioTier ? '#4f46e5' : '#000000';

    const openLightbox = (index: number) => {
        setLightboxIndex(index);
        setIsSlideshowPlaying(false);
        setDragOffset(0);
        document.body.style.overflow = 'hidden';
    };

    const closeLightbox = useCallback(() => {
        setLightboxIndex(null);
        setIsSlideshowPlaying(false);
        document.body.style.overflow = 'unset';
    }, []);

    const navigateLightbox = useCallback((direction: 'next' | 'prev') => {
        if (lightboxIndex === null || isAnimating) return;

        const windowWidth = window.innerWidth;
        const targetOffset = direction === 'next' ? -windowWidth : windowWidth;

        setIsAnimating(true);
        setDragOffset(targetOffset);

        setTimeout(() => {
            const len = displayMedia.length;
            let newIndex;
            if (direction === 'next') {
                newIndex = (lightboxIndex + 1) % len;
            } else {
                newIndex = (lightboxIndex - 1 + len) % len;
            }

            setIsSnapping(true);
            setLightboxIndex(newIndex);
            setDragOffset(0);
            setIsAnimating(false);

            setTimeout(() => {
                setIsSnapping(false);
            }, 50);
        }, 300);
    }, [lightboxIndex, displayMedia.length, isAnimating]);

    // --- Unified Pointer Handlers for Sliding (Touch + Mouse) ---
    const onPointerDown = (e: React.PointerEvent) => {
        if (isAnimating) return;
        touchStartRef.current = e.clientX;
        setIsDragging(true);
    };

    const onPointerMove = (e: React.PointerEvent) => {
        if (!touchStartRef.current || isAnimating || !isDragging) return;
        const currentX = e.clientX;
        const diff = currentX - touchStartRef.current;
        setDragOffset(diff);
    };

    const onPointerUp = () => {
        if (!touchStartRef.current || isAnimating || !isDragging) {
            setIsDragging(false);
            return;
        }
        setIsDragging(false);

        const threshold = window.innerWidth / 4;

        if (dragOffset < -threshold) {
            navigateLightbox('next');
        } else if (dragOffset > threshold) {
            navigateLightbox('prev');
        } else {
            setIsAnimating(true);
            setDragOffset(0);
            setTimeout(() => setIsAnimating(false), 300);
        }

        touchStartRef.current = null;
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (lightboxIndex === null) return;
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowRight') navigateLightbox('next');
            if (e.key === 'ArrowLeft') navigateLightbox('prev');
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [lightboxIndex, closeLightbox, navigateLightbox]);

    useEffect(() => {
        let interval: any;
        if (isSlideshowPlaying && lightboxIndex !== null) {
            interval = setInterval(() => {
                navigateLightbox('next');
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [isSlideshowPlaying, lightboxIndex, navigateLightbox]);

    const handleCopyLink = useCallback(async () => {
        const link = `${window.location.origin}?event=${event.id}`;
        try {
            await navigator.clipboard.writeText(link);
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 2000);
        } catch (err) {
            prompt(t('copyLink'), link);
        }
    }, [event.id, t]);

    const handleMobileDownload = useCallback(async (mediaItem: MediaItem) => {
        const filename = generateFilename(mediaItem.url, mediaItem.type, `snapify_${mediaItem.id}`);

        // Show loading message
        setDownloadStatus({ show: true, message: 'Preparing download...', type: 'info' });

        try {
            const result = await downloadMediaForMobile(mediaItem.url, filename);

            if (result.success) {
                setDownloadStatus({
                    show: true,
                    message: isMobile ? 'Media shared! Check your gallery.' : 'Download completed!',
                    type: 'success'
                });
            } else {
                setDownloadStatus({
                    show: true,
                    message: result.message || 'Download failed. Try again.',
                    type: 'error'
                });
            }
        } catch (error) {
            setDownloadStatus({
                show: true,
                message: 'Download failed. Please try again.',
                type: 'error'
            });
        }

        // Hide toast after 3 seconds
        setTimeout(() => setDownloadStatus(null), 3000);
    }, [isMobile]);

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        const isValid = await api.validateEventPin(event.id, pinInput);
        if (isValid) {
            setIsPinLocked(false);
            sessionStorage.setItem(PIN_STORAGE_KEY, 'true');
        } else {
            setPinError(t('invalidPin'));
        }
    };

    const handleGuestbookSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!guestbookMessage.trim() || !guestbookName.trim()) return;
        const newEntry: GuestbookEntry = { id: crypto.randomUUID(), eventId: event.id, senderName: guestbookName, message: guestbookMessage, createdAt: new Date().toISOString() };
        await api.addGuestbookEntry(newEntry);
        setGuestbookMessage('');
    };

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim() || lightboxIndex === null) return;
        const media = displayMedia[lightboxIndex];
        const name = currentUser ? currentUser.name : (localStorage.getItem('snapify_guest_name') || 'Guest');
        const newComment: Comment = {
            id: crypto.randomUUID(),
            mediaId: media.id,
            eventId: event.id,
            senderName: name,
            text: commentText,
            createdAt: new Date().toISOString()
        };
        await api.addComment(newComment);
        setCommentText('');
    };

    const handleFindMeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0] || !window.faceapi) return;
        const file = e.target.files[0];
        const url = URL.createObjectURL(file);
        setFindMeImage(url);
        setIsScanning(true);
        try {
            const img = await window.faceapi.fetchImage(url);
            const selfieDetection = await window.faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
            if (!selfieDetection) {
                alert(t('noFaceDetected'));
                setIsScanning(false);
                setFindMeImage(null);
                return;
            }
            const faceMatcher = new window.faceapi.FaceMatcher(selfieDetection);
            const matches: MediaItem[] = [];
            const imagesToCheck = localMedia.filter(m => m.type === 'image');
            for (const item of imagesToCheck) {
                try {
                    const itemImg = await window.faceapi.fetchImage(item.url);
                    const detections = await window.faceapi.detectAllFaces(itemImg).withFaceLandmarks().withFaceDescriptors();
                    const hasMatch = detections.some((d: any) => {
                        const bestMatch = faceMatcher.findBestMatch(d.descriptor);
                        return bestMatch.label !== 'unknown';
                    });
                    if (hasMatch) matches.push(item);
                } catch (err) { }
            }
            setFilteredMedia(matches);
        } catch (err) { alert(t('scanError')); } finally { setIsScanning(false); }
    };

    const toggleBulkDeleteMode = () => {
        if (isBulkDeleteMode) {
            setSelectedMedia(new Set());
            setIsBulkDeleteMode(false);
        } else {
            setIsBulkDeleteMode(true);
        }
    };

    const toggleMediaSelection = (mediaId: string) => {
        const newSelected = new Set(selectedMedia);
        if (newSelected.has(mediaId)) newSelected.delete(mediaId);
        else newSelected.add(mediaId);
        setSelectedMedia(newSelected);
    };

    const selectAllMedia = () => {
        if (selectedMedia.size === displayMedia.length) setSelectedMedia(new Set());
        else setSelectedMedia(new Set(displayMedia.map(item => item.id)));
    };

    const handleBulkDelete = async () => {
        if (selectedMedia.size === 0) return;
        if (!confirm(t('confirmBulkDelete').replace('{count}', selectedMedia.size.toString()))) return;
        setIsDeleting(true);
        try {
            const mediaIds = Array.from(selectedMedia) as string[];
            const result = await api.bulkDeleteMedia(mediaIds);
            if (result.success) {
                setLocalMedia(prev => prev.filter(item => !selectedMedia.has(item.id)));
                setSelectedMedia(new Set());
                setIsBulkDeleteMode(false);
            }
        } catch (error) { } finally { setIsDeleting(false); }
    };

    // Memoize grid items creation - expensive operation
    const gridItems = useMemo((): (MediaItem | { type: 'ad', vendor: Vendor } | { type: 'add-memory' })[] => {
        const items: (MediaItem | { type: 'ad', vendor: Vendor } | { type: 'add-memory' })[] = [];
        let adIndex = 0;

        console.log('EventGallery: Computing gridItems from displayMedia.length=', displayMedia.length);

        // Add "Add Memory" card if applicable
        if ((isOwner || currentUser?.role === UserRole.ADMIN || currentUser) && !isBulkDeleteMode && !searchQuery) {
            items.push({ type: 'add-memory' });
            console.log('EventGallery: Added "Add Memory" card');
        }

        for (let i = 0; i < displayMedia.length; i++) {
            const item = displayMedia[i];

            // Inject Ad every 8 items if we have vendors and not in bulk mode
            if (vendors.length > 0 && !isBulkDeleteMode && i > 0 && i % 8 === 0) {
                const vendor = vendors[adIndex % vendors.length];
                items.push({ type: 'ad', vendor });
                adIndex++;
            }

            items.push(item);
        }
        console.log('EventGallery: gridItems computed with', items.length, 'total items');
        return items;
    }, [displayMedia, isOwner, currentUser, isBulkDeleteMode, searchQuery, vendors]);

    const renderGridItem = useCallback((index: number) => {
        const item = gridItems[index];
        if (item.type === 'add-memory') {
            return (
                <div onClick={() => onUpload('upload')} className="relative group rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-50 to-white border-2 border-dashed border-indigo-200 shadow-sm hover:shadow-md hover:border-indigo-400 transition-all cursor-pointer flex flex-col items-center justify-center min-h-[250px] animate-in fade-in slide-in-from-bottom-4 h-full">
                    <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4 shadow-inner group-hover:scale-110 transition-transform duration-300">
                        <Plus size={32} strokeWidth={3} />
                    </div>
                    <h4 className="font-black text-indigo-900 text-lg">{t('addMemory')}</h4>
                    <p className="text-indigo-500/80 text-xs font-bold uppercase tracking-wider mt-1">{t('tapToUpload')}</p>
                </div>
            );
        } else if (item.type === 'ad') {
            return <VendorAdCard key={`ad-${index}`} vendor={item.vendor} />;
        } else {
            const mediaItem = item as MediaItem;
            const mediaIndex = displayMedia.indexOf(mediaItem);
            return (
                <div key={mediaItem.id} className="relative group rounded-2xl overflow-hidden bg-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer h-full" onClick={() => !isBulkDeleteMode && openLightbox(mediaIndex)}>

                    {/* Bulk Select Overlay - Only if mode active AND user can manage this specific item */}
                    {isBulkDeleteMode && canManageItem(mediaItem) && (
                        <div className="absolute top-0 left-0 right-0 bottom-0 z-20 bg-black/10 flex items-start justify-end p-3">
                            <button onClick={(e) => { e.stopPropagation(); toggleMediaSelection(mediaItem.id); }} className={`w-6 h-6 rounded-full flex items-center justify-center transition-all shadow-sm ${selectedMedia.has(mediaItem.id) ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400'}`}>
                                {selectedMedia.has(mediaItem.id) ? <CheckSquare size={14} /> : <Square size={14} />}
                            </button>
                        </div>
                    )}

                    {mediaItem.type === 'video' ? (
                        <VideoGridItem item={mediaItem} onClick={() => !isBulkDeleteMode && openLightbox(mediaIndex)} />
                    ) : (
                        // Updated Image Grid Item with Fallback
                        <div className="w-full aspect-square bg-slate-200 relative overflow-hidden">
                            <img
                                src={mediaItem.previewUrl || mediaItem.url}
                                alt={mediaItem.caption || 'Photo'}
                                className="w-full h-full object-cover"
                                style={{ transform: getOrientationTransform(mediaItem.orientation) }}
                                loading="lazy"
                                onError={(e) => {
                                    console.error('Image failed to load:', mediaItem.url);
                                    e.currentTarget.style.display = 'none';
                                }}
                            />
                        </div>
                    )}
                    {mediaItem.isWatermarked && mediaItem.watermarkText && (
                        <div className="absolute bottom-2 right-2 pointer-events-none">
                            <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest drop-shadow-md px-1.5 py-0.5 rounded bg-black/30 backdrop-blur-sm">{mediaItem.watermarkText}</p>
                        </div>
                    )}

                    {/* UPDATED: Privacy Lock Icon */}
                    {mediaItem.privacy === 'private' && (
                        <div className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-full shadow-sm backdrop-blur-sm z-10">
                            <Lock size={12} />
                        </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4 pointer-events-none">
                        <p className="text-white text-sm font-medium truncate">{mediaItem.caption}</p>
                        <div className="flex justify-between items-end mt-0.5">
                            <p className="text-white/60 text-xs">by {mediaItem.uploaderName}</p>
                            {mediaItem.comments && mediaItem.comments.length > 0 && (
                                <div className="flex items-center gap-1 text-white/80 text-xs">
                                    <MessageSquare size={12} /> {mediaItem.comments.length}
                                </div>
                            )}
                        </div>
                    </div>
                    {!isBulkDeleteMode && (
                        <button onClick={(e) => { e.stopPropagation(); onLike(mediaItem); }} className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-md rounded-full p-2 text-slate-400 shadow-lg hover:text-red-500 hover:scale-110 transition-all flex items-center gap-1 pointer-events-auto z-10">
                            <Heart size={16} className={mediaItem.likes ? 'fill-red-500 text-red-500' : ''} />
                            {item.likes ? <span className="text-xs font-bold text-red-500">{mediaItem.likes}</span> : null}
                        </button>
                    )}
                    {/* Star Cover Icon - Host Only */}
                    {(isOwner || currentUser?.role === UserRole.ADMIN) && mediaItem.type === 'image' && !isBulkDeleteMode && (
                        <button onClick={(e) => { e.stopPropagation(); onSetCover(mediaItem); }} className="absolute top-3 left-3 bg-black/40 backdrop-blur-md rounded-full p-1.5 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-indigo-600 pointer-events-auto z-10"><Star size={14} /></button>
                    )}
                </div>
            );
        }
    }, [gridItems, displayMedia, isBulkDeleteMode, canManageItem, selectedMedia, onLike, onSetCover, isOwner, currentUser]);

    if (isPinLocked) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center px-4">
                <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center border border-slate-200">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock size={32} className="text-slate-700" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('pinRequired')}</h2>
                    <form onSubmit={handleUnlock}>
                        <input id="event-pin-input" name="event-pin" type="text" value={pinInput} onChange={(e) => { setPinInput(e.target.value); setPinError(''); }} placeholder="PIN Code" className="w-full text-center text-2xl tracking-widest font-bold p-3 rounded-xl border border-slate-300 mb-4 uppercase" maxLength={6} autoComplete="off" />
                        {pinError && <p className="text-red-500 font-bold text-sm mb-4">{pinError}</p>}
                        <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold">{t('submitPin')}</button>
                    </form>
                </div>
            </div>
        );
    }

    if (isEventExpired && currentUser?.role !== UserRole.ADMIN && currentUser?.id !== event.hostId) {
        return (
            <main className="max-w-5xl mx-auto px-4 py-20 text-center">
                <h1 className="text-3xl font-bold text-slate-900 mb-4">{t('eventExpiredTitle')}</h1>
                <p className="text-slate-500 mb-8">{t('eventExpiredMsg')}</p>
                <button onClick={() => window.location.href = "/"} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold">{t('goHome')}</button>
            </main>
        );
    }

    return (
        <main
            className="max-w-5xl mx-auto px-4 py-8 pb-32"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
                transform: pullDistance > 0 ? `translateY(${Math.min(pullDistance, PULL_THRESHOLD)}px)` : undefined,
                transition: isRefreshing ? 'transform 0.3s ease-out' : undefined
            }}
        >
            {/* Pull to Refresh Indicator */}
            {pullDistance > 0 && (
                <div
                    className="fixed top-0 left-0 right-0 z-50 bg-indigo-600 text-white text-center py-2 text-sm font-medium transition-opacity"
                    style={{
                        opacity: Math.min(pullDistance / PULL_THRESHOLD, 1),
                        transform: `translateY(${Math.max(0, pullDistance - PULL_THRESHOLD)}px)`
                    }}
                >
                    {isRefreshing ? (
                        <div className="flex items-center justify-center gap-2">
                            <Loader2 className="animate-spin h-4 w-4" />
                            Refreshing...
                        </div>
                    ) : pullDistance > PULL_THRESHOLD ? (
                        <div className="flex items-center justify-center gap-2">
                            <ArrowDown className="h-4 w-4" />
                            Release to refresh
                        </div>
                    ) : (
                        <div className="flex items-center justify-center gap-2">
                            <ArrowDown className="h-4 w-4" />
                            Pull to refresh
                        </div>
                    )}
                </div>
            )}

            {isEventExpired && currentUser?.role === UserRole.ADMIN && (
                <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-xl mb-6 flex items-center font-bold">
                    <ShieldCheck className="mr-2" /> {t('adminModeExpired')}
                </div>
            )}

            {/* Event Header */}
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 mb-8 relative overflow-hidden group">
                {event.coverImage ? (
                    <div className="absolute inset-0 z-0">
                        {event.coverMediaType === 'video' ? (
                            <video src={event.coverImage} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                        ) : (
                            <img src={event.coverImage} alt="Cover" className="w-full h-full object-cover" />
                        )}
                        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm"></div>
                    </div>
                ) : (
                    <div className="absolute -top-20 -right-20 opacity-[0.03] pointer-events-none z-0">
                        <div className="w-96 h-96 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full blur-3xl"></div>
                    </div>
                )}

                <div className="flex flex-col md:flex-row gap-8 relative z-10 items-center md:items-start">
                    <div className="flex-shrink-0 flex flex-col items-center">
                        <div className={`bg-white p-4 rounded-2xl shadow-lg border inline-block ${isStudioTier ? 'border-amber-200 ring-4 ring-amber-50' : 'border-slate-100'}`}>
                            <QRCodeSVG value={`${window.location.origin}?event=${event.id}`} size={140} fgColor={qrFgColor} />
                        </div>
                        <button onClick={handleCopyLink} className={`mt-3 flex items-center gap-2 text-sm font-bold px-3 py-1.5 rounded-lg transition-all ${linkCopied ? 'bg-green-100 text-green-700' : 'text-indigo-600 hover:bg-indigo-50'}`}>
                            {linkCopied ? <CheckCircle size={14} /> : <LinkIcon size={14} />}
                            {linkCopied ? t('linkCopied') : t('copyLink')}
                        </button>
                    </div>

                    <div className="flex-1 text-center md:text-left w-full">
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-2">{event.title}</h1>
                        <p className="text-slate-500 flex items-center justify-center md:justify-start mb-2 font-medium">
                            <Calendar size={18} className="mr-2 text-indigo-500" /> {event.date || t('dateTBD')}
                        </p>
                        {/* NEW: City Display */}
                        {event.city && (
                            <p className="text-slate-500 flex items-center justify-center md:justify-start mb-6 font-medium">
                                <MapPin size={18} className="mr-2 text-red-500" /> {t('city')}: {event.city}
                            </p>
                        )}
                        <div className="text-slate-700 bg-slate-50 p-5 rounded-2xl border border-slate-200 w-full text-left shadow-sm relative">
                            <p className="italic">{event.description}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-center mb-8">
                <div className="bg-white p-1.5 rounded-xl shadow-sm border border-slate-200 flex gap-2">
                    <button onClick={() => setActiveTab('gallery')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'gallery' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
                        <LayoutGrid size={18} /> {t('gallery')}</button>
                    <button onClick={() => setActiveTab('guestbook')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'guestbook' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
                        <BookOpen size={18} /> {t('guestbook')}</button>
                </div>
            </div>

            {activeTab === 'gallery' ? (
                <>
                    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                            <input id="search-memories-input" name="search-memories" type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search memories..." className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm" autoComplete="off" />
                            {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={14} /></button>}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {filteredMedia && <button onClick={() => { setFilteredMedia(null); setFindMeImage(null); }} className="flex items-center gap-1 px-3 py-2 text-sm font-bold text-red-600 bg-red-50 rounded-xl hover:bg-red-100"><X size={16} /> {t('clearFilter')}</button>}

                            {/* Enhanced "My Uploads" Toggle */}
                            {currentUser && !isBulkDeleteMode && (
                                <button
                                    onClick={() => setShowMyUploads(!showMyUploads)}
                                    className={`p-2 rounded-xl transition-colors ${showMyUploads ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                                    title={showMyUploads ? t('allPhotos') : t('myUploads')}
                                >
                                    <Upload size={20} />
                                </button>
                            )}

                            {/* Enable Bulk Mode if user has ANY manageable items */}
                            {hasManageableItems && displayMedia.length > 0 && (
                                <button
                                    onClick={toggleBulkDeleteMode}
                                    className={`p-2 rounded-xl transition-colors ${isBulkDeleteMode ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                                    title={isBulkDeleteMode ? t('cancel') : t('selectMedia')}
                                >
                                    {isBulkDeleteMode ? <X size={20} /> : <CheckSquare size={20} />}
                                </button>
                            )}
                            {isBulkDeleteMode && (
                                <>
                                    <button onClick={selectAllMedia} className="px-3 py-2 text-xs font-bold bg-slate-100 rounded-xl hover:bg-slate-200">
                                        {selectedMedia.size === displayMedia.length ? 'Deselect All' : 'Select All'}
                                    </button>
                                    {selectedMedia.size > 0 && (
                                        <button onClick={handleBulkDelete} disabled={isDeleting} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl">
                                            {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                            {selectedMedia.size}
                                        </button>
                                    )}
                                </>
                            )}
                            {modelsLoaded && localMedia.length > 0 && !isBulkDeleteMode && (
                                <button onClick={() => setIsFindMeOpen(!isFindMeOpen)} className={`p-2 rounded-xl transition-colors ${isFindMeOpen ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`} title={t('findMe')}><ScanFace size={20} /></button>
                            )}
                            {displayMedia.length > 0 && !isBulkDeleteMode && (
                                <button onClick={() => { openLightbox(0); setIsSlideshowPlaying(true); }} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 font-bold text-sm"><Play size={16} /> <span className="hidden sm:inline">{t('slideshow')}</span></button>
                            )}
                            {(isOwner || currentUser?.role === UserRole.ADMIN) && displayMedia.length > 0 && !isBulkDeleteMode && (
                                <button onClick={() => onDownloadAll(localMedia)} disabled={downloadingZip} className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors disabled:opacity-50" title={t('downloadAll')}>
                                    {downloadingZip ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
                                </button>
                            )}
                        </div>
                    </div>

                    {isFindMeOpen && (
                        <div className="bg-white p-4 rounded-2xl shadow-md border border-indigo-100 mb-6 animate-in slide-in-from-top-2 flex flex-col items-center text-center relative overflow-hidden">
                            {/* NEW: Development Warning Banner */}
                            <div className="w-full bg-amber-50 border-b border-amber-100 p-2 mb-4 flex items-center justify-center gap-2 text-amber-700 text-xs font-bold">
                                <AlertTriangle size={14} />
                                {t('findMeDevMode')}
                            </div>

                            <h4 className="font-bold text-slate-900 mb-2">{t('findMeTitle')}</h4>
                            <p className="text-sm text-slate-500 mb-4">{t('findMeDesc')}</p>
                            {isScanning ? (
                                <div className="flex items-center justify-center py-4 text-indigo-600"><Loader2 className="animate-spin mr-2" /> {t('scanning')}</div>
                            ) : (
                                <div className="flex items-center gap-4">
                                    <label className="cursor-pointer bg-indigo-600 text-white px-6 py-3 rounded-full font-bold text-sm hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-lg shadow-indigo-200">
                                        <Camera size={18} />
                                        {t('uploadSelfie')}
                                        {/* FIX: Force Selfie Camera */}
                                        <input id="find-me-upload" name="find-me-upload" type="file" accept="image/*" capture="user" className="hidden" onChange={handleFindMeUpload} autoComplete="off" />
                                    </label>
                                    {findMeImage && (
                                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-indigo-500 shadow-sm"><img src={findMeImage} className="w-full h-full object-cover" alt="Selfie" /></div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mb-24 min-h-screen">
                        {/* Virtual Scrolling Grid for Performance */}
                        <VirtuosoGrid
                            style={{ height: '100vh' }}
                            data={gridItems}
                            itemContent={(index) => renderGridItem(index)}
                            listClassName="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                            itemClassName=""
                            overscan={5} // Render 5 extra items outside visible area
                        />
                    </div>

                    {/* Refined Empty State Logic */}
                    {displayMedia.length === 0 && (
                        <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                            <div className="mx-auto w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4">
                                {searchQuery ? <Search className="text-slate-300" size={32} /> : <Camera className="text-slate-300" size={32} />}
                            </div>
                            <h3 className="text-lg font-medium text-slate-900">{searchQuery ? 'No matches found' : t('noPhotos')}</h3>

                            {/* Host specific CTA */}
                            {isOwner && !searchQuery && (
                                <div className="mt-4">
                                    <p className="text-slate-500 mb-4">Your event is live! Start the gallery.</p>
                                    <button
                                        onClick={() => onUpload('upload')}
                                        className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2 mx-auto shadow-lg"
                                    >
                                        <Upload size={18} />
                                        {t('upload')}
                                    </button>
                                </div>
                            )}

                            {!isOwner && !searchQuery && (
                                <p className="text-slate-500">{t('beFirst')}</p>
                            )}

                            {searchQuery && <button onClick={() => setSearchQuery('')} className="mt-4 text-indigo-600 font-bold hover:underline">Clear Search</button>}
                        </div>
                    )}
                </>
            ) : (
                <div className="max-w-2xl mx-auto mb-24">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-8">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">{t('signGuestbook')}</h3>
                        <form onSubmit={handleGuestbookSubmit} className="space-y-4">
                            <input id="guestbook-name-input" name="guestbook-name" type="text" value={guestbookName} onChange={(e) => setGuestbookName(e.target.value)} placeholder={t('yourName')} required className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" autoComplete="name" />
                            <textarea value={guestbookMessage} onChange={(e) => setGuestbookMessage(e.target.value)} placeholder={t('leaveMessage')} required className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none" />
                            <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"><Send size={18} /> {t('signGuestbook')}</button>
                        </form>
                    </div>
                    <div className="space-y-4">
                        {localGuestbook.map(entry => (
                            <div key={entry.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm animate-in slide-in-from-top-1">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-slate-900">{entry.senderName}</h4>
                                    <span className="text-xs text-slate-400">{new Date(entry.createdAt).toLocaleDateString()}</span>
                                </div>
                                <p className="text-slate-600">{entry.message}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )
            }

            {/* Video Upload Restriction Banner */}
            {videoPermissions.upgradePrompt && !videoPermissions.enabled && (
                <div className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] left-4 right-4 z-30">
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3 shadow-lg">
                        <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                                <Video className="h-5 w-5 text-amber-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-amber-800">
                                    Video uploads available on Pro plan
                                </p>
                                <p className="text-xs text-amber-700 mt-0.5">
                                    Upgrade to unlock 4K video uploads and advanced features
                                </p>
                            </div>
                            <button
                                onClick={() => window.open('/pricing', '_blank')}
                                className="flex-shrink-0 bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-amber-700 transition-colors"
                            >
                                Upgrade
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* UPDATED: Safe area bottom spacing for the fixed bar */}
            <div className={`fixed bottom-[calc(2rem+env(safe-area-inset-bottom))] left-0 right-0 flex justify-center z-40 pointer-events-auto ${videoPermissions.upgradePrompt && !videoPermissions.enabled ? 'bottom-[calc(8rem+env(safe-area-inset-bottom))]' : ''}`}>
                {/* Revised Action Island */}
                <div className="flex items-center gap-4 p-2 pr-3 pl-3 bg-black/80 backdrop-blur-xl rounded-full shadow-2xl border border-white/10 text-white">
                    {/* Camera Button (Mobile) */}
                    {isMobile && (
                        <button
                            onClick={() => onUpload('camera')}
                            className="flex flex-col items-center justify-center w-12 h-12 rounded-full bg-white text-black shadow-lg active:scale-95 transition-transform"
                            title={videoPermissions.enabled ? 'Take photo' : videoPermissions.message}
                        >
                            <Camera size={24} />
                        </button>
                    )}

                    {/* Upload Button */}
                    <button
                        onClick={() => onUpload('upload')}
                        className={`flex flex-col items-center justify-center w-12 h-12 rounded-full transition-colors ${videoPermissions.enabled
                            ? (isMobile ? 'bg-white/10 hover:bg-white/20' : 'bg-white text-black shadow-lg hover:bg-slate-100')
                            : 'bg-gray-500/50 cursor-not-allowed'
                            }`}
                        title={videoPermissions.enabled ? 'Upload media' : videoPermissions.message}
                        disabled={!videoPermissions.enabled && !videoPermissions.visible}
                    >
                        {videoPermissions.enabled ? (
                            <ImagePlus size={24} />
                        ) : (
                            <div className="relative">
                                <ImagePlus size={24} />
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full flex items-center justify-center">
                                    <span className="text-xs font-bold text-black">★</span>
                                </div>
                            </div>
                        )}
                    </button>

                    <div className="w-px h-8 bg-white/20" />

                    {/* Share */}
                    <button onClick={() => setShowShareModal(true)} className="flex flex-col items-center justify-center w-10 h-10 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors">
                        <Share2 size={20} />
                    </button>

                    {/* Watermark Toggle (Photographer only) */}
                    {currentUser?.role === UserRole.PHOTOGRAPHER && (
                        <button onClick={() => setApplyWatermark(!applyWatermark)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${applyWatermark ? 'bg-amber-400 text-black' : 'text-white/50 hover:text-white'}`}>
                            <ShieldCheck size={20} />
                        </button>
                    )}
                </div>
            </div>

            {/* UPDATED Lightbox / Slideshow Modal with Sliding */}
            {
                lightboxIndex !== null && (
                    <div
                        className="fixed inset-0 z-[60] bg-black flex items-center justify-center backdrop-blur-2xl animate-in fade-in duration-200 touch-none"
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        onPointerCancel={onPointerUp}
                        onPointerLeave={onPointerUp}
                    >
                        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-50 bg-gradient-to-b from-black/60 to-transparent pt-[env(safe-area-inset-top)]">
                            <div className="text-white/80 text-sm font-medium">{lightboxIndex + 1} / {displayMedia.length}</div>
                            <div className="flex gap-3">
                                <button onClick={() => setIsSlideshowPlaying(!isSlideshowPlaying)} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">{isSlideshowPlaying ? <Pause size={20} /> : <Play size={20} />}</button>
                                <button onClick={closeLightbox} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"><X size={20} /></button>
                            </div>
                        </div>
                        <button onClick={() => navigateLightbox('prev')} className="absolute left-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-50 hidden md:block"><ChevronLeft size={32} /></button>
                        <button onClick={() => navigateLightbox('next')} className="absolute right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-50 hidden md:block"><ChevronRight size={32} /></button>

                        <div className="w-full h-full relative overflow-hidden" onClick={closeLightbox}>
                            {/* Sliding Container */}
                            <div
                                className="absolute top-0 left-0 h-full flex items-center"
                                style={{
                                    transform: `translateX(calc(-100vw + ${dragOffset}px))`, // -100vw centers the middle slide
                                    transition: (isDragging || isSnapping) ? 'none' : 'transform 0.3s ease-out',
                                    width: '300vw', // Explicit 3 screens wide
                                }}
                                onClick={e => e.stopPropagation()}
                            >
                                {/* Render 3 Slides: Prev, Curr, Next */}
                                {[-1, 0, 1].map((offset) => {
                                    const targetIndex = (lightboxIndex + offset + displayMedia.length) % displayMedia.length;
                                    const item = displayMedia[targetIndex];
                                    return (
                                        <div key={`${targetIndex}-${offset}`} className="w-[100vw] h-full flex-shrink-0 flex items-center justify-center p-2 md:p-10">
                                            {item.type === 'video' ? (
                                                <video
                                                    src={item.url}
                                                    controls
                                                    autoPlay={offset === 0 && isSlideshowPlaying}
                                                    className="max-w-full max-h-full rounded-lg shadow-2xl object-contain bg-black"
                                                    playsInline
                                                    muted={isSlideshowPlaying}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onError={(e) => {
                                                        console.error('Video failed to load in lightbox:', item.url);
                                                    }}
                                                    style={{
                                                        pointerEvents: 'auto',
                                                        width: 'auto',
                                                        height: 'auto',
                                                        maxWidth: '100%',
                                                        maxHeight: '100%'
                                                    }}
                                                />
                                            ) : (
                                                <img
                                                    src={item.previewUrl || item.url}
                                                    alt={item.caption}
                                                    className="max-w-full max-h-full object-contain rounded-lg shadow-2xl select-none"
                                                    style={{ transform: getOrientationTransform(item.orientation) }}
                                                    draggable={false}
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Caption Overlay (Static on top) */}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] flex flex-col gap-4 max-h-[40vh] overflow-y-auto pointer-events-auto" onClick={e => e.stopPropagation()}>
                                <div className="text-center mb-2">
                                    {displayMedia[lightboxIndex].privacy === 'private' && (
                                        <div className="flex items-center justify-center gap-1 text-amber-400 mb-1 text-xs font-bold uppercase tracking-wider">
                                            <Lock size={12} /> Private
                                        </div>
                                    )}
                                    <p className="text-white text-lg font-bold drop-shadow-md">{displayMedia[lightboxIndex].caption}</p>
                                    <p className="text-white/60 text-sm mt-1">{new Date(displayMedia[lightboxIndex].uploadedAt).toLocaleDateString()} • {displayMedia[lightboxIndex].uploaderName}</p>
                                </div>

                                {/* Comments Section */}
                                <div className="w-full max-w-lg mx-auto bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10">
                                    <div className="max-h-32 overflow-y-auto space-y-2 mb-3 custom-scrollbar">
                                        {displayMedia[lightboxIndex].comments?.length ? (
                                            displayMedia[lightboxIndex].comments!.map(c => (
                                                <div key={c.id} className="text-sm">
                                                    <span className="font-bold text-white mr-2">{c.senderName}:</span>
                                                    <span className="text-white/80">{c.text}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-white/40 text-xs text-center italic">No comments yet.</p>
                                        )}
                                    </div>
                                    <form onSubmit={handleAddComment} className="flex gap-2">
                                        <input
                                            type="text"
                                            value={commentText}
                                            onChange={e => setCommentText(e.target.value)}
                                            placeholder="Add a comment..."
                                            className="flex-1 bg-black/20 text-white text-sm rounded-lg px-3 py-2 border border-white/20 focus:outline-none focus:border-white/50 placeholder:text-white/30"
                                        />
                                        <button type="submit" className="p-2 bg-white/20 rounded-lg hover:bg-white/30 text-white transition-colors">
                                            <Send size={16} />
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Download Status Toast */}
            {downloadStatus?.show && (
                <div className="fixed top-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
                    <div className={`p-4 rounded-lg shadow-lg border backdrop-blur-md ${downloadStatus.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
                        downloadStatus.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
                            'bg-blue-50 border-blue-200 text-blue-800'
                        }`}>
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                {downloadStatus.type === 'success' && (
                                    <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                )}
                                {downloadStatus.type === 'error' && (
                                    <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                )}
                                {downloadStatus.type === 'info' && (
                                    <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
                                )}
                            </div>
                            <div className="ml-3">
                                <p className="text-sm font-medium">{downloadStatus.message}</p>
                            </div>
                            <div className="ml-auto pl-3">
                                <button
                                    onClick={() => setDownloadStatus(null)}
                                    className="inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 hover:bg-black/10"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showShareModal && <ShareModal eventId={event.id} eventTitle={event.title} onClose={() => setShowShareModal(false)} t={t} />}
        </main >
    );
};

EventGalleryComponent.displayName = 'EventGallery';

export const EventGallery = memo(EventGalleryComponent);