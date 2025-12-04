/**
 * Custom Hook for Event Gallery Socket Integration
 * Implements Phase 2: Core Optimization for real-time socket updates
 */
import { useEffect, useRef, useCallback } from 'react';
import { optimizedSocketService } from '../services/optimizedSocketService';
import { useEventStore } from '../stores/eventStore';
import { useAuthStore } from '../stores/authStore';
import { useMediaStore } from '../stores/mediaStore';
import { Event, MediaItem, User } from '../types';

// Socket event types
type SocketEventMap = {
    'media_added': { eventId: string; media: MediaItem };
    'media_updated': { eventId: string; mediaId: string; updates: Partial<MediaItem> };
    'media_deleted': { eventId: string; mediaId: string };
    'guestbook_updated': { eventId: string; guestbook: any[] };
    'event_updated': { event: Partial<Event> & { id: string } };
    'user_joined': { eventId: string; user: User };
    'user_left': { eventId: string; userId: string };
    'like_added': { eventId: string; mediaId: string; userId: string };
    'comment_added': { eventId: string; mediaId: string; comment: any };
};

export function useEventSocket(eventId: string, currentUser: User | null) {
    const socketService = useRef(optimizedSocketService);
    const { token: authToken } = useAuthStore();
    const { updateEvent, addMediaToEvent, updateMediaInEvent, deleteMediaFromEvent } = useEventStore();

    // Track if we're currently processing socket events to prevent duplicate processing
    const processingRef = useRef<Set<string>>(new Set());
    const isMountedRef = useRef(true);

    // Cleanup function ref
    const cleanupRef = useRef<() => void>(() => { });

    // Socket event handlers with proper error handling and cleanup
    const setupSocketHandlers = useCallback(() => {
        if (!eventId || !isMountedRef.current) return;

        // Clean up any existing handlers first
        cleanupRef.current();

        const cleanupCallbacks: (() => void)[] = [];

        try {
            // Connect socket with authentication
            socketService.current.connect(authToken || undefined);

            // Join the event room
            socketService.current.joinEvent(eventId);

            // Set up event handlers with debouncing and batching
            const handlers = {
                // Media updates with debouncing (300ms)
                media_added: (data: SocketEventMap['media_added']) => {
                    if (data.eventId === eventId && !processingRef.current.has(`media_added_${data.media.id}`)) {
                        processingRef.current.add(`media_added_${data.media.id}`);
                        try {
                            addMediaToEvent(eventId, data.media);
                            console.log(`✅ Processed media_added for ${data.media.id}`);
                        } catch (error) {
                            console.error('❌ Error processing media_added:', error);
                        } finally {
                            processingRef.current.delete(`media_added_${data.media.id}`);
                        }
                    }
                },

                media_updated: (data: SocketEventMap['media_updated']) => {
                    if (data.eventId === eventId && !processingRef.current.has(`media_updated_${data.mediaId}`)) {
                        processingRef.current.add(`media_updated_${data.mediaId}`);
                        try {
                            updateMediaInEvent(eventId, data.mediaId, data.updates);
                            console.log(`✅ Processed media_updated for ${data.mediaId}`);
                        } catch (error) {
                            console.error('❌ Error processing media_updated:', error);
                        } finally {
                            processingRef.current.delete(`media_updated_${data.mediaId}`);
                        }
                    }
                },

                media_deleted: (data: SocketEventMap['media_deleted']) => {
                    if (data.eventId === eventId && !processingRef.current.has(`media_deleted_${data.mediaId}`)) {
                        processingRef.current.add(`media_deleted_${data.mediaId}`);
                        try {
                            deleteMediaFromEvent(eventId, data.mediaId);
                            console.log(`✅ Processed media_deleted for ${data.mediaId}`);
                        } catch (error) {
                            console.error('❌ Error processing media_deleted:', error);
                        } finally {
                            processingRef.current.delete(`media_deleted_${data.mediaId}`);
                        }
                    }
                },

                // Guestbook updates with batching (200ms)
                guestbook_updated: (data: SocketEventMap['guestbook_updated']) => {
                    if (data.eventId === eventId) {
                        try {
                            // Get current event and update only the guestbook
                            const currentEvent = useEventStore.getState().getEventById(eventId);
                            if (currentEvent) {
                                updateEvent({
                                    ...currentEvent,
                                    guestbook: data.guestbook
                                });
                            }
                            console.log(`✅ Processed guestbook_updated with ${data.guestbook.length} entries`);
                        } catch (error) {
                            console.error('❌ Error processing guestbook_updated:', error);
                        }
                    }
                },

                // Event updates with debouncing
                event_updated: (data: SocketEventMap['event_updated']) => {
                    if (data.event.id === eventId) {
                        try {
                            // Get current event and merge updates
                            const currentEvent = useEventStore.getState().getEventById(eventId);
                            if (currentEvent) {
                                updateEvent({
                                    ...currentEvent,
                                    ...data.event
                                });
                            }
                            console.log(`✅ Processed event_updated for ${data.event.id}`);
                        } catch (error) {
                            console.error('❌ Error processing event_updated:', error);
                        }
                    }
                },

                // User presence updates
                user_joined: (data: SocketEventMap['user_joined']) => {
                    if (data.eventId === eventId) {
                        try {
                            console.log(`👤 User joined: ${data.user.id || data.user.name}`);
                            // Could update presence indicators here
                        } catch (error) {
                            console.error('❌ Error processing user_joined:', error);
                        }
                    }
                },

                user_left: (data: SocketEventMap['user_left']) => {
                    if (data.eventId === eventId) {
                        try {
                            console.log(`👋 User left: ${data.userId}`);
                            // Could update presence indicators here
                        } catch (error) {
                            console.error('❌ Error processing user_left:', error);
                        }
                    }
                },

                // Interaction updates with batching
                like_added: (data: SocketEventMap['like_added']) => {
                    if (data.eventId === eventId) {
                        try {
                            // Get current media and update likes
                            const currentEvent = useEventStore.getState().getEventById(eventId);
                            if (currentEvent) {
                                const currentMedia = currentEvent.media.find(m => m.id === data.mediaId);
                                if (currentMedia) {
                                    const currentLikes = Array.isArray(currentMedia.likes) ? currentMedia.likes : [];
                                    updateMediaInEvent(eventId, data.mediaId, {
                                        likes: currentLikes.length + 1 // Increment like count
                                    });
                                }
                            }
                            console.log(`❤️ Processed like_added for media ${data.mediaId} by user ${data.userId}`);
                        } catch (error) {
                            console.error('❌ Error processing like_added:', error);
                        }
                    }
                },

                comment_added: (data: SocketEventMap['comment_added']) => {
                    if (data.eventId === eventId) {
                        try {
                            // Get current media and update comments
                            const currentEvent = useEventStore.getState().getEventById(eventId);
                            if (currentEvent) {
                                const currentMedia = currentEvent.media.find(m => m.id === data.mediaId);
                                if (currentMedia) {
                                    const currentComments = Array.isArray(currentMedia.comments) ? currentMedia.comments : [];
                                    updateMediaInEvent(eventId, data.mediaId, {
                                        comments: [...currentComments, data.comment]
                                    });
                                }
                            }
                            console.log(`💬 Processed comment_added for media ${data.mediaId}`);
                        } catch (error) {
                            console.error('❌ Error processing comment_added:', error);
                        }
                    }
                }
            };

            // Register all handlers with appropriate optimization strategies
            Object.entries(handlers).forEach(([event, handler]) => {
                // Use batching for high-frequency events
                if (['guestbook_updated', 'like_added', 'comment_added'].includes(event)) {
                    socketService.current.onWithBatching(event, handler as any, 200);
                }
                // Use debouncing for individual media updates
                else if (['media_added', 'media_updated', 'media_deleted'].includes(event)) {
                    socketService.current.on(event, handler as any, 300);
                }
                // Regular handling for other events
                else {
                    socketService.current.on(event, handler as any);
                }
            });

            // Set up cleanup function
            cleanupRef.current = () => {
                console.log('🧹 Cleaning up socket handlers...');
                Object.keys(handlers).forEach(event => {
                    try {
                        // Remove specific handlers for this event
                        const handler = (handlers as any)[event];
                        if (handler && typeof handler === 'function') {
                            socketService.current.off(event as string, handler);
                        }
                    } catch (error) {
                        console.error(`❌ Error cleaning up handler for ${event}:`, error);
                    }
                });

                // Leave event room
                try {
                    socketService.current.leaveEvent();
                } catch (error) {
                    console.error('❌ Error leaving event room:', error);
                }

                // Disconnect socket
                try {
                    socketService.current.disconnect();
                } catch (error) {
                    console.error('❌ Error disconnecting socket:', error);
                }
            };

        } catch (error) {
            console.error('❌ Failed to set up socket handlers:', error);
            // Ensure cleanup happens even if setup fails
            cleanupRef.current();
        }

    }, [eventId, authToken, addMediaToEvent, updateMediaInEvent, deleteMediaFromEvent, updateEvent]);

    // Effect for socket connection management
    useEffect(() => {
        isMountedRef.current = true;

        // Set up socket handlers
        setupSocketHandlers();

        // Handle component unmount cleanup
        return () => {
            isMountedRef.current = false;
            console.log('🏠 Component unmounting - cleaning up socket connections');
            cleanupRef.current();
        };
    }, [setupSocketHandlers]);

    // Effect for monitoring socket connection state
    useEffect(() => {
        if (!isMountedRef.current) return;

        const connectionMonitor = setInterval(() => {
            const isConnected = socketService.current.isConnected();
            const stats = socketService.current.getConnectionStats();

            if (!isConnected) {
                console.warn('⚠️ Socket disconnected, attempting to reconnect...');
                socketService.current.connect(authToken || undefined);
            }
        }, 10000); // Check every 10 seconds

        return () => {
            clearInterval(connectionMonitor);
        };
    }, [authToken]);

    // Expose socket service methods for manual use if needed
    const socketMethods = {
        sendMediaUpdate: (mediaId: string, updates: Partial<MediaItem>) => {
            if (socketService.current.isConnected() && eventId) {
                socketService.current.emit('update_media', {
                    eventId,
                    mediaId,
                    updates
                });
            }
        },
        sendLike: (mediaId: string) => {
            if (socketService.current.isConnected() && eventId && currentUser?.id) {
                socketService.current.emit('add_like', {
                    eventId,
                    mediaId,
                    userId: currentUser.id
                });
            }
        },
        sendComment: (mediaId: string, comment: { text: string; userId: string }) => {
            if (socketService.current.isConnected() && eventId) {
                socketService.current.emit('add_comment', {
                    eventId,
                    mediaId,
                    comment
                });
            }
        },
        getConnectionStats: () => socketService.current.getConnectionStats(),
        isConnected: () => socketService.current.isConnected()
    };

    return {
        ...socketMethods,
        // Expose cleanup for manual triggering if needed
        cleanup: cleanupRef.current
    };
}

// Type guard for socket events
export function isSocketEvent<T extends keyof SocketEventMap>(
    event: string,
    data: any
): data is SocketEventMap[T] {
    return event in {
        'media_added': 1,
        'media_updated': 1,
        'media_deleted': 1,
        'guestbook_updated': 1,
        'event_updated': 1,
        'user_joined': 1,
        'user_left': 1,
        'like_added': 1,
        'comment_added': 1
    };
}