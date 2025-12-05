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
    console.error('CRITICAL: No API URL configured. Set VITE_API_URL environment variable.');
    // Only throw in development if no URL is configured
    if (isDev) {
      throw new Error('API URL not configured. Contact administrator.');
    }
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
  private reconnectionTimeout: NodeJS.Timeout | null = null;
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
      this.scheduleReconnection();
    }
  }

  private getSocketOptions(isMobile: boolean) {
    // Prioritize polling for reliable connections through proxies/firewalls, fallback to WebSocket
    // This fixes connection issues where WebSocket was blocked or unavailable
    const transports = ['polling', 'websocket'];

    return {
      transports,
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

    // Clear any pending reconnection
    if (this.reconnectionTimeout) {
      clearTimeout(this.reconnectionTimeout);
      this.reconnectionTimeout = null;
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

    // Clear any pending reconnection
    if (this.reconnectionTimeout) {
      clearTimeout(this.reconnectionTimeout);
      this.reconnectionTimeout = null;
    }

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

    // Don't auto-reconnect if user intentionally disconnected or navigated away
    if (reason === 'io client disconnect' || reason === 'io server disconnect' || document.hidden) {
      this.cleanupExistingConnection();
      return;
    }

    // Schedule reconnection with exponential backoff
    this.scheduleReconnection();
  }

  private handleConnectError(error: Error) {
    this.connectionStats.lastError = error.message;
    console.error('⚠️ WebSocket connection error:', error.message);

    // Track WebSocket connection error
    trackWebSocketError(`Connection failed: ${error.message}`, 'Socket Connection');

    // Schedule reconnection with exponential backoff
    this.scheduleReconnection();
  }

  private handleConnectTimeout() {
    this.connectionStats.lastError = 'Connection timeout';
    console.error('⏱️ WebSocket connection timeout');

    // Schedule reconnection with exponential backoff
    this.scheduleReconnection();
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

    // Schedule another reconnection attempt
    this.scheduleReconnection();
  }

  private handleReconnectFailed() {
    console.error('💥 WebSocket reconnection failed completely');
    this.connectionStats.lastError = 'Reconnection failed completely';

    // Track complete reconnection failure
    trackError('WebSocket reconnection failed completely after all attempts', 'Socket Service', 'high');

    // One final attempt after a longer delay
    this.scheduleReconnection(true);
  }

  private handlePing() {
    // Connection is healthy
    console.log('🏓 Ping received - connection healthy');
  }

  private handlePong(latency: number) {
    console.log(`🏓 Pong received - latency: ${latency}ms`);
  }

  // Exponential backoff reconnection strategy
  private scheduleReconnection(isFinalAttempt: boolean = false) {
    if (this.reconnectionTimeout) {
      clearTimeout(this.reconnectionTimeout);
    }

    const maxAttempts = this.detectMobileDevice() ? 10 : 5;
    const currentAttempts = this.connectionStats.reconnectionAttempts;

    if (currentAttempts >= maxAttempts && !isFinalAttempt) {
      console.warn(`🛑 Max reconnection attempts (${maxAttempts}) reached`);
      return;
    }

    // Calculate delay with exponential backoff (capped at 30 seconds)
    const delay = Math.min(
      1000 * Math.pow(2, currentAttempts),
      30000
    );

    console.log(`⏳ Scheduling reconnection attempt ${currentAttempts + 1} in ${delay}ms`);

    this.reconnectionTimeout = setTimeout(() => {
      console.log(`🔄 Attempting reconnection (attempt ${currentAttempts + 1})`);
      this.connectionStats.reconnectionAttempts++;
      this.connect(this.userToken || undefined);
    }, delay);
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

    // Clean up any pending reconnection
    if (this.reconnectionTimeout) {
      clearTimeout(this.reconnectionTimeout);
      this.reconnectionTimeout = null;
    }

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
    this.currentEventId = null;
    if (this.socket && this.socket.connected) {
      this.socket.emit('leave_event', this.currentEventId);
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