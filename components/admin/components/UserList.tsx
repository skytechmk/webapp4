import * as React from 'react';
import { User, UserRole, TranslateFn } from '../../../types';
import { Edit, Trash2, User as UserIcon, Mail, Calendar, Shield, MoreVertical } from 'lucide-react';

/**
 * UserList Component
 *
 * A component for displaying a list of users with their details and actions.
 * Shows user information including name, email, role, tier, and join date.
 * Provides edit and delete actions for each user.
 *
 * @component
 */
interface UserListProps {
    /** Array of users to display */
    users: User[];
    /** Function to handle user edit action */
    onEditUser: (user: User) => void;
    /** Function to handle user delete action */
    onDeleteUser: (userId: string) => void;
    /** Translation function for internationalization */
    t: TranslateFn;
}

export const UserList: React.FC<UserListProps> = ({ users, onEditUser, onDeleteUser, t }) => {
    return (
        <div className="space-y-4">
            {users.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                    <p>{t('noUsersFound')}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {users.map(user => (
                        <div key={user.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                        <span className="text-indigo-600 font-bold">
                                            {user.name.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-semibold text-slate-900 truncate">{user.name}</h4>
                                            {user.role === UserRole.ADMIN && (
                                                <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-1 rounded-full font-medium">
                                                    {t('admin')}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-500 truncate">{user.email}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => onEditUser(user)}
                                        className="p-2 text-slate-500 hover:text-indigo-600 transition-colors"
                                        title={t('editUser')}
                                    >
                                        <Edit size={18} />
                                    </button>
                                    <button
                                        onClick={() => onDeleteUser(user.id)}
                                        className="p-2 text-slate-500 hover:text-red-500 transition-colors"
                                        title={t('deleteUser')}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* User Details */}
                            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                                <div className="flex items-center gap-1 text-slate-600">
                                    <Mail size={14} />
                                    <span className="truncate">{user.email}</span>
                                </div>
                                <div className="flex items-center gap-1 text-slate-600">
                                    <Calendar size={14} />
                                    <span>{new Date(user.joinedDate).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-1 text-slate-600">
                                    <Shield size={14} />
                                    <span>{user.role}</span>
                                </div>
                                <div className="flex items-center gap-1 text-slate-600">
                                    <span className="font-medium">{t('tier')}:</span>
                                    <span>{user.tier}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};