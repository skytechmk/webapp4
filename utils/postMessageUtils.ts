/**
 * PostMessage Utility Functions
 * Handles cross-origin communication with proper error handling
 */

import { trackPostMessageError } from './monitoring';

// Extend Window interface for Google Sign-In
declare global {
  interface Window {
    google?: any; // Use any to avoid conflicts with existing declarations
  }
}

// PostMessage Error Types
export enum PostMessageErrorType {
  BLOCKED_BY_COOP = 'BLOCKED_BY_COOP',
  SECURITY_ERROR = 'SECURITY_ERROR',
  TIMEOUT = 'TIMEOUT',
  INVALID_ORIGIN = 'INVALID_ORIGIN',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// PostMessage Error Interface
export interface PostMessageError extends Error {
  type: PostMessageErrorType;
  originalError?: Error;
  origin?: string;
  targetOrigin?: string;
  messageData?: any;
}

// PostMessage Options Interface
export interface PostMessageOptions {
  targetOrigin: string;
  timeout?: number;
  expectedResponseType?: string;
  retryCount?: number;
}

// Safe PostMessage Function with Error Handling
export const safePostMessage = (
  targetWindow: Window,
  message: any,
  options: PostMessageOptions
): Promise<any> => {
  return new Promise((resolve, reject) => {
    // Validate target window
    if (!targetWindow || !targetWindow.postMessage) {
      const error: PostMessageError = new Error('Invalid target window') as PostMessageError;
      error.type = PostMessageErrorType.UNKNOWN_ERROR;
      return reject(error);
    }

    // Generate unique message ID for response tracking
    const messageId = `pm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const messageWithId = {
      ...message,
      __postMessageId: messageId,
      __timestamp: Date.now()
    };

    // Set up response listener
    const responseHandler = (event: MessageEvent) => {
      // Validate the response origin for security
      if (event.origin !== options.targetOrigin) {
        console.warn(`PostMessage: Invalid origin ${event.origin}, expected ${options.targetOrigin}`);
        return;
      }

      // Check if this is the response to our message
      if (event.data?.__postMessageId === messageId) {
        cleanup();
        resolve(event.data);
      }
    };

    // Set up error listener for postMessage failures
    const errorHandler = (event: ErrorEvent) => {
      if (event.message.includes('postMessage') || event.message.includes('Cross-Origin-Opener-Policy')) {
        cleanup();
        const error: PostMessageError = new Error(`PostMessage blocked: ${event.message}`) as PostMessageError;
        error.type = PostMessageErrorType.BLOCKED_BY_COOP;
        error.originalError = event.error;
        reject(error);
      }
    };

    // Set up timeout
    const timeoutId = options.timeout
      ? setTimeout(() => {
          cleanup();
          const error: PostMessageError = new Error(`PostMessage timeout after ${options.timeout}ms`) as PostMessageError;
          error.type = PostMessageErrorType.TIMEOUT;
          error.targetOrigin = options.targetOrigin;
          error.messageData = message;
          reject(error);
        }, options.timeout)
      : null;

    // Cleanup function
    const cleanup = () => {
      window.removeEventListener('message', responseHandler);
      window.removeEventListener('error', errorHandler);
      if (timeoutId) clearTimeout(timeoutId);
    };

    // Add event listeners
    window.addEventListener('message', responseHandler);
    window.addEventListener('error', errorHandler);

    // Try to send the message with error handling
    try {
      targetWindow.postMessage(messageWithId, options.targetOrigin);
    } catch (error) {
      cleanup();
      const postMessageError: PostMessageError = new Error(`Failed to send postMessage: ${error instanceof Error ? error.message : String(error)}`) as PostMessageError;

      if (error instanceof Error) {
        if (error.message.includes('Cross-Origin-Opener-Policy') || error.message.includes('blocked')) {
          postMessageError.type = PostMessageErrorType.BLOCKED_BY_COOP;
        } else if (error.message.includes('SecurityError')) {
          postMessageError.type = PostMessageErrorType.SECURITY_ERROR;
        } else {
          postMessageError.type = PostMessageErrorType.UNKNOWN_ERROR;
        }
        postMessageError.originalError = error;
      }

      reject(postMessageError);
    }
  });
};

// PostMessage Error Handler
export const handlePostMessageError = (error: PostMessageError, context: string, fallbackAction?: () => void) => {
  console.error(`[POST_MESSAGE_ERROR] ${context}:`, error);

  // Track postMessage error for monitoring
  trackPostMessageError(`${error.type}: ${error.message}`, context);

  // Dispatch error event for global handling
  const errorEvent = new CustomEvent('postMessageError', {
    detail: {
      error: error,
      context: context,
      timestamp: new Date().toISOString(),
      type: error.type
    }
  });
  window.dispatchEvent(errorEvent);

  // Execute fallback action if provided
  if (fallbackAction) {
    try {
      fallbackAction();
    } catch (fallbackError) {
      console.error(`[POST_MESSAGE_ERROR] Fallback action failed:`, fallbackError);
    }
  }

  // Return error information for logging
  return {
    handled: true,
    errorType: error.type,
    message: error.message,
    timestamp: new Date().toISOString()
  };
};

// PostMessage Validation Utility
export const validatePostMessageOrigin = (origin: string, allowedOrigins: string[]): boolean => {
  try {
    const url = new URL(origin);
    return allowedOrigins.some(allowedOrigin => {
      try {
        const allowedUrl = new URL(allowedOrigin);
        return url.hostname === allowedUrl.hostname &&
               (allowedUrl.protocol === '*' || url.protocol === allowedUrl.protocol) &&
               (allowedUrl.port === '' || url.port === allowedUrl.port);
      } catch {
        // If allowedOrigin is not a valid URL, treat it as exact match
        return origin === allowedOrigin;
      }
    });
  } catch {
    return false;
  }
};

// PostMessage Retry Utility
export const retryPostMessage = async (
  targetWindow: Window,
  message: any,
  options: PostMessageOptions,
  maxRetries: number = 3
): Promise<any> => {
  let lastError: PostMessageError | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await safePostMessage(targetWindow, message, {
        ...options,
        retryCount: attempt
      });
    } catch (error) {
      lastError = error as PostMessageError;
      console.warn(`PostMessage attempt ${attempt} failed:`, error);

      // Don't retry for certain error types
      if (lastError.type === PostMessageErrorType.BLOCKED_BY_COOP) {
        break;
      }

      // Exponential backoff
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError;
};

// PostMessage Fallback Strategies
export const postMessageFallbacks = {
  googleSignIn: (): void => {
    console.log('Attempting Google Sign-In fallback...');
    if (window.google && window.google.accounts && window.google.accounts.id) {
      try {
        window.google.accounts.id.prompt();
      } catch (error) {
        console.error('Google Sign-In fallback failed:', error);
      }
    }
  },

  reloadWithCleanState: (): void => {
    console.log('Reloading with clean state...');
    try {
      // Clear any problematic state
      localStorage.removeItem('google_auth_state');
      sessionStorage.removeItem('google_auth_state');

      // Reload the page
      window.location.reload();
    } catch (error) {
      console.error('Reload fallback failed:', error);
    }
  }
};