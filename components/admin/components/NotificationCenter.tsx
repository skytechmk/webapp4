/**
 * Notification Center Component
 * Handles admin notifications
 */

import * as React from 'react';
import { useState } from 'react';
import { Bell, Crown, X } from 'lucide-react';

export const NotificationCenter: React.FC = () => {
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);

    return (
        <div className="relative notification-container">
            <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors relative"
                title="Notifications"
            >
                <Bell size={20} />
                {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                        {notifications.length > 9 ? '9+' : notifications.length}
                    </span>
                )}
            </button>
            {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 max-h-96 overflow-y-auto notification-container">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <h4 className="font-bold text-slate-900">Notifications</h4>
                        <button
                            onClick={() => setNotifications([])}
                            className="text-xs text-slate-500 hover:text-slate-700"
                        >
                            Clear All
                        </button>
                    </div>
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                            <Bell size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No notifications</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {notifications.map((notification, index) => (
                                <div
                                    key={notification.id || index}
                                    className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                                            <Crown size={16} className="text-indigo-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-900">
                                                Upgrade Request
                                            </p>
                                            <p className="text-xs text-slate-600 mt-1">
                                                {notification.userInfo?.name || 'Anonymous user'} → {notification.tier}
                                            </p>
                                            <p className="text-xs text-slate-400 mt-1">
                                                {new Date(notification.timestamp).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="text-slate-400">
                                            <Crown size={14} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};