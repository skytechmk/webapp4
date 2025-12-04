/**
 * Storage Utilities Module
 * Focused utility functions for safe storage operations
 */

// Safe localStorage operations
export const safeSetItem = (key: string, value: string): boolean => {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (error) {
        console.warn('Failed to save to localStorage:', error);
        return false;
    }
};

export const safeGetItem = (key: string): string | null => {
    try {
        return localStorage.getItem(key);
    } catch (error) {
        console.warn('Failed to read from localStorage:', error);
        return null;
    }
};

export const safeRemoveItem = (key: string): boolean => {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.warn('Failed to remove from localStorage:', error);
        return false;
    }
};

export const safeSetObject = <T>(key: string, value: T): boolean => {
    try {
        const jsonValue = JSON.stringify(value);
        localStorage.setItem(key, jsonValue);
        return true;
    } catch (error) {
        console.warn('Failed to save object to localStorage:', error);
        return false;
    }
};

export const safeGetObject = <T>(key: string): T | null => {
    try {
        const jsonValue = localStorage.getItem(key);
        return jsonValue ? JSON.parse(jsonValue) : null;
    } catch (error) {
        console.warn('Failed to read object from localStorage:', error);
        return null;
    }
};