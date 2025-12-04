/**
 * Auth Store - Zustand Implementation
 * Manages authentication state, user sessions, and auth-related operations
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, Language, UserRole } from '../types';

interface AuthState {
    // User authentication state
    currentUser: User | null;
    guestName: string;
    isLoggingIn: boolean;
    authError: string;
    language: Language;
    token: string | null;

    // Authentication actions
    setCurrentUser: (user: User | null) => void;
    setGuestName: (name: string) => void;
    setIsLoggingIn: (isLoggingIn: boolean) => void;
    setAuthError: (error: string) => void;
    setLanguage: (language: Language) => void;
    setToken: (token: string | null) => void;

    // Authentication operations
    login: (user: User, token: string) => void;
    logout: () => void;
    updateUser: (updatedUser: Partial<User>) => void;

    // Utility functions
    isAuthenticated: () => boolean;
    isAdmin: () => boolean;
    isPhotographer: () => boolean;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            // Initial state
            currentUser: null,
            guestName: '',
            isLoggingIn: false,
            authError: '',
            language: 'en',
            token: null,

            // State setters
            setCurrentUser: (user) => set({ currentUser: user }),
            setGuestName: (name) => set({ guestName: name }),
            setIsLoggingIn: (isLoggingIn) => set({ isLoggingIn }),
            setAuthError: (error) => set({ authError: error }),
            setLanguage: (language) => set({ language }),
            setToken: (token) => set({ token }),

            // Authentication operations
            login: (user, token) => {
                set({
                    currentUser: user,
                    token,
                    isLoggingIn: false,
                    authError: ''
                });
            },

            logout: () => {
                set({
                    currentUser: null,
                    guestName: '',
                    token: null,
                    isLoggingIn: false,
                    authError: ''
                });
            },

            updateUser: (updatedUser) => {
                const currentUser = get().currentUser;
                if (currentUser) {
                    set({
                        currentUser: { ...currentUser, ...updatedUser }
                    });
                }
            },

            // Utility functions
            isAuthenticated: () => {
                const { currentUser, token } = get();
                return !!currentUser && !!token;
            },

            isAdmin: () => {
                const { currentUser } = get();
                return currentUser?.role === UserRole.ADMIN;
            },

            isPhotographer: () => {
                const { currentUser } = get();
                return currentUser?.role === UserRole.PHOTOGRAPHER;
            }
        }),
        {
            name: 'snapify-auth-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                currentUser: state.currentUser,
                guestName: state.guestName,
                language: state.language,
                token: state.token
            })
        }
    )
);

// Selectors for optimized performance
export const selectCurrentUser = () => useAuthStore((state) => state.currentUser);
export const selectIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated());
export const selectIsAdmin = () => useAuthStore((state) => state.isAdmin());
export const selectLanguage = () => useAuthStore((state) => state.language);