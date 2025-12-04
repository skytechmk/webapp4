/**
 * Zustand Demo Component
 * Demonstrates how Zustand state management replaces prop drilling
 * This component shows the foundation for the new state management approach
 */

import React from 'react';
import { useAuthStore, useEventStore, useMediaStore, useUIStore, useUserStore } from '../stores';
import { UserRole, TierLevel } from '../types';

// Example component that uses Zustand stores instead of prop drilling
export const ZustandDemo: React.FC = () => {
    // Replace prop drilling with direct store access
    const currentUser = useAuthStore((state) => state.currentUser);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
    const isAdmin = useAuthStore((state) => state.isAdmin());

    const events = useEventStore((state) => state.events);
    const activeEvent = useEventStore((state) => state.getActiveEvent());
    const currentEventId = useEventStore((state) => state.currentEventId);

    const previewMedia = useMediaStore((state) => state.previewMedia);
    const isUploading = useMediaStore((state) => state.isUploading);
    const uploadProgress = useMediaStore((state) => state.uploadProgress);

    const showGuestLogin = useUIStore((state) => state.showGuestLogin);
    const pendingAction = useUIStore((state) => state.pendingAction);

    const allUsers = useUserStore((state) => state.allUsers);

    // Example actions that would previously require prop drilling
    const {
        setCurrentUser,
        login,
        logout,
        setLanguage
    } = useAuthStore();

    const {
        setEvents,
        setCurrentEventId,
        addEvent,
        updateEvent,
        deleteEvent
    } = useEventStore();

    const {
        setPreviewMedia,
        setIsUploading,
        setUploadProgress,
        setApplyWatermark
    } = useMediaStore();

    const {
        setShowGuestLogin,
        setPendingAction,
        setShowCreateModal
    } = useUIStore();

    const {
        setAllUsers,
        addUser,
        updateUser,
        deleteUser
    } = useUserStore();

    // Example of how this replaces the complex prop drilling in AuthManager
    const handleDemoLogin = () => {
        // This would be called from a login form
        const mockUser = {
            id: 'demo-user',
            name: 'Demo User',
            email: 'demo@example.com',
            role: UserRole.USER,
            tier: TierLevel.FREE,
            storageUsedMb: 0,
            storageLimitMb: 100,
            joinedDate: new Date().toISOString().split('T')[0]
        };

        login(mockUser, 'demo-token');
        setCurrentEventId(null); // Clear any existing event
    };

    const handleDemoLogout = () => {
        logout();
    };

    const handleDemoEventCreation = () => {
        if (!currentUser) return;

        const newEvent = {
            id: `event-${Date.now()}`,
            title: 'Demo Event',
            date: new Date().toISOString().split('T')[0],
            description: 'Created with Zustand state management',
            hostId: currentUser.id,
            code: 'DEMO123',
            media: [],
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            pin: null,
            views: 0,
            downloads: 0
        };

        addEvent(newEvent);
        setCurrentEventId(newEvent.id);
    };

    return (
        <div className="p-4 bg-white rounded-lg shadow-md max-w-md mx-auto">
            <h2 className="text-xl font-bold mb-4 text-indigo-600">Zustand State Management Demo</h2>

            <div className="space-y-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                    <h3 className="font-semibold text-sm text-gray-600 mb-2">Authentication State</h3>
                    <p><strong>User:</strong> {currentUser?.name || 'Not logged in'}</p>
                    <p><strong>Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</p>
                    <p><strong>Admin:</strong> {isAdmin ? 'Yes' : 'No'}</p>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                    <h3 className="font-semibold text-sm text-gray-600 mb-2">Event State</h3>
                    <p><strong>Total Events:</strong> {events.length}</p>
                    <p><strong>Active Event:</strong> {activeEvent?.title || 'None'}</p>
                    <p><strong>Current Event ID:</strong> {currentEventId || 'None'}</p>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                    <h3 className="font-semibold text-sm text-gray-600 mb-2">Media State</h3>
                    <p><strong>Preview Media:</strong> {previewMedia ? 'Yes' : 'No'}</p>
                    <p><strong>Uploading:</strong> {isUploading ? 'Yes' : 'No'}</p>
                    <p><strong>Progress:</strong> {uploadProgress}%</p>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                    <h3 className="font-semibold text-sm text-gray-600 mb-2">UI State</h3>
                    <p><strong>Guest Login Visible:</strong> {showGuestLogin ? 'Yes' : 'No'}</p>
                    <p><strong>Pending Action:</strong> {pendingAction || 'None'}</p>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                    <h3 className="font-semibold text-sm text-gray-600 mb-2">User State</h3>
                    <p><strong>Total Users:</strong> {allUsers.length}</p>
                </div>
            </div>

            <div className="mt-6 space-y-2">
                <button
                    onClick={handleDemoLogin}
                    disabled={isAuthenticated}
                    className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300 transition-colors"
                >
                    {isAuthenticated ? 'Already Logged In' : 'Demo Login'}
                </button>

                <button
                    onClick={handleDemoLogout}
                    disabled={!isAuthenticated}
                    className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 transition-colors"
                >
                    Demo Logout
                </button>

                <button
                    onClick={handleDemoEventCreation}
                    disabled={!isAuthenticated}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-green-300 transition-colors"
                >
                    Create Demo Event
                </button>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm">
                <h4 className="font-semibold mb-1">Key Benefits:</h4>
                <ul className="list-disc list-inside space-y-1 text-blue-800">
                    <li>Eliminates prop drilling through component hierarchy</li>
                    <li>Centralized state management with TypeScript support</li>
                    <li>Optimized performance with selective state access</li>
                    <li>Persistent storage for authentication state</li>
                    <li>Clean separation of concerns between different state domains</li>
                </ul>
            </div>
        </div>
    );
};