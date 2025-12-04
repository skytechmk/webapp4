import * as React from 'react';
import { X, ChevronLeft, ChevronRight, Play, Pause, MessageCircle, Send } from 'lucide-react';
import { MediaItem, TranslateFn } from '../../../types';

/**
 * LightboxModal Component
 *
 * A full-screen modal for displaying media items with navigation controls,
 * slideshow functionality, and comment capabilities.
 *
 * @component
 */
interface LightboxModalProps {
    /** Current media index in the display array, null if closed */
    lightboxIndex: number | null;
    /** Array of media items to display */
    displayMedia: MediaItem[];
    /** Whether the slideshow is currently playing */
    isSlideshowPlaying: boolean;
    /** Function to toggle slideshow play/pause state */
    setIsSlideshowPlaying: (playing: boolean) => void;
    /** Function to close the lightbox modal */
    closeLightbox: () => void;
    /** Function to navigate between media items */
    navigateLightbox: (direction: 'prev' | 'next') => void;
    /** Current comment text input value */
    commentText: string;
    /** Function to update comment text */
    setCommentText: (text: string) => void;
    /** Function to handle adding a comment to a media item */
    handleAddComment: (itemId: string, comment: string) => void;
    /** Translation function for internationalization */
    t: TranslateFn;
}

export const LightboxModal: React.FC<LightboxModalProps> = ({
    lightboxIndex,
    displayMedia,
    isSlideshowPlaying,
    setIsSlideshowPlaying,
    closeLightbox,
    navigateLightbox,
    commentText,
    setCommentText,
    handleAddComment,
    t
}) => {
    const currentMedia = lightboxIndex !== null ? displayMedia[lightboxIndex] : null;

    const handleCommentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (commentText.trim() && currentMedia) {
            handleAddComment(currentMedia.id, commentText);
            setCommentText('');
        }
    };

    if (lightboxIndex === null || !currentMedia) return null;

    return (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-4xl h-full max-h-[90vh] flex flex-col bg-black rounded-2xl overflow-hidden">
                {/* Close Button */}
                <button
                    onClick={closeLightbox}
                    className="absolute top-4 right-4 z-10 p-2 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition-colors"
                >
                    <X size={24} className="text-white" />
                </button>

                {/* Media Display */}
                <div className="flex-1 flex items-center justify-center p-8">
                    {currentMedia.type === 'image' ? (
                        <img
                            src={currentMedia.url}
                            alt={currentMedia.caption || 'Event media'}
                            className="max-w-full max-h-full object-contain"
                        />
                    ) : currentMedia.type === 'video' ? (
                        <video
                            src={currentMedia.url}
                            controls
                            autoPlay
                            className="max-w-full max-h-full object-contain"
                        />
                    ) : null}
                </div>

                {/* Navigation Controls */}
                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                    <button
                        onClick={() => navigateLightbox('prev')}
                        className="p-3 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition-colors"
                    >
                        <ChevronLeft size={24} className="text-white" />
                    </button>
                </div>

                <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10">
                    <button
                        onClick={() => navigateLightbox('next')}
                        className="p-3 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition-colors"
                    >
                        <ChevronRight size={24} className="text-white" />
                    </button>
                </div>

                {/* Bottom Controls */}
                <div className="p-4 bg-black/50 backdrop-blur-sm border-t border-white/10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setIsSlideshowPlaying(!isSlideshowPlaying)}
                                className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                            >
                                {isSlideshowPlaying ? <Pause size={16} /> : <Play size={16} />}
                                <span className="text-sm font-medium">
                                    {isSlideshowPlaying ? t('pauseSlideshow') : t('playSlideshow')}
                                </span>
                            </button>
                        </div>

                        <div className="text-sm text-white/80">
                            {lightboxIndex + 1} / {displayMedia.length}
                        </div>
                    </div>

                    {/* Comments Section */}
                    <div className="mt-4 space-y-3">
                        <div className="flex items-center gap-2">
                            <MessageCircle size={16} className="text-white/60" />
                            <span className="text-sm font-medium text-white/80">{t('comments')}</span>
                        </div>

                        <form onSubmit={handleCommentSubmit} className="flex items-center gap-2">
                            <input
                                type="text"
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder={t('addComment')}
                                className="flex-1 px-3 py-2 bg-white/10 rounded-lg text-white placeholder-white/60 border border-white/20 focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            <button
                                type="submit"
                                className="p-2 bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                                <Send size={16} className="text-white" />
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};