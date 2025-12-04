/**
 * Event Store - Zustand Implementation
 * Manages event-related state and operations
 */

import { create } from 'zustand';
import { Event, MediaItem, User } from '../types';

interface EventState {
    // Event state
    events: Event[];
    currentEventId: string | null;
    fetchedHostUsers: Record<string, User>;

    // Event actions
    setEvents: (events: Event[] | ((prev: Event[]) => Event[])) => void;
    setCurrentEventId: (eventId: string | null) => void;
    setFetchedHostUsers: (users: Record<string, User> | ((prev: Record<string, User>) => Record<string, User>)) => void;

    // Event operations
    addEvent: (event: Event) => void;
    updateEvent: (updatedEvent: Event) => void;
    deleteEvent: (eventId: string) => void;
    addMediaToEvent: (eventId: string, media: MediaItem) => void;
    updateMediaInEvent: (eventId: string, mediaId: string, updates: Partial<MediaItem>) => void;
    deleteMediaFromEvent: (eventId: string, mediaId: string) => void;

    // Utility functions
    getActiveEvent: () => Event | null;
    getEventById: (eventId: string) => Event | null;
    incrementEventViews: (eventId: string) => void;
    incrementEventDownloads: (eventId: string) => void;
}

export const useEventStore = create<EventState>((set, get) => ({
    // Initial state
    events: [],
    currentEventId: null,
    fetchedHostUsers: {},

    // State setters
    setEvents: (events) => {
        if (typeof events === 'function') {
            set((state) => ({ events: events(state.events) }));
        } else {
            set({ events });
        }
    },

    setCurrentEventId: (eventId) => set({ currentEventId: eventId }),

    setFetchedHostUsers: (users) => {
        if (typeof users === 'function') {
            set((state) => ({ fetchedHostUsers: users(state.fetchedHostUsers) }));
        } else {
            set({ fetchedHostUsers: users });
        }
    },

    // Event operations
    addEvent: (event) => {
        set((state) => ({
            events: [event, ...state.events]
        }));
    },

    updateEvent: (updatedEvent) => {
        set((state) => ({
            events: state.events.map((event) =>
                event.id === updatedEvent.id ? updatedEvent : event
            )
        }));
    },

    deleteEvent: (eventId) => {
        set((state) => ({
            events: state.events.filter((event) => event.id !== eventId)
        }));

        // If we're deleting the current event, clear the current event ID
        if (get().currentEventId === eventId) {
            set({ currentEventId: null });
        }
    },

    addMediaToEvent: (eventId, media) => {
        set((state) => ({
            events: state.events.map((event) => {
                if (event.id === eventId) {
                    return {
                        ...event,
                        media: [media, ...event.media]
                    };
                }
                return event;
            })
        }));
    },

    updateMediaInEvent: (eventId, mediaId, updates) => {
        set((state) => ({
            events: state.events.map((event) => {
                if (event.id === eventId) {
                    return {
                        ...event,
                        media: event.media.map((m) =>
                            m.id === mediaId ? { ...m, ...updates } : m
                        )
                    };
                }
                return event;
            })
        }));
    },

    deleteMediaFromEvent: (eventId, mediaId) => {
        set((state) => ({
            events: state.events.map((event) => {
                if (event.id === eventId) {
                    return {
                        ...event,
                        media: event.media.filter((m) => m.id !== mediaId)
                    };
                }
                return event;
            })
        }));
    },

    // Utility functions
    getActiveEvent: () => {
        const { events, currentEventId } = get();
        return events.find((event) => event.id === currentEventId) || null;
    },

    getEventById: (eventId) => {
        const { events } = get();
        return events.find((event) => event.id === eventId) || null;
    },

    incrementEventViews: (eventId) => {
        set((state) => ({
            events: state.events.map((event) => {
                if (event.id === eventId) {
                    return {
                        ...event,
                        views: (event.views || 0) + 1
                    };
                }
                return event;
            })
        }));
    },

    incrementEventDownloads: (eventId) => {
        set((state) => ({
            events: state.events.map((event) => {
                if (event.id === eventId) {
                    return {
                        ...event,
                        downloads: (event.downloads || 0) + 1
                    };
                }
                return event;
            })
        }));
    }
}));

// Selectors for optimized performance
export const selectEvents = () => useEventStore((state) => state.events);
export const selectCurrentEventId = () => useEventStore((state) => state.currentEventId);
export const selectActiveEvent = () => useEventStore((state) => state.getActiveEvent());
export const selectFetchedHostUsers = () => useEventStore((state) => state.fetchedHostUsers);