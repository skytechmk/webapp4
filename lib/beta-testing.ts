/**
 * Beta Testing Feature Flag System
 * Manages beta testing features, version detection, and user access control
 */

import { User, UserRole } from '../types';
import { getCurrentVersion, detectAppVersion } from '../utils/versionDetection';

// Beta Testing Configuration
export interface BetaConfig {
  version: 'v2.1' | 'v2.1-native';
  features: BetaFeature[];
  enabled: boolean;
  betaAccessCode?: string;
  feedbackEnabled: boolean;
  analyticsEnabled: boolean;
  maxBetaUsers: number;
  currentBetaUsers: number;
}

// Beta Feature Flags
export interface BetaFeature {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  requiresAuth: boolean;
  userRoles: UserRole[];
  version: 'v2.1' | 'v2.1-native' | 'both';
}

// Beta User Access
export interface BetaUserAccess {
  userId: string;
  grantedAt: Date;
  features: string[];
  feedbackSubmitted: boolean;
  version: 'v2.1' | 'v2.1-native';
}

// Default Beta Configuration
export const defaultBetaConfig: BetaConfig = {
  version: 'v2.1-native',
  features: [
    {
      id: 'ai-face-detection',
      name: 'AI Face Detection',
      description: 'Advanced face detection for finding photos',
      enabled: true,
      requiresAuth: false,
      userRoles: [UserRole.USER, UserRole.PHOTOGRAPHER, UserRole.ADMIN],
      version: 'both'
    },
    {
      id: 'live-slideshow',
      name: 'Live Slideshow',
      description: 'Real-time slideshow for events',
      enabled: true,
      requiresAuth: false,
      userRoles: [UserRole.USER, UserRole.PHOTOGRAPHER, UserRole.ADMIN],
      version: 'both'
    },
    {
      id: 'advanced-watermarking',
      name: 'Advanced Watermarking',
      description: 'Professional watermarking tools',
      enabled: true,
      requiresAuth: true,
      userRoles: [UserRole.PHOTOGRAPHER, UserRole.ADMIN],
      version: 'both'
    },
    {
      id: 'beta-feedback',
      name: 'Beta Feedback System',
      description: 'Submit feedback and bug reports',
      enabled: true,
      requiresAuth: false,
      userRoles: [UserRole.USER, UserRole.PHOTOGRAPHER, UserRole.ADMIN],
      version: 'both'
    },
    {
      id: 'performance-analytics',
      name: 'Performance Analytics',
      description: 'Advanced performance monitoring',
      enabled: false,
      requiresAuth: true,
      userRoles: [UserRole.ADMIN],
      version: 'v2.1-native'
    }
  ],
  enabled: true,
  betaAccessCode: 'SNAPIFY-BETA-2024',
  feedbackEnabled: true,
  analyticsEnabled: false,
  maxBetaUsers: 1000,
  currentBetaUsers: 0
};

// Beta Testing Manager Class
export class BetaTestingManager {
  private static STORAGE_KEY = 'beta_testing_config';
  private static USER_ACCESS_KEY = 'beta_user_access';

  /**
   * Get current beta configuration
   */
  static getBetaConfig(): BetaConfig {
    if (typeof window === 'undefined') {
      return defaultBetaConfig;
    }

    const storedConfig = localStorage.getItem(this.STORAGE_KEY);
    return storedConfig ? JSON.parse(storedConfig) : { ...defaultBetaConfig };
  }

  /**
   * Update beta configuration
   */
  static updateBetaConfig(config: Partial<BetaConfig>): BetaConfig {
    if (typeof window === 'undefined') {
      return defaultBetaConfig;
    }

    const currentConfig = this.getBetaConfig();
    const updatedConfig = { ...currentConfig, ...config };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedConfig));
    return updatedConfig;
  }

  /**
   * Detect current app version
   */
  static getCurrentVersion(): 'v2.1' | 'v2.1-native' {
    return getCurrentVersion();
  }

  /**
   * Get detailed version information
   */
  static getVersionInfo() {
    return detectAppVersion();
  }

  /**
   * Check if beta testing is enabled
   */
  static isBetaEnabled(): boolean {
    const config = this.getBetaConfig();
    return config.enabled;
  }

  /**
   * Check if user has beta access
   */
  static hasBetaAccess(user: User | null): boolean {
    if (!this.isBetaEnabled()) return false;

    // Admin always has access
    if (user?.role === UserRole.ADMIN) return true;

    // Check stored beta access
    const userAccess = this.getUserBetaAccess(user?.id);
    if (userAccess) return true;

    // Check if user is within beta user limit
    const config = this.getBetaConfig();
    return config.currentBetaUsers < config.maxBetaUsers;
  }

  /**
   * Grant beta access to user
   */
  static grantBetaAccess(userId: string, features: string[] = []): BetaUserAccess {
    const config = this.getBetaConfig();
    const userAccess: BetaUserAccess = {
      userId,
      grantedAt: new Date(),
      features: features.length > 0 ? features : config.features.map(f => f.id),
      feedbackSubmitted: false,
      version: this.getCurrentVersion()
    };

    // Store user access
    const allAccess = this.getAllBetaUserAccess();
    allAccess[userId] = userAccess;
    localStorage.setItem(this.USER_ACCESS_KEY, JSON.stringify(allAccess));

    // Update beta user count
    this.updateBetaConfig({ currentBetaUsers: config.currentBetaUsers + 1 });

    return userAccess;
  }

  /**
   * Get user's beta access information
   */
  static getUserBetaAccess(userId?: string): BetaUserAccess | null {
    if (!userId || typeof window === 'undefined') return null;

    const allAccess = this.getAllBetaUserAccess();
    return allAccess[userId] || null;
  }

  /**
   * Get all beta user access records
   */
  private static getAllBetaUserAccess(): Record<string, BetaUserAccess> {
    if (typeof window === 'undefined') return {};

    const stored = localStorage.getItem(this.USER_ACCESS_KEY);
    return stored ? JSON.parse(stored) : {};
  }

  /**
   * Check if a specific feature is enabled for user
   */
  static isFeatureEnabled(featureId: string, user: User | null): boolean {
    if (!this.isBetaEnabled()) return false;

    const config = this.getBetaConfig();
    const feature = config.features.find(f => f.id === featureId);

    if (!feature?.enabled) return false;

    // Check version compatibility
    const currentVersion = this.getCurrentVersion();
    if (feature.version !== 'both' && feature.version !== currentVersion) return false;

    // Check authentication requirement
    if (feature.requiresAuth && !user) return false;

    // Check user role
    if (user && !feature.userRoles.includes(user.role)) return false;

    // Check user has beta access
    if (!this.hasBetaAccess(user)) return false;

    // Check if user has access to this specific feature
    const userAccess = this.getUserBetaAccess(user?.id);
    if (userAccess && !userAccess.features.includes(featureId)) return false;

    return true;
  }

  /**
   * Get all enabled features for user
   */
  static getEnabledFeatures(user: User | null): BetaFeature[] {
    const config = this.getBetaConfig();
    return config.features.filter(feature => this.isFeatureEnabled(feature.id, user));
  }

  /**
   * Validate beta access code
   */
  static validateBetaAccessCode(code: string): boolean {
    const config = this.getBetaConfig();
    return config.betaAccessCode === code;
  }

  /**
   * Submit beta feedback
   */
  static submitBetaFeedback(userId: string, feedback: {
    rating: number;
    comments: string;
    feature: string;
    category: 'bug' | 'feature-request' | 'improvement' | 'general';
  }): void {
    const userAccess = this.getUserBetaAccess(userId);
    if (userAccess) {
      userAccess.feedbackSubmitted = true;
      const allAccess = this.getAllBetaUserAccess();
      allAccess[userId] = userAccess;
      localStorage.setItem(this.USER_ACCESS_KEY, JSON.stringify(allAccess));
    }

    // In a real implementation, this would send to a backend service
    console.log('Beta feedback submitted:', { userId, feedback });
  }

  /**
   * Get beta testing statistics
   */
  static getBetaStats(): {
    totalBetaUsers: number;
    activeFeatures: number;
    feedbackSubmitted: number;
    version: string;
  } {
    const config = this.getBetaConfig();
    const allAccess = this.getAllBetaUserAccess();
    const feedbackCount = Object.values(allAccess).filter(access => access.feedbackSubmitted).length;

    return {
      totalBetaUsers: config.currentBetaUsers,
      activeFeatures: config.features.filter(f => f.enabled).length,
      feedbackSubmitted: feedbackCount,
      version: this.getCurrentVersion()
    };
  }

  /**
   * Reset beta testing data (admin only)
   */
  static resetBetaTesting(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.USER_ACCESS_KEY);
    }
  }
}

// Export singleton instance
export const betaTesting = BetaTestingManager;
export default betaTesting;