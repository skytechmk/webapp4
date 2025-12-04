/**
 * Edit User Modal Component
 * Handles user editing functionality
 */

import * as React from 'react';
import { User, UserRole, TierLevel, TIER_CONFIG, TranslateFn } from '../../../types';

interface EditUserModalProps {
    user: User;
    editUserName: string;
    editUserEmail: string;
    editUserStudio: string;
    selectedTier: TierLevel;
    selectedRole: UserRole;
    setEditUserName: (name: string) => void;
    setEditUserEmail: (email: string) => void;
    setEditUserStudio: (studio: string) => void;
    setSelectedTier: (tier: TierLevel) => void;
    setSelectedRole: (role: UserRole) => void;
    onSave: () => void;
    onCancel: () => void;
    t: TranslateFn;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({
    user,
    editUserName,
    editUserEmail,
    editUserStudio,
    selectedTier,
    selectedRole,
    setEditUserName,
    setEditUserEmail,
    setEditUserStudio,
    setSelectedTier,
    setSelectedRole,
    onSave,
    onCancel,
    t
}) => {
    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden scale-100">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-xl font-black text-slate-900">Edit User Profile</h3>
                    <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-full transition-colors">✕</button>
                </div>
                <div className="p-6 space-y-5">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Display Name</label>
                            <input
                                id="edit-user-name-input"
                                name="edit-user-name"
                                type="text"
                                value={editUserName}
                                onChange={(e) => setEditUserName(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-medium"
                                autoComplete="name"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email Address</label>
                            <div className="flex items-center px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-500">
                                <span className="mr-3 text-slate-400">📧</span>
                                <input
                                    id="edit-user-email-input"
                                    name="edit-user-email"
                                    type="text"
                                    value={editUserEmail}
                                    onChange={(e) => setEditUserEmail(e.target.value)}
                                    className="bg-transparent w-full focus:outline-none font-medium"
                                    autoComplete="email"
                                />
                            </div>
                        </div>
                        {TIER_CONFIG[selectedTier].allowBranding && (
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Studio / Business</label>
                                <div className="flex items-center px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900">
                                    <span className="mr-3 text-slate-400">🏢</span>
                                    <input
                                        id="edit-user-studio-input"
                                        name="edit-user-studio"
                                        type="text"
                                        value={editUserStudio}
                                        onChange={(e) => setEditUserStudio(e.target.value)}
                                        className="bg-transparent w-full focus:outline-none font-medium"
                                        placeholder="No studio name"
                                        autoComplete="organization"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">System Role</label>
                            <select
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none font-medium cursor-pointer"
                            >
                                {Object.values(UserRole).map(role => (
                                    <option key={role} value={role}>{role}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tier Plan</label>
                            <select
                                value={selectedTier}
                                onChange={(e) => setSelectedTier(e.target.value as TierLevel)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none font-medium cursor-pointer"
                            >
                                {Object.values(TierLevel).map(tier => (
                                    <option key={tier} value={tier}>{tier}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <button
                        onClick={onSave}
                        className="w-full py-4 bg-black text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 flex items-center justify-center gap-2 mt-4"
                    >
                        💾 Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};