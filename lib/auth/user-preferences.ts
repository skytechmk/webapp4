/**
 * User Preferences Management
 * Handles user-specific settings and preferences
 */

// User Preferences Interface
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  language: string;
  density: 'comfortable' | 'compact' | 'cozy';
  fontSize: 'small' | 'medium' | 'large';
  colorScheme: 'default' | 'high-contrast';
  animations: boolean;
  sidebarCollapsed: boolean;
  lastActiveTab?: string;
  // Beta testing preferences
  betaNotifications: boolean;
  betaFeaturePreviews: boolean;
  betaFeedbackReminders: boolean;
}

// Default Preferences
export const defaultPreferences: UserPreferences = {
  theme: 'system',
  notifications: true,
  language: 'en',
  density: 'comfortable',
  fontSize: 'medium',
  colorScheme: 'default',
  animations: true,
  sidebarCollapsed: false,
  // Beta testing defaults
  betaNotifications: true,
  betaFeaturePreviews: true,
  betaFeedbackReminders: true
};

// Preferences Management Class
export class UserPreferencesManager {
  private static STORAGE_KEY = 'user_preferences';

  /**
   * Get current preferences
   */
  static getPreferences(): UserPreferences {
    if (typeof window === 'undefined') {
      return defaultPreferences;
    }

    const storedPrefs = localStorage.getItem(this.STORAGE_KEY);
    return storedPrefs ? JSON.parse(storedPrefs) : { ...defaultPreferences };
  }

  /**
   * Set preferences
   */
  static setPreferences(preferences: Partial<UserPreferences>): UserPreferences {
    if (typeof window === 'undefined') {
      return defaultPreferences;
    }

    const currentPrefs = this.getPreferences();
    const updatedPrefs = { ...currentPrefs, ...preferences };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedPrefs));
    return updatedPrefs;
  }

  /**
   * Reset to default preferences
   */
  static resetPreferences(): UserPreferences {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY);
    }
    return { ...defaultPreferences };
  }

  /**
   * Apply theme preferences to document
   */
  static applyThemePreferences() {
    if (typeof window === 'undefined') return;

    const prefs = this.getPreferences();

    // Apply theme
    if (prefs.theme === 'system') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', systemPrefersDark);
    } else {
      document.documentElement.classList.toggle('dark', prefs.theme === 'dark');
    }

    // Apply density
    document.documentElement.classList.remove('density-comfortable', 'density-compact', 'density-cozy');
    document.documentElement.classList.add(`density-${prefs.density}`);

    // Apply font size
    document.documentElement.classList.remove('font-small', 'font-medium', 'font-large');
    document.documentElement.classList.add(`font-${prefs.fontSize}`);
  }

  /**
   * Initialize preferences on app load
   */
  static initialize() {
    this.applyThemePreferences();

    // Set up theme change listener for system theme
    if (typeof window !== 'undefined') {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        const prefs = this.getPreferences();
        if (prefs.theme === 'system') {
          document.documentElement.classList.toggle('dark', e.matches);
        }
      });
    }
  }
}

// Export preferences manager
export const userPreferences = new UserPreferencesManager();
export default userPreferences;