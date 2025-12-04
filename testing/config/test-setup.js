/**
 * Enhanced Test Setup for SnapifY Automated Testing Framework
 * Comprehensive test environment configuration
 */

// Import required modules
import React from 'react';
import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { TextEncoder, TextDecoder } from 'util';

// Configure React Testing Library
configure({
    testIdAttribute: 'data-testid',
    asyncUtilTimeout: 5000,
    throwSuggestions: true
});

// Polyfill global objects for testing environment
global.React = React;

// Mock window.matchMedia with enhanced capabilities
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
        matches: query.includes('max-width'),
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
});

// Enhanced IntersectionObserver mock
global.IntersectionObserver = class IntersectionObserver {
    constructor(callback, options) {
        this.callback = callback;
        this.options = options;
        this.observedElements = new Set();
    }

    observe(element) {
        this.observedElements.add(element);
        // Simulate intersection for testing
        setTimeout(() => {
            this.callback([{
                target: element,
                isIntersecting: true,
                intersectionRatio: 1.0,
                boundingClientRect: element.getBoundingClientRect(),
                intersectionRect: element.getBoundingClientRect(),
                rootBounds: null,
                time: Date.now()
            }], this);
        }, 100);
    }

    unobserve(element) {
        this.observedElements.delete(element);
    }

    disconnect() {
        this.observedElements.clear();
    }

    takeRecords() {
        return Array.from(this.observedElements).map(element => ({
            target: element,
            isIntersecting: true,
            intersectionRatio: 1.0
        }));
    }
};

// Enhanced ResizeObserver mock
global.ResizeObserver = class ResizeObserver {
    constructor(callback) {
        this.callback = callback;
        this.observedElements = new Set();
        this.observe = jest.fn((element) => {
            this.observedElements.add(element);
            // Simulate resize events
            setTimeout(() => {
                this.callback([{
                    target: element,
                    contentRect: {
                        width: 100,
                        height: 100,
                        x: 0,
                        y: 0,
                        top: 0,
                        right: 100,
                        bottom: 100,
                        left: 0
                    }
                }], this);
            }, 50);
        });
        this.unobserve = jest.fn((element) => {
            this.observedElements.delete(element);
        });
        this.disconnect = jest.fn(() => {
            this.observedElements.clear();
        });
    }
};

// Mock URL utilities
global.URL.createObjectURL = jest.fn((blob) => {
    if (blob instanceof Blob) {
        return `mock-object-url-${Math.random().toString(36).substring(2, 9)}`;
    }
    return 'mock-object-url';
});

global.URL.revokeObjectURL = jest.fn();

// Enhanced localStorage mock with persistence
const localStorageMock = (() => {
    let store = {};

    return {
        getItem: jest.fn((key) => store[key] || null),
        setItem: jest.fn((key, value) => {
            store[key] = value.toString();
        }),
        removeItem: jest.fn((key) => {
            delete store[key];
        }),
        clear: jest.fn(() => {
            store = {};
        }),
        key: jest.fn((index) => Object.keys(store)[index] || null),
        get length() {
            return Object.keys(store).length;
        }
    };
})();

global.localStorage = localStorageMock;

// Enhanced sessionStorage mock
const sessionStorageMock = (() => {
    let store = {};

    return {
        getItem: jest.fn((key) => store[key] || null),
        setItem: jest.fn((key, value) => {
            store[key] = value.toString();
        }),
        removeItem: jest.fn((key) => {
            delete store[key];
        }),
        clear: jest.fn(() => {
            store = {};
        }),
        key: jest.fn((index) => Object.keys(store)[index] || null),
        get length() {
            return Object.keys(store).length;
        }
    };
})();

global.sessionStorage = sessionStorageMock;

// Mock fetch with enhanced capabilities
global.fetch = jest.fn((url, options) => {
    // Default mock responses
    const mockResponses = {
        '/api/events': { events: [] },
        '/api/media': { media: [] },
        '/api/user': { user: { id: 'test-user', name: 'Test User' } }
    };

    // Find matching mock response
    const mockResponse = mockResponses[url] || { status: 'success' };

    return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
        headers: new Map([['content-type', 'application/json']])
    });
});

// Mock console methods with enhanced error tracking
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

const consoleErrors = [];
const consoleWarnings = [];
const consoleLogs = [];

console.error = jest.fn((...args) => {
    consoleErrors.push(args);
    originalConsoleError(...args);
});

console.warn = jest.fn((...args) => {
    consoleWarnings.push(args);
    originalConsoleWarn(...args);
});

console.log = jest.fn((...args) => {
    consoleLogs.push(args);
    originalConsoleLog(...args);
});

// Enhanced test lifecycle hooks
beforeAll(() => {
    // Set up test environment
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test_jwt_secret';
    process.env.VITE_API_URL = 'http://localhost:3001';

    // Mock performance API
    global.performance = {
        now: () => Date.now(),
        mark: jest.fn(),
        measure: jest.fn(),
        clearMarks: jest.fn(),
        clearMeasures: jest.fn(),
        getEntries: jest.fn(() => []),
        getEntriesByName: jest.fn(() => []),
        getEntriesByType: jest.fn(() => [])
    };

    // Mock navigator with enhanced capabilities
    Object.defineProperty(global, 'navigator', {
        value: {
            userAgent: 'Mozilla/5.0 (Test Environment) AppleWebKit/537.36',
            platform: 'Test',
            language: 'en-US',
            languages: ['en-US', 'en'],
            onLine: true,
            clipboard: {
                writeText: jest.fn(),
                readText: jest.fn()
            },
            geolocation: {
                getCurrentPosition: jest.fn(),
                watchPosition: jest.fn()
            }
        },
        configurable: true
    });
});

// Enhanced cleanup after each test
afterEach(() => {
    jest.clearAllMocks();
    consoleErrors.length = 0;
    consoleWarnings.length = 0;
    consoleLogs.length = 0;

    // Reset localStorage and sessionStorage
    localStorageMock.clear();
    sessionStorageMock.clear();
});

// Enhanced cleanup after all tests
afterAll(() => {
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    console.log = originalConsoleLog;
});

// Export test utilities for use in other test files
export const testUtils = {
    getConsoleErrors: () => [...consoleErrors],
    getConsoleWarnings: () => [...consoleWarnings],
    getConsoleLogs: () => [...consoleLogs],
    clearConsoleLogs: () => {
        consoleErrors.length = 0;
        consoleWarnings.length = 0;
        consoleLogs.length = 0;
    },
    setupTestEnvironment: () => {
        // Additional environment setup if needed
    },
    cleanupTestEnvironment: () => {
        // Additional environment cleanup if needed
    }
};

// Export mock storage for test manipulation
export const mockStorage = {
    localStorage: localStorageMock,
    sessionStorage: sessionStorageMock
};