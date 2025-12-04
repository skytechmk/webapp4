/**
 * Event Header Component
 * Handles the event header with QR code and basic info
 */

import * as React from 'react';
import { Event, User, TranslateFn } from '../../../types';
import { QRCodeSVG } from 'qrcode.react';
import { Calendar, MapPin, BookOpen, LayoutGrid, Link as LinkIcon, CheckCircle } from 'lucide-react';

interface EventHeaderProps {
    event: Event;
    currentUser: User | null;
    hostUser: User | null | undefined;
    isEventExpired: boolean;
    isOwner: boolean;
    isHostPhotographer: boolean;
    activeTab: 'gallery' | 'guestbook';
    setActiveTab: (tab: 'gallery' | 'guestbook') => void;
    linkCopied: boolean;
    setLinkCopied: (copied: boolean) => void;
    t: TranslateFn;
}

export const EventHeader: React.FC<EventHeaderProps> = ({
    event,
    currentUser,
    hostUser,
    isEventExpired,
    isOwner,
    isHostPhotographer,
    activeTab,
    setActiveTab,
    linkCopied,
    setLinkCopied,
    t
}) => {
    const isStudioTier = hostUser?.tier === 'STUDIO';
    const qrFgColor = isStudioTier ? '#4f46e5' : '#000000';

    const handleCopyLink = async () => {
        const link = `${window.location.origin}?event=${event.id}`;
        try {
            await navigator.clipboard.writeText(link);
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 2000);
        } catch (err) {
            prompt(t('copyLink'), link);
        }
    };

    return (
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 mb-8 relative overflow-hidden group">
            {event.coverImage ? (
                <div className="absolute inset-0 z-0">
                    {event.coverMediaType === 'video' ? (
                        <video src={event.coverImage} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                    ) : (
                        <img src={event.coverImage} alt="Cover" className="w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-white/90 backdrop-blur-sm"></div>
                </div>
            ) : (
                <div className="absolute -top-20 -right-20 opacity-[0.03] pointer-events-none z-0">
                    <div className="w-96 h-96 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full blur-3xl"></div>
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-8 relative z-10 items-center md:items-start">
                <div className="flex-shrink-0 flex flex-col items-center">
                    <div className={`bg-white p-4 rounded-2xl shadow-lg border inline-block ${isStudioTier ? 'border-amber-200 ring-4 ring-amber-50' : 'border-slate-100'}`}>
                        <QRCodeSVG value={`${window.location.origin}?event=${event.id}`} size={140} fgColor={qrFgColor} />
                    </div>
                    <button onClick={handleCopyLink} className={`mt-3 flex items-center gap-2 text-sm font-bold px-3 py-1.5 rounded-lg transition-all ${linkCopied ? 'bg-green-100 text-green-700' : 'text-indigo-600 hover:bg-indigo-50'}`}>
                        {linkCopied ? <CheckCircle size={14} /> : <LinkIcon size={14} />}
                        {linkCopied ? t('linkCopied') : t('copyLink')}
                    </button>
                </div>

                <div className="flex-1 text-center md:text-left w-full">
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-2">{event.title}</h1>
                    <p className="text-slate-500 flex items-center justify-center md:justify-start mb-2 font-medium">
                        <Calendar size={18} className="mr-2 text-indigo-500" /> {event.date || t('dateTBD')}
                    </p>
                    {/* NEW: City Display */}
                    {event.city && (
                        <p className="text-slate-500 flex items-center justify-center md:justify-start mb-6 font-medium">
                            <MapPin size={18} className="mr-2 text-red-500" /> {t('city')}: {event.city}
                        </p>
                    )}
                    <div className="text-slate-700 bg-slate-50 p-5 rounded-2xl border border-slate-200 w-full text-left shadow-sm relative">
                        <p className="italic">{event.description}</p>
                    </div>
                </div>
            </div>
        </div>
    );

    // Tab Navigation
    return (
        <div className="flex justify-center mb-8">
            <div className="bg-white p-1.5 rounded-xl shadow-sm border border-slate-200 flex gap-2">
                <button onClick={() => setActiveTab('gallery')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'gallery' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
                    <LayoutGrid size={18} /> {t('gallery')}
                </button>
                <button onClick={() => setActiveTab('guestbook')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'guestbook' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
                    <BookOpen size={18} /> {t('guestbook')}
                </button>
            </div>
        </div>
    );
};