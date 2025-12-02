import React from 'react';
import { BetaTestingManager } from '../lib/beta-testing';
import { getVersionDisplayString } from '../utils/versionDetection';

interface BetaBadgeProps {
  className?: string;
  showVersion?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const BetaBadge: React.FC<BetaBadgeProps> = ({
  className = '',
  showVersion = true,
  size = 'sm'
}) => {
  const versionInfo = BetaTestingManager.getVersionInfo();
  const isBetaEnabled = BetaTestingManager.isBetaEnabled();

  if (!isBetaEnabled) return null;

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  };

  return (
    <div className={`inline-flex items-center bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-full shadow-lg ${sizeClasses[size]} ${className}`}>
      <span className="mr-1">β</span>
      {showVersion && (
        <span className="opacity-90">
          {versionInfo.version.replace('v', '')}
        </span>
      )}
    </div>
  );
};

interface BetaFeatureIndicatorProps {
  featureId: string;
  user: any;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const BetaFeatureIndicator: React.FC<BetaFeatureIndicatorProps> = ({
  featureId,
  user,
  children,
  fallback = null
}) => {
  const isEnabled = BetaTestingManager.isFeatureEnabled(featureId, user);

  if (!isEnabled) {
    return <>{fallback}</>;
  }

  return (
    <div className="relative">
      {children}
      <div className="absolute -top-1 -right-1">
        <BetaBadge size="sm" showVersion={false} />
      </div>
    </div>
  );
};

interface VersionIndicatorProps {
  className?: string;
  showPlatform?: boolean;
}

export const VersionIndicator: React.FC<VersionIndicatorProps> = ({
  className = '',
  showPlatform = true
}) => {
  const versionString = getVersionDisplayString();

  return (
    <div className={`inline-flex items-center text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md ${className}`}>
      {showPlatform ? versionString : `v${versionString.split(' ')[0]}`}
    </div>
  );
};