/**
 * Jest Setup File
 * Global test setup and configuration
 */

import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Set up global mocks and utilities
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock browser APIs
global.URL.createObjectURL = jest.fn();
global.URL.revokeObjectURL = jest.fn();

// Mock localStorage
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
        length: 0,
        get length() {
            return Object.keys(store).length;
        }
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true
});

// Mock sessionStorage
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
        length: 0,
        get length() {
            return Object.keys(store).length;
        }
    };
})();

Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock,
    writable: true
});

// Mock matchMedia for responsive tests
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
});

// Mock ResizeObserver
class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
}

window.ResizeObserver = ResizeObserver;

// Mock IntersectionObserver
class IntersectionObserver {
    constructor(callback, options) {
        this.callback = callback;
        this.options = options;
    }

    observe() {
        // Simulate intersection
        setTimeout(() => {
            this.callback([{ isIntersecting: true, target: {} }], this);
        }, 100);
    }

    unobserve() { }
    disconnect() { }
}

window.IntersectionObserver = IntersectionObserver;

// Global test utilities
global.setupTestEnvironment = () => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Set up default test environment
    process.env.NODE_ENV = 'test';
    process.env.API_BASE_URL = 'http://localhost:3000/api';
};

// Set up test environment
setupTestEnvironment();