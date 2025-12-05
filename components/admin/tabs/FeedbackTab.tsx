/**
 * Feedback Tab Component
 * Handles feedback management functionality
 */

import * as React from 'react';
import { useState, useEffect } from 'react';
import { MessageSquare, FileText, Star, Check, Eye, MessageCircle, AlertTriangle } from 'lucide-react';
import { api } from '../../../services/api';
import { User } from '../../../types';
import { BetaTestingManager } from '../../../lib/beta-testing';

interface FeedbackTabProps {
    users: User[];
}

export const FeedbackTab: React.FC<FeedbackTabProps> = ({ users }) => {
    const [feedbackData, setFeedbackData] = useState<any>(null);
    const [loadingFeedback, setLoadingFeedback] = useState(true);

    // Load feedback data
    useEffect(() => {
        const loadFeedbackData = async () => {
            try {
                setLoadingFeedback(true);
                const data = await api.getAllFeedback();
                setFeedbackData(data);
            } catch (error) {
                console.error('Failed to load feedback data:', error);
                setFeedbackData(null);
            } finally {
                setLoadingFeedback(false);
            }
        };

        loadFeedbackData();
    }, []);

    const handleStatusUpdate = async (feedbackId: string, newStatus: 'new' | 'reviewed' | 'resolved') => {
        try {
            await api.updateFeedbackStatus(feedbackId, newStatus);
            // Refresh feedback data
            const data = await api.getAllFeedback();
            setFeedbackData(data);
        } catch (error) {
            console.error('Failed to update feedback status:', error);
        }
    };

    // Get beta statistics for compatibility
    const stats = BetaTestingManager.getBetaStats();

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <MessageSquare className="text-indigo-600" size={24} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Feedback Management</h3>
                    <p className="text-sm text-slate-500">View and manage user feedback submissions</p>
                </div>
            </div>

            {/* Feedback Statistics */}
            <div className="p-6 border-b border-slate-100">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Total Feedback</div>
                        <div className="text-2xl font-black text-slate-900">{feedbackData?.stats.totalFeedback || stats.feedbackSubmitted}</div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">New Feedback</div>
                        <div className="text-2xl font-black text-slate-900">{feedbackData?.stats.newFeedback || 0}</div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Active Features</div>
                        <div className="text-2xl font-black text-slate-900">{stats.activeFeatures}</div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Current Version</div>
                        <div className="text-2xl font-black text-slate-900">{stats.version}</div>
                    </div>
                </div>
            </div>

            {/* Feedback List */}
            <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-bold text-slate-900">User Feedback Submissions</h4>
                    <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-full">{feedbackData?.feedbackItems.length || 0} submissions</span>
                </div>

                {loadingFeedback ? (
                    <div className="text-center py-12 text-slate-500">
                        <div className="animate-spin border-2 border-slate-300 border-t-slate-600 rounded-full w-8 h-8 mx-auto mb-4"></div>
                        <p className="font-medium">Loading feedback data...</p>
                    </div>
                ) : feedbackData?.feedbackItems.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                        <FileText size={48} className="mx-auto mb-4 text-slate-300" />
                        <p className="font-medium">No feedback submissions yet</p>
                        <p className="text-sm">User feedback will appear here when submitted</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {feedbackData?.feedbackItems.map((feedbackItem) => {
                            // Find the corresponding user
                            const user = users.find(u => u.id === feedbackItem.userId);

                            return (
                                <div key={feedbackItem.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold">
                                                {user ? user.name.charAt(0).toUpperCase() : 'U'}
                                            </div>
                                            <div>
                                                <h5 className="font-bold text-slate-900">{user ? user.name : `User ${feedbackItem.userId}`}</h5>
                                                <p className="text-sm text-slate-500">{user ? user.email : feedbackItem.userEmail || 'Anonymous user'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-bold px-2 py-1 rounded-full border ${feedbackItem.status === 'new' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                                feedbackItem.status === 'reviewed' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                                                    'bg-green-100 text-green-700 border-green-200'
                                                }`}>
                                                {feedbackItem.status.toUpperCase()}
                                            </span>
                                            <span className="text-xs text-slate-400">{new Date(feedbackItem.submittedAt).toLocaleString()}</span>
                                        </div>
                                    </div>

                                    {/* Feedback Content */}
                                    <div className="bg-white p-4 rounded-lg border border-slate-100 mb-3">
                                        <div className="flex items-center gap-2 mb-2">
                                            {feedbackItem.rating && (
                                                <div className="flex items-center gap-1">
                                                    <Star className="text-yellow-400 fill-yellow-400" size={16} />
                                                    <span className="font-bold text-slate-900">{feedbackItem.rating}/5</span>
                                                </div>
                                            )}
                                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${feedbackItem.category === 'bug' ? 'bg-red-100 text-red-700' :
                                                feedbackItem.category === 'feature-request' ? 'bg-purple-100 text-purple-700' :
                                                    feedbackItem.category === 'improvement' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-slate-100 text-slate-700'
                                                }`}>
                                                {feedbackItem.category.toUpperCase()}
                                            </span>
                                            <span className="text-xs font-bold px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">
                                                {feedbackItem.source.toUpperCase()}
                                            </span>
                                        </div>

                                        <div className="mt-2">
                                            <p className="text-sm text-slate-700 font-medium mb-2">Feedback:</p>
                                            <p className="text-slate-900 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                                {feedbackItem.comments}
                                            </p>
                                        </div>

                                        {feedbackItem.feature && (
                                            <div className="mt-2 text-sm">
                                                <span className="text-slate-500">Related Feature:</span>
                                                <span className="font-bold text-slate-900 ml-1">{feedbackItem.feature}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Feedback Actions */}
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={feedbackItem.status}
                                            onChange={(e) => handleStatusUpdate(feedbackItem.id, e.target.value as 'new' | 'reviewed' | 'resolved')}
                                            className="flex-1 px-3 py-2 text-sm font-bold rounded-lg border border-slate-200 bg-white text-slate-700 cursor-pointer"
                                        >
                                            <option value="new">New</option>
                                            <option value="reviewed">Reviewed</option>
                                            <option value="resolved">Resolved</option>
                                        </select>

                                        {feedbackItem.status === 'new' && (
                                            <button
                                                onClick={() => handleStatusUpdate(feedbackItem.id, 'reviewed')}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Mark as Reviewed"
                                            >
                                                <Eye size={18} />
                                            </button>
                                        )}

                                        {feedbackItem.status === 'reviewed' && (
                                            <button
                                                onClick={() => handleStatusUpdate(feedbackItem.id, 'resolved')}
                                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                title="Mark as Resolved"
                                            >
                                                <Check size={18} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
