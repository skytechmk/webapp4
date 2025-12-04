/**
 * Utility Consolidation Tests
 * Comprehensive tests for the consolidated utility functions
 */

import { UserRole, TierLevel, User, Event, MediaItem } from '../../types';

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

import { handleUserUpdate } from '../userManagementUtils';
import { incrementEventViews, handleLikeMedia, handleSetCoverImage } from '../eventManagementUtils';
import { handleError } from '../errorHandlingUtils';
import { createEvent, setupSocketHandlers } from '../centralizedUtils';

describe('Utility Consolidation Tests', () => {
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

    describe('Validation Utilities', () => {
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

    describe('Storage Utilities', () => {
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

    describe('User Management Utilities', () => {
        test('handleUserUpdate should update user state correctly', () => {
            const mockSetCurrentUser = jest.fn((fn) => fn({ id: 'user1', name: 'Old Name' }));
            const mockSetAllUsers = jest.fn();

            const updatedUser = {
                id: 'user1',
                name: 'New Name',
                email: 'user@example.com',
                role: UserRole.USER,
                tier: TierLevel.FREE,
                storageUsedMb: 0,
                storageLimitMb: 100,
                joinedDate: '2023-01-01'
            };
            handleUserUpdate(updatedUser, mockSetCurrentUser, mockSetAllUsers);

            // Check that setCurrentUser was called
            expect(mockSetCurrentUser).toHaveBeenCalled();

            // Check that setAllUsers was called
            expect(mockSetAllUsers).toHaveBeenCalled();
        });
    });

    describe('Event Management Utilities', () => {
        test('incrementEventViews should increment views correctly', async () => {
            const mockEvents: Event[] = [
                {
                    id: 'event1',
                    title: 'Test Event 1',
                    description: 'Test description',
                    date: '2023-01-01',
                    hostId: 'user1',
                    code: 'ABC123',
                    media: [],
                    expiresAt: null,
                    views: 5
                },
                {
                    id: 'event2',
                    title: 'Test Event 2',
                    description: 'Test description',
                    date: '2023-01-01',
                    hostId: 'user1',
                    code: 'DEF456',
                    media: [],
                    expiresAt: null,
                    views: 3
                }
            ];
            const mockSetEvents = jest.fn();

            await incrementEventViews('event1', mockEvents, mockSetEvents);

            expect(mockSetEvents).toHaveBeenCalledWith([
                { id: 'event1', views: 6 },
                { id: 'event2', views: 3 }
            ]);
        });

        test('handleLikeMedia should increment likes correctly', async () => {
            const mockItem: MediaItem = {
                id: 'media1',
                eventId: 'event1',
                type: 'image',
                url: 'https://example.com/image.jpg',
                uploadedAt: '2023-01-01T00:00:00Z',
                uploaderName: 'Test User',
                privacy: 'public',
                likes: 2
            };

            const mockEvent: Event = {
                id: 'event1',
                title: 'Test Event',
                description: 'Test description',
                date: '2023-01-01',
                hostId: 'user1',
                code: 'ABC123',
                media: [
                    {
                        id: 'media1',
                        eventId: 'event1',
                        type: 'image',
                        url: 'https://example.com/image.jpg',
                        uploadedAt: '2023-01-01T00:00:00Z',
                        uploaderName: 'Test User',
                        privacy: 'public',
                        likes: 2
                    },
                    {
                        id: 'media2',
                        eventId: 'event1',
                        type: 'image',
                        url: 'https://example.com/image2.jpg',
                        uploadedAt: '2023-01-01T00:00:00Z',
                        uploaderName: 'Test User',
                        privacy: 'public',
                        likes: 5
                    }
                ],
                expiresAt: null
            };
            const mockSetEvents = jest.fn();

            await handleLikeMedia(mockItem, mockEvent, mockSetEvents);

            expect(mockSetEvents).toHaveBeenCalled();
            const calledWith = mockSetEvents.mock.calls[0][0](mockEvent);
            expect(calledWith.media[0].likes).toBe(3);
        });
    });

    describe('Error Handling Utilities', () => {
        test('handleError should return appropriate error messages', () => {
            const mockTranslate = (key: string) => key === 'storageLimit' ? 'Storage limit exceeded' : '';

            // Test storage limit error
            const storageError = { message: 'Storage limit exceeded' };
            expect(handleError(storageError, 'Default message', mockTranslate))
                .toBe('Storage limit exceeded');

            // Test network error
            const networkError = { message: 'NetworkError: Failed to fetch' };
            expect(handleError(networkError, 'Default message', mockTranslate))
                .toBe('Network connection issue. Please check your internet connection and try again.');

            // Test timeout error
            const timeoutError = { code: 'ECONNABORTED' };
            expect(handleError(timeoutError, 'Default message', mockTranslate))
                .toBe('Upload timed out. Please try again with a smaller file.');

            // Test default error
            const defaultError = { message: 'Unknown error' };
            expect(handleError(defaultError, 'Default message', mockTranslate))
                .toBe('Default message');
        });
    });

    describe('Centralized Utilities', () => {
        test('createEvent should create valid event object', async () => {
            const mockCurrentUser = { id: 'user1', role: 'PHOTOGRAPHER', tier: 'PRO' };
            const mockData = {
                title: 'Test Event',
                date: '2023-01-01',
                description: 'Test description',
                pin: '1234'
            };
            const mockSetEvents = jest.fn();
            const mockSetShowCreateModal = jest.fn();
            const mockSetCurrentEventId = jest.fn();
            const mockSetView = jest.fn();
            const mockTranslate = jest.fn((key) => key);

            // Mock the API
            const mockApi = {
                createEvent: jest.fn().mockResolvedValue({
                    ...mockData,
                    id: 'event1',
                    hostId: 'user1'
                })
            };

            // Replace the actual API with our mock
            jest.mock('../services/api', () => ({
                api: mockApi
            }));

            await createEvent(
                mockCurrentUser as any,
                mockData,
                mockSetEvents,
                mockSetShowCreateModal,
                mockSetCurrentEventId,
                mockSetView,
                mockTranslate
            );

            expect(mockSetEvents).toHaveBeenCalled();
            expect(mockSetShowCreateModal).toHaveBeenCalledWith(false);
            expect(mockSetView).toHaveBeenCalledWith('event');
        });
    });
});