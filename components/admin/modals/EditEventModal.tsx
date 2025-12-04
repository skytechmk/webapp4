import * as React from 'react';
import { X, Save, Calendar, MapPin, Image as ImageIcon, Video, Edit, Trash2, Eye, Download } from 'lucide-react';
import { Event, TranslateFn } from '../../../types';

interface EditEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    event: Event;
    onSave: (updatedEvent: Partial<Event>) => void;
    t: TranslateFn;
}

export const EditEventModal: React.FC<EditEventModalProps> = ({
    isOpen,
    onClose,
    event,
    onSave,
    t
}) => {
    const [editedEvent, setEditedEvent] = React.useState<Partial<Event>>({ ...event });

    React.useEffect(() => {
        setEditedEvent({ ...event });
    }, [event]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setEditedEvent(prev => ({ ...prev, [name]: value } as Partial<Event>));
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditedEvent(prev => ({ ...prev, date: e.target.value } as Partial<Event>));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(editedEvent);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-lg font-bold text-slate-900">{t('editEvent')}</h3>
                    <button onClick={onClose} className="p-2 bg-white rounded-full hover:bg-slate-100 transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">
                                    {t('eventTitle')}
                                </label>
                                <input
                                    type="text"
                                    id="title"
                                    name="title"
                                    value={editedEvent.title || ''}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="date" className="block text-sm font-medium text-slate-700 mb-1">
                                    {t('eventDate')}
                                </label>
                                <div className="relative">
                                    <input
                                        type="datetime-local"
                                        id="date"
                                        name="date"
                                        value={editedEvent.date ? new Date(editedEvent.date).toISOString().slice(0, 16) : ''}
                                        onChange={handleDateChange}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        required
                                    />
                                    <Calendar size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="city" className="block text-sm font-medium text-slate-700 mb-1">
                                    {t('eventCity')}
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        id="city"
                                        name="city"
                                        value={editedEvent.city || ''}
                                        onChange={handleInputChange}
                                        placeholder={t('cityName')}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                    <MapPin size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
                                    {t('eventDescription')}
                                </label>
                                <textarea
                                    id="description"
                                    name="description"
                                    value={editedEvent.description || ''}
                                    onChange={handleInputChange}
                                    rows={4}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                />
                            </div>

                            <div>
                                <label htmlFor="code" className="block text-sm font-medium text-slate-700 mb-1">
                                    {t('eventCode')}
                                </label>
                                <input
                                    type="text"
                                    id="code"
                                    name="code"
                                    value={editedEvent.code || ''}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="expiresAt" className="block text-sm font-medium text-slate-700 mb-1">
                                    {t('expirationDate')}
                                </label>
                                <input
                                    type="datetime-local"
                                    id="expiresAt"
                                    name="expiresAt"
                                    value={editedEvent.expiresAt ? new Date(editedEvent.expiresAt).toISOString().slice(0, 16) : ''}
                                    onChange={(e) => setEditedEvent(prev => ({ ...prev, expiresAt: e.target.value } as Partial<Event>))}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Event Stats */}
                    <div className="bg-slate-50 rounded-xl p-4">
                        <h4 className="font-semibold text-slate-800 mb-3">{t('eventStatistics')}</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex items-center gap-2">
                                <ImageIcon size={16} className="text-slate-500" />
                                <span className="text-sm text-slate-600">
                                    {event.media.filter((m: { type: string }) => m.type === 'image').length} {t('images')}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Video size={16} className="text-slate-500" />
                                <span className="text-sm text-slate-600">
                                    {event.media.filter((m: { type: string }) => m.type === 'video').length} {t('videos')}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Eye size={16} className="text-slate-500" />
                                <span className="text-sm text-slate-600">
                                    {event.views || 0} {t('views')}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Download size={16} className="text-slate-500" />
                                <span className="text-sm text-slate-600">
                                    {event.downloads || 0} {t('downloads')}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2"
                        >
                            <Save size={18} />
                            {t('saveChanges')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};