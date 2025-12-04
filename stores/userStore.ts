/**
 * User Store - Zustand Implementation
 * Manages user-related state and operations
 */

import { create } from 'zustand';
import { User, UserRole } from '../types';

interface UserState {
    // User state
    allUsers: User[];
    adminStatus: { adminId: string, online: boolean, lastSeen: number }[];

    // User actions
    setAllUsers: (users: User[] | ((prev: User[]) => User[])) => void;
    setAdminStatus: (status: { adminId: string, online: boolean, lastSeen: number }[]) => void;

    // User operations
    addUser: (user: User) => void;
    updateUser: (updatedUser: User) => void;
    deleteUser: (userId: string) => void;
    updateAdminStatus: (update: { adminId: string, online: boolean, lastSeen: number }) => void;

    // Utility functions
    getUserById: (userId: string) => User | null;
    isUserAdmin: (userId: string) => boolean;
    isUserPhotographer: (userId: string) => boolean;
}

export const useUserStore = create<UserState>((set, get) => ({
    // Initial state
    allUsers: [],
    adminStatus: [],

    // State setters
    setAllUsers: (users) => {
        if (typeof users === 'function') {
            set((state) => ({ allUsers: users(state.allUsers) }));
        } else {
            set({ allUsers: users });
        }
    },

    setAdminStatus: (status) => set({ adminStatus: status }),

    // User operations
    addUser: (user) => {
        set((state) => ({
            allUsers: [...state.allUsers, user]
        }));
    },

    updateUser: (updatedUser) => {
        set((state) => ({
            allUsers: state.allUsers.map((user) =>
                user.id === updatedUser.id ? updatedUser : user
            )
        }));
    },

    deleteUser: (userId) => {
        set((state) => ({
            allUsers: state.allUsers.filter((user) => user.id !== userId)
        }));
    },

    updateAdminStatus: (update) => {
        set((state) => ({
            adminStatus: state.adminStatus.map((status) =>
                status.adminId === update.adminId ? update : status
            )
        }));
    },

    // Utility functions
    getUserById: (userId) => {
        const { allUsers } = get();
        return allUsers.find((user) => user.id === userId) || null;
    },

    isUserAdmin: (userId) => {
        const user = get().getUserById(userId);
        return user?.role === UserRole.ADMIN;
    },

    isUserPhotographer: (userId) => {
        const user = get().getUserById(userId);
        return user?.role === UserRole.PHOTOGRAPHER;
    }
}));

// Selectors for optimized performance
export const selectAllUsers = () => useUserStore((state) => state.allUsers);
export const selectAdminStatus = () => useUserStore((state) => state.adminStatus);
export const selectGetUserById = () => useUserStore((state) => state.getUserById);