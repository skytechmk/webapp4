/**
 * Event Management Utilities Module
 * Focused utility functions for event-related operations
 */

import { Event, MediaItem } from '../types';
import { api } from '../services/api';

export const incrementEventViews = async (
    id: string,
    currentEvents: Event[],
    setEvents: (value: Event[] | ((prev: Event[]) => Event[])) => void
): Promise<void> => {
    const updated = currentEvents.map(e => {
        if (e.id === id) return { ...e, views: (e.views || 0) + 1 };
        return e;
    });
    setEvents(updated);
    await fetch(`${process.env.VITE_API_URL || ''}/api/events/${id}/view`, { method: 'POST' });
};

export const handleLikeMedia = async (
    item: MediaItem,
    activeEvent: Event | null,
    setEvents: (value: Event[] | ((prev: Event[]) => Event[])) => void
): Promise<void> => {
    if (!activeEvent) return;
    setEvents(prev => prev.map(e => {
        if (e.id === activeEvent.id) {
            return { ...e, media: e.media.map(m => m.id === item.id ? { ...m, likes: (m.likes || 0) + 1 } : m) };
        }
        return e;
    }));
    await api.likeMedia(item.id);
};

export const handleSetCoverImage = async (
    item: MediaItem,
    activeEvent: Event | null,
    setEvents: (value: Event[] | ((prev: Event[]) => Event[])) => void
): Promise<string> => {
    if (!activeEvent) return "No active event";
    const updated = { ...activeEvent, coverImage: item.url, coverMediaType: item.type };
    await api.updateEvent(updated);
    setEvents(prev => prev.map(e => e.id === activeEvent.id ? updated : e));
    return "Cover image set successfully";
};