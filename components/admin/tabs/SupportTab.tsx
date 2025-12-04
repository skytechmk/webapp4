/**
 * Support Tab Component
 * Handles support management functionality
 */

import * as React from 'react';
import { useState, useEffect } from 'react';
import { MessageCircle, Send, X, Check, MessageSquare } from 'lucide-react';
import { api } from '../../../services/api';
import { socketService } from '../../../services/socketService';
import { User } from '../../../types';

interface SupportTabProps {
    users: User[];
}

export const SupportTab: React.FC<SupportTabProps> = ({ users }) => {
    const [supportMessages, setSupportMessages] = useState<any[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [newReply, setNewReply] = useState('');
    const [isReplying, setIsReplying] = useState(false);

    // Load support messages
    useEffect(() => {
        const loadSupportMessages = async () => {
            try {
                const messages = await api.getSupportMessages();
                setSupportMessages(messages);
            } catch (error) {
                console.error('Support messages load failed:', error);
            }
        };
        loadSupportMessages();
    }, []);

    // Listen for new support messages
    useEffect(() => {
        socketService.connect();
        const handleNewSupportMessage = (message: any) => {
            setSupportMessages(prev => {
                const existing = prev.find(m => m.id === message.id);
                if (existing) return prev;
                return [...prev, message];
            });
        };

        socketService.on('new_support_message', handleNewSupportMessage);

        return () => {
            socketService.off('new_support_message', handleNewSupportMessage);
        };
    }, []);

    const sendReply = async () => {
        if (!newReply.trim() || !selectedUserId || isReplying) return;

        setIsReplying(true);
        try {
            await api.sendAdminReply(selectedUserId, newReply.trim());
            setNewReply('');
        } catch (error) {
            console.error('Reply send failed:', error);
        } finally {
            setIsReplying(false);
        }
    };

    const markAsRead = async (messageId: string) => {
        try {
            await api.markMessageAsRead(messageId);
            setSupportMessages(prev =>
                prev.map(msg =>
                    msg.id === messageId ? { ...msg, isRead: true } : msg
                )
            );
        } catch (error) {
            console.error('Mark as read failed:', error);
        }
    };

    // Group messages by user
    const conversations = supportMessages.reduce((acc: any, message: any) => {
        const userId = message.userId || 'anonymous';
        if (!acc[userId]) {
            acc[userId] = {
                userId,
                userName: message.userName,
                userEmail: message.userEmail,
                messages: [],
                lastMessage: message.createdAt,
                unreadCount: 0
            };
        }
        acc[userId].messages.push(message);
        acc[userId].lastMessage = message.createdAt;
        if (!message.isFromAdmin && !message.isRead) {
            acc[userId].unreadCount++;
        }
        return acc;
    }, {});

    const sortedConversations = Object.values(conversations).sort((a: any, b: any) =>
        new Date(b.lastMessage).getTime() - new Date(a.lastMessage).getTime()
    );

    const selectedConversation = selectedUserId ? conversations[selectedUserId] : null;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <MessageCircle className="text-indigo-600" size={24} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Support Chat Management</h3>
                    <p className="text-sm text-slate-500">Manage customer support conversations</p>
                </div>
            </div>

            <div className="flex h-[600px]">
                {/* Conversations List */}
                <div className="w-1/3 border-r border-slate-200 flex flex-col">
                    <div className="p-4 border-b border-slate-100">
                        <h4 className="font-bold text-slate-900">Conversations ({sortedConversations.length})</h4>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {sortedConversations.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">
                                <MessageCircle size={48} className="mx-auto mb-4 text-slate-300" />
                                <p className="font-medium">No conversations yet</p>
                                <p className="text-sm">Support messages will appear here</p>
                            </div>
                        ) : (
                            sortedConversations.map((conv: any) => {
                                const user = users.find(u => u.id === conv.userId);
                                return (
                                    <div
                                        key={conv.userId}
                                        onClick={() => setSelectedUserId(conv.userId)}
                                        className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${selectedUserId === conv.userId ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : ''
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold">
                                                {conv.userName.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <p className="font-bold text-slate-900 truncate">{conv.userName}</p>
                                                    {conv.unreadCount > 0 && (
                                                        <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                                                            {conv.unreadCount}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-slate-500 truncate">{conv.userEmail || 'No email'}</p>
                                                {user && (
                                                    <div className="flex items-center gap-2 mt-1">
                                                        {/* Tier badge would go here */}
                                                    </div>
                                                )}
                                                <p className="text-xs text-slate-400 mt-1">
                                                    {new Date(conv.lastMessage).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Chat Window */}
                <div className="flex-1 flex flex-col">
                    {selectedConversation ? (
                        <>
                            {/* Chat Header */}
                            <div className="p-4 border-b border-slate-100 bg-slate-50">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold">
                                        {selectedConversation.userName.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900">{selectedConversation.userName}</h4>
                                        <p className="text-sm text-slate-500">{selectedConversation.userEmail || 'No email provided'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {selectedConversation.messages.map((message: any) => (
                                    <div
                                        key={message.id}
                                        className={`flex ${message.isFromAdmin ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${message.isFromAdmin
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-slate-100 text-slate-900'
                                                }`}
                                        >
                                            <p className="text-sm">{message.message}</p>
                                            <p className={`text-xs mt-1 ${message.isFromAdmin ? 'text-indigo-200' : 'text-slate-500'
                                                }`}>
                                                {new Date(message.createdAt).toLocaleTimeString()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Reply Input */}
                            <div className="p-4 border-t border-slate-100 bg-white">
                                <div className="flex gap-2">
                                    <input
                                        id="admin-reply-input"
                                        name="admin-reply"
                                        type="text"
                                        value={newReply}
                                        onChange={(e) => setNewReply(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && sendReply()}
                                        placeholder="Type your reply..."
                                        className="flex-1 px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                        autoComplete="off"
                                    />
                                    <button
                                        onClick={sendReply}
                                        disabled={!newReply.trim() || isReplying}
                                        className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {isReplying ? (
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <Send size={16} />
                                        )}
                                        Send
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-500">
                            <div className="text-center">
                                <MessageCircle size={64} className="mx-auto mb-4 text-slate-300" />
                                <p className="font-medium">Select a conversation to start chatting</p>
                                <p className="text-sm">Choose a user from the list to view their messages</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};