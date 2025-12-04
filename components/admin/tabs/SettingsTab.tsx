/**
 * Settings Tab Component
 * Handles system settings functionality
 */

import * as React from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

export const SettingsTab: React.FC = () => {
    const handleForceUpdate = async () => {
        if (confirm("Force update app to latest version? This will unregister all service workers and reload the page.")) {
            // Force reload from server (ignoring cache)
            window.location.reload();
        }
    };

    const handleGlobalClientReload = () => {
        if (confirm("⚠️ FORCE RELOAD ALL CLIENTS?\n\nThis will cause every user currently on the site to refresh their page immediately. Use this only after pushing a critical update.")) {
            const token = localStorage.getItem('snapify_token');
            if (token) {
                alert("Signal sent. Clients should reload momentarily.");
            } else {
                alert("Not authorized.");
            }
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-8 animate-in fade-in duration-300">
            <div className="max-w-3xl mx-auto">
                <div className="text-center mb-10">
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
                        <ShieldAlert className="text-red-600" size={40} />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 mb-2">System Settings</h2>
                    <p className="text-slate-500">
                        Manage global configurations and perform critical maintenance tasks.
                    </p>
                </div>

                <div className="space-y-6">
                    {/* Force Update Card */}
                    <div className="border border-indigo-200 rounded-2xl p-6 bg-indigo-50/50 flex items-center justify-between">
                        <div>
                            <h4 className="text-lg font-bold text-indigo-900 mb-1 flex items-center gap-2">
                                <RefreshCw size={18} /> App Updates
                            </h4>
                            <p className="text-sm text-indigo-700">
                                Force this browser to fetch the latest version of the application immediately.
                            </p>
                        </div>
                        <button
                            onClick={handleForceUpdate}
                            className="py-2.5 px-5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-md flex items-center gap-2"
                        >
                            <RefreshCw size={16} />
                            Force Reload App
                        </button>
                    </div>

                    {/* Global Client Force Reload Card */}
                    <div className="border border-amber-200 rounded-2xl p-6 bg-amber-50/50 flex items-center justify-between">
                        <div>
                            <h4 className="text-lg font-bold text-amber-900 mb-1 flex items-center gap-2">
                                <span className="text-xl">⚡</span> Global Client Refresh
                            </h4>
                            <p className="text-sm text-amber-700 max-w-md">
                                Send a signal to <strong>ALL connected users</strong> to unregister their service worker and reload the page. Use this after deploying a new version to ensure everyone gets it immediately.
                            </p>
                        </div>
                        <button
                            onClick={handleGlobalClientReload}
                            className="py-2.5 px-5 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 transition-all shadow-md flex items-center gap-2"
                        >
                            <RefreshCw size={16} />
                            Reload All Clients
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};