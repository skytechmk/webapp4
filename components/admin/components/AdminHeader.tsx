/**
 * Admin Header Component
 * Handles the admin dashboard header with navigation
 */

import * as React from 'react';
import { User, TranslateFn } from '../../../types';
import { Zap, Users, Calendar, MessageCircle, MessageSquare, HardDrive, Settings, LayoutGrid, LogOut } from 'lucide-react';
import { NotificationCenter } from './NotificationCenter';

interface AdminHeaderProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    onNewEvent: () => void;
    onClose: () => void;
    onLogout: () => void;
    t: TranslateFn;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
    activeTab,
    setActiveTab,
    onNewEvent,
    onClose,
    onLogout,
    t
}) => {
    return (
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-4 md:px-8 py-4 shadow-sm">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-600 p-2 rounded-lg shadow-indigo-200 shadow-md">
                        <Zap className="text-white" size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tight">SnapifY Admin</h1>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Master Control</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                    {[
                        { id: 'users', icon: Users, label: 'Users' },
                        { id: 'events', icon: Calendar, label: 'Events' },
                        { id: 'support', icon: MessageCircle, label: 'Support' },
                        { id: 'feedback', icon: MessageSquare, label: 'Feedback' },
                        { id: 'system', icon: HardDrive, label: 'System' },
                        { id: 'settings', icon: Settings, label: 'Settings' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id); }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === tab.id
                                ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                }`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={onNewEvent}
                        className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-500/20 text-sm"
                    >
                        <span>+</span>
                        <span className="hidden sm:inline">{t('newEvent')}</span>
                    </button>
                    <div className="h-8 w-px bg-slate-200 mx-1"></div>
                    <button onClick={onClose} className="p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors" title={t('backToApp')}>
                        <LayoutGrid size={20} />
                    </button>
                    <button onClick={onLogout} className="p-2.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors" title={t('logOut')}>
                        <LogOut size={20} />
                    </button>
                </div>
            </div>
        </header>
    );
};