/**
 * Mock Data Generator for SnapifY Automated Testing Framework
 * Comprehensive test data generation utilities
 */

import { faker } from '@faker-js/faker';
import { UserRole, TierLevel, MediaType } from '../../../types';

/**
 * Generate mock user data
 * @param {Object} overrides - Property overrides
 * @returns {Object} Mock user object
 */
export function generateMockUser(overrides = {}) {
    const defaultUser = {
        id: faker.string.uuid(),
        name: faker.person.fullName(),
        email: faker.internet.email(),
        role: UserRole.USER,
        tier: TierLevel.FREE,
        storageUsedMb: faker.number.int({ min: 0, max: 100 }),
        storageLimitMb: faker.number.int({ min: 100, max: 1000 }),
        joinedDate: faker.date.past().toISOString(),
        profilePicture: faker.image.avatar(),
        lastLogin: faker.date.recent().toISOString(),
        preferences: {
            language: 'en',
            theme: 'light',
            notifications: true
        }
    };

    return { ...defaultUser, ...overrides };
}

/**
 * Generate mock admin user
 * @param {Object} overrides - Property overrides
 * @returns {Object} Mock admin user object
 */
export function generateMockAdminUser(overrides = {}) {
    return generateMockUser({
        role: UserRole.ADMIN,
        tier: TierLevel.STUDIO,
        storageLimitMb: -1, // Unlimited
        ...overrides
    });
}

/**
 * Generate mock event data
 * @param {Object} overrides - Property overrides
 * @returns {Object} Mock event object
 */
export function generateMockEvent(overrides = {}) {
    const defaultEvent = {
        id: faker.string.uuid(),
        title: faker.lorem.words(3),
        description: faker.lorem.sentences(2),
        date: faker.date.future().toISOString(),
        hostId: faker.string.uuid(),
        code: faker.string.alphanumeric(6).toUpperCase(),
        expiresAt: faker.date.future({ years: 1 }).toISOString(),
        createdAt: faker.date.past().toISOString(),
        updatedAt: faker.date.recent().toISOString(),
        isPublic: faker.datatype.boolean(),
        requiresApproval: faker.datatype.boolean(),
        maxGuests: faker.number.int({ min: 10, max: 500 }),
        location: {
            name: faker.location.streetAddress(),
            coordinates: {
                lat: parseFloat(faker.location.latitude()),
                lng: parseFloat(faker.location.longitude())
            }
        },
        settings: {
            allowDownloads: true,
            allowSharing: true,
            allowComments: true,
            allowLikes: true,
            watermarkEnabled: false
        },
        media: [],
        guestbook: []
    };

    return { ...defaultEvent, ...overrides };
}

/**
 * Generate mock media item
 * @param {Object} overrides - Property overrides
 * @returns {Object} Mock media object
 */
export function generateMockMediaItem(overrides = {}) {
    const mediaTypes = [MediaType.IMAGE, MediaType.VIDEO];
    const type = faker.helpers.arrayElement(mediaTypes);

    const defaultMedia = {
        id: faker.string.uuid(),
        eventId: faker.string.uuid(),
        url: type === MediaType.IMAGE
            ? faker.image.url()
            : faker.internet.url(),
        previewUrl: type === MediaType.IMAGE
            ? faker.image.url()
            : faker.internet.url(),
        type: type,
        caption: faker.lorem.sentence(),
        uploaderName: faker.person.fullName(),
        uploaderId: faker.string.uuid(),
        likes: faker.number.int({ min: 0, max: 100 }),
        comments: Array.from({ length: faker.number.int({ min: 0, max: 5 }) }, () => ({
            id: faker.string.uuid(),
            userId: faker.string.uuid(),
            userName: faker.person.fullName(),
            text: faker.lorem.sentence(),
            timestamp: faker.date.recent().toISOString()
        })),
        privacy: faker.helpers.arrayElement(['public', 'private', 'event-only']),
        isProcessing: faker.datatype.boolean(),
        uploadedAt: faker.date.recent().toISOString(),
        metadata: {
            width: type === MediaType.IMAGE ? faker.number.int({ min: 800, max: 4000 }) : 1920,
            height: type === MediaType.IMAGE ? faker.number.int({ min: 600, max: 3000 }) : 1080,
            size: faker.number.int({ min: 100, max: 5000 }) + 'KB',
            format: type === MediaType.IMAGE ? 'jpeg' : 'mp4',
            duration: type === MediaType.VIDEO ? faker.number.int({ min: 5, max: 300 }) : undefined
        },
        aiAnalysis: {
            objects: faker.lorem.words(3).split(' '),
            faces: faker.number.int({ min: 0, max: 10 }),
            labels: faker.lorem.words(5).split(' '),
            safeSearch: {
                adult: faker.number.float({ min: 0, max: 1, precision: 0.01 }),
                violence: faker.number.float({ min: 0, max: 1, precision: 0.01 }),
                racy: faker.number.float({ min: 0, max: 1, precision: 0.01 })
            }
        }
    };

    return { ...defaultMedia, ...overrides };
}

/**
 * Generate mock guestbook entry
 * @param {Object} overrides - Property overrides
 * @returns {Object} Mock guestbook entry
 */
export function generateMockGuestbookEntry(overrides = {}) {
    const defaultEntry = {
        id: faker.string.uuid(),
        eventId: faker.string.uuid(),
        userId: faker.string.uuid(),
        userName: faker.person.fullName(),
        message: faker.lorem.sentences(2),
        timestamp: faker.date.recent().toISOString(),
        likes: faker.number.int({ min: 0, max: 20 }),
        replies: Array.from({ length: faker.number.int({ min: 0, max: 3 }) }, () => ({
            id: faker.string.uuid(),
            userId: faker.string.uuid(),
            userName: faker.person.fullName(),
            message: faker.lorem.sentence(),
            timestamp: faker.date.recent().toISOString()
        }))
    };

    return { ...defaultEntry, ...overrides };
}

/**
 * Generate mock notification
 * @param {Object} overrides - Property overrides
 * @returns {Object} Mock notification
 */
export function generateMockNotification(overrides = {}) {
    const types = ['like', 'comment', 'mention', 'event_invite', 'system'];

    const defaultNotification = {
        id: faker.string.uuid(),
        userId: faker.string.uuid(),
        type: faker.helpers.arrayElement(types),
        title: faker.lorem.words(3),
        message: faker.lorem.sentence(),
        isRead: faker.datatype.boolean(),
        createdAt: faker.date.recent().toISOString(),
        metadata: {
            eventId: faker.string.uuid(),
            mediaId: faker.string.uuid(),
            senderId: faker.string.uuid(),
            senderName: faker.person.fullName()
        }
    };

    return { ...defaultNotification, ...overrides };
}

/**
 * Generate mock API response
 * @param {Object} data - Response data
 * @param {Object} overrides - Property overrides
 * @returns {Object} Mock API response
 */
export function generateMockApiResponse(data, overrides = {}) {
    const defaultResponse = {
        success: true,
        status: 'success',
        data: data,
        timestamp: new Date().toISOString(),
        metadata: {
            version: '1.0.0',
            requestId: faker.string.uuid()
        }
    };

    return { ...defaultResponse, ...overrides };
}

/**
 * Generate mock error response
 * @param {Object} overrides - Property overrides
 * @returns {Object} Mock error response
 */
export function generateMockErrorResponse(overrides = {}) {
    const errorTypes = ['validation_error', 'authentication_error', 'not_found', 'server_error', 'rate_limit'];

    const defaultError = {
        success: false,
        status: 'error',
        error: {
            type: faker.helpers.arrayElement(errorTypes),
            code: faker.string.alphanumeric(6).toUpperCase(),
            message: faker.lorem.sentence(),
            details: faker.lorem.paragraph()
        },
        timestamp: new Date().toISOString(),
        metadata: {
            version: '1.0.0',
            requestId: faker.string.uuid()
        }
    };

    return { ...defaultError, ...overrides };
}

/**
 * Generate mock performance metrics
 * @param {Object} overrides - Property overrides
 * @returns {Object} Mock performance metrics
 */
export function generateMockPerformanceMetrics(overrides = {}) {
    const defaultMetrics = {
        frontendMetrics: {
            fcp: faker.number.int({ min: 50, max: 500 }),
            lcp: faker.number.int({ min: 100, max: 1000 }),
            cls: faker.number.float({ min: 0, max: 0.5, precision: 0.01 }),
            ttfb: faker.number.int({ min: 20, max: 200 }),
            fps: faker.number.int({ min: 30, max: 120 }),
            memoryUsage: faker.number.int({ min: 10, max: 100 }),
            networkLatency: faker.number.int({ min: 10, max: 200 }),
            resourceLoadTime: faker.number.int({ min: 50, max: 500 })
        },
        backendMetrics: {
            apiResponseTime: faker.number.int({ min: 50, max: 500 }),
            databaseQueryTime: faker.number.int({ min: 10, max: 100 }),
            serviceProcessingTime: faker.number.int({ min: 20, max: 200 }),
            errorRate: faker.number.float({ min: 0, max: 5, precision: 0.1 }),
            requestThroughput: faker.number.int({ min: 10, max: 100 })
        },
        infrastructureMetrics: {
            cpuUsage: faker.number.float({ min: 10, max: 90, precision: 0.1 }),
            memoryUsage: faker.number.float({ min: 20, max: 80, precision: 0.1 }),
            diskUsage: faker.number.float({ min: 10, max: 80, precision: 0.1 }),
            networkBandwidth: faker.number.int({ min: 5, max: 50 }),
            storageCapacity: faker.number.int({ min: 50, max: 200 })
        },
        userExperienceMetrics: {
            pageLoadTime: faker.number.int({ min: 500, max: 3000 }),
            interactionResponseTime: faker.number.int({ min: 20, max: 200 }),
            sessionSuccessRate: faker.number.float({ min: 80, max: 100, precision: 0.1 }),
            devicePerformanceScore: faker.number.int({ min: 50, max: 100 }),
            userSatisfactionScore: faker.number.int({ min: 60, max: 100 })
        },
        serviceHealthMetrics: {
            serviceAvailability: faker.number.float({ min: 95, max: 100, precision: 0.1 }),
            dependencyHealth: faker.number.float({ min: 80, max: 100, precision: 0.1 }),
            circuitBreakerStatus: faker.helpers.arrayElement(['closed', 'open', 'half-open']),
            degradationLevel: faker.helpers.arrayElement(['normal', 'warning', 'critical'])
        },
        timestamp: new Date().toISOString()
    };

    return { ...defaultMetrics, ...overrides };
}

/**
 * Generate mock file for upload testing
 * @param {number} size - File size in bytes
 * @param {string} type - File type
 * @returns {File} Mock file object
 */
export function generateMockFile(size = 1024 * 1024, type = 'image/jpeg') {
    const fileContent = new ArrayBuffer(size);
    const fileName = type.startsWith('image/')
        ? faker.system.fileName('jpg')
        : faker.system.fileName('mp4');

    return new File([fileContent], fileName, { type });
}

/**
 * Generate mock form data
 * @param {Object} data - Form data
 * @returns {FormData} Mock form data
 */
export function generateMockFormData(data = {}) {
    const formData = new FormData();

    Object.entries(data).forEach(([key, value]) => {
        if (value instanceof File) {
            formData.append(key, value);
        } else if (typeof value === 'object') {
            formData.append(key, JSON.stringify(value));
        } else {
            formData.append(key, value);
        }
    });

    return formData;
}

/**
 * Generate comprehensive test dataset
 * @param {number} users - Number of users
 * @param {number} events - Number of events
 * @param {number} mediaPerEvent - Media items per event
 * @returns {Object} Complete test dataset
 */
export function generateComprehensiveTestDataset(users = 5, events = 3, mediaPerEvent = 10) {
    const dataset = {
        users: [],
        events: [],
        media: [],
        guestbookEntries: []
    };

    // Generate users
    for (let i = 0; i < users; i++) {
        const user = generateMockUser();
        dataset.users.push(user);

        // First user is admin
        if (i === 0) {
            Object.assign(user, generateMockAdminUser());
        }
    }

    // Generate events
    for (let i = 0; i < events; i++) {
        const event = generateMockEvent({
            hostId: dataset.users[i % users].id
        });
        dataset.events.push(event);

        // Generate media for each event
        for (let j = 0; j < mediaPerEvent; j++) {
            const media = generateMockMediaItem({
                eventId: event.id,
                uploaderId: dataset.users[j % users].id,
                uploaderName: dataset.users[j % users].name
            });
            dataset.media.push(media);
        }

        // Generate guestbook entries
        for (let k = 0; k < faker.number.int({ min: 2, max: 5 }); k++) {
            const entry = generateMockGuestbookEntry({
                eventId: event.id,
                userId: dataset.users[k % users].id,
                userName: dataset.users[k % users].name
            });
            dataset.guestbookEntries.push(entry);
        }
    }

    return dataset;
}

// Export all mock generation functions
export const mockData = {
    generateMockUser,
    generateMockAdminUser,
    generateMockEvent,
    generateMockMediaItem,
    generateMockGuestbookEntry,
    generateMockNotification,
    generateMockApiResponse,
    generateMockErrorResponse,
    generateMockPerformanceMetrics,
    generateMockFile,
    generateMockFormData,
    generateComprehensiveTestDataset
};

export default mockData;