/**
 * Authentication Store - Centralized auth state management
 * React-based implementation with TypeScript typing
 */

import { User } from '../../types';
import { BetaTestingManager } from '../beta-testing';

// Auth State Interface
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

// Initial Auth State
const initialAuthState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  lastUpdated: null
};

// Create auth store using React state
export const createAuthStore = () => {
  // Internal state
  let state: AuthState = { ...initialAuthState };
  let listeners: ((state: AuthState) => void)[] = [];

  // Notify all listeners of state changes
  const notifyListeners = () => {
    listeners.forEach(listener => listener({ ...state }));
  };

  return {
    // Subscribe to state changes
    subscribe: (listener: (state: AuthState) => void) => {
      listeners.push(listener);

      // Return unsubscribe function
      return () => {
        listeners = listeners.filter(l => l !== listener);
      };
    },

    // Get current state
    getState: (): AuthState => ({ ...state }),

    // Initialize auth state from local storage
    initialize: () => {
      try {
        // Check for token in localStorage
        const token = localStorage.getItem('auth_token');
        const userData = localStorage.getItem('auth_user');

        if (token && userData) {
          state = {
            user: JSON.parse(userData),
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            lastUpdated: new Date()
          };
        } else {
          state = { ...state, isLoading: false };
        }

        notifyListeners();
      } catch (error) {
        console.error('Auth initialization error:', error);
        state = {
          ...state,
          isLoading: false,
          error: 'Initialization failed'
        };
        notifyListeners();
      }
    },

    /**
     * Login action - updates auth state
     */
    login: (user: User, token: string) => {
      // Check and update beta access information
      const hasBetaAccess = BetaTestingManager.hasBetaAccess(user);
      const betaFeatures = hasBetaAccess ? BetaTestingManager.getEnabledFeatures(user).map(f => f.id) : [];
      const userWithBeta = {
        ...user,
        betaAccess: hasBetaAccess,
        betaVersion: hasBetaAccess ? BetaTestingManager.getCurrentVersion() : undefined,
        betaFeatures: hasBetaAccess ? betaFeatures : undefined
      };

      // Store in localStorage
      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_user', JSON.stringify(userWithBeta));

      state = {
        user: userWithBeta,
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        lastUpdated: new Date()
      };

      notifyListeners();
    },

    /**
     * Logout action - clears auth state
     */
    logout: () => {
      // Clear from localStorage
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');

      state = {
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        lastUpdated: new Date()
      };

      notifyListeners();
    },

    /**
     * Update user data
     */
    updateUser: (userUpdates: Partial<User>) => {
      if (!state.user) return;

      const updatedUser = { ...state.user, ...userUpdates };

      // Update localStorage
      localStorage.setItem('auth_user', JSON.stringify(updatedUser));

      state = {
        ...state,
        user: updatedUser,
        lastUpdated: new Date()
      };

      notifyListeners();
    },

    /**
     * Set loading state
     */
    setLoading: (isLoading: boolean) => {
      state = { ...state, isLoading };
      notifyListeners();
    },

    /**
     * Set error state
     */
    setError: (error: string | null) => {
      state = { ...state, error };
      notifyListeners();
    },

    /**
     * Clear error state
     */
    clearError: () => {
      state = { ...state, error: null };
      notifyListeners();
    },

    /**
     * Refresh token
     */
    refreshToken: (newToken: string) => {
      // Update token in localStorage
      localStorage.setItem('auth_token', newToken);

      state = {
        ...state,
        token: newToken,
        lastUpdated: new Date()
      };

      notifyListeners();
    },

    /**
     * Check if authenticated
     */
    isAuthenticated: (): boolean => {
      return state.isAuthenticated;
    },

    /**
     * Get current user
     */
    getUser: (): User | null => {
      return state.user;
    },

    /**
     * Get current token
     */
    getToken: (): string | null => {
      return state.token;
    },

    /**
     * Grant beta access to current user
     */
    grantBetaAccess: () => {
      if (!state.user) return;

      const userId = state.user.id;
      BetaTestingManager.grantBetaAccess(userId);

      const updatedUser = {
        ...state.user,
        betaAccess: true,
        betaAccessGrantedAt: new Date().toISOString(),
        betaVersion: BetaTestingManager.getCurrentVersion(),
        betaFeatures: BetaTestingManager.getEnabledFeatures(state.user).map(f => f.id)
      };

      // Update localStorage
      localStorage.setItem('auth_user', JSON.stringify(updatedUser));

      state = {
        ...state,
        user: updatedUser,
        lastUpdated: new Date()
      };

      notifyListeners();
    },

    /**
     * Check if current user has beta access
     */
    hasBetaAccess: (): boolean => {
      return state.user ? BetaTestingManager.hasBetaAccess(state.user) : false;
    },

    /**
     * Get enabled beta features for current user
     */
    getEnabledBetaFeatures: () => {
      return state.user ? BetaTestingManager.getEnabledFeatures(state.user) : [];
    }
  };
};

// Create and export the auth store instance
export const authStore = createAuthStore();

// Export type for external use