import * as React from 'react';
import { Upload, Download, Trash2, User, Search, Camera, Play, Grid, List, Share2 } from 'lucide-react';
import { MediaItem, User as UserType, TranslateFn } from '../../../types';

/**
 * ActionBar Component
 *
 * A toolbar component for event galleries that provides various actions:
 * - Upload media
 * - Download all media
 * - Start slideshow
 * - Bulk delete mode
 * - Filter by user uploads
 * - Find me functionality
 * - Camera upload
 *
 * @component
 */
interface ActionBarProps {
    /** Currently logged in user */
    currentUser: UserType | null;
    /** Whether the current user is the event owner */
    isOwner: boolean;
    /** Whether bulk delete mode is active */
    isBulkDeleteMode: boolean;
    /** Set of selected media item IDs */
    selectedMedia: Set<string>;
    /** Whether to show only current user's uploads */
    showMyUploads: boolean;
    /** Function to toggle showing only user's uploads */
    setShowMyUploads: (show: boolean) => void;
    /** Function to toggle bulk delete mode */
    toggleBulkDeleteMode: () => void;
    /** Function to select all media items */
    selectAllMedia: () => void;
    /** Function to handle bulk deletion */
    handleBulkDelete: () => void;
    /** Whether face scanning is in progress */
    isScanning: boolean;
    /** Function to open the find me modal */
    setIsFindMeOpen: (open: boolean) => void;
    /** Array of media items to display */
    displayMedia: MediaItem[];
    /** Whether the device is mobile */
    isMobile: boolean;
    /** Whether a ZIP download is in progress */
    downloadingZip: boolean;
    /** Function to download all media */
    onDownloadAll: (media?: MediaItem[]) => void;
    /** Function to open the slideshow */
    onOpenSlideshow: () => void;
    /** Translation function for internationalization */
    t: TranslateFn;
}

export const ActionBar: React.FC<ActionBarProps> = ({
    currentUser,
    isOwner,
    isBulkDeleteMode,
    selectedMedia,
    showMyUploads,
    setShowMyUploads,
    toggleBulkDeleteMode,
    selectAllMedia,
    handleBulkDelete,
    isScanning,
    setIsFindMeOpen,
    displayMedia,
    isMobile,
    downloadingZip,
    onDownloadAll,
    onOpenSlideshow,
    t
}) => {
    return (
        <div className="flex items-center gap-2 flex-wrap">
            {/* Upload Button */}
            {isOwner && (
                <button
                    onClick={() => { }}
                    className="flex items-center justify-center w-10 h-10 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                    title={t('uploadMedia')}
                >
                    <Upload size={20} />
                </button>
            )}

            {/* Download All Button */}
            <button
                onClick={() => onDownloadAll(displayMedia)}
                disabled={downloadingZip}
                className="flex items-center justify-center w-10 h-10 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                title={t('downloadAll')}
            >
                <Download size={20} />
            </button>

            {/* Slideshow Button */}
            <button
                onClick={onOpenSlideshow}
                className="flex items-center justify-center w-10 h-10 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                title={t('startSlideshow')}
            >
                <Play size={20} />
            </button>

            {/* Bulk Delete Controls */}
            {isBulkDeleteMode ? (
                <div className="flex items-center gap-2 bg-white/10 p-2 rounded-xl">
                    <button
                        onClick={selectAllMedia}
                        className="text-sm font-medium text-white/80 hover:text-white"
                    >
                        {t('selectAll')}
                    </button>
                    <span className="text-sm text-white/60">
                        {selectedMedia.size} {t('selected')}
                    </span>
                    <button
                        onClick={handleBulkDelete}
                        className="text-sm font-medium text-red-400 hover:text-red-300"
                    >
                        {t('deleteSelected')}
                    </button>
                    <button
                        onClick={toggleBulkDeleteMode}
                        className="text-sm font-medium text-white/80 hover:text-white"
                    >
                        {t('cancel')}
                    </button>
                </div>
            ) : (
                <button
                    onClick={toggleBulkDeleteMode}
                    className="flex items-center justify-center w-10 h-10 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                    title={t('bulkDelete')}
                >
                    <Trash2 size={20} />
                </button>
            )}

            {/* My Uploads Toggle */}
            <button
                onClick={() => setShowMyUploads(!showMyUploads)}
                className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ${showMyUploads ? 'bg-indigo-600 text-white' : 'text-white/80 hover:bg-white/10'
                    }`}
                title={t('myUploads')}
            >
                <User size={20} />
            </button>

            {/* Find Me Button */}
            <button
                onClick={() => setIsFindMeOpen(true)}
                disabled={isScanning}
                className="flex items-center justify-center w-10 h-10 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                title={t('findMe')}
            >
                <Search size={20} />
            </button>

            {/* Camera Upload Button */}
            <button
                onClick={() => { }}
                className="flex items-center justify-center w-10 h-10 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                title={t('cameraUpload')}
            >
                <Camera size={20} />
            </button>
        </div>
    );
};