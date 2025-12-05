/**
 * WebSocket Connection Manager with User Feedback and State Management
 * Provides comprehensive connection monitoring, error handling, and user notifications
 */
import { socketService } from './socketService';
import * as React from 'react';

// Simple toast notification fallback if react-toastify is not available
const toast = {
  info: (message: string, options?: any) => console.info('📢 [INFO]', message),
  success: (message: string, options?: any) => console.log('✅ [SUCCESS]', message),
  error: (message: string, options?: any) => console.error('❌ [ERROR]', message),
  warning: (message: string, options?: any) => console.warn('⚠️ [WARNING]', message),
  dismiss: (toastId: string) => console.debug('🗑️ [DISMISS]', toastId)
};

interface ConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  lastError: string | null;
  reconnectionAttempts: number;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected' | null;
  lastConnectionTime: number | null;
  lastDisconnectionTime: number | null;
}

interface WebSocketConnectionManagerProps {
  onConnectionStateChange?: (state: ConnectionState) => void;
  showUserNotifications?: boolean;
  autoReconnect?: boolean;
}

export class WebSocketConnectionManager {
  private connectionState: ConnectionState = {
    isConnected: false,
    isConnecting: false,
    lastError: null,
    reconnectionAttempts: 0,
    connectionQuality: null,
    lastConnectionTime: null,
    lastDisconnectionTime: null
  };

  private props: WebSocketConnectionManagerProps;
  private connectionMonitorInterval: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private lastPingTime: number = 0;
  private pingResponses: number[] = [];
  private maxPingHistory = 10;

  constructor(props: WebSocketConnectionManagerProps = {}) {
    this.props = {
      onConnectionStateChange: props.onConnectionStateChange,
      showUserNotifications: props.showUserNotifications !== false, // default true
      autoReconnect: props.autoReconnect !== false // default true
    };

    this.initialize();
  }

  private initialize() {
    // Set up connection monitoring
    this.setupConnectionMonitoring();

    // Set up ping/pong monitoring for connection quality
    this.setupPingMonitoring();

    // Set up event listeners for socket service
    this.setupSocketEventListeners();

    // Initial connection attempt
    this.attemptConnection();
  }

  private setupSocketEventListeners() {
    // Monitor connection state changes from the socket service
    const checkConnectionState = () => {
      const isConnected = socketService.isConnected();
      const stats = socketService.getConnectionStats();
      const lastError = socketService.getLastError();

      this.updateConnectionState({
        isConnected,
        isConnecting: stats.isConnecting,
        lastError,
        reconnectionAttempts: stats.reconnectionAttempts,
        lastConnectionTime: stats.lastConnectionTime,
        lastDisconnectionTime: isConnected ? null : Date.now()
      });
    };

    // Check every second
    this.connectionMonitorInterval = setInterval(checkConnectionState, 1000);

    // Listen for pong responses from the socket service
    socketService.on('pong', (data: { latency: number; serverTime: number; clientTime: number }) => {
      this.handlePongResponse(data);
    });
  }

  private setupConnectionMonitoring() {
    // Monitor the socket service connection state
    const monitorInterval = setInterval(() => {
      const isConnected = socketService.isConnected();
      const stats = socketService.getConnectionStats();

      // Update connection quality based on recent performance
      this.updateConnectionQuality();

      // Check if we need to attempt reconnection
      if (this.props.autoReconnect && !isConnected && !stats.isConnecting) {
        this.attemptConnection();
      }
    }, 5000); // Check every 5 seconds

    // Store interval for cleanup
    this.connectionMonitorInterval = monitorInterval;
  }

  private setupPingMonitoring() {
    // Send periodic pings to monitor connection quality
    const pingInterval = setInterval(() => {
      if (socketService.isConnected()) {
        this.lastPingTime = Date.now();
        socketService.emit('ping', { timestamp: this.lastPingTime });
      }
    }, 15000); // Ping every 15 seconds

    this.pingInterval = pingInterval;
  }

  private handlePongResponse(data: { latency: number; serverTime: number; clientTime: number }) {
    // Record the latency for connection quality calculation
    this.pingResponses.push(data.latency);

    // Keep only the most recent pings
    if (this.pingResponses.length > this.maxPingHistory) {
      this.pingResponses = this.pingResponses.slice(-this.maxPingHistory);
    }

    // Update connection quality
    this.updateConnectionQuality();
  }

  private updateConnectionQuality() {
    if (this.pingResponses.length === 0) {
      if (socketService.isConnected()) {
        this.updateConnectionState({ connectionQuality: 'good' });
      }
      return;
    }

    // Calculate average latency
    const avgLatency = this.pingResponses.reduce((sum, lat) => sum + lat, 0) / this.pingResponses.length;

    let quality: ConnectionState['connectionQuality'];

    if (avgLatency < 100) {
      quality = 'excellent';
    } else if (avgLatency < 300) {
      quality = 'good';
    } else if (avgLatency < 1000) {
      quality = 'poor';
    } else {
      quality = 'poor';
    }

    this.updateConnectionState({ connectionQuality: quality });
  }

  private attemptConnection() {
    if (this.connectionState.isConnecting) {
      console.log('⏳ Connection already in progress');
      return;
    }

    this.updateConnectionState({
      isConnecting: true,
      lastError: null
    });

    if (this.props.showUserNotifications) {
      toast.info('🔌 Connecting to real-time updates...', {
        toastId: 'websocket-connecting',
        autoClose: false
      });
    }

    try {
      socketService.connect();
    } catch (error) {
      this.handleConnectionError(error instanceof Error ? error.message : 'Unknown connection error');
    }
  }

  private handleConnectionError(error: string) {
    this.updateConnectionState({
      isConnecting: false,
      lastError: error,
      reconnectionAttempts: this.connectionState.reconnectionAttempts + 1,
      lastDisconnectionTime: Date.now()
    });

    if (this.props.showUserNotifications) {
      toast.dismiss('websocket-connecting');
      toast.error(`❌ Connection failed: ${error}`, {
        toastId: 'websocket-error',
        autoClose: 5000
      });
    }

    console.error('❌ WebSocket connection error:', error);
  }

  private updateConnectionState(updates: Partial<ConnectionState>) {
    const newState = { ...this.connectionState, ...updates };

    // Only notify if there are actual changes
    const hasChanges = Object.keys(updates).some(key => {
      const updatesKey = key as keyof ConnectionState;
      return this.connectionState[updatesKey] !== updates[updatesKey];
    });

    if (hasChanges) {
      this.connectionState = newState;

      // Notify subscribers
      if (this.props.onConnectionStateChange) {
        try {
          this.props.onConnectionStateChange(newState);
        } catch (error) {
          console.error('❌ Connection state change callback error:', error);
        }
      }

      // Handle specific state transitions
      this.handleStateTransitions(newState);
    }
  }

  private handleStateTransitions(newState: ConnectionState) {
    // Handle connection established
    if (newState.isConnected && !this.connectionState.isConnected) {
      this.handleConnectedState();
    }

    // Handle disconnection
    if (!newState.isConnected && this.connectionState.isConnected) {
      this.handleDisconnectedState();
    }
  }

  private handleConnectedState() {
    if (this.props.showUserNotifications) {
      toast.dismiss('websocket-connecting');
      toast.dismiss('websocket-error');
      toast.success('✅ Real-time updates connected!', {
        toastId: 'websocket-connected',
        autoClose: 3000
      });
    }

    console.log('🔌 WebSocket connected successfully');
    this.updateConnectionQuality();
  }

  private handleDisconnectedState() {
    if (this.props.showUserNotifications) {
      toast.dismiss('websocket-connected');
      toast.warning('⚠️ Real-time updates disconnected. Reconnecting...', {
        toastId: 'websocket-disconnected',
        autoClose: false
      });
    }

    console.warn('🔌 WebSocket disconnected');
  }

  // Public methods
  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  connect() {
    this.attemptConnection();
  }

  disconnect() {
    this.updateConnectionState({
      isConnecting: false,
      isConnected: false
    });

    socketService.disconnect();

    if (this.props.showUserNotifications) {
      toast.dismiss('websocket-connected');
      toast.dismiss('websocket-disconnected');
      toast.info('🔌 Real-time updates disconnected', {
        toastId: 'websocket-manual-disconnect',
        autoClose: 3000
      });
    }
  }

  isConnected(): boolean {
    return this.connectionState.isConnected;
  }

  // React hook for easy integration
  static useWebSocketConnection(props: WebSocketConnectionManagerProps = {}): {
    connectionState: ConnectionState;
    connect: () => void;
    disconnect: () => void;
    isConnected: () => boolean;
  } {
    const [state, setState] = React.useState<ConnectionState>({
      isConnected: false,
      isConnecting: false,
      lastError: null,
      reconnectionAttempts: 0,
      connectionQuality: null,
      lastConnectionTime: null,
      lastDisconnectionTime: null
    });

    const managerRef = React.useRef<WebSocketConnectionManager | null>(null);

    React.useEffect(() => {
      // Create manager instance
      managerRef.current = new WebSocketConnectionManager({
        ...props,
        onConnectionStateChange: (newState) => {
          setState(newState);
        }
      });

      return () => {
        // Cleanup
        if (managerRef.current) {
          managerRef.current.disconnect();
        }
      };
    }, []);

    return {
      connectionState: state,
      connect: () => managerRef.current?.connect(),
      disconnect: () => managerRef.current?.disconnect(),
      isConnected: () => managerRef.current?.isConnected() || false
    };
  }
}

// Singleton instance for global use
export const webSocketConnectionManager = new WebSocketConnectionManager({
  showUserNotifications: true,
  autoReconnect: true
});