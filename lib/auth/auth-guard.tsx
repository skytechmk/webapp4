/**
 * Authentication Guard - Route protection and authorization
 * Provides comprehensive auth guards for React/Next.js applications
 */

import { authStore, type AuthState } from './auth-store';
import { UserPreferences } from './user-preferences';
import { jwtDecode } from 'jwt-decode';
import React from 'react';
import type { User } from '../../types';

// Enhanced AuthState with additional methods
interface AuthGuardState extends AuthState {
  init: () => Promise<void>;
  getAuthState: () => AuthState;
  getTokens: () => { accessToken: string | null; refreshToken: string | null };
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: User | null) => void;
  createSession: (user: User, tokens: { accessToken: string; refreshToken: string }) => void;
  getPreferences: () => UserPreferences;
  setPreferences: (preferences: Partial<UserPreferences>) => void;
  invalidateSession: () => void;
  clearAll: () => void;
  updateSessionActivity: () => void;
}

// Extend authStore with guard-specific methods
const authGuard: AuthGuardState = {
  ...authStore,
  // Add base AuthState properties to satisfy the interface
  get user() {
    return authStore.getUser();
  },
  get token() {
    return authStore.getToken();
  },
  get isLoading() {
    let state: AuthState;
    authStore.subscribe(s => { state = s; })();
    return state?.isLoading || false;
  },
  get error() {
    let state: AuthState;
    authStore.subscribe(s => { state = s; })();
    return state?.error || null;
  },
  get lastUpdated() {
    let state: AuthState;
    authStore.subscribe(s => { state = s; })();
    return state?.lastUpdated || null;
  },
  get isAuthenticated() {
    return authStore.isAuthenticated();
  },

  // Initialize auth guard with session validation
  init: async function() {
    try {
      // Initialize base auth store
      authStore.initialize();

      // Check for existing session
      const currentState = this.getAuthState();

      if (currentState.token) {
        // Validate token expiration
        try {
          const decoded = jwtDecode(currentState.token);
          const isExpired = decoded.exp ? decoded.exp * 1000 < Date.now() : true;

          if (isExpired) {
            this.invalidateSession();
          }
        } catch (error) {
          this.invalidateSession();
        }
      }
    } catch (error) {
      console.error('AuthGuard initialization failed:', error);
      this.clearAll();
    }
  },

  // Get current auth state
  getAuthState: function() {
    let state: AuthState;
    authStore.subscribe(s => { state = s; })();
    return state || {
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      lastUpdated: null
    };
  },

  // Get tokens (access and refresh)
  getTokens: function() {
    const state = this.getAuthState();
    return {
      accessToken: state.token,
      refreshToken: localStorage.getItem('refresh_token')
    };
  },

  // Set both access and refresh tokens
  setTokens: function(accessToken: string, refreshToken: string) {
    localStorage.setItem('auth_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    authStore.login(this.getAuthState().user || null, accessToken);
  },

  // Set user data
  setUser: function(user: User | null) {
    if (user) {
      localStorage.setItem('auth_user', JSON.stringify(user));
      authStore.updateUser(user);
    } else {
      localStorage.removeItem('auth_user');
    }
  },

  // Create complete session
  createSession: function(user: User, tokens: { accessToken: string; refreshToken: string }) {
    this.setUser(user);
    this.setTokens(tokens.accessToken, tokens.refreshToken);
    this.updateSessionActivity();
  },

  // Get user preferences
  getPreferences: function() {
    const prefs = localStorage.getItem('user_preferences');
    return prefs ? JSON.parse(prefs) : {
      theme: 'system',
      notifications: true,
      language: 'en',
      density: 'comfortable'
    };
  },

  // Set user preferences
  setPreferences: function(preferences: Partial<UserPreferences>) {
    const currentPrefs = this.getPreferences();
    const updatedPrefs = { ...currentPrefs, ...preferences };
    localStorage.setItem('user_preferences', JSON.stringify(updatedPrefs));
  },

  // Invalidate current session
  invalidateSession: function() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    authStore.logout();
  },

  // Clear all auth-related data
  clearAll: function() {
    this.invalidateSession();
    localStorage.removeItem('auth_user');
    localStorage.removeItem('user_preferences');
  },

  // Update session activity timestamp
  updateSessionActivity: function() {
    localStorage.setItem('last_activity', new Date().toISOString());
  }
};

// Route Guard Functions
export const withAuthGuard = (Component: React.ComponentType) => {
  return function AuthGuardedComponent(props: any) {
    const [isLoading, setIsLoading] = React.useState(true);
    const [isAuthenticated, setIsAuthenticated] = React.useState(false);

    React.useEffect(() => {
      const checkAuth = async () => {
        try {
          await authGuard.init();
          const state = authGuard.getAuthState();
          setIsAuthenticated(state.isAuthenticated);

          // Check token validity
          if (state.token) {
            try {
              const decoded = jwtDecode(state.token);
              const isExpired = decoded.exp ? decoded.exp * 1000 < Date.now() : true;

              if (isExpired) {
                authGuard.invalidateSession();
                setIsAuthenticated(false);
              }
            } catch (error) {
              authGuard.invalidateSession();
              setIsAuthenticated(false);
            }
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          setIsAuthenticated(false);
        } finally {
          setIsLoading(false);
        }
      };

      checkAuth();
    }, []);

    if (isLoading) {
      return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
    }

    if (!isAuthenticated) {
      // Redirect to login or show unauthorized
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return null;
    }

    return <Component {...props} />;
  };
};

// Role-based guard
export const withRoleGuard = (requiredRole: string) => (Component: React.ComponentType) => {
  return function RoleGuardedComponent(props: any) {
    const [isLoading, setIsLoading] = React.useState(true);
    const [hasAccess, setHasAccess] = React.useState(false);

    React.useEffect(() => {
      const checkRole = async () => {
        try {
          await authGuard.init();
          const state = authGuard.getAuthState();

          if (!state.isAuthenticated) {
            setHasAccess(false);
            return;
          }

          // Check user role
          const hasRequiredRole = state.user?.role === requiredRole || state.user?.role === 'ADMIN';
          setHasAccess(hasRequiredRole);
        } catch (error) {
          console.error('Role check failed:', error);
          setHasAccess(false);
        } finally {
          setIsLoading(false);
        }
      };

      checkRole();
    }, []);

    if (isLoading) {
      return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
    }

    if (!hasAccess) {
      if (typeof window !== 'undefined') {
        window.location.href = '/unauthorized';
      }
      return <div className="text-center py-8">Unauthorized Access</div>;
    }

    return <Component {...props} />;
  };
};

// API Guard - for server-side authentication
export const withApiGuard = (handler: any) => {
  return async (req: any, res: any) => {
    try {
      // Initialize auth guard
      await authGuard.init();

      // Check authorization header
      const authHeader = req.headers['authorization'];
      const token = authHeader?.split(' ')[1];

      if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Validate token
      try {
        const decoded = jwtDecode(token);
        const isExpired = decoded.exp ? decoded.exp * 1000 < Date.now() : true;

        if (isExpired) {
          return res.status(401).json({ error: 'Token expired' });
        }

        // Set token in auth guard
        authGuard.setTokens(token, '');

        // Call original handler
        return handler(req, res);
      } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
      }
    } catch (error) {
      console.error('API Guard error:', error);
      return res.status(500).json({ error: 'Authentication failed' });
    }
  };
};

// Session management utilities
export const checkSessionValidity = () => {
  const state = authGuard.getAuthState();

  if (!state.token) return false;

  try {
    const decoded = jwtDecode(state.token);
    return !!(decoded.exp && decoded.exp * 1000 > Date.now());
  } catch (error) {
    return false;
  }
};

export const refreshSession = async (refreshToken: string) => {
  try {
    // In a real app, this would call your auth API to get new tokens
    // For now, we'll simulate token refresh
    const newAccessToken = `new_token_${Date.now()}`;
    authGuard.setTokens(newAccessToken, refreshToken);
    return { success: true, accessToken: newAccessToken };
  } catch (error) {
    console.error('Session refresh failed:', error);
    authGuard.invalidateSession();
    return { success: false, error: 'Refresh failed' };
  }
};

// Export the auth guard instance
export default authGuard;
export { authGuard };