/**
 * System Tab Component
 * Handles system monitoring functionality
 */

import * as React from 'react';
import { useState, useEffect } from 'react';
import { HardDrive, ShieldAlert, Trash2, AlertTriangle } from 'lucide-react';
import { api } from '../../../services/api';

export const SystemTab: React.FC = () => {
    const [systemStorage, setSystemStorage] = useState<{
        system: { filesystem: string; size: string; used: string; available: string; usePercent: string };
        minio: { filesystem: string; size: string; used: string; available: string; usePercent: string };
        resources?: {
            cpu: { usage: number; cores: number; loadAverage: number[] };
            memory: { total: string; used: string; available: string; usePercent: string };
            network: { rxBytes: number; txBytes: number; rxPackets: number; txPackets: number };
            uptime: number;
            timestamp: string;
        };
        timestamp: string;
    } | null>(null);
    const [systemResources, setSystemResources] = useState<{
        cpu: { usage: number; cores: number; loadAverage: number[] };
        memory: { total: string; used: string; available: string; usePercent: string };
        network: { rxBytes: number; txBytes: number; rxPackets: number; txPackets: number };
        uptime: number;
        timestamp: string;
    } | null>(null);
    const [storageLoading, setStorageLoading] = useState(false);
    const [resourcesLoading, setResourcesLoading] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(true);

    // Fetch system storage data
    const fetchStorageData = async () => {
        setStorageLoading(true);
        try {
            const data = await api.getSystemStorage();
            setSystemStorage(data);
        } catch (error) {
            console.error('Failed to fetch system storage data:', error);
            if (error.message.includes('Session expired')) {
                alert('⚠️ Session expired. Please log in again to access system information.');
            } else if (error.message.includes('Unauthorized')) {
                alert('⚠️ Authentication required. Please log in again to access system information.');
            }
        } finally {
            setStorageLoading(false);
        }
    };

    // Fetch system resources data
    const fetchResourcesData = async () => {
        setResourcesLoading(true);
        try {
            const data = await api.getSystemResources();
            setSystemResources(data);
        } catch (error) {
            console.error('Failed to fetch system resources data:', error);
        } finally {
            setResourcesLoading(false);
        }
    };

    // Initial data fetch
    useEffect(() => {
        fetchStorageData();
        fetchResourcesData();
    }, []);

    // Auto-refresh resources every 30 seconds
    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(() => {
            fetchResourcesData();
        }, 30000); // 30 seconds

        return () => clearInterval(interval);
    }, [autoRefresh]);

    const handleCleanMinIOBucket = async () => {
        const confirmed = confirm('🚨 CRITICAL WARNING 🚨\n\n' +
            'This will PERMANENTLY DELETE ALL FILES from the MinIO storage bucket!\n\n' +
            '• All user uploaded media will be lost\n' +
            '• Event galleries will become empty\n' +
            '• This action CANNOT be undone\n\n' +
            'Type "YES" to confirm:');

        if (confirmed) {
            const secondConfirm = prompt('Type "YES" to confirm permanent deletion:');
            if (secondConfirm === 'YES') {
                try {
                    const result = await api.cleanMinIOBucket();
                    alert(`✅ Bucket cleaned successfully!\n\n` +
                        `📁 Deleted: ${result.deletedCount} objects\n` +
                        `💾 Freed: ${result.totalSize}\n\n` +
                        `⚠️  All media files have been permanently removed.`);
                    // Refresh storage data
                    setSystemStorage(null);
                } catch (error) {
                    console.error('Failed to clean bucket:', error);
                    alert('❌ Failed to clean bucket. Check console for details.');
                }
            }
        }
    };

    const handleClearUsersDatabase = async () => {
        const confirmed = confirm('🚨 CRITICAL WARNING 🚨\n\n' +
            'This will RESET THE ENTIRE WEBAPP!\n\n' +
            '• All user accounts will be deleted (except admin)\n' +
            '• All events and galleries will be removed\n' +
            '• All media files will be lost\n' +
            '• Support messages will be cleared\n\n' +
            'The webapp will return to a fresh state.\n\n' +
            'Type "RESET" to confirm:');

        if (confirmed) {
            const secondConfirm = prompt('Type "RESET" to confirm complete webapp reset:');
            if (secondConfirm === 'RESET') {
                try {
                    const result = await api.clearUsersDatabase();
                    alert(`✅ Database cleared successfully!\n\n` +
                        `👤 Admin preserved: ${result.adminPreserved}\n` +
                        `🗑️  Total records deleted: ${result.totalDeleted}\n\n` +
                        `⚠️  Webapp has been reset to fresh state.`);
                    // Refresh the page to reload data
                    window.location.reload();
                } catch (error) {
                    console.error('Failed to clear database:', error);
                    alert('❌ Failed to clear database. Check console for details.');
                }
            }
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-8 animate-in fade-in duration-300">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-10">
                    <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-100">
                        <HardDrive className="text-green-600" size={40} />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 mb-2">System Storage</h2>
                    <p className="text-slate-500">
                        Real-time monitoring of system and storage capacity.
                    </p>
                </div>

                <div className="space-y-6">
                    {/* System Resources Card */}
                    <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/50">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <HardDrive size={18} /> System Resources
                            </h4>
                            <div className="flex items-center gap-2">
                                <label className="text-sm text-slate-600">Auto-refresh:</label>
                                <button
                                    onClick={() => setAutoRefresh(!autoRefresh)}
                                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${autoRefresh
                                        ? 'bg-green-100 text-green-800 border border-green-200'
                                        : 'bg-gray-100 text-gray-600 border border-gray-200'
                                        }`}
                                >
                                    {autoRefresh ? 'ON' : 'OFF'}
                                </button>
                            </div>
                        </div>
                        {resourcesLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin border-2 border-slate-300 border-t-slate-600 rounded-full w-6 h-6"></div>
                                <span className="ml-3 text-slate-600">Loading resources...</span>
                            </div>
                        ) : systemResources ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* CPU Usage */}
                                <div className={`p-4 rounded-xl border ${systemResources.cpu.usage > 90 ? 'bg-red-50 border-red-200' :
                                    systemResources.cpu.usage > 75 ? 'bg-yellow-50 border-yellow-200' :
                                        'bg-white border-slate-200'
                                    }`}>
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">CPU Usage</div>
                                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${systemResources.cpu.usage > 90 ? 'bg-red-100 text-red-800' :
                                            systemResources.cpu.usage > 75 ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-green-100 text-green-800'
                                            }`}>
                                            {systemResources.cpu.usage > 90 ? 'Critical' :
                                                systemResources.cpu.usage > 75 ? 'Warning' : 'Normal'}
                                        </div>
                                    </div>
                                    <div className="text-lg font-black text-slate-900">{systemResources.cpu.usage.toFixed(1)}%</div>
                                    <div className="text-xs text-slate-500 mt-1">
                                        {systemResources.cpu.cores} cores • Load: {systemResources.cpu.loadAverage.map(l => l.toFixed(1)).join(', ')}
                                    </div>
                                </div>
                                {/* Memory Usage */}
                                <div className={`p-4 rounded-xl border ${parseFloat(systemResources.memory.usePercent) > 85 ? 'bg-red-50 border-red-200' :
                                    parseFloat(systemResources.memory.usePercent) > 70 ? 'bg-yellow-50 border-yellow-200' :
                                        'bg-white border-slate-200'
                                    }`}>
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">Memory</div>
                                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${parseFloat(systemResources.memory.usePercent) > 85 ? 'bg-red-100 text-red-800' :
                                            parseFloat(systemResources.memory.usePercent) > 70 ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-green-100 text-green-800'
                                            }`}>
                                            {parseFloat(systemResources.memory.usePercent) > 85 ? 'Critical' :
                                                parseFloat(systemResources.memory.usePercent) > 70 ? 'Warning' : 'Normal'}
                                        </div>
                                    </div>
                                    <div className="text-lg font-black text-slate-900">{systemResources.memory.usePercent}</div>
                                    <div className="text-xs text-slate-500 mt-1">
                                        {systemResources.memory.used} / {systemResources.memory.total}
                                    </div>
                                </div>
                                {/* Uptime */}
                                <div className="bg-white p-4 rounded-xl border border-slate-200">
                                    <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Uptime</div>
                                    <div className="text-lg font-black text-slate-900">
                                        {Math.floor(systemResources.uptime / 86400)}d {Math.floor((systemResources.uptime % 86400) / 3600)}h
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">
                                        {Math.floor(systemResources.uptime / 3600)} hours total
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-500">
                                <HardDrive size={48} className="mx-auto mb-4 text-slate-300" />
                                <p>Unable to load system resources</p>
                            </div>
                        )}
                    </div>

                    {/* System Storage Card */}
                    <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/50">
                        <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <HardDrive size={18} /> System Disk Usage
                        </h4>
                        {storageLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin border-2 border-slate-300 border-t-slate-600 rounded-full w-8 h-8"></div>
                                <span className="ml-3 text-slate-600">Loading storage info...</span>
                            </div>
                        ) : systemStorage ? (
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-white p-4 rounded-xl border border-slate-200">
                                    <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Filesystem</div>
                                    <div className="text-lg font-black text-slate-900">{systemStorage.system.filesystem}</div>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-200">
                                    <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Total Size</div>
                                    <div className="text-lg font-black text-slate-900">{systemStorage.system.size}</div>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-200">
                                    <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Used</div>
                                    <div className="text-lg font-black text-slate-900">{systemStorage.system.used}</div>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-200">
                                    <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Available</div>
                                    <div className="text-lg font-black text-slate-900">{systemStorage.system.available}</div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-500">
                                <HardDrive size={48} className="mx-auto mb-4 text-slate-300" />
                                <p>Unable to load storage information</p>
                            </div>
                        )}
                    </div>

                    {/* MinIO Storage Card */}
                    <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/50">
                        <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <HardDrive size={18} /> MinIO Storage Usage
                        </h4>
                        {systemStorage ? (
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-white p-4 rounded-xl border border-slate-200">
                                    <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Filesystem</div>
                                    <div className="text-lg font-black text-slate-900">{systemStorage.minio.filesystem}</div>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-200">
                                    <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Total Size</div>
                                    <div className="text-lg font-black text-slate-900">{systemStorage.minio.size}</div>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-200">
                                    <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Used</div>
                                    <div className="text-lg font-black text-slate-900">{systemStorage.minio.used}</div>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-200">
                                    <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Available</div>
                                    <div className="text-lg font-black text-slate-900">{systemStorage.minio.available}</div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-500">
                                <HardDrive size={48} className="mx-auto mb-4 text-slate-300" />
                                <p>Unable to load MinIO information</p>
                            </div>
                        )}
                    </div>

                    {/* System Health Summary */}
                    <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/50">
                        <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <AlertTriangle size={18} /> System Health Summary
                        </h4>

                        {systemResources ? (
                            <div className="space-y-4">
                                {/* Overall Status */}
                                <div className="bg-white p-4 rounded-xl border border-slate-200">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h5 className="font-semibold text-slate-900">Overall System Status</h5>
                                            <p className="text-sm text-slate-600 mt-1">
                                                {systemResources.cpu.usage > 90 || parseFloat(systemResources.memory.usePercent) > 85 ? 'Critical - Immediate attention required' :
                                                    systemResources.cpu.usage > 75 || parseFloat(systemResources.memory.usePercent) > 70 ? 'Warning - Monitor closely' :
                                                        'Normal - System operating optimally'}
                                            </p>
                                        </div>
                                        <div className={`px-4 py-2 rounded-full text-sm font-bold ${systemResources.cpu.usage > 90 || parseFloat(systemResources.memory.usePercent) > 85 ? 'bg-red-100 text-red-800' :
                                                systemResources.cpu.usage > 75 || parseFloat(systemResources.memory.usePercent) > 70 ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-green-100 text-green-800'
                                            }`}>
                                            {systemResources.cpu.usage > 90 || parseFloat(systemResources.memory.usePercent) > 85 ? 'CRITICAL' :
                                                systemResources.cpu.usage > 75 || parseFloat(systemResources.memory.usePercent) > 70 ? 'WARNING' : 'HEALTHY'}
                                        </div>
                                    </div>
                                </div>

                                {/* Active Alerts */}
                                {(systemResources.cpu.usage > 75 || parseFloat(systemResources.memory.usePercent) > 70) && (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                                        <div className="flex items-start gap-3">
                                            <AlertTriangle className="text-yellow-600 mt-0.5" size={20} />
                                            <div>
                                                <h5 className="font-semibold text-yellow-800">Active System Alerts</h5>
                                                <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                                                    {systemResources.cpu.usage > 90 && <li>• CPU usage is critically high ({systemResources.cpu.usage.toFixed(1)}%)</li>}
                                                    {systemResources.cpu.usage > 75 && systemResources.cpu.usage <= 90 && <li>• CPU usage is elevated ({systemResources.cpu.usage.toFixed(1)}%)</li>}
                                                    {parseFloat(systemResources.memory.usePercent) > 85 && <li>• Memory usage is critically high ({systemResources.memory.usePercent})</li>}
                                                    {parseFloat(systemResources.memory.usePercent) > 70 && parseFloat(systemResources.memory.usePercent) <= 85 && <li>• Memory usage is elevated ({systemResources.memory.usePercent})</li>}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-500">
                                <AlertTriangle size={48} className="mx-auto mb-4 text-slate-300" />
                                <p>Unable to assess system health</p>
                            </div>
                        )}
                    </div>

                    {/* System Lab Card */}
                    <div className="border border-red-200 rounded-2xl p-6 bg-red-50/30">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center border border-red-200">
                                <ShieldAlert className="text-red-600" size={24} />
                            </div>
                            <div>
                                <h4 className="text-xl font-black text-red-900">System Lab</h4>
                                <p className="text-sm text-red-700 font-medium">Danger Zone - Administrative Operations</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {/* Clean MinIO Bucket */}
                            <div className="bg-white p-4 rounded-xl border border-red-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h5 className="font-bold text-slate-900">Clean MinIO Storage Bucket</h5>
                                        <p className="text-sm text-slate-600 mt-1">
                                            Permanently delete all files and objects from the MinIO storage bucket.
                                            This action cannot be undone.
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleCleanMinIOBucket}
                                        className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 shadow-lg shadow-red-500/20"
                                    >
                                        <Trash2 size={16} />
                                        Clean Bucket
                                    </button>
                                </div>
                            </div>

                            {/* Clear Users Database */}
                            <div className="bg-white p-4 rounded-xl border border-red-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h5 className="font-bold text-slate-900">Clear Users Database</h5>
                                        <p className="text-sm text-slate-600 mt-1">
                                            Reset the webapp by removing all users, events, media, and related data.
                                            Admin account will be preserved.
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleClearUsersDatabase}
                                        className="px-4 py-2 bg-red-700 text-white text-sm font-bold rounded-lg hover:bg-red-800 transition-colors flex items-center gap-2 shadow-lg shadow-red-500/30"
                                    >
                                        <AlertTriangle size={16} />
                                        Clear Database
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded-lg">
                            <p className="text-xs text-red-800 font-medium flex items-center gap-2">
                                <AlertTriangle size={14} />
                                These operations are irreversible. Use only when necessary for system maintenance or testing.
                            </p>
                        </div>

                        {/* Last Updated */}
                        {(systemStorage || systemResources) && (
                            <div className="flex justify-between items-center text-xs text-slate-400">
                                <div>
                                    Storage: {systemStorage ? new Date(systemStorage.timestamp).toLocaleString() : 'Never'}
                                </div>
                                <div>
                                    Resources: {systemResources ? new Date(systemResources.timestamp).toLocaleString() : 'Never'}
                                </div>
                                <button
                                    onClick={() => {
                                        fetchStorageData();
                                        fetchResourcesData();
                                    }}
                                    className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                                >
                                    Refresh All
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
