/**
 * Test Helper Functions for SnapifY Automated Testing Framework
 * Comprehensive testing utilities and assertions
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockData } from '../mocks/mockData';
import { act } from 'react-dom/test-utils';

/**
 * Enhanced render function with additional utilities
 * @param {React.ReactElement} ui - React component to render
 * @param {Object} options - Render options
 * @returns {Object} Enhanced render result
 */
export function renderWithProviders(ui, options = {}) {
    const {
        route = '/',
        path = '/',
        history = createMemoryHistory({ initialEntries: [route] }),
        ...renderOptions
    } = options;

    // Wrap component with providers
    const Wrapper = ({ children }) => (
        <Router history={history}>
            <TestProviders>
                {children}
            </TestProviders>
        </Router>
    );

    return {
        ...render(ui, { wrapper: Wrapper, ...renderOptions }),
        history,
        route,
        path
    };
}

/**
 * Create test user with enhanced capabilities
 * @param {Object} overrides - User property overrides
 * @returns {Object} Test user with utilities
 */
export function createTestUser(overrides = {}) {
    const user = mockData.generateMockUser(overrides);

    return {
        ...user,
        // Enhanced user utilities
        login: async (page) => {
            if (page.fill) {
                await page.fill('#email', user.email);
                await page.fill('#password', 'password123');
                await page.click('#login-button');
            }
        },
        logout: async (page) => {
            if (page.click) {
                await page.click('#logout-button');
            }
        },
        uploadMedia: async (eventId, file) => {
            // Mock media upload
            return mockData.generateMockMediaItem({
                eventId,
                uploaderId: user.id,
                uploaderName: user.name
            });
        }
    };
}

/**
 * Create test event with enhanced capabilities
 * @param {Object} overrides - Event property overrides
 * @returns {Object} Test event with utilities
 */
export function createTestEvent(overrides = {}) {
    const event = mockData.generateMockEvent(overrides);

    return {
        ...event,
        // Enhanced event utilities
        addMedia: (mediaData) => {
            const media = mockData.generateMockMediaItem({
                eventId: event.id,
                ...mediaData
            });
            event.media.push(media);
            return media;
        },
        addGuestbookEntry: (entryData) => {
            const entry = mockData.generateMockGuestbookEntry({
                eventId: event.id,
                ...entryData
            });
            event.guestbook.push(entry);
            return entry;
        },
        getMediaCount: () => event.media.length,
        getGuestbookCount: () => event.guestbook.length
    };
}

/**
 * Enhanced user interaction simulation
 * @param {HTMLElement} element - Element to interact with
 * @param {string} interaction - Type of interaction
 * @param {Object} options - Interaction options
 */
export async function simulateUserInteraction(element, interaction, options = {}) {
    const user = userEvent.setup();

    switch (interaction) {
        case 'click':
            await user.click(element);
            break;
        case 'doubleClick':
            await user.dblClick(element);
            break;
        case 'hover':
            await user.hover(element);
            break;
        case 'type':
            await user.type(element, options.text || '');
            break;
        case 'clear':
            await user.clear(element);
            break;
        case 'select':
            await user.selectOptions(element, options.value || '');
            break;
        case 'upload':
            const file = options.file || mockData.generateMockFile();
            await user.upload(element, file);
            break;
        case 'dragAndDrop':
            const { source, target } = options;
            if (source && target) {
                await user.pointer([
                    '[MouseLeft>]',
                    '[MouseLeft]',
                    'pointermove',
                    'pointerup'
                ]);
            }
            break;
        default:
            console.warn(`Unknown interaction type: ${interaction}`);
    }
}

/**
 * Enhanced assertion utilities
 */
export const assertions = {
    /**
     * Assert element is visible with enhanced checks
     * @param {string|HTMLElement} element - Element to check
     * @param {Object} options - Assertion options
     */
    toBeVisible: async (element, options = {}) => {
        const { timeout = 1000, checkContent = false } = options;

        const targetElement = typeof element === 'string'
            ? screen.getByTestId(element)
            : element;

        await waitFor(() => {
            expect(targetElement).toBeInTheDocument();
            expect(targetElement).not.toHaveClass('hidden');
            expect(targetElement).not.toHaveAttribute('aria-hidden', 'true');

            if (checkContent && targetElement.textContent) {
                expect(targetElement.textContent.trim()).not.toBe('');
            }
        }, { timeout });
    },

    /**
     * Assert element contains specific text
     * @param {string|HTMLElement} element - Element to check
     * @param {string} text - Expected text
     * @param {Object} options - Assertion options
     */
    toContainText: async (element, text, options = {}) => {
        const { exact = false, timeout = 1000 } = options;

        const targetElement = typeof element === 'string'
            ? screen.getByTestId(element)
            : element;

        await waitFor(() => {
            const elementText = targetElement.textContent || '';
            if (exact) {
                expect(elementText.trim()).toBe(text);
            } else {
                expect(elementText).toContain(text);
            }
        }, { timeout });
    },

    /**
     * Assert performance metrics meet thresholds
     * @param {Object} metrics - Performance metrics
     * @param {Object} thresholds - Performance thresholds
     */
    toMeetPerformanceThresholds: (metrics, thresholds) => {
        Object.entries(thresholds).forEach(([metric, threshold]) => {
            if (typeof threshold === 'object') {
                // Nested metrics
                Object.entries(threshold).forEach(([subMetric, subThreshold]) => {
                    const metricPath = `${metric}.${subMetric}`;
                    const actualValue = metrics[metric]?.[subMetric];

                    if (typeof subThreshold === 'object') {
                        // Range threshold
                        if (subThreshold.min !== undefined) {
                            expect(actualValue).toBeGreaterThanOrEqual(subThreshold.min);
                        }
                        if (subThreshold.max !== undefined) {
                            expect(actualValue).toBeLessThanOrEqual(subThreshold.max);
                        }
                    } else {
                        // Direct comparison
                        expect(actualValue).toBeLessThanOrEqual(subThreshold);
                    }
                });
            } else {
                // Direct metric comparison
                expect(metrics[metric]).toBeLessThanOrEqual(threshold);
            }
        });
    }
};

/**
 * Performance measurement utilities
 */
export const performance = {
    /**
     * Measure function execution time
     * @param {Function} fn - Function to measure
     * @param {Object} options - Measurement options
     * @returns {Object} Execution metrics
     */
    measureExecutionTime: async (fn, options = {}) => {
        const { iterations = 1, warmup = false } = options;

        if (warmup) {
            await fn(); // Warmup run
        }

        const startTime = performance.now();
        const startMemory = getMemoryUsage();

        for (let i = 0; i < iterations; i++) {
            await fn();
        }

        const endTime = performance.now();
        const endMemory = getMemoryUsage();

        return {
            duration: endTime - startTime,
            durationPerIteration: (endTime - startTime) / iterations,
            memoryUsage: endMemory - startMemory,
            memoryUsagePerIteration: (endMemory - startMemory) / iterations,
            iterations,
            timestamp: new Date().toISOString()
        };
    },

    /**
     * Measure component rendering performance
     * @param {React.ReactElement} component - Component to measure
     * @param {Object} options - Measurement options
     * @returns {Object} Rendering metrics
     */
    measureComponentPerformance: async (component, options = {}) => {
        const { iterations = 1, warmup = false } = options;

        if (warmup) {
            render(component);
        }

        const metrics = {
            renderTimes: [],
            memoryUsages: [],
            startTime: performance.now()
        };

        for (let i = 0; i < iterations; i++) {
            const startRender = performance.now();
            const startMemory = getMemoryUsage();

            const { unmount } = render(component);

            const endRender = performance.now();
            const endMemory = getMemoryUsage();

            metrics.renderTimes.push(endRender - startRender);
            metrics.memoryUsages.push(endMemory - startMemory);

            unmount();
        }

        metrics.endTime = performance.now();
        metrics.totalDuration = metrics.endTime - metrics.startTime;
        metrics.averageRenderTime = metrics.renderTimes.reduce((a, b) => a + b, 0) / metrics.renderTimes.length;
        metrics.averageMemoryUsage = metrics.memoryUsages.reduce((a, b) => a + b, 0) / metrics.memoryUsages.length;

        return metrics;
    }
};

/**
 * Test data validation utilities
 */
export const validators = {
    /**
     * Validate mock data structure
     * @param {Object} data - Data to validate
     * @param {string} type - Data type
     */
    validateMockData: (data, type) => {
        const schemas = {
            user: ['id', 'name', 'email', 'role', 'tier'],
            event: ['id', 'title', 'date', 'hostId', 'code'],
            media: ['id', 'eventId', 'url', 'type', 'uploaderId'],
            guestbook: ['id', 'eventId', 'userId', 'message']
        };

        const requiredFields = schemas[type];
        if (!requiredFields) {
            throw new Error(`Unknown data type: ${type}`);
        }

        requiredFields.forEach(field => {
            if (!(field in data)) {
                throw new Error(`Missing required field: ${field} in ${type}`);
            }
        });
    },

    /**
     * Validate API response structure
     * @param {Object} response - API response to validate
     */
    validateApiResponse: (response) => {
        if (!response) {
            throw new Error('Response is null or undefined');
        }

        if (response.success !== undefined && typeof response.success !== 'boolean') {
            throw new Error('Response success field must be boolean');
        }

        if (response.status && typeof response.status !== 'string') {
            throw new Error('Response status field must be string');
        }

        if (response.timestamp && isNaN(new Date(response.timestamp))) {
            throw new Error('Response timestamp must be valid ISO date string');
        }
    }
};

/**
 * Test environment utilities
 */
export const environment = {
    /**
     * Setup test environment with specific conditions
     * @param {Object} conditions - Environment conditions
     */
    setupEnvironment: (conditions = {}) => {
        const {
            network = 'normal',
            device = 'desktop',
            browser = 'chrome',
            screenSize = 'large'
        } = conditions;

        // Mock navigator based on conditions
        Object.defineProperty(global.navigator, 'userAgent', {
            value: getUserAgentString(device, browser),
            configurable: true
        });

        // Mock screen size
        global.innerWidth = getScreenWidth(screenSize);
        global.innerHeight = getScreenHeight(screenSize);

        // Mock network conditions
        mockNetworkConditions(network);
    },

    /**
     * Clean up test environment
     */
    cleanupEnvironment: () => {
        // Reset navigator
        Object.defineProperty(global.navigator, 'userAgent', {
            value: 'Mozilla/5.0 (Test Environment)',
            configurable: true
        });

        // Reset screen size
        global.innerWidth = 1024;
        global.innerHeight = 768;

        // Reset network conditions
        resetNetworkConditions();
    }
};

// Helper functions
function getUserAgentString(device, browser) {
    const deviceStrings = {
        desktop: 'Windows NT 10.0; Win64; x64',
        mobile: 'iPhone; CPU iPhone OS 15_0 like Mac OS X',
        tablet: 'iPad; CPU OS 15_0 like Mac OS X'
    };

    const browserStrings = {
        chrome: 'Chrome/91.0.4472.124 Safari/537.36',
        firefox: 'Firefox/89.0',
        safari: 'Version/14.1 Safari/605.1.15',
        edge: 'Edg/91.0.864.59'
    };

    return `Mozilla/5.0 (${deviceStrings[device] || deviceStrings.desktop}) AppleWebKit/537.36 ${browserStrings[browser] || browserStrings.chrome}`;
}

function getScreenWidth(size) {
    const sizes = {
        small: 375,
        medium: 768,
        large: 1024,
        xlarge: 1440
    };
    return sizes[size] || 1024;
}

function getScreenHeight(size) {
    const sizes = {
        small: 667,
        medium: 1024,
        large: 768,
        xlarge: 900
    };
    return sizes[size] || 768;
}

function getMemoryUsage() {
    if (typeof performance !== 'undefined' && performance.memory) {
        return performance.memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return 0;
}

function mockNetworkConditions(network) {
    const conditions = {
        normal: { latency: 0, throughput: Infinity },
        slow: { latency: 150, throughput: 1.5 * 1024 * 1024 }, // 1.5 Mbps
        fast: { latency: 0, throughput: Infinity },
        offline: { latency: Infinity, throughput: 0 }
    };

    const condition = conditions[network] || conditions.normal;

    // Mock fetch to simulate network conditions
    const originalFetch = global.fetch;
    global.fetch = async (url, options) => {
        // Simulate latency
        if (condition.latency > 0) {
            await new Promise(resolve => setTimeout(resolve, condition.latency));
        }

        // Simulate throughput limitation for large responses
        const response = await originalFetch(url, options);
        const responseSize = response.headers.get('content-length') || 1024;

        if (condition.throughput < Infinity && responseSize > condition.throughput) {
            await new Promise(resolve => setTimeout(resolve, responseSize / condition.throughput));
        }

        return response;
    };
}

function resetNetworkConditions() {
    // Restore original fetch
    const originalFetch = global.fetch;
    if (originalFetch.mock) {
        global.fetch = originalFetch.mock;
    }
}

// Export all test helpers
export const testHelpers = {
    renderWithProviders,
    createTestUser,
    createTestEvent,
    simulateUserInteraction,
    assertions,
    performance,
    validators,
    environment,
    ...mockData
};

export default testHelpers;