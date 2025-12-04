import * as React from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { Event, User, GuestbookEntry, TranslateFn } from '../../../types';

/**
 * Guestbook Component
 *
 * A component for displaying and submitting guestbook messages for events.
 * Includes a form for new messages and a list of existing messages.
 *
 * @component
 */
interface GuestbookProps {
    /** Event data */
    event: Event;
    /** Currently logged in user */
    currentUser: User | null;
    /** Current guestbook message input value */
    guestbookMessage: string;
    /** Function to update guestbook message */
    setGuestbookMessage: (message: string) => void;
    /** Current guestbook name input value */
    guestbookName: string;
    /** Function to update guestbook name */
    setGuestbookName: (name: string) => void;
    /** Function to handle form submission */
    handleGuestbookSubmit: (e: React.FormEvent) => void;
    /** Array of existing guestbook entries */
    localGuestbook: GuestbookEntry[];
    /** Translation function for internationalization */
    t: TranslateFn;
}

export const Guestbook: React.FC<GuestbookProps> = ({
    event,
    currentUser,
    guestbookMessage,
    setGuestbookMessage,
    guestbookName,
    setGuestbookName,
    handleGuestbookSubmit,
    localGuestbook,
    t
}) => {
    return (
        <div className="space-y-8">
            {/* Guestbook Form */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-8">
                <h3 className="text-lg font-bold text-slate-900 mb-4">{t('signGuestbook')}</h3>
                <form onSubmit={handleGuestbookSubmit} className="space-y-4">
                    <input
                        id="guestbook-name-input"
                        name="guestbook-name"
                        type="text"
                        value={guestbookName}
                        onChange={(e) => setGuestbookName(e.target.value)}
                        placeholder={t('yourName')}
                        required
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                        autoComplete="name"
                    />
                    <textarea
                        value={guestbookMessage}
                        onChange={(e) => setGuestbookMessage(e.target.value)}
                        placeholder={t('leaveMessage')}
                        required
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                    />
                    <button
                        type="submit"
                        className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                    >
                        <Send size={18} /> {t('signGuestbook')}
                    </button>
                </form>
            </div>

            {/* Guestbook Entries */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <MessageCircle size={20} /> {t('guestbookMessages')}
                </h3>

                {localGuestbook.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                        <p>{t('noMessagesYet')}</p>
                        <p className="text-sm mt-2">{t('beFirstToSign')}</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {localGuestbook.map(entry => (
                            <div key={entry.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm animate-in slide-in-from-top-1">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                        <span className="text-indigo-600 font-bold text-sm">
                                            {entry.senderName.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-semibold text-slate-900">{entry.senderName}</span>
                                            <span className="text-xs text-slate-500">
                                                {new Date(entry.createdAt).toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="text-slate-700 leading-relaxed">{entry.message}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};