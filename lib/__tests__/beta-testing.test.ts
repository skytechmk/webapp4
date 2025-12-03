import { BetaTestingManager } from '../beta-testing';
import { User, UserRole } from '../../types';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// Declare global types for Jest environment
declare const global: {
  localStorage: typeof localStorageMock;
};

global.localStorage = localStorageMock as any;

describe('BetaTestingManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the singleton instance
    (BetaTestingManager as any).instance = null;
  });

  describe('getCurrentVersion', () => {
    it('should return beta 2.2 for web platform', () => {
      // Mock navigator for web platform
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        configurable: true
      });

      const version = BetaTestingManager.getCurrentVersion();
      expect(version).toBe('beta 2.2');
    });

    it('should return beta 2.2-native for native platforms', () => {
      // Mock navigator for Electron
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Electron/1.0.0',
        configurable: true
      });

      const version = BetaTestingManager.getCurrentVersion();
      expect(version).toBe('beta 2.2-native');
    });
  });

  describe('hasBetaAccess', () => {
    it('should return true for admin users', () => {
      const adminUser = { id: '1', role: UserRole.ADMIN } as User;
      const hasAccess = BetaTestingManager.hasBetaAccess(adminUser);
      expect(hasAccess).toBe(true);
    });

    it('should return false when beta testing is disabled', () => {
      // Temporarily disable beta testing
      const originalConfig = BetaTestingManager.getBetaConfig();
      BetaTestingManager.updateBetaConfig({ enabled: false });

      const user = { id: '1', role: UserRole.USER } as User;
      const hasAccess = BetaTestingManager.hasBetaAccess(user);
      expect(hasAccess).toBe(false);

      // Restore original config
      BetaTestingManager.updateBetaConfig({ enabled: originalConfig.enabled });
    });
  });

  describe('isFeatureEnabled', () => {
    it('should return true for enabled features with correct permissions', () => {
      const user = { id: '1', role: UserRole.USER } as User;
      const isEnabled = BetaTestingManager.isFeatureEnabled('ai-face-detection', user);
      expect(isEnabled).toBe(true);
    });

    it('should return false for disabled features', () => {
      const user = { id: '1', role: UserRole.USER } as User;
      const isEnabled = BetaTestingManager.isFeatureEnabled('performance-analytics', user);
      expect(isEnabled).toBe(false);
    });

    it('should return false for features requiring auth when user is null', () => {
      const isEnabled = BetaTestingManager.isFeatureEnabled('advanced-watermarking', null);
      expect(isEnabled).toBe(false);
    });
  });

  describe('grantBetaAccess', () => {
    it('should grant beta access to user', () => {
      const userId = 'test-user';
      const access = BetaTestingManager.grantBetaAccess(userId);

      expect(access.userId).toBe(userId);
      expect(access.features).toBeDefined();
      expect(access.version).toBeDefined();
    });
  });

  describe('validateBetaAccessCode', () => {
    it('should validate correct access code', () => {
      const isValid = BetaTestingManager.validateBetaAccessCode('SNAPIFY-BETA-2024');
      expect(isValid).toBe(true);
    });

    it('should reject incorrect access code', () => {
      const isValid = BetaTestingManager.validateBetaAccessCode('wrong-code');
      expect(isValid).toBe(false);
    });
  });

  describe('getBetaStats', () => {
    it('should return beta statistics', () => {
      const stats = BetaTestingManager.getBetaStats();

      expect(stats).toHaveProperty('totalBetaUsers');
      expect(stats).toHaveProperty('activeFeatures');
      expect(stats).toHaveProperty('feedbackSubmitted');
      expect(stats).toHaveProperty('version');
    });
  });
});