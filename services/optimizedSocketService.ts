/**
 * Optimized Socket Service with Debouncing, Batching, and Connection Management
 * Implements Phase 2: Core Optimization for real-time socket updates
 */
import { io, Socket } from 'socket.io-client';
import * as React from 'react';
import { useEventStore } from '../stores/eventStore';
import { useAuthStore } from '../stores/authStore';

// Simple debounce implementation to avoid lodash dependency
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
    let timeout: NodeJS.Timeout | null = null;

    return function (this: any, ...args: Parameters<T>): void {
        const later = () => {
            timeout = null;
            func.apply(this, args);
        };

        if (timeout) {
            clearTimeout(timeout);
        }

        timeout = setTimeout(later, wait);
    } as T;
}

// Simple fallback for API URL - works in both browser and Node.js environments
const API_URL = 'http://localhost:3001';

// Configuration constants
const DEBOUNCE_DELAY = 300; // ms for event handler debouncing
const BATCH_INTERVAL = 200; // ms for state update batching
const MAX_RECONNECTION_ATTEMPTS = 5;
const RECONNECTION_DELAY = 1000; // ms
const CONNECTION_TIMEOUT = 20000; // ms

interface SocketEventBatch {
    event: string;
    data: any;
    timestamp: number;
}

interface ConnectionStats {
    connectionTime: number;
    disconnectionCount: number;
    lastReconnectAttempt: number | null;
    messageCount: number;
    errorCount: number;
}

class OptimizedSocketService {
    private socket: Socket | null = null;
    private currentEventId: string | null = null;
    private eventHandlers: Map<string, ((data: any) => void)[]> = new Map();
    private pendingBatches: Map<string, SocketEventBatch[]> = new Map();
    private batchTimers: Map<string, NodeJS.Timeout> = new Map();
    private connectionStats: ConnectionStats = {
        connectionTime: 0,
        disconnectionCount: 0,
        lastReconnectAttempt: null,
        messageCount: 0,
        errorCount: 0
    };
    private isConnecting = false;
    private reconnectionAttempts = 0;
    private cleanupCallbacks: (() => void)[] = [];
    private userToken: string | null = null;

    // Connection management
    connect(userToken?: string) {
        if (this.socket && this.socket.connected) {
            this.logConnectionStats('Already connected');
            return;
        }

        if (this.isConnecting) {
            this.logConnectionStats('Connection already in progress');
            return;
        }

        this.isConnecting = true;
        this.userToken = userToken || null;

        // Clean up any existing socket in bad state
        this.cleanupExistingSocket();

        // Detect mobile devices for optimized settings
        const isMobile = this.detectMobileDevice();

        this.logConnectionStats(`Connecting to ${API_URL} (mobile: ${isMobile})`);

        this.socket = io(API_URL, this.getSocketOptions(isMobile));

        this.setupSocketEventListeners();
        this.setupPerformanceMonitoring();

        this.isConnecting = false;
    }

    private getSocketOptions(isMobile: boolean) {
        return {
            transports: isMobile ? ['polling', 'websocket'] : ['websocket', 'polling'],
            timeout: CONNECTION_TIMEOUT,
            forceNew: false,
            reconnection: true,
            reconnectionAttempts: isMobile ? 10 : MAX_RECONNECTION_ATTEMPTS,
            reconnectionDelay: RECONNECTION_DELAY,
            reconnectionDelayMax: isMobile ? 10000 : 5000,
            randomizationFactor: 0.5,
            upgrade: !isMobile,
            rememberUpgrade: !isMobile,
            autoConnect: true,
            // Mobile-specific optimizations
            ...(isMobile && {
                closeOnBeforeunload: true,
                openOnBeforeunload: false
            })
        };
    }

    private detectMobileDevice(): boolean {
        // Check if navigator is available (for testing environments)
        if (typeof navigator === 'undefined') {
            return false;
        }
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    private cleanupExistingSocket() {
        if (this.socket) {
            try {
                if (this.socket.connected) {
                    this.socket.disconnect();
                }
                this.socket.off();
                this.socket = null;
                this.logConnectionStats('Cleaned up existing socket connection');
            } catch (error) {
                this.logError('Socket cleanup failed', error);
            }
        }
    }

    private setupSocketEventListeners() {
        if (!this.socket) return;

        // Connection lifecycle events
        this.socket.on('connect', () => this.handleConnect());
        this.socket.on('disconnect', (reason) => this.handleDisconnect(reason));
        this.socket.on('connect_error', (error) => this.handleConnectError(error));
        this.socket.on('reconnect', (attemptNumber) => this.handleReconnect(attemptNumber));
        this.socket.on('reconnect_error', (error) => this.handleReconnectError(error));
        this.socket.on('reconnect_failed', () => this.handleReconnectFailed());

        // Performance monitoring
        this.socket.on('ping', () => this.handlePing());
        this.socket.on('pong', (latency) => this.handlePong(latency));

        this.logConnectionStats('Socket event listeners set up');
    }

    private setupPerformanceMonitoring() {
        // Store monitoring interval for cleanup
        const monitoringInterval = setInterval(() => {
            if (this.socket && this.socket.connected) {
                // Use available socket properties for monitoring
                const socketId = this.socket.id;
                const connected = this.socket.connected;
                this.logConnectionStats(`Connection quality - Socket ID: ${socketId}, Connected: ${connected}`);

                // Add cleanup for this interval
                this.cleanupCallbacks.push(() => {
                    clearInterval(monitoringInterval);
                });
            }
        }, 30000); // Every 30 seconds

        // Add immediate cleanup callback for the monitoring interval
        this.cleanupCallbacks.push(() => {
            clearInterval(monitoringInterval);
        });
    }

    // Event handler management with debouncing
    on(event: string, callback: (data: any) => void, debounceDelay: number = DEBOUNCE_DELAY) {
        if (!this.socket) {
            this.logError('Cannot add event handler - socket not connected');
            return;
        }

        // Create debounced version of the callback
        const debouncedCallback = debounce((data: any) => {
            try {
                callback(data);
                this.connectionStats.messageCount++;
            } catch (error) {
                this.logError(`Event handler error for ${event}`, error);
                this.connectionStats.errorCount++;
            }
        }, debounceDelay);

        // Store the handler
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event)?.push(debouncedCallback);

        // Add to socket
        this.socket.on(event, debouncedCallback);

        // Add cleanup callback
        this.cleanupCallbacks.push(() => {
            this.socket?.off(event, debouncedCallback);
        });

        this.logConnectionStats(`Added debounced handler for event: ${event}`);
    }

    // Public method to remove event handlers
    off(event: string, callback?: (data: any) => void) {
        if (this.socket) {
            if (callback) {
                this.socket.off(event, callback);
            } else {
                this.socket.off(event);
            }
        }
    }

    // Batching for rapid state updates
    onWithBatching(event: string, callback: (data: any) => void, batchInterval: number = BATCH_INTERVAL) {
        if (!this.socket) {
            this.logError('Cannot add batched event handler - socket not connected');
            return;
        }

        const batchedCallback = (data: any) => {
            // Initialize batch if it doesn't exist
            if (!this.pendingBatches.has(event)) {
                this.pendingBatches.set(event, []);
            }

            // Add to batch
            const batch = this.pendingBatches.get(event)!;
            batch.push({
                event,
                data,
                timestamp: Date.now()
            });

            // Clear existing timer if any
            if (this.batchTimers.has(event)) {
                clearTimeout(this.batchTimers.get(event));
            }

            // Set new timer
            this.batchTimers.set(event, setTimeout(() => {
                this.processBatch(event);
            }, batchInterval));
        };

        // Store the handler
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event)?.push(batchedCallback);

        // Add to socket
        this.socket.on(event, batchedCallback);

        // Add cleanup callback
        this.cleanupCallbacks.push(() => {
            this.socket?.off(event, batchedCallback);
            // Process any remaining items in the batch
            this.processBatch(event);
        });

        this.logConnectionStats(`Added batched handler for event: ${event}`);
    }

    private processBatch(event: string) {
        if (!this.pendingBatches.has(event)) return;

        const batch = this.pendingBatches.get(event)!;
        if (batch.length === 0) return;

        try {
            // Process all items in the batch
            const batchData = batch.map(item => item.data);
            this.logConnectionStats(`Processing batch of ${batch.length} items for event: ${event}`);

            // Call the original callback with the entire batch
            // Note: This assumes the callback can handle array input
            const handlers = this.eventHandlers.get(event) || [];
            for (const handler of handlers) {
                if (typeof handler === 'function') {
                    handler(batchData);
                }
            }

            this.connectionStats.messageCount += batch.length;
        } catch (error) {
            this.logError(`Batch processing error for ${event}`, error);
            this.connectionStats.errorCount++;
        } finally {
            // Clear the batch
            this.pendingBatches.set(event, []);
            this.batchTimers.delete(event);
        }
    }

    // Connection lifecycle handlers
    private handleConnect() {
        this.connectionStats.connectionTime = Date.now();
        this.connectionStats.disconnectionCount = 0;
        this.reconnectionAttempts = 0;

        console.log('🔌 Socket connected successfully');

        // Authenticate if we have a token
        if (this.userToken) {
            this.socket?.emit('authenticate', this.userToken);
        }

        // Re-join event room if we were in one
        if (this.currentEventId) {
            console.log('🔄 Re-joining event room:', this.currentEventId);
            this.socket?.emit('join_event', this.currentEventId);
        }

        this.logConnectionStats('Socket connected');
    }

    private handleDisconnect(reason: string) {
        this.connectionStats.disconnectionCount++;
        console.warn('🔌 Socket disconnected:', reason);

        // Don't auto-reconnect on mobile if user navigated away
        if (reason === 'io client disconnect' || document.hidden) {
            this.cleanupExistingSocket();
        }

        this.logConnectionStats(`Socket disconnected: ${reason}`);
    }

    private handleConnectError(error: Error) {
        this.connectionStats.errorCount++;
        console.warn('⚠️ Socket connection error:', error.message);

        // Implement exponential backoff for reconnection
        if (this.reconnectionAttempts < MAX_RECONNECTION_ATTEMPTS) {
            this.reconnectionAttempts++;
            const delay = Math.min(RECONNECTION_DELAY * Math.pow(2, this.reconnectionAttempts), 10000);
            setTimeout(() => this.connect(this.userToken || undefined), delay);
        }

        this.logConnectionStats(`Connection error: ${error.message}`);
    }

    private handleReconnect(attemptNumber: number) {
        this.connectionStats.lastReconnectAttempt = attemptNumber;
        console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
        this.logConnectionStats(`Reconnected after ${attemptNumber} attempts`);
    }

    private handleReconnectError(error: Error) {
        this.connectionStats.errorCount++;
        console.warn('⚠️ Socket reconnection failed:', error.message);
        this.logConnectionStats(`Reconnection error: ${error.message}`);
    }

    private handleReconnectFailed() {
        console.error('💥 Socket reconnection failed completely');
        this.logConnectionStats('Reconnection failed completely');
    }

    private handlePing() {
        // Ping received, connection is healthy
        this.logConnectionStats('Ping received - connection healthy');
    }

    private handlePong(latency: number) {
        // Measure round-trip time
        this.logConnectionStats(`Pong received - latency: ${latency}ms`);
    }

    // Event room management
    joinEvent(eventId: string) {
        this.currentEventId = eventId;
        if (this.socket && this.socket.connected) {
            this.socket.emit('join_event', eventId);
            this.logConnectionStats(`Joined event room: ${eventId}`);
        } else {
            this.logError('Cannot join event - socket not connected');
        }
    }

    leaveEvent() {
        if (this.currentEventId && this.socket && this.socket.connected) {
            this.socket.emit('leave_event', this.currentEventId);
            this.logConnectionStats(`Left event room: ${this.currentEventId}`);
        }
        this.currentEventId = null;
    }

    // Cleanup and resource management
    disconnect() {
        this.logConnectionStats('Initiating socket disconnect');

        // Process any remaining batches
        this.pendingBatches.forEach((batch, event) => {
            if (batch.length > 0) {
                this.logConnectionStats(`Processing final batch for ${event} with ${batch.length} items`);
                this.processBatch(event);
            }
        });

        // Execute all cleanup callbacks
        this.cleanupCallbacks.forEach(callback => {
            try {
                callback();
            } catch (error) {
                this.logError('Cleanup callback error', error);
            }
        });

        // Clear all event listeners from socket
        if (this.socket) {
            try {
                // Remove all event listeners
                this.socket.off();
                this.logConnectionStats(`Removed all event listeners from socket`);
            } catch (error) {
                this.logError('Failed to remove socket event listeners', error);
            }
        }

        // Clear all state
        this.cleanupCallbacks = [];
        this.eventHandlers.clear();
        this.pendingBatches.clear();
        this.batchTimers.forEach(timer => clearTimeout(timer));
        this.batchTimers.clear();

        // Disconnect socket
        if (this.socket) {
            try {
                this.socket.disconnect();
                this.socket = null;
            } catch (error) {
                this.logError('Socket disconnect error', error);
            }
        }

        this.currentEventId = null;
        this.userToken = null;

        this.logConnectionStats('Socket disconnected and cleaned up');
    }

    // Error handling and logging
    private logError(message: string, error?: unknown) {
        console.error(`[SocketService] ${message}`, error || '');
        // In production, you might want to send this to an error tracking service
    }

    private logConnectionStats(message: string) {
        console.log(`[SocketStats] ${message}`);
        // In production, you might want to send this to monitoring
    }

    // Get current connection statistics
    getConnectionStats(): ConnectionStats & { currentConnectionTime?: number } {
        return {
            ...this.connectionStats,
            currentConnectionTime: this.socket?.connected ? Date.now() - this.connectionStats.connectionTime : 0
        };
    }

    // Check connection health
    isConnected(): boolean {
        return !!this.socket && this.socket.connected;
    }

    // Get current event ID
    getCurrentEventId(): string | null {
        return this.currentEventId;
    }

    // Public method to emit events (for controlled access)
    emit(event: string, data: any) {
        if (this.socket && this.socket.connected) {
            this.socket.emit(event, data);
            return true;
        }
        return false;
    }
}

// Singleton instance
export const optimizedSocketService = new OptimizedSocketService();

// React hook for easy integration with components
export function useOptimizedSocket() {
    const [isConnected, setIsConnected] = React.useState(optimizedSocketService.isConnected());
    const [connectionStats, setConnectionStats] = React.useState(optimizedSocketService.getConnectionStats());

    React.useEffect(() => {
        // Set up connection state monitoring
        const interval = setInterval(() => {
            setIsConnected(optimizedSocketService.isConnected());
            setConnectionStats(optimizedSocketService.getConnectionStats());
        }, 1000);

        return () => {
            clearInterval(interval);
        };
    }, []);

    return {
        ...optimizedSocketService,
        isConnected,
        connectionStats
    };
}