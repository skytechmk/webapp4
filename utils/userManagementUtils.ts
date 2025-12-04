/**
 * User Management Utilities Module
 * Focused utility functions for user-related operations
 */

import { User } from '../types';
import { safeSetObject, safeGetObject, safeRemoveItem } from './storageUtils';

export const handleUserUpdate = (
    updatedUser: User,
    setCurrentUser: (value: User | null | ((prev: User | null) => User | null)) => void,
    setAllUsers: (value: User[] | ((prev: User[]) => User[])) => void
): void => {
    setCurrentUser(prev => {
        if (!prev) return null;
        const updated = { ...prev, ...updatedUser };
        safeSetObject('snapify_user_obj', updated);
        return updated;
    });

    setAllUsers(prev => prev.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u));
};