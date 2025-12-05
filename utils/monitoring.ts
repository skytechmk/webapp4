/**
 * Monitoring and Alerting System
 * Tracks errors, performance metrics, and sends alerts
 */

interface ErrorEvent {
  type: string;
  message: string;
  context: string;
  timestamp: string;
  userAgent?: string;
  url?: string;
  userId?: string;
  stack?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: string;
  context?: string;
}

class MonitoringService {
  private errorBuffer: ErrorEvent[] = [];
  private performanceBuffer: PerformanceMetric[] = [];
  private readonly maxBufferSize = 100;
  private readonly flushInterval = 30000; // 30 seconds
  private flushTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startPeriodicFlush();
    this.setupGlobalErrorHandlers();
  }

  // Track application errors
  trackError(error: Error | string, context: string, severity: ErrorEvent['severity'] = 'medium') {
    const errorEvent: ErrorEvent = {
      type: typeof error === 'string' ? 'string_error' : error.name,
      message: typeof error === 'string' ? error : error.message,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator?.userAgent,
      url: window?.location?.href,
      userId: this.getCurrentUserId(),
      stack: typeof error === 'object' && error.stack ? error.stack : undefined,
      severity
    };

    this.errorBuffer.push(errorEvent);

    // Immediately alert for critical errors
    if (severity === 'critical') {
      this.sendImmediateAlert(errorEvent);
    }

    // Flush if buffer is full
    if (this.errorBuffer.length >= this.maxBufferSize) {
      this.flushErrors();
    }

    console.error(`[${severity.toUpperCase()}] ${context}:`, error);
  }

  // Track performance metrics
  trackPerformance(name: string, value: number, context?: string) {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: new Date().toISOString(),
      context
    };

    this.performanceBuffer.push(metric);

    // Flush if buffer is full
    if (this.performanceBuffer.length >= this.maxBufferSize) {
      this.flushPerformanceMetrics();
    }
  }

  // Track WebSocket connection issues
  trackWebSocketError(error: string, context: string) {
    this.trackError(`WebSocket: ${error}`, context, 'high');
  }

  // Track API failures
  trackApiError(endpoint: string, status: number, message: string) {
    const severity = status >= 500 ? 'high' : status >= 400 ? 'medium' : 'low';
    this.trackError(`API ${status}: ${message}`, `API Call to ${endpoint}`, severity);
  }

  // Track authentication issues
  trackAuthError(error: string, context: string) {
    this.trackError(`Auth: ${error}`, context, 'high');
  }

  // Track COOP/postMessage issues
  trackPostMessageError(error: string, context: string) {
    this.trackError(`PostMessage: ${error}`, context, 'high');
  }

  private setupGlobalErrorHandlers() {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.trackError(event.error || event.message, 'Global Error Handler', 'high');
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError(event.reason || 'Unhandled Promise Rejection', 'Promise Rejection', 'high');
    });

    // Custom error events
    window.addEventListener('postMessageError', (event: any) => {
      const detail = event.detail;
      this.trackPostMessageError(detail.error.message, detail.context);
    });

    window.addEventListener('gsiError', (event: any) => {
      const detail = event.detail;
      this.trackAuthError(detail.error, detail.context);
    });
  }

  private startPeriodicFlush() {
    this.flushTimer = setInterval(() => {
      this.flushErrors();
      this.flushPerformanceMetrics();
    }, this.flushInterval);
  }

  private async flushErrors() {
    if (this.errorBuffer.length === 0) return;

    try {
      const errorsToSend = [...this.errorBuffer];
      this.errorBuffer = [];

      // Send to monitoring endpoint (if available)
      if (this.isMonitoringEndpointAvailable()) {
        await this.sendErrorsToEndpoint(errorsToSend);
      }

      // Also log to console for development
      if (process.env.NODE_ENV === 'development') {
        console.group('🚨 Error Batch Sent to Monitoring');
        errorsToSend.forEach(error => console.log(error));
        console.groupEnd();
      }
    } catch (error) {
      console.error('Failed to flush errors:', error);
      // Re-add errors to buffer for retry
      this.errorBuffer.unshift(...this.errorBuffer.slice(0, this.maxBufferSize - this.errorBuffer.length));
    }
  }

  private async flushPerformanceMetrics() {
    if (this.performanceBuffer.length === 0) return;

    try {
      const metricsToSend = [...this.performanceBuffer];
      this.performanceBuffer = [];

      // Send to monitoring endpoint (if available)
      if (this.isMonitoringEndpointAvailable()) {
        await this.sendMetricsToEndpoint(metricsToSend);
      }

      // Log for development
      if (process.env.NODE_ENV === 'development') {
        console.group('📊 Performance Metrics Batch Sent');
        metricsToSend.forEach(metric => console.log(metric));
        console.groupEnd();
      }
    } catch (error) {
      console.error('Failed to flush performance metrics:', error);
      // Re-add metrics to buffer for retry
      this.performanceBuffer.unshift(...this.performanceBuffer.slice(0, this.maxBufferSize - this.performanceBuffer.length));
    }
  }

  private async sendImmediateAlert(error: ErrorEvent) {
    try {
      if (this.isMonitoringEndpointAvailable()) {
        await fetch('/api/monitoring/alert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error, alertType: 'immediate' })
        });
      }

      // Also show user notification for critical errors
      this.showUserAlert(error);
    } catch (alertError) {
      console.error('Failed to send immediate alert:', alertError);
    }
  }

  private async sendErrorsToEndpoint(errors: ErrorEvent[]) {
    try {
      const response = await fetch('/api/monitoring/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ errors, batchId: Date.now() })
      });

      if (!response.ok) {
        throw new Error(`Monitoring endpoint returned ${response.status}`);
      }
    } catch (error) {
      console.warn('Monitoring endpoint not available, errors buffered locally');
      throw error;
    }
  }

  private async sendMetricsToEndpoint(metrics: PerformanceMetric[]) {
    try {
      const response = await fetch('/api/monitoring/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics, batchId: Date.now() })
      });

      if (!response.ok) {
        throw new Error(`Metrics endpoint returned ${response.status}`);
      }
    } catch (error) {
      console.warn('Metrics endpoint not available, metrics buffered locally');
      throw error;
    }
  }

  private showUserAlert(error: ErrorEvent) {
    // Show user-friendly alert for critical errors
    const message = `A critical error occurred: ${error.message}. Please refresh the page or contact support if the issue persists.`;

    // Use a toast notification if available, otherwise alert
    if (window.dispatchEvent) {
      const alertEvent = new CustomEvent('showAlert', {
        detail: { message, type: 'error', duration: 10000 }
      });
      window.dispatchEvent(alertEvent);
    } else {
      alert(message);
    }
  }

  private isMonitoringEndpointAvailable(): boolean {
    // Check if monitoring endpoints are available
    return typeof fetch !== 'undefined';
  }

  private getCurrentUserId(): string | undefined {
    try {
      return localStorage.getItem('snapify_user_id') || undefined;
    } catch {
      return undefined;
    }
  }

  // Public methods for external monitoring
  getErrorCount(): number {
    return this.errorBuffer.length;
  }

  getPerformanceMetricsCount(): number {
    return this.performanceBuffer.length;
  }

  clearBuffers() {
    this.errorBuffer = [];
    this.performanceBuffer = [];
  }

  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }
}

// Create singleton instance
export const monitoringService = new MonitoringService();

// Export convenience functions
export const trackError = (error: Error | string, context: string, severity?: ErrorEvent['severity']) =>
  monitoringService.trackError(error, context, severity);

export const trackPerformance = (name: string, value: number, context?: string) =>
  monitoringService.trackPerformance(name, value, context);

export const trackApiError = (endpoint: string, status: number, message: string) =>
  monitoringService.trackApiError(endpoint, status, message);

export const trackWebSocketError = (error: string, context: string) =>
  monitoringService.trackWebSocketError(error, context);

export const trackAuthError = (error: string, context: string) =>
  monitoringService.trackAuthError(error, context);

export const trackPostMessageError = (error: string, context: string) =>
  monitoringService.trackPostMessageError(error, context);