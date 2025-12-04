/**
 * KPI Cards Component
 * Displays key performance indicators
 */

import * as React from 'react';
import { User, Event, TranslateFn } from '../../../types';
import { Users, Calendar, HardDrive } from 'lucide-react';

interface KpiCardsProps {
    users: User[];
    events: Event[];
    t: TranslateFn;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ users, events, t }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-in slide-in-from-top-2">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">{t('totalUsers')}</span>
                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><Users size={20} /></div>
                </div>
                <span className="text-4xl font-black text-slate-900">{users.length}</span>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">{t('totalEvents')}</span>
                    <div className="p-2 bg-pink-50 rounded-lg text-pink-600"><Calendar size={20} /></div>
                </div>
                <span className="text-4xl font-black text-slate-900">{events.length}</span>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">{t('storage')}</span>
                    <div className="p-2 bg-green-50 rounded-lg text-green-600"><HardDrive size={20} /></div>
                </div>
                <span className="text-4xl font-black text-slate-900">
                    {users.reduce((acc, curr) => acc + curr.storageUsedMb, 0).toFixed(1)} <span className="text-lg font-medium text-slate-400">MB</span>
                </span>
            </div>
        </div>
    );
};