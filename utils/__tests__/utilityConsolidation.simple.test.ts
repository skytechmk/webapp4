/**
 * Simple Utility Consolidation Tests
 * Basic tests to verify utility consolidation without complex dependencies
 */

import {
    validateEmail,
    validatePassword,
    validateEventTitle,
    validateEventDescription,
    validateGuestName,
    sanitizeInput
} from '../validation';

import {
    safeSetItem,
    safeGetItem,
    safeRemoveItem,
    safeSetObject,
    safeGetObject
} from '../storageUtils';

describe('Utility Consolidation - Core Functions', () => {
    // Mock localStorage for testing
    const localStorageMock = (() => {
        let store: Record<string, string> = {};

        return {
            getItem: (key: string) => store[key] || null,
            setItem: (key: string, value: string) => {
                store[key] = value.toString();
            },
            removeItem: (key: string) => {
                delete store[key];
            },
            clear: () => {
                store = {};
            }
        };
    })();

    beforeAll(() => {
        // Mock localStorage
        Object.defineProperty(window, 'localStorage', {
            value: localStorageMock,
            writable: true
        });
    });

    beforeEach(() => {
        localStorageMock.clear();
    });

    describe('Validation Utilities - Core Functions', () => {
        test('validateEmail should work correctly', () => {
            expect(validateEmail('user@example.com')).toBe(true);
            expect(validateEmail('invalid-email')).toBe(false);
            expect(validateEmail('user@.com')).toBe(false);
        });

        test('validatePassword should work correctly', () => {
            expect(validatePassword('password123')).toBe(true);
            expect(validatePassword('short')).toBe(false);
            expect(validatePassword('')).toBe(false);
        });

        test('validateEventTitle should work correctly', () => {
            expect(validateEventTitle('Valid Title')).toBe(true);
            expect(validateEventTitle('')).toBe(false);
            expect(validateEventTitle('A'.repeat(101))).toBe(false);
        });

        test('validateEventDescription should work correctly', () => {
            expect(validateEventDescription('Valid description')).toBe(true);
            expect(validateEventDescription('A'.repeat(501))).toBe(false);
        });

        test('validateGuestName should work correctly', () => {
            expect(validateGuestName('John Doe')).toBe(true);
            expect(validateGuestName('J')).toBe(false);
            expect(validateGuestName('A'.repeat(51))).toBe(false);
        });

        test('sanitizeInput should remove dangerous characters', () => {
            expect(sanitizeInput('<script>alert("xss")</script>')).toBe('alert("xss")');
            expect(sanitizeInput('Normal text')).toBe('Normal text');
        });
    });

    describe('Storage Utilities - Core Functions', () => {
        test('safeSetItem and safeGetItem should work correctly', () => {
            expect(safeSetItem('test_key', 'test_value')).toBe(true);
            expect(safeGetItem('test_key')).toBe('test_value');
            expect(safeGetItem('nonexistent_key')).toBeNull();
        });

        test('safeRemoveItem should work correctly', () => {
            safeSetItem('test_key', 'test_value');
            expect(safeRemoveItem('test_key')).toBe(true);
            expect(safeGetItem('test_key')).toBeNull();
        });

        test('safeSetObject and safeGetObject should work correctly', () => {
            const testObj = { name: 'test', value: 123 };
            expect(safeSetObject('test_obj', testObj)).toBe(true);
            const retrievedObj = safeGetObject('test_obj');
            expect(retrievedObj).toEqual(testObj);
        });
    });
});