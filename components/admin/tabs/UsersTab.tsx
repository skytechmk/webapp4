/**
 * Users Tab Component
 * Handles user management functionality
 */

import * as React from 'react';
const { useState } = React;
import { User, Event, TranslateFn, UserRole, TierLevel, TIER_CONFIG } from '../../../types';
import { useUserStore } from '../../../stores';
import { EditUserModal } from '../modals/EditUserModal';
import { UserList } from '../components/UserList';
import { StorageChart } from '../components/StorageChart';

interface UsersTabProps {
    users: User[];
    events?: Event[];
    user?: User | null;
    onBack?: () => void;
    onDeleteUser?: (id: string) => void;
    onUpdateUser?: (user: User) => void;
    onViewUserEvents?: (user: User) => void;
    onDeleteEvent?: (id: string) => void;
    onDownloadEvent?: (event: Event) => void;
    onUpdateEvent?: (event: Event) => void;
    t: TranslateFn;
}

export const UsersTab: React.FC<UsersTabProps> = ({
    users,
    events = [],
    user = null,
    onBack,
    onDeleteUser,
    onUpdateUser,
    onViewUserEvents,
    onDeleteEvent,
    onDownloadEvent,
    onUpdateEvent,
    t
}) => {
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editUserName, setEditUserName] = useState('');
    const [editUserEmail, setEditUserEmail] = useState('');
    const [editUserStudio, setEditUserStudio] = useState('');
    const [selectedTier, setSelectedTier] = useState<TierLevel>(TierLevel.FREE);
    const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.USER);

    // Zustand integration
    const allUsers = useUserStore((state) => state.allUsers);

    const getUserEvents = (userId: string) => {
        return events.filter(event => event.hostId === userId);
    };

    const getUserEventCount = (userId: string) => {
        return events.filter(e => e.hostId === userId).length;
    };

    const renderTierBadge = (tier: TierLevel) => {
        let badgeColor = 'bg-green-50 text-green-700 border-green-200';
        let icon = null;

        if (tier === TierLevel.STUDIO) {
            badgeColor = 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-900 border-amber-300';
            icon = <span className="mr-1">👑</span>;
        } else if (tier === TierLevel.PRO) {
            badgeColor = 'bg-purple-50 text-purple-700 border-purple-200';
            icon = <span className="mr-1">⚡</span>;
        } else if (tier === TierLevel.BASIC) {
            badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
            icon = <span className="mr-1">⭐</span>;
        } else {
            badgeColor = 'bg-slate-100 text-slate-600 border-slate-200';
        }

        return (
            <span className={`px-2.5 py-1 inline-flex items-center text-xs leading-5 font-bold rounded-full border ${badgeColor}`}>
                {icon}
                {tier}
            </span>
        );
    };

    const openEditUserModal = (user: User) => {
        setEditingUser(user);
        setEditUserName(user.name);
        setEditUserEmail(user.email);
        setEditUserStudio(TIER_CONFIG[user.tier].allowBranding ? (user.studioName || '') : '');
        setSelectedTier(user.tier);
        setSelectedRole(user.role);
    };

    const handleSaveUserEdit = () => {
        if (!editingUser) return;

        const config = TIER_CONFIG[selectedTier];
        const updatedUser: User = {
            ...editingUser,
            name: editUserName,
            email: editUserEmail,
            studioName: config.allowBranding ? editUserStudio : undefined,
            role: selectedRole,
            tier: selectedTier
        };

        onUpdateUser?.(updatedUser);
        setEditingUser(null);
    };

    const viewUserEvents = (user: User) => {
        onViewUserEvents?.(user);
    };

    // Display either user list or specific user's events
    if (user) {
        const userEvents = getUserEvents(user.id);
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center gap-4 bg-slate-50">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors bg-white border border-slate-300 px-3 py-1.5 rounded-lg text-sm font-medium"
                    >
                        ← Back to Users
                    </button>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">
                            {user.name}'s Events
                        </h3>
                        <p className="text-xs text-slate-500">
                            {userEvents.length} events found
                        </p>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Event</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Media</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {userEvents.map((evt) => (
                                <tr key={evt.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div>
                                            <div className="text-sm font-bold text-slate-900 flex items-center gap-1">
                                                {evt.title}
                                                {evt.pin && <span className="text-amber-500">🔒</span>}
                                            </div>
                                            <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                                📅 {evt.date || t('noDate')}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {evt.expiresAt && new Date() > new Date(evt.expiresAt) ? (
                                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 flex items-center w-fit border border-red-200">
                                                ⏰ {t('expired')}
                                            </span>
                                        ) : (
                                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 flex items-center w-fit border border-green-200">
                                                ⚡ {t('active')}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 font-medium">
                                        {evt.media.length} {t('items')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-2">
                                        <button onClick={() => onDownloadEvent?.(evt)} className="text-green-600 hover:bg-green-50 p-2 rounded-lg transition-colors" title={t('downloadAll')}>
                                            📥
                                        </button>
                                        <button onClick={() => openEditUserModal(evt as any)} className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors" title="Edit Event">
                                            ✏️
                                        </button>
                                        <button onClick={() => { }} className="text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg transition-colors" title="View Media">
                                            👁️
                                        </button>
                                        <button onClick={() => onDeleteEvent?.(evt.id)} className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors" title="Delete Event">
                                            🗑️
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {userEvents.length === 0 && (
                        <div className="p-12 text-center text-slate-500">
                            <div className="text-4xl mb-4">📅</div>
                            <p className="font-medium">No events found for this user</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* User List */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-900">{t('registeredUsers')}</h3>
                    <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-full">{users.length}</span>
                </div>
                <div className="overflow-x-auto flex-1">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider pl-8">{t('users')}</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Stats</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">{t('tier')}</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider pr-8">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4 pl-8 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-white font-bold shadow-sm ${user.role === UserRole.PHOTOGRAPHER ? 'bg-slate-900 border-2 border-amber-400' : 'bg-gradient-to-br from-indigo-500 to-purple-600'}`}>
                                                {user.role === UserRole.PHOTOGRAPHER ? '📷' : user.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-bold text-slate-900 flex flex-wrap items-center gap-2">
                                                    {user.name}
                                                    {user.role === UserRole.ADMIN && <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 uppercase tracking-wide">ADMIN</span>}
                                                </div>
                                                <div className="text-xs text-slate-500">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs font-medium text-slate-700">{getUserEventCount(user.id)} Events</span>
                                            <div className="w-24 bg-slate-200 rounded-full h-1.5">
                                                <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${Math.min((user.storageUsedMb / user.storageLimitMb) * 100, 100)}%` }}></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {renderTierBadge(user.tier)}
                                    </td>
                                    <td className="px-6 py-4 pr-8 whitespace-nowrap text-right text-sm font-medium">
                                        {user.role !== UserRole.ADMIN && (
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => viewUserEvents(user)} className="text-slate-500 hover:text-indigo-600 p-2 hover:bg-indigo-50 rounded-lg transition-colors" title="View Events">👁️</button>
                                                <button onClick={() => openEditUserModal(user)} className="text-slate-500 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-lg transition-colors" title="Edit User">✏️</button>
                                                <button onClick={() => onDeleteUser?.(user.id)} className="text-slate-500 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors" title="Delete User">🗑️</button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Storage Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
                <h3 className="text-lg font-bold text-slate-900 mb-6">{t('storageUsage')}</h3>
                <div className="flex-1 min-h-[300px]">
                    <StorageChart users={users} />
                </div>
            </div>
        </div>
    );

    // Define renderContent based on whether we're showing user list or editing a user
    const renderContent = (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* User List */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-900">{t('registeredUsers')}</h3>
                    <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-full">{users.length}</span>
                </div>
                <div className="overflow-x-auto flex-1">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider pl-8">{t('users')}</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Stats</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">{t('tier')}</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider pr-8">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4 pl-8 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-white font-bold shadow-sm ${user.role === UserRole.PHOTOGRAPHER ? 'bg-slate-900 border-2 border-amber-400' : 'bg-gradient-to-br from-indigo-500 to-purple-600'}`}>
                                                {user.role === UserRole.PHOTOGRAPHER ? '📷' : user.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-bold text-slate-900 flex flex-wrap items-center gap-2">
                                                    {user.name}
                                                    {user.role === UserRole.ADMIN && <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 uppercase tracking-wide">ADMIN</span>}
                                                </div>
                                                <div className="text-xs text-slate-500">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs font-medium text-slate-700">{getUserEventCount(user.id)} Events</span>
                                            <div className="w-24 bg-slate-200 rounded-full h-1.5">
                                                <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${Math.min((user.storageUsedMb / user.storageLimitMb) * 100, 100)}%` }}></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {renderTierBadge(user.tier)}
                                    </td>
                                    <td className="px-6 py-4 pr-8 whitespace-nowrap text-right text-sm font-medium">
                                        {user.role !== UserRole.ADMIN && (
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => viewUserEvents(user)} className="text-slate-500 hover:text-indigo-600 p-2 hover:bg-indigo-50 rounded-lg transition-colors" title="View Events">👁️</button>
                                                <button onClick={() => openEditUserModal(user)} className="text-slate-500 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-lg transition-colors" title="Edit User">✏️</button>
                                                <button onClick={() => onDeleteUser?.(user.id)} className="text-slate-500 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors" title="Delete User">🗑️</button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Storage Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
                <h3 className="text-lg font-bold text-slate-900 mb-6">{t('storageUsage')}</h3>
                <div className="flex-1 min-h-[300px]">
                    <StorageChart users={users} />
                </div>
            </div>
        </div>
    );

    // Edit User Modal
    if (editingUser) {
        return (
            <>
                {renderContent}
                <EditUserModal
                    user={editingUser}
                    editUserName={editUserName}
                    editUserEmail={editUserEmail}
                    editUserStudio={editUserStudio}
                    selectedTier={selectedTier}
                    selectedRole={selectedRole}
                    setEditUserName={setEditUserName}
                    setEditUserEmail={setEditUserEmail}
                    setEditUserStudio={setEditUserStudio}
                    setSelectedTier={setSelectedTier}
                    setSelectedRole={setSelectedRole}
                    onSave={handleSaveUserEdit}
                    onCancel={() => setEditingUser(null)}
                    t={t}
                />
            </>
        );
    }

    return renderContent;
};