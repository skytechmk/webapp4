/**
 * Events Tab Component
 * Handles event management functionality
 */

import * as React from 'react';
import { User, Event, TranslateFn, UserRole } from '../../../types';
import { Calendar, Clock, Zap, Download, Edit, Eye, Trash2, Lock, Briefcase } from 'lucide-react';

interface EventsTabProps {
    events: Event[];
    users: User[];
    onDeleteEvent: (id: string) => void;
    onUpdateEvent: (event: Event) => void;
    onDownloadEvent: (event: Event) => void;
    t: TranslateFn;
}

export const EventsTab: React.FC<EventsTabProps> = ({
    events,
    users,
    onDeleteEvent,
    onUpdateEvent,
    onDownloadEvent,
    t
}) => {
    const getEventHostName = (hostId: string) => {
        return users.find(u => u.id === hostId)?.name || t('unknownUser');
    };

    const isExpired = (dateStr: string | null) => {
        if (!dateStr) return false;
        return new Date() > new Date(dateStr);
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-900">{t('systemEvents')}</h3>
                <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-full">{events.length}</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider pl-8">{t('event')}</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">{t('host')}</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">{t('status')}</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">{t('mediaCount')}</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider pr-8">{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                        {events.map((evt) => (
                            <tr key={evt.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-6 py-4 pl-8 whitespace-nowrap">
                                    <div>
                                        <div className="text-sm font-bold text-slate-900 flex items-center gap-1">
                                            {evt.title}
                                            {evt.pin && <Lock size={12} className="text-amber-500" />}
                                        </div>
                                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-1"><Calendar size={12} /> {evt.date || t('noDate')}</div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                            {getEventHostName(evt.hostId).charAt(0)}
                                        </div>
                                        {getEventHostName(evt.hostId)}
                                        {users.find(u => u.id === evt.hostId)?.role === UserRole.PHOTOGRAPHER && <Briefcase size={12} className="text-amber-500" />}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {isExpired(evt.expiresAt) ?
                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 flex items-center w-fit border border-red-200"><Clock size={12} className="mr-1" /> {t('expired')}</span> :
                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 flex items-center w-fit border border-green-200"><Zap size={12} className="mr-1" /> {t('active')}</span>
                                    }
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 font-bold">{evt.media.length}</td>
                                <td className="px-6 py-4 pr-8 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => onDownloadEvent(evt)} className="text-slate-500 hover:text-green-600 p-2 hover:bg-green-50 rounded-lg transition-colors" title={t('downloadAll')}><Download size={16} /></button>
                                        <button onClick={() => { }} className="text-slate-500 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-lg transition-colors" title="Edit Event"><Edit size={16} /></button>
                                        <button onClick={() => { }} className="text-slate-500 hover:text-indigo-600 p-2 hover:bg-indigo-50 rounded-lg transition-colors" title="View Media"><Eye size={16} /></button>
                                        <button onClick={() => onDeleteEvent(evt.id)} className="text-slate-500 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors" title="Delete Event"><Trash2 size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};