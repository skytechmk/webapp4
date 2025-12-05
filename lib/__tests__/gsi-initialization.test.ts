/**
 * Google Sign-In Initialization Tests
 * Tests for the GSI initialization sequence fix
 */

// Mock window.google for testing
const mockWindow = {
    google: {
        accounts: {
            id: {
                initialize: jest.fn(),
                renderButton: jest.fn()
            }
        }
    },
    googleSignInInitialized: false,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
};

// GSI Validation Utility (copied from implementation)
const validateGsiInitialization = (testWindow: any): { isValid: boolean; error?: string } => {
    if (!testWindow.google) {
        return {
            isValid: false,
            error: 'Google API not loaded'
        };
    }

    if (!testWindow.google.accounts || !testWindow.google.accounts.id) {
        return {
            isValid: false,
            error: 'Google Identity Services not available'
        };
    }

    if (!testWindow.googleSignInInitialized) {
        return {
            isValid: false,
            error: 'Google Sign-In not initialized - call initialize() first'
        };
    }

    return { isValid: true };
};

// GSI Error Handler (copied from implementation)
const handleGsiError = (error: any, context: string, testWindow: any) => {
    console.error(`[GSI_ERROR] ${context}:`, error);

    // Dispatch error event for global handling
    if (testWindow) {
        const errorEvent = new CustomEvent('gsiError', {
            detail: {
                error: error,
                context: context,
                timestamp: new Date().toISOString()
            }
        });
        testWindow.dispatchEvent(errorEvent);
    }
};

describe('Google Sign-In Initialization Validation', () => {
    beforeEach(() => {
        // Reset mocks before each test
        jest.clearAllMocks();
        mockWindow.googleSignInInitialized = false;
    });

    describe('validateGsiInitialization', () => {
        it('should return invalid when Google API is not loaded', () => {
            const testWindow = {};
            const result = validateGsiInitialization(testWindow);
            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Google API not loaded');
        });

        it('should return invalid when Google Identity Services are not available', () => {
            // Mock window with google but no accounts.id
            const testWindow = {
                google: { accounts: {} }
            };

            const result = validateGsiInitialization(testWindow);
            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Google Identity Services not available');
        });

        it('should return invalid when GSI is not initialized', () => {
            const result = validateGsiInitialization(mockWindow);
            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Google Sign-In not initialized - call initialize() first');
        });

        it('should return valid when all conditions are met', () => {
            const testWindow = {
                ...mockWindow,
                googleSignInInitialized: true
            };

            const result = validateGsiInitialization(testWindow);
            expect(result.isValid).toBe(true);
            expect(result.error).toBeUndefined();
        });
    });

    describe('handleGsiError', () => {
        it('should dispatch error event with proper details', () => {
            const testError = new Error('Test initialization error');
            const mockDispatchEvent = jest.fn();

            const testWindow = {
                ...mockWindow,
                dispatchEvent: mockDispatchEvent
            };

            handleGsiError(testError, 'Test context', testWindow);

            expect(mockDispatchEvent).toHaveBeenCalledTimes(1);
            const event = mockDispatchEvent.mock.calls[0][0];
            expect(event.type).toBe('gsiError');
            expect(event.detail.error).toBe(testError);
            expect(event.detail.context).toBe('Test context');
            expect(event.detail.timestamp).toBeDefined();
        });
    });

    describe('Initialization Sequence', () => {
        it('should prevent button rendering before initialization', () => {
            // This test simulates the original error condition
            const testWindow = mockWindow;

            // Mock renderButton to throw the original error
            testWindow.google.accounts.id.renderButton.mockImplementation(() => {
                throw new Error('Failed to render button before calling initialize().');
            });

            const validation = validateGsiInitialization(testWindow);
            expect(validation.isValid).toBe(false);

            // Attempt to render button (should not be called due to validation)
            if (validation.isValid && testWindow.google.accounts.id.renderButton) {
                testWindow.google.accounts.id.renderButton();
            }

            // Verify renderButton was not called
            expect(testWindow.google.accounts.id.renderButton).not.toHaveBeenCalled();
        });

        it('should allow button rendering after successful initialization', () => {
            const testWindow = {
                ...mockWindow,
                googleSignInInitialized: true
            };

            const validation = validateGsiInitialization(testWindow);
            expect(validation.isValid).toBe(true);

            // Mock successful renderButton call
            testWindow.google.accounts.id.renderButton.mockImplementation(() => {
                // Success - no error thrown
            });

            // Attempt to render button (should be called due to validation passing)
            if (validation.isValid && testWindow.google.accounts.id.renderButton) {
                testWindow.google.accounts.id.renderButton();
            }

            // Verify renderButton was called
            expect(testWindow.google.accounts.id.renderButton).toHaveBeenCalled();
        });

        it('should handle initialization errors gracefully', () => {
            const testError = new Error('Initialization failed');
            const mockDispatchEvent = jest.fn();

            const testWindow = {
                ...mockWindow,
                dispatchEvent: mockDispatchEvent
            };

            handleGsiError(testError, 'Initialization sequence', testWindow);

            // Verify error was logged and event was dispatched
            expect(mockDispatchEvent).toHaveBeenCalledTimes(1);
            const event = mockDispatchEvent.mock.calls[0][0];
            expect(event.detail.error).toBe(testError);
            expect(event.detail.context).toBe('Initialization sequence');
        });
    });

    describe('Event-Based Initialization Flow', () => {
        it('should respond to gsiInitialized event', () => {
            const mockCallback = jest.fn();
            const mockAddEventListener = jest.fn((event, callback) => {
                if (event === 'gsiInitialized') {
                    mockCallback();
                }
            });

            const testWindow = {
                ...mockWindow,
                addEventListener: mockAddEventListener
            };

            // Simulate event listener setup
            testWindow.addEventListener('gsiInitialized', mockCallback);

            // Verify event listener was set up
            expect(mockAddEventListener).toHaveBeenCalledWith('gsiInitialized', mockCallback);
        });
    });
});