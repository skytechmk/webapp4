import * as React from 'react';
import { Event, TranslateFn } from '../../../types';
import { Calendar, MapPin, Users, Image as ImageIcon, Video, Edit, Trash2, Eye, Download } from 'lucide-react';

/**
 * EventList Component
 *
 * A component for displaying a list of events with their details and actions.
 * Shows event information including title, date, location, media count, and views.
 * Provides view, edit, and delete actions for each event.
 * Includes a media preview for each event.
 *
 * @component
 */
interface EventListProps {
    /** Array of events to display */
    events: Event[];
    /** Function to handle event edit action */
    onEditEvent: (event: Event) => void;
    /** Function to handle event delete action */
    onDeleteEvent: (eventId: string) => void;
    /** Function to handle event view action */
    onViewEvent: (eventId: string) => void;
    /** Translation function for internationalization */
    t: TranslateFn;
}

export const EventList: React.FC<EventListProps> = ({ events, onEditEvent, onDeleteEvent, onViewEvent, t }) => {
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    return (
        <div className="space-y-4">
            {events.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                    <p>{t('noEventsFound')}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {events.map(event => (
                        <div key={event.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h4 className="font-semibold text-slate-900 truncate">{event.title}</h4>
                                        {event.expiresAt && (
                                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${new Date(event.expiresAt) > new Date() ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                                }`}>
                                                {new Date(event.expiresAt) > new Date() ? t('active') : t('expired')}
                                            </span>
                                        )}
                                    </div>

                                    <p className="text-sm text-slate-600 mb-3 line-clamp-2">{event.description}</p>

                                    {/* Event Details */}
                                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                                        <div className="flex items-center gap-1 text-slate-600">
                                            <Calendar size={14} />
                                            <span>{formatDate(event.date)}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-slate-600">
                                            <MapPin size={14} />
                                            <span>{event.city || t('noLocation')}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-slate-600">
                                            <Users size={14} />
                                            <span>{event.media.length} {t('mediaItems')}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-slate-600">
                                            <ImageIcon size={14} />
                                            <span>{event.views || 0} {t('views')}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 flex-shrink-0">
                                    <button
                                        onClick={() => onViewEvent(event.id)}
                                        className="p-2 text-slate-500 hover:text-indigo-600 transition-colors"
                                        title={t('viewEvent')}
                                    >
                                        <Eye size={18} />
                                    </button>
                                    <button
                                        onClick={() => onEditEvent(event)}
                                        className="p-2 text-slate-500 hover:text-indigo-600 transition-colors"
                                        title={t('editEvent')}
                                    >
                                        <Edit size={18} />
                                    </button>
                                    <button
                                        onClick={() => onDeleteEvent(event.id)}
                                        className="p-2 text-slate-500 hover:text-red-500 transition-colors"
                                        title={t('deleteEvent')}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Media Preview */}
                            {event.media.length > 0 && (
                                <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                                    {event.media.slice(0, 3).map(media => (
                                        <div key={media.id} className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-slate-200">
                                            {media.type === 'image' ? (
                                                <img
                                                    src={media.url}
                                                    alt="Event media"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                                                    <Video size={20} className="text-slate-500" />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {event.media.length > 3 && (
                                        <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200">
                                            <span className="text-sm font-medium text-slate-600">
                                                +{event.media.length - 3}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};