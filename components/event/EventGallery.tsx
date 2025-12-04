/**
 * Event Gallery - Main Component
 * Refactored to use Zustand state management and modular components
 */

import * as React from 'react';
const { useState, useEffect, useCallback, useRef, useMemo, memo } = React;
import { VirtuosoGrid } from 'react-virtuoso';
import { useEventStore, useMediaStore, useAuthStore } from '../../stores';
import { Event, User, MediaItem, TranslateFn } from '../../types';
import { EventHeader } from './components/EventHeader';
import { MediaGrid } from './components/MediaGrid';
import { LightboxModal } from './components/LightboxModal';
import { Guestbook } from './components/Guestbook';
import { ActionBar } from './components/ActionBar';
import { SearchBar } from './components/SearchBar';
import { FindMeModal } from './components/FindMeModal';
import { ShareModal } from './modals/ShareModal';
import { VideoGridItem } from './components/VideoGridItem';

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

export const EventGallery: React.FC<EventGalleryProps> = ({
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
    // Zustand stores integration
    const localMedia = useEventStore((state) => state.getEventById(event.id)?.media || []);
    const setLocalMedia = useEventStore((state) => state.setEvents);
    const localGuestbook = useEventStore((state) => state.getEventById(event.id)?.guestbook || []);
    const setLocalGuestbook = useEventStore((state) => state.setEvents);

    const [activeTab, setActiveTab] = useState<'gallery' | 'guestbook'>('gallery');
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const [isSlideshowPlaying, setIsSlideshowPlaying] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);
    const [commentText, setCommentText] = useState('');

    // Sync props with Zustand stores
    useEffect(() => {
        if (event.media !== localMedia) {
            useEventStore.getState().updateEvent({
                ...event,
                media: event.media
            });
        }
    }, [event.media]);

    useEffect(() => {
        if (event.guestbook !== localGuestbook) {
            useEventStore.getState().updateEvent({
                ...event,
                guestbook: event.guestbook
            });
        }
    }, [event.guestbook]);

    const openLightbox = (index: number) => {
        setLightboxIndex(index);
        setIsSlideshowPlaying(false);
        document.body.style.overflow = 'hidden';
    };

    const closeLightbox = useCallback(() => {
        setLightboxIndex(null);
        setIsSlideshowPlaying(false);
        document.body.style.overflow = 'unset';
    }, []);

    return (
        <main className="max-w-5xl mx-auto px-4 py-8 pb-32">
            {/* Event Header */}
            <EventHeader
                event={event}
                currentUser={currentUser}
                hostUser={hostUser}
                isEventExpired={isEventExpired}
                isOwner={isOwner}
                isHostPhotographer={isHostPhotographer}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                linkCopied={linkCopied}
                setLinkCopied={setLinkCopied}
                t={t}
            />

            {/* Tab Content */}
            {activeTab === 'gallery' ? (
                <>
                    {/* Search and Action Bar */}
                    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                        <SearchBar
                            searchQuery=""
                            setSearchQuery={() => { }}
                            filteredMedia={null}
                            setFilteredMedia={() => { }}
                            setFindMeImage={() => { }}
                            t={t}
                        />

                        <ActionBar
                            currentUser={currentUser}
                            isOwner={isOwner}
                            isBulkDeleteMode={false}
                            selectedMedia={new Set()}
                            showMyUploads={false}
                            setShowMyUploads={() => { }}
                            toggleBulkDeleteMode={() => { }}
                            selectAllMedia={() => { }}
                            handleBulkDelete={() => { }}
                            isScanning={false}
                            setIsFindMeOpen={() => { }}
                            displayMedia={localMedia}
                            isMobile={false}
                            downloadingZip={downloadingZip}
                            onDownloadAll={onDownloadAll}
                            onOpenSlideshow={() => openLightbox(0)}
                            t={t}
                        />
                    </div>

                    {/* Media Grid */}
                    <MediaGrid
                        event={event}
                        currentUser={currentUser}
                        isOwner={isOwner}
                        isBulkDeleteMode={false}
                        selectedMedia={new Set()}
                        displayMedia={localMedia}
                        onLike={onLike}
                        onSetCover={onSetCover}
                        openLightbox={openLightbox}
                        t={t}
                    />

                    {/* Find Me Modal (placeholder) */}
                    <FindMeModal
                        isFindMeOpen={false}
                        setIsFindMeOpen={() => { }}
                        findMeImage={null}
                        setFindMeImage={() => { }}
                        isScanning={false}
                        handleFindMeUpload={() => { }}
                        t={t}
                    />
                </>
            ) : (
                /* Guestbook Tab */
                <Guestbook
                    event={event}
                    currentUser={currentUser}
                    guestbookMessage=""
                    setGuestbookMessage={() => { }}
                    guestbookName={currentUser?.name || ''}
                    setGuestbookName={() => { }}
                    handleGuestbookSubmit={() => { }}
                    localGuestbook={localGuestbook}
                    t={t}
                />
            )}

            {/* Lightbox Modal */}
            <LightboxModal
                lightboxIndex={lightboxIndex}
                displayMedia={localMedia}
                isSlideshowPlaying={isSlideshowPlaying}
                setIsSlideshowPlaying={setIsSlideshowPlaying}
                closeLightbox={closeLightbox}
                navigateLightbox={() => { }}
                commentText={commentText}
                setCommentText={setCommentText}
                handleAddComment={() => { }}
                t={t}
            />

            {/* Share Modal */}
            {showShareModal && (
                <ShareModal
                    eventId={event.id}
                    eventTitle={event.title}
                    onClose={() => setShowShareModal(false)}
                    t={t}
                />
            )}
        </main>
    );
};

EventGallery.displayName = 'EventGallery';