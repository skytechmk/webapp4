/**
 * Admin Dashboard - Main Component
 * Refactored to use Zustand state management and modular components
 */

import * as React from 'react';
const { useState, useEffect } = React;
import { useAuthStore, useEventStore, useUserStore } from '../../stores';
import { User, UserRole, Event, TranslateFn } from '../../types';
import { AdminHeader } from './components/AdminHeader';
import { KpiCards } from './components/KpiCards';
import { UsersTab } from './tabs/UsersTab';
import { EventsTab } from './tabs/EventsTab';
import { SupportTab } from './tabs/SupportTab';
import { SystemTab } from './tabs/SystemTab';
import { SettingsTab } from './tabs/SettingsTab';
import { FeedbackTab } from './tabs/FeedbackTab';
import { NotificationCenter } from './components/NotificationCenter';
// Remove the problematic PWA import - it's not needed for this component

interface AdminDashboardProps {
    users: User[];
    events: Event[];
    onDeleteUser: (id: string) => void;
    onDeleteEvent: (id: string) => void;
    onDeleteMedia: (eventId: string, mediaId: string) => void;
    onUpdateEvent: (event: Event) => void;
    onUpdateUser: (user: User) => void;
    onNewEvent: () => void;
    onDownloadEvent: (event: Event) => void;
    onClose: () => void;
    onLogout: () => void;
    t: TranslateFn;
}

type Tab = 'users' | 'events' | 'userEvents' | 'support' | 'settings' | 'system' | 'feedback';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
    users,
    events,
    onDeleteUser,
    onDeleteEvent,
    onDeleteMedia,
    onUpdateEvent,
    onUpdateUser,
    onNewEvent,
    onDownloadEvent,
    onClose,
    onLogout,
    t
}) => {
    const [activeTab, setActiveTab] = useState<Tab>('users');
    const [selectedUserForEvents, setSelectedUserForEvents] = useState<User | null>(null);

    // Zustand stores integration
    const currentUser = useAuthStore((state) => state.currentUser);
    const isAdmin = useAuthStore((state) => state.isAdmin());
    const allUsers = useUserStore((state) => state.allUsers);
    const allEvents = useEventStore((state) => state.events);

    // Sync props with Zustand stores
    useEffect(() => {
        useUserStore.getState().setAllUsers(users);
        useEventStore.getState().setEvents(events);
    }, []);

    const backToUsers = () => {
        setSelectedUserForEvents(null);
        setActiveTab('users');
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header */}
            <AdminHeader
                activeTab={activeTab}
                setActiveTab={(tab) => { setActiveTab(tab as Tab); setSelectedUserForEvents(null); }}
                onNewEvent={onNewEvent}
                onClose={onClose}
                onLogout={onLogout}
                t={t}
            />

            <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
                {/* KPI Cards - Only show on main tabs */}
                {activeTab !== 'settings' && !selectedUserForEvents && (
                    <KpiCards
                        users={users}
                        events={events}
                        t={t}
                    />
                )}

                {/* Content Switcher */}
                {activeTab === 'settings' ? (
                    <SettingsTab />
                ) : activeTab === 'system' ? (
                    <SystemTab />
                ) : activeTab === 'support' ? (
                    <SupportTab users={users} />
                ) : activeTab === 'feedback' ? (
                    <FeedbackTab users={users} />
                ) : activeTab === 'userEvents' ? (
                    <UsersTab
                        users={users}
                        user={selectedUserForEvents}
                        onBack={backToUsers}
                        events={events.filter(event => event.hostId === selectedUserForEvents?.id)}
                        onDeleteEvent={onDeleteEvent}
                        onUpdateEvent={onUpdateEvent}
                        onDownloadEvent={onDownloadEvent}
                        t={t}
                    />
                ) : activeTab === 'users' ? (
                    <UsersTab
                        users={users}
                        events={events}
                        onDeleteUser={onDeleteUser}
                        onUpdateUser={onUpdateUser}
                        onViewUserEvents={setSelectedUserForEvents}
                        t={t}
                    />
                ) : (
                    <EventsTab
                        events={events}
                        users={users}
                        onDeleteEvent={onDeleteEvent}
                        onUpdateEvent={onUpdateEvent}
                        onDownloadEvent={onDownloadEvent}
                        t={t}
                    />
                )}
            </div>

            {/* Notification Center */}
            <NotificationCenter />
        </div>
    );
};