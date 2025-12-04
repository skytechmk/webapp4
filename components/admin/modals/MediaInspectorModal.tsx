import * as React from 'react';
import { X, Image as ImageIcon, Video, Eye, Download, Heart, MessageCircle, Trash2, Edit, Info, Calendar, User as UserIcon } from 'lucide-react';
import { MediaItem, TranslateFn } from '../../../types';

/**
 * MediaInspectorModal Component
 *
 * A detailed modal for inspecting media items in the admin dashboard.
 * Shows comprehensive information about a media item including:
 * - Media preview
 * - Basic information (type, caption, upload date, uploader)
 * - Statistics (likes, comments)
 * - Comments list
 * - Delete action
 *
 * @component
 */
interface MediaInspectorModalProps {
    /** Whether the modal is open */
    isOpen: boolean;
    /** Function to close the modal */
    onClose: () => void;
    /** Media item to inspect */
    mediaItem: MediaItem;
    /** Function to delete the media item */
    onDelete: () => void;
    /** Translation function for internationalization */
    t: TranslateFn;
}

export const MediaInspectorModal: React.FC<MediaInspectorModalProps> = ({
    isOpen,
    onClose,
    mediaItem,
    onDelete,
    t
}) => {
    if (!isOpen || !mediaItem) return null;

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-lg font-bold text-slate-900">{t('mediaDetails')}</h3>
                    <button onClick={onClose} className="p-2 bg-white rounded-full hover:bg-slate-100 transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    {/* Media Preview */}
                    <div className="bg-slate-50 rounded-xl p-4">
                        {mediaItem.type === 'image' ? (
                            <img
                                src={mediaItem.url}
                                alt={mediaItem.caption || 'Media item'}
                                className="w-full max-h-96 object-contain rounded-lg"
                            />
                        ) : (
                            <video
                                src={mediaItem.url}
                                controls
                                className="w-full max-h-96 object-contain rounded-lg"
                            />
                        )}
                    </div>

                    {/* Media Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h4 className="font-semibold text-slate-800 mb-3">{t('basicInformation')}</h4>

                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    {mediaItem.type === 'image' ? (
                                        <ImageIcon size={16} className="text-indigo-600" />
                                    ) : (
                                        <Video size={16} className="text-indigo-600" />
                                    )}
                                    <span className="text-sm font-medium text-slate-700">
                                        {mediaItem.type === 'image' ? t('image') : t('video')}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Info size={16} className="text-slate-500" />
                                    <span className="text-sm text-slate-600">
                                        {mediaItem.caption || t('noCaption')}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Calendar size={16} className="text-slate-500" />
                                    <span className="text-sm text-slate-600">
                                        {formatDate(mediaItem.uploadedAt)}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <UserIcon size={16} className="text-slate-500" />
                                    <span className="text-sm text-slate-600">
                                        {mediaItem.uploaderName || t('unknownUploader')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="font-semibold text-slate-800 mb-3">{t('statistics')}</h4>

                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Heart size={16} className="text-slate-500" />
                                    <span className="text-sm text-slate-600">
                                        {t('likes')}: {mediaItem.likes || 0}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <MessageCircle size={16} className="text-slate-500" />
                                    <span className="text-sm text-slate-600">
                                        {t('comments')}: {mediaItem.comments?.length || 0}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Comments Section */}
                    {mediaItem.comments && mediaItem.comments.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="font-semibold text-slate-800 mb-3">{t('comments')}</h4>
                            <div className="space-y-3 max-h-48 overflow-y-auto">
                                {mediaItem.comments.map(comment => (
                                    <div key={comment.id} className="bg-slate-50 p-3 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
                                                <span className="text-indigo-600 text-xs font-bold">
                                                    {comment.senderName.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-slate-800">
                                                        {comment.senderName}
                                                    </span>
                                                    <span className="text-xs text-slate-500">
                                                        {formatDate(comment.createdAt)}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-600 mt-1">{comment.text}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <button
                            onClick={onDelete}
                            className="px-4 py-2 bg-red-100 text-red-600 rounded-xl font-medium hover:bg-red-200 transition-colors flex items-center gap-2"
                        >
                            <Trash2 size={16} />
                            {t('deleteMedia')}
                        </button>
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                        >
                            {t('close')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};