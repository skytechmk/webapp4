/**
 * Version Detection Utility
 * Detects whether the app is running as v2.1 web or v2.1 Native
 */

export type AppVersion = 'v2.1' | 'v2.1-native';

export interface VersionInfo {
  version: AppVersion;
  isNative: boolean;
  platform: 'web' | 'ios' | 'android' | 'electron' | 'unknown';
  userAgent: string;
  features: string[];
}

/**
 * Detect the current app version and platform
 */
export function detectAppVersion(): VersionInfo {
  if (typeof window === 'undefined') {
    return {
      version: 'v2.1',
      isNative: false,
      platform: 'unknown',
      userAgent: '',
      features: []
    };
  }

  const userAgent = navigator.userAgent;
  const platform = navigator.platform;

  // Check for native app indicators
  const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
  const isAndroid = /Android/.test(userAgent);
  const isElectron = /Electron/.test(userAgent);
  const isCordova = !!(window as any).cordova;
  const isCapacitor = !!(window as any).Capacitor;

  // Check for custom native app indicators
  const isSnapifyNative = userAgent.includes('SnapifyNative') ||
                         userAgent.includes('Snapify/2.1') ||
                         window.location.protocol === 'file:' ||
                         (window.location.hostname === 'localhost' && window.location.port === '3000' && isElectron);

  // Determine platform
  let detectedPlatform: 'web' | 'ios' | 'android' | 'electron' | 'unknown' = 'web';

  if (isElectron) {
    detectedPlatform = 'electron';
  } else if (isIOS && (isCordova || isCapacitor || isSnapifyNative)) {
    detectedPlatform = 'ios';
  } else if (isAndroid && (isCordova || isCapacitor || isSnapifyNative)) {
    detectedPlatform = 'android';
  }

  // Determine version
  const isNative = detectedPlatform === 'ios' || detectedPlatform === 'android' || detectedPlatform === 'electron';
  const version: AppVersion = isNative ? 'v2.1-native' : 'v2.1';

  // Detect available features based on platform
  const features: string[] = [];

  if (isNative) {
    features.push('native-camera', 'native-storage', 'push-notifications', 'offline-mode');
  } else {
    features.push('web-camera', 'web-storage', 'service-worker');
  }

  // Add common features
  features.push('ai-face-detection', 'live-slideshow', 'watermarking', 'beta-testing');

  return {
    version,
    isNative,
    platform: detectedPlatform,
    userAgent,
    features
  };
}

/**
 * Check if running in native app
 */
export function isNativeApp(): boolean {
  return detectAppVersion().isNative;
}

/**
 * Get current app version
 */
export function getCurrentVersion(): AppVersion {
  return detectAppVersion().version;
}

/**
 * Check if a specific feature is available
 */
export function hasFeature(feature: string): boolean {
  return detectAppVersion().features.includes(feature);
}

/**
 * Get version-specific configuration
 */
export function getVersionConfig() {
  const versionInfo = detectAppVersion();

  return {
    version: versionInfo.version,
    isNative: versionInfo.isNative,
    platform: versionInfo.platform,
    // Version-specific settings
    cameraApi: versionInfo.isNative ? 'native' : 'web',
    storageApi: versionInfo.isNative ? 'native' : 'web',
    notificationApi: versionInfo.isNative ? 'native' : 'web',
    offlineSupport: versionInfo.isNative,
    performanceMode: versionInfo.isNative ? 'optimized' : 'standard'
  };
}

/**
 * Get version display string
 */
export function getVersionDisplayString(): string {
  const versionInfo = detectAppVersion();
  const platformMap = {
    web: 'Web',
    ios: 'iOS',
    android: 'Android',
    electron: 'Desktop',
    unknown: 'Unknown'
  };

  return `${versionInfo.version} ${platformMap[versionInfo.platform]}`;
}

/**
 * Check if version supports a specific capability
 */
export function supportsCapability(capability: string): boolean {
  const versionInfo = detectAppVersion();

  const capabilityMap: Record<string, boolean> = {
    'native-camera': versionInfo.platform === 'ios' || versionInfo.platform === 'android',
    'web-camera': versionInfo.platform === 'web' || versionInfo.platform === 'electron',
    'push-notifications': versionInfo.isNative,
    'offline-mode': versionInfo.isNative,
    'advanced-watermarking': true, // Available on all versions
    'ai-face-detection': true, // Available on all versions
    'live-slideshow': true, // Available on all versions
    'beta-testing': true // Available on all versions
  };

  return capabilityMap[capability] || false;
}