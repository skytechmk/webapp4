// Video upload permissions utility

import { User, TierLevel, getTierConfigForUser, getTierConfig, TIER_CONFIG } from '../types';

export interface VideoPermissionResult {
    allowed: boolean;
    reason?: string;
    upgradeRequired?: boolean;
    requiredTier?: TierLevel;
}

/**
 * Check if a user can upload videos based on their current tier or event host's tier
 */
export function canUploadVideos(user: User | null, eventHostTier?: TierLevel): VideoPermissionResult {
    // If user is authenticated and is admin, always allow
    if (user?.role === 'ADMIN') {
        return { allowed: true };
    }

    // Check user's own tier first
    if (user) {
        const userConfig = getTierConfigForUser(user);
        if (userConfig.allowVideo) {
            return { allowed: true };
        }
    }

    // If event host has video permissions, guests can upload videos
    if (eventHostTier) {
        const hostConfig = getTierConfig(eventHostTier);
        if (hostConfig.allowVideo) {
            return { allowed: true };
        }
    }

    // If user is not authenticated, check if event host allows guest video uploads
    if (!user && eventHostTier) {
        const hostConfig = getTierConfig(eventHostTier);
        if (hostConfig.allowVideo) {
            return { allowed: true };
        }
    }

    // Determine which tier is required
    const requiredTier = TIER_CONFIG[TierLevel.PRO].allowVideo ? TierLevel.PRO :
        TIER_CONFIG[TierLevel.STUDIO].allowVideo ? TierLevel.STUDIO :
            TierLevel.PRO; // fallback

    if (!user) {
        return {
            allowed: false,
            reason: 'Video uploads require an account with Pro plan or higher, or upload to an event hosted by a Pro+ user',
            upgradeRequired: true,
            requiredTier
        };
    }

    return {
        allowed: false,
        reason: `Video uploads require ${requiredTier} plan or higher, or upload to an event hosted by a ${requiredTier}+ user`,
        upgradeRequired: true,
        requiredTier
    };
}

/**
 * Get video upload restrictions message for UI display
 */
export function getVideoRestrictionMessage(user: User | null, eventHostTier?: TierLevel): string {
    const permission = canUploadVideos(user, eventHostTier);

    if (permission.allowed) {
        return '';
    }

    // If guest, show a generic message without upgrade prompt
    if (!user) {
        return 'Video uploads are not enabled for this event.';
    }

    if (permission.upgradeRequired && permission.requiredTier) {
        return `Video uploads are available on ${permission.requiredTier} plan and above. Upgrade to unlock this feature.`;
    }

    return permission.reason || 'Video uploads are not available for your current plan.';
}

/**
 * Check if video upload UI should be shown (for feature discovery)
 */
export function shouldShowVideoUploadOption(user: User | null): boolean {
    // Always show the option, but disable it if not allowed
    // This helps with feature discovery and upgrade prompts
    return true;
}

/**
 * Get the appropriate UI state for video upload controls
 */
export function getVideoUploadUIState(user: User | null, eventHostTier?: TierLevel): {
    enabled: boolean;
    visible: boolean;
    message?: string;
    upgradePrompt?: boolean;
} {
    const permission = canUploadVideos(user, eventHostTier);

    return {
        enabled: permission.allowed,
        visible: shouldShowVideoUploadOption(user),
        message: permission.allowed ? undefined : getVideoRestrictionMessage(user, eventHostTier),
        // Only show upgrade prompt if user is logged in (guests can't upgrade)
        upgradePrompt: permission.upgradeRequired && !!user
    };
}