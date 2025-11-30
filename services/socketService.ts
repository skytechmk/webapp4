import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class SocketService {
  socket: Socket | null = null;
  private currentEventId: string | null = null;

  connect(userToken?: string) {
    if (this.socket && this.socket.connected) return;

    // Disconnect existing socket if it's in a bad state
    if (this.socket && !this.socket.connected) {
      this.socket.disconnect();
      this.socket = null;
    }

    // Detect mobile devices for better settings
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    this.socket = io(API_URL, {
      // Mobile-optimized settings
      transports: isMobile ? ['polling', 'websocket'] : ['websocket', 'polling'],
      timeout: isMobile ? 30000 : 20000,
      forceNew: false,
      reconnection: true,
      reconnectionAttempts: isMobile ? 10 : 5,
      reconnectionDelay: isMobile ? 2000 : 1000,
      reconnectionDelayMax: isMobile ? 10000 : 5000,
      randomizationFactor: 0.5,
      // Mobile-specific optimizations
      upgrade: !isMobile, // Disable upgrade on mobile for better stability
      rememberUpgrade: !isMobile,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected successfully');
      // Authenticate if we have a token
      if (userToken) {
        this.socket?.emit('authenticate', userToken);
      }
      // Re-join event room if we were in one
      if (this.currentEventId) {
        console.log('Re-joining event room:', this.currentEventId);
        this.socket?.emit('join_event', this.currentEventId);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      // Don't auto-reconnect on mobile if user navigated away
      if (reason === 'io client disconnect' || document.hidden) {
        this.socket = null;
      }
    });

    this.socket.on('connect_error', (error) => {
      console.warn('Socket connection error:', error.message);
      // Continue silently but log for debugging
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
    });

    this.socket.on('reconnect_error', (error) => {
      console.warn('Socket reconnection failed:', error.message);
    });
  }

  joinEvent(eventId: string) {
    this.currentEventId = eventId;
    if (this.socket) {
      this.socket.emit('join_event', eventId);
    }
  }

  leaveEvent() {
    this.currentEventId = null;
    // Ideally we should emit a leave_event but for now just clearing the tracker is enough
    // as the server handles disconnects
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: (data: any) => void) {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
      } else {
        this.socket.off(event);
      }
    }
  }
}

export const socketService = new SocketService();