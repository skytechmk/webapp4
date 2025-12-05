/**
 * Media Grid Component
 * Handles the virtualized media grid with ads and add memory card
 * Enhanced with smooth scrolling and performance optimizations
 */

import * as React from 'react';
import { useMemo } from 'react';
import { VirtuosoGrid, VirtuosoGridHandle } from 'react-virtuoso';
import { Event, User, MediaItem, TranslateFn } from '../../../types';
import { VideoGridItem } from './VideoGridItem';
import { Plus, Camera, Upload, ImagePlus, Lock, MessageSquare, Heart, Star, CheckSquare, Square } from 'lucide-react';
import { smoothScrollTo, scrollToItemIndex } from '../../../utils/smoothScrollUtils';
import './MediaGrid.css';

interface MediaGridProps {
    event: Event;
    currentUser: User | null;
    isOwner: boolean;
    isBulkDeleteMode: boolean;
    selectedMedia: Set<string>;
    displayMedia: MediaItem[];
    onLike: (item: MediaItem) => void;
    onSetCover: (item: MediaItem) => void;
    openLightbox: (index: number) => void;
    t: TranslateFn;
}

export const MediaGrid = React.memo<MediaGridProps>(({
    event,
    currentUser,
    isOwner,
    isBulkDeleteMode,
    selectedMedia,
    displayMedia,
    onLike,
    onSetCover,
    openLightbox,
    t
}) => {
    const virtuosoRef = React.useRef<VirtuosoGridHandle>(null);
    const gridContainerRef = React.useRef<HTMLDivElement>(null);

    // Memoize grid items creation with performance optimizations
    const gridItems = useMemo((): (MediaItem | { type: 'ad' } | { type: 'add-memory' })[] => {
        const items: (MediaItem | { type: 'ad' } | { type: 'add-memory' })[] = [];

        // Add "Add Memory" card if applicable
        if ((isOwner || currentUser?.role === 'ADMIN' || currentUser) && !isBulkDeleteMode) {
            items.push({ type: 'add-memory' });
        }

        for (let i = 0; i < displayMedia.length; i++) {
            const item = displayMedia[i];

            // Inject Ad every 8 items if not in bulk mode
            if (i > 0 && i % 8 === 0 && !isBulkDeleteMode) {
                items.push({ type: 'ad' });
            }

            items.push(item);
        }

        return items;
    }, [displayMedia, isOwner, currentUser, isBulkDeleteMode]);

    // Performance optimization: Create a Map for O(1) media index lookup instead of O(n) array.indexOf
    const mediaIndexMap = useMemo(() => {
        const map = new Map<string, number>();
        displayMedia.forEach((item, index) => map.set(item.id, index));
        return map;
    }, [displayMedia]);

    const renderGridItem = React.useCallback((index: number) => {
        const item = gridItems[index];

        // Generate unique key based on item type and content
        const getItemKey = () => {
            if (item.type === 'add-memory') return 'add-memory';
            if (item.type === 'ad') return `ad-${index}`;
            return (item as MediaItem).id;
        };

        const itemKey = getItemKey();

        if (item.type === 'add-memory') {
            return (
                <div key={itemKey} onClick={() => { }} className="relative group rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-50 to-white border-2 border-dashed border-indigo-200 shadow-sm hover:shadow-md hover:border-indigo-400 transition-all cursor-pointer flex flex-col items-center justify-center min-h-[250px] animate-in fade-in slide-in-from-bottom-4 h-full">
                    <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4 shadow-inner group-hover:scale-110 transition-transform duration-300">
                        <Plus size={32} strokeWidth={3} />
                    </div>
                    <h4 className="font-black text-indigo-900 text-lg">{t('addMemory')}</h4>
                    <p className="text-indigo-500/80 text-xs font-bold uppercase tracking-wider mt-1">{t('tapToUpload')}</p>
                </div>
            );
        } else if (item.type === 'ad') {
            return (
                <div key={itemKey} className="bg-slate-100 p-4 rounded-xl border border-slate-200 flex items-center justify-center">
                    <div className="text-center text-slate-500">
                        <div className="text-2xl mb-2">📸</div>
                        <p className="text-sm font-medium">Ad Spot</p>
                        <p className="text-xs">Local vendor ad would appear here</p>
                    </div>
                </div>
            );
        } else {
            const mediaItem = item as MediaItem;
            // Performance optimization: Use Map for O(1) lookup instead of O(n) array.indexOf
            const mediaIndex = mediaIndexMap.get(mediaItem.id) ?? 0;

            return (
                <div key={itemKey} className="relative group rounded-2xl overflow-hidden bg-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer h-full" onClick={() => !isBulkDeleteMode && openLightbox(mediaIndex)}>
                    {/* Bulk Select Overlay */}
                    {isBulkDeleteMode && (
                        <div className="absolute top-0 left-0 right-0 bottom-0 z-20 bg-black/10 flex items-start justify-end p-3">
                            <button className={`w-6 h-6 rounded-full flex items-center justify-center transition-all shadow-sm ${selectedMedia.has(mediaItem.id) ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400'}`}>
                                {selectedMedia.has(mediaItem.id) ? <CheckSquare size={14} /> : <Square size={14} />}
                            </button>
                        </div>
                    )}

                    {mediaItem.type === 'video' ? (
                        <VideoGridItem item={mediaItem} onClick={() => !isBulkDeleteMode && openLightbox(mediaIndex)} />
                    ) : (
                        <div className="w-full aspect-square bg-slate-200 relative overflow-hidden">
                            <img
                                src={mediaItem.previewUrl || mediaItem.url}
                                alt={mediaItem.caption || 'Photo'}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                onError={(e) => {
                                    console.error('Image failed to load:', mediaItem.url);
                                    e.currentTarget.style.display = 'none';
                                }}
                            />
                        </div>
                    )}

                    {/* Privacy Lock Icon */}
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
                            {mediaItem.likes ? <span className="text-xs font-bold text-red-500">{mediaItem.likes}</span> : null}
                        </button>
                    )}

                    {/* Star Cover Icon - Host Only */}
                    {(isOwner || currentUser?.role === 'ADMIN') && mediaItem.type === 'image' && !isBulkDeleteMode && (
                        <button onClick={(e) => { e.stopPropagation(); onSetCover(mediaItem); }} className="absolute top-3 left-3 bg-black/40 backdrop-blur-md rounded-full p-1.5 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-indigo-600 pointer-events-auto z-10"><Star size={14} /></button>
                    )}
                </div>
            );
        }
    }, [gridItems, isBulkDeleteMode, displayMedia, t]);

    return (
        <div className="mb-24 min-h-screen">
            {/* Enhanced Virtual Scrolling Grid with Performance Optimizations */}
            <VirtuosoGrid
                ref={virtuosoRef}
                style={{ height: '100vh' }}
                data={gridItems}
                itemContent={(index) => renderGridItem(index)}
                listClassName="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 media-grid-container"
                itemClassName="h-full media-grid-item"
                overscan={8}
                increaseViewportBy={{ top: 200, bottom: 200 }}
                useWindowScroll={false}
                totalCount={gridItems.length}
                data-testid="media-grid-virtuoso"
            />
        </div>
    );
});

MediaGrid.displayName = 'MediaGrid';