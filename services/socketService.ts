import { io, Socket } from 'socket.io-client';
import { trackWebSocketError, trackError } from '../utils/monitoring';

// Import the API URL configuration from the main API service
// This ensures consistency and uses the enhanced URL validation
const getApiUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;

  if (envUrl) {
    // Validate the URL format
    try {
      new URL(envUrl);
      return envUrl.replace(/\/$/, ''); // Remove trailing slash
    } catch (error) {
      console.warn('Invalid VITE_API_URL format, falling back to default:', envUrl);
    }
  }

  // Environment-aware defaults
  const isDev = import.meta.env.DEV;
  const defaultUrl = isDev ? 'http://localhost:3001' : '';

  if (!defaultUrl) {
    throw new Error('CRITICAL: No API URL configured. Set VITE_API_URL environment variable.');
  }

  return defaultUrl;
};

const API_URL = getApiUrl();

// Convert HTTP URL to WebSocket URL
const getWebSocketUrl = (url: string): string => {
  return url.replace(/^http/, 'ws');
};

const WEBSOCKET_URL = getWebSocketUrl(API_URL);

interface ConnectionStats {
  connectionAttempts: number;
  lastConnectionTime: number | null;
  lastError: string | null;
  isConnecting: boolean;
  reconnectionAttempts: number;
  currentConnectionTime?: number;
}

class SocketService {
  socket: Socket | null = null;
  private currentEventId: string | null = null;
  private connectionStats: ConnectionStats = {
    connectionAttempts: 0,
    lastConnectionTime: null,
    lastError: null,
    isConnecting: false,
    reconnectionAttempts: 0
  };
  private eventListeners: Map<string, ((data: any) => void)[]> = new Map();
  private userToken: string | null = null;

  // Enhanced connection with exponential backoff and proper error handling
  connect(userToken?: string) {
    if (this.socket && this.socket.connected) {
      console.log('✅ Already connected to WebSocket');
      return;
    }

    // Clean up any existing bad connection
    this.cleanupExistingConnection();

    if (this.connectionStats.isConnecting) {
      console.log('⏳ Connection already in progress');
      return;
    }

    this.connectionStats.isConnecting = true;
    this.userToken = userToken || null;
    this.connectionStats.connectionAttempts++;

    console.log(`🔌 Connecting to WebSocket: ${WEBSOCKET_URL}`);

    // Detect mobile devices for optimized settings
    const isMobile = this.detectMobileDevice();

    try {
      this.socket = io(WEBSOCKET_URL, this.getSocketOptions(isMobile));

      // Set up comprehensive event listeners
      this.setupSocketEventListeners();

      this.connectionStats.isConnecting = false;
      this.connectionStats.lastConnectionTime = Date.now();

    } catch (error) {
      this.connectionStats.isConnecting = false;
      this.connectionStats.lastError = error.message;
      console.error('❌ WebSocket connection initialization failed:', error.message);
    }
  }

  private getSocketOptions(isMobile: boolean) {
    // Prioritize WebSocket for better performance, fallback to polling
    // This ensures faster connections when WebSocket is available
    const transports = ['websocket', 'polling'];

    return {
      transports,
      pingTimeout: 60000,
      pingInterval: 25000,
      timeout: isMobile ? 30000 : 20000,
      forceNew: false,
      reconnection: true,
      reconnectionAttempts: isMobile ? 10 : 5,
      reconnectionDelay: isMobile ? 2000 : 1000,
      reconnectionDelayMax: isMobile ? 10000 : 5000,
      randomizationFactor: 0.5,
      autoConnect: true,
      // Mobile-specific optimizations
      ...(isMobile && {
        closeOnBeforeunload: true,
        openOnBeforeunload: false,
        // Additional mobile optimizations
        upgrade: true, // Allow transport upgrade
        rememberUpgrade: true // Remember successful upgrades
      })
    };
  }

  private detectMobileDevice(): boolean {
    if (typeof navigator === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  private cleanupExistingConnection() {
    if (this.socket) {
      try {
        if (this.socket.connected) {
          this.socket.disconnect();
        }
        (this.socket as any).off();
        this.socket = null;
      } catch (error) {
        console.error('❌ Socket cleanup failed:', error.message);
      }
    }

  }

  private setupSocketEventListeners() {
    if (!this.socket) return;

    // Connection lifecycle events
    (this.socket as any).on('connect', () => this.handleConnect());
    (this.socket as any).on('disconnect', (reason) => this.handleDisconnect(reason));
    (this.socket as any).on('connect_error', (error) => this.handleConnectError(error));
    (this.socket as any).on('connect_timeout', () => this.handleConnectTimeout());
    (this.socket as any).on('reconnect', (attemptNumber) => this.handleReconnect(attemptNumber));
    (this.socket as any).on('reconnect_attempt', (attemptNumber) => this.handleReconnectAttempt(attemptNumber));
    (this.socket as any).on('reconnect_error', (error) => this.handleReconnectError(error));
    (this.socket as any).on('reconnect_failed', () => this.handleReconnectFailed());
    (this.socket as any).on('ping', () => this.handlePing());
    (this.socket as any).on('pong', (latency) => this.handlePong(latency));

    // Re-establish any existing event listeners
    this.reestablishEventListeners();
  }

  private reestablishEventListeners() {
    if (!this.socket) return;

    this.eventListeners.forEach((callbacks, event) => {
      callbacks.forEach(callback => {
        (this.socket as any)?.on(event, callback);
      });
    });
  }

  // Connection lifecycle handlers with enhanced error handling
  private handleConnect() {
    this.connectionStats.reconnectionAttempts = 0;
    console.log('🔌 WebSocket connected successfully');

    // Ensure event listeners are preserved across reconnections
    this.reestablishEventListeners();

    // Authenticate if we have a token
    if (this.userToken) {
      this.socket?.emit('authenticate', this.userToken);
    }

    // Re-join event room if we were in one
    if (this.currentEventId) {
      console.log('🔄 Re-joining event room:', this.currentEventId);
      this.socket?.emit('join_event', this.currentEventId);
    }
  }

  private handleDisconnect(reason: string) {
    console.warn('🔌 WebSocket disconnected:', reason);
    this.connectionStats.lastError = `Disconnected: ${reason}`;

    // Don't clean up if socket.io will handle reconnection
    if (reason === 'io client disconnect' || reason === 'io server disconnect') {
      this.cleanupExistingConnection();
    }
  }

  private handleConnectError(error: Error) {
    this.connectionStats.lastError = error.message;
    console.error('⚠️ WebSocket connection error:', error.message);

    // Track WebSocket connection error
    trackWebSocketError(`Connection failed: ${error.message}`, 'Socket Connection');
  }

  private handleConnectTimeout() {
    this.connectionStats.lastError = 'Connection timeout';
    console.error('⏱️ WebSocket connection timeout');
  }

  private handleReconnect(attemptNumber: number) {
    console.log('🔄 WebSocket reconnected after', attemptNumber, 'attempts');
    this.connectionStats.reconnectionAttempts = attemptNumber;
  }

  private handleReconnectAttempt(attemptNumber: number) {
    console.log('🔄 WebSocket reconnection attempt', attemptNumber);
  }

  private handleReconnectError(error: Error) {
    console.error('⚠️ WebSocket reconnection error:', error.message);
    this.connectionStats.lastError = `Reconnection error: ${error.message}`;

    // Track reconnection error
    trackWebSocketError(`Reconnection failed: ${error.message}`, 'Socket Reconnection');
  }

  private handleReconnectFailed() {
    console.error('💥 WebSocket reconnection failed completely');
    this.connectionStats.lastError = 'Reconnection failed completely';

    // Track complete reconnection failure
    trackError('WebSocket reconnection failed completely after all attempts', 'Socket Service', 'high');
  }

  private handlePing() {
    // Connection is healthy
    console.log('🏓 Ping received - connection healthy');
  }

  private handlePong(latency: number) {
    console.log(`🏓 Pong received - latency: ${latency}ms`);
  }


  // Enhanced event management with error handling
  on(event: string, callback: (data: any) => void) {
    if (!this.socket) {
      console.warn('⚠️ Cannot add event listener - socket not connected');
      return;
    }

    // Store the callback for re-establishment
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)?.push(callback);

    // Add to current socket
    (this.socket as any).on(event, callback);
  }

  off(event: string, callback?: (data: any) => void) {
    if (this.socket) {
      if (callback) {
        (this.socket as any).off(event, callback);
        // Remove from our tracking
        const callbacks = this.eventListeners.get(event) || [];
        const updatedCallbacks = callbacks.filter(cb => cb !== callback);
        this.eventListeners.set(event, updatedCallbacks);
      } else {
        (this.socket as any).off(event);
        this.eventListeners.delete(event);
      }
    }
  }

  // Connection state management
  isConnected(): boolean {
    return !!this.socket && this.socket.connected;
  }

  getConnectionStats(): ConnectionStats {
    return {
      ...this.connectionStats,
      currentConnectionTime: this.socket?.connected ? Date.now() - (this.connectionStats.lastConnectionTime || 0) : 0
    };
  }

  getLastError(): string | null {
    return this.connectionStats.lastError;
  }

  // Enhanced disconnect with cleanup
  disconnect() {
    console.log('🔌 Disconnecting WebSocket...');

    if (this.socket) {
      try {
        this.socket.disconnect();
      } catch (error) {
        console.error('❌ Socket disconnect error:', error.message);
      }
      this.socket = null;
    }

    this.currentEventId = null;
    this.userToken = null;
    this.connectionStats.isConnecting = false;
  }

  joinEvent(eventId: string) {
    this.currentEventId = eventId;
    if (this.socket && this.socket.connected) {
      this.socket.emit('join_event', eventId);
    } else {
      console.warn('⚠️ Cannot join event - socket not connected');
    }
  }

  leaveEvent() {
    const eventId = this.currentEventId;
    this.currentEventId = null;
    if (this.socket && this.socket.connected && eventId) {
      this.socket.emit('leave_event', eventId);
    }
  }

  // Enhanced real-time features
  sendNotification(data: { to?: string; type?: string; title: string; message: string; data?: any }, callback?: (response: any) => void) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('send_notification', data, callback);
    } else {
      callback?.({ success: false, error: 'Not connected' });
    }
  }

  sendMessage(data: { to?: string; room?: string; type?: string; content: string; metadata?: any }, callback?: (response: any) => void) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('send_message', data, callback);
    } else {
      callback?.({ success: false, error: 'Not connected' });
    }
  }

  broadcastUpdate(data: { type: string; data: any; room?: string }, callback?: (response: any) => void) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('broadcast_update', data, callback);
    } else {
      callback?.({ success: false, error: 'Not connected' });
    }
  }

  updatePresence(data: { status: string; activity?: string }, callback?: (response: any) => void) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('update_presence', data, callback);
    } else {
      callback?.({ success: false, error: 'Not connected' });
    }
  }

  startTyping(data: { room?: string }) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('typing_start', data);
    }
  }

  stopTyping(data: { room?: string }) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('typing_stop', data);
    }
  }

  joinRoom(roomId: string, callback?: (response: any) => void) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('join_room', roomId, callback);
    } else {
      callback?.({ success: false, error: 'Not connected' });
    }
  }

  leaveRoom(roomId: string, callback?: (response: any) => void) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('leave_room', roomId, callback);
    } else {
      callback?.({ success: false, error: 'Not connected' });
    }
  }

  getRoomInfo(roomId: string, callback?: (response: any) => void) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('get_room_info', roomId, callback);
    } else {
      callback?.({ success: false, error: 'Not connected' });
    }
  }

  emit(event: string, data: any) {
    if (this.socket && this.socket.connected) {
      return this.socket.emit(event, data);
    }
    return false;
  }
}

export const socketService = new SocketService();