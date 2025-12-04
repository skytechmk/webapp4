/**
 * Test suite for Optimized Socket Service
 * Tests Phase 2: Core Optimization socket implementation
 */
import { optimizedSocketService } from '../optimizedSocketService';
import { io, Socket } from 'socket.io-client';

// Mock socket.io-client
jest.mock('socket.io-client', () => ({
    io: jest.fn(),
}));

describe('OptimizedSocketService', () => {
    let mockSocket: any;
    let service: typeof optimizedSocketService;

    beforeEach(() => {
        // Reset the singleton instance by accessing private properties
        service = optimizedSocketService;

        // Mock socket
        mockSocket = {
            connected: false,
            id: 'test-socket-id',
            on: jest.fn(),
            off: jest.fn(),
            emit: jest.fn(),
            disconnect: jest.fn(),
            io: {
                engine: {
                    pingInterval: 5000,
                    pingTimeout: 10000
                }
            }
        };

        // Mock io function
        (io as jest.Mock).mockReturnValue(mockSocket);

        // Reset service state by disconnecting
        service.disconnect();
    });

    afterEach(() => {
        jest.clearAllMocks();
        service.disconnect();
    });

    describe('Connection Management', () => {
        it('should connect to socket server with correct options', () => {
            service.connect('test-token');

            expect(io).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
                transports: expect.any(Array),
                timeout: 20000,
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
            }));
        });

        it('should handle mobile device detection and apply mobile settings', () => {
            // Mock mobile user agent
            Object.defineProperty(navigator, 'userAgent', {
                value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
                configurable: true
            });

            service.connect('test-token');

            expect(io).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
                transports: ['polling', 'websocket'],
                reconnectionAttempts: 10,
                reconnectionDelayMax: 10000,
            }));
        });

        it('should not reconnect if already connected', () => {
            mockSocket.connected = true;
            service.connect('test-token');
            service.connect('another-token');

            expect(io).toHaveBeenCalledTimes(1);
        });

        it('should cleanup existing socket before connecting', () => {
            // First connection
            service.connect('test-token');
            expect(mockSocket.on).toHaveBeenCalledTimes(8); // 8 event listeners

            // Second connection attempt
            service.connect('another-token');

            // Should cleanup and reconnect
            expect(mockSocket.disconnect).toHaveBeenCalled();
            expect(mockSocket.off).toHaveBeenCalled();
        });
    });

    describe('Event Handler Management', () => {
        it('should add debounced event handlers', () => {
            const testCallback = jest.fn();
            service.connect('test-token');

            service.on('test_event', testCallback, 100);

            expect(mockSocket.on).toHaveBeenCalledWith('test_event', expect.any(Function));
        });

        it('should add batched event handlers', () => {
            const testCallback = jest.fn();
            service.connect('test-token');

            service.onWithBatching('batch_event', testCallback, 200);

            expect(mockSocket.on).toHaveBeenCalledWith('batch_event', expect.any(Function));
        });

        it('should remove event handlers with off method', () => {
            const testCallback = jest.fn();
            service.connect('test-token');
            service.on('test_event', testCallback);

            service.off('test_event', testCallback);
            expect(mockSocket.off).toHaveBeenCalledWith('test_event', testCallback);
        });
    });

    describe('Connection Lifecycle', () => {
        it('should handle connect event and authenticate', () => {
            service.connect('test-token');

            // Simulate connect event
            const connectCallback = mockSocket.on.mock.calls.find((call: any) => call[0] === 'connect')[1];
            connectCallback();

            expect(mockSocket.emit).toHaveBeenCalledWith('authenticate', 'test-token');
        });

        it('should handle disconnect event', () => {
            service.connect('test-token');

            // Simulate disconnect event
            const disconnectCallback = mockSocket.on.mock.calls.find((call: any) => call[0] === 'disconnect')[1];
            disconnectCallback('server shutdown');

            expect(service.getConnectionStats().disconnectionCount).toBe(1);
        });

        it('should implement exponential backoff on connection errors', () => {
            jest.useFakeTimers();
            service.connect('test-token');

            // Simulate connection error
            const errorCallback = mockSocket.on.mock.calls.find((call: any) => call[0] === 'connect_error')[1];
            errorCallback(new Error('connection failed'));

            // Fast-forward time to trigger reconnection
            jest.advanceTimersByTime(1000);

            expect(setTimeout).toHaveBeenCalled();
            jest.useRealTimers();
        });
    });

    describe('Event Room Management', () => {
        it('should join event room', () => {
            service.connect('test-token');
            service.joinEvent('test-event-id');

            expect(mockSocket.emit).toHaveBeenCalledWith('join_event', 'test-event-id');
            expect(service.getCurrentEventId()).toBe('test-event-id');
        });

        it('should leave event room', () => {
            service.connect('test-token');
            service.joinEvent('test-event-id');
            service.leaveEvent();

            expect(mockSocket.emit).toHaveBeenCalledWith('leave_event', 'test-event-id');
            expect(service.getCurrentEventId()).toBeNull();
        });
    });

    describe('Cleanup and Resource Management', () => {
        it('should disconnect and cleanup all resources', () => {
            service.connect('test-token');
            service.on('test_event', jest.fn());

            service.disconnect();

            expect(mockSocket.disconnect).toHaveBeenCalled();
            expect(service.isConnected()).toBe(false);
        });

        it('should process remaining batches on disconnect', () => {
            jest.useFakeTimers();
            service.connect('test-token');

            const testCallback = jest.fn();
            service.onWithBatching('batch_event', testCallback, 200);

            // Simulate some batched events
            const batchCallback = mockSocket.on.mock.calls.find((call: any) => call[0] === 'batch_event')[1];
            batchCallback({ data: 'test1' });
            batchCallback({ data: 'test2' });

            // Disconnect should process remaining batches
            service.disconnect();

            // Fast-forward time to process batch
            jest.advanceTimersByTime(200);

            expect(testCallback).toHaveBeenCalledWith([{ data: 'test1' }, { data: 'test2' }]);
            jest.useRealTimers();
        });
    });

    describe('Error Handling', () => {
        it('should handle socket connection errors gracefully', () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            // Force a connection error
            mockSocket.connected = false;
            service.connect('test-token');

            // Simulate connection error
            const errorCallback = mockSocket.on.mock.calls.find((call: any) => call[0] === 'connect_error')[1];
            errorCallback(new Error('network failure'));

            expect(consoleErrorSpy).toHaveBeenCalled();
            consoleErrorSpy.mockRestore();
        });

        it('should handle event handler errors without crashing', () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
            service.connect('test-token');

            const failingCallback = () => {
                throw new Error('handler failed');
            };

            service.on('failing_event', failingCallback);

            // Simulate event
            const eventCallback = mockSocket.on.mock.calls.find((call: any) => call[0] === 'failing_event')[1];
            eventCallback('test data');

            expect(consoleErrorSpy).toHaveBeenCalled();
            expect(service.getConnectionStats().errorCount).toBe(1);
            consoleErrorSpy.mockRestore();
        });
    });

    describe('Performance Optimization', () => {
        it('should debounce rapid event handlers', () => {
            jest.useFakeTimers();
            service.connect('test-token');

            const testCallback = jest.fn();
            service.on('debounced_event', testCallback, 300);

            const eventCallback = mockSocket.on.mock.calls.find((call: any) => call[0] === 'debounced_event')[1];

            // Rapid calls
            eventCallback('data1');
            eventCallback('data2');
            eventCallback('data3');

            // Only the last call should be executed after debounce delay
            jest.advanceTimersByTime(300);

            expect(testCallback).toHaveBeenCalledTimes(1);
            expect(testCallback).toHaveBeenCalledWith('data3');
            jest.useRealTimers();
        });

        it('should batch multiple events into single updates', () => {
            jest.useFakeTimers();
            service.connect('test-token');

            const testCallback = jest.fn();
            service.onWithBatching('batch_event', testCallback, 200);

            const eventCallback = mockSocket.on.mock.calls.find((call: any) => call[0] === 'batch_event')[1];

            // Multiple rapid events
            eventCallback({ id: 1, data: 'first' });
            eventCallback({ id: 2, data: 'second' });
            eventCallback({ id: 3, data: 'third' });

            // Should batch all events into single call
            jest.advanceTimersByTime(200);

            expect(testCallback).toHaveBeenCalledTimes(1);
            expect(testCallback).toHaveBeenCalledWith([
                { id: 1, data: 'first' },
                { id: 2, data: 'second' },
                { id: 3, data: 'third' }
            ]);
            jest.useRealTimers();
        });
    });

    describe('Connection Statistics', () => {
        it('should track connection statistics', () => {
            service.connect('test-token');

            // Simulate connect
            const connectCallback = mockSocket.on.mock.calls.find((call: any) => call[0] === 'connect')[1];
            connectCallback();

            // Simulate disconnect
            const disconnectCallback = mockSocket.on.mock.calls.find((call: any) => call[0] === 'disconnect')[1];
            disconnectCallback('test reason');

            const stats = service.getConnectionStats();
            expect(stats.disconnectionCount).toBe(1);
            expect(stats.connectionTime).toBeGreaterThan(0);
        });

        it('should track message and error counts', () => {
            service.connect('test-token');

            const testCallback = jest.fn();
            service.on('test_event', testCallback);

            // Simulate successful event
            const eventCallback = mockSocket.on.mock.calls.find((call: any) => call[0] === 'test_event')[1];
            eventCallback('test data');

            // Simulate error
            const errorCallback = mockSocket.on.mock.calls.find((call: any) => call[0] === 'connect_error')[1];
            errorCallback(new Error('test error'));

            const stats = service.getConnectionStats();
            expect(stats.messageCount).toBe(1);
            expect(stats.errorCount).toBe(1);
        });
    });
});

// Test the React hook
describe('useOptimizedSocket Hook', () => {
    it('should provide connection status and stats', () => {
        const { useOptimizedSocket } = require('../optimizedSocketService');
        const mockSetState = jest.fn();

        // Mock React
        jest.mock('react', () => ({
            useState: (initial: any) => [initial, mockSetState],
            useEffect: (fn: any) => fn(),
        }));

        const result = useOptimizedSocket();
        expect(result).toHaveProperty('isConnected');
        expect(result).toHaveProperty('connectionStats');
    });
});