import { MediaItem } from '../types';

/**
 * Media Resource Manager - Phase 2: Core Optimization
 * Handles efficient memory management for media resources
 */
class MediaResourceManager {
    private static instance: MediaResourceManager;
    private resourceCache: Map<string, { url: string, refCount: number, cleanupTimeout: NodeJS.Timeout | null }> = new Map();
    private cleanupInterval: NodeJS.Timeout | null = null;
    private isMonitoring = false;

    private constructor() {
        // Private constructor for singleton pattern
    }

    public static getInstance(): MediaResourceManager {
        if (!MediaResourceManager.instance) {
            MediaResourceManager.instance = new MediaResourceManager();
        }
        return MediaResourceManager.instance;
    }

    /**
     * Register a media resource for tracking and cleanup
     */
    public registerResource(resourceId: string, url: string): void {
        if (this.resourceCache.has(resourceId)) {
            const existing = this.resourceCache.get(resourceId)!;
            existing.refCount++;
            this.resourceCache.set(resourceId, existing);
        } else {
            this.resourceCache.set(resourceId, {
                url,
                refCount: 1,
                cleanupTimeout: null
            });
        }

        this.startMonitoring();
    }

    /**
     * Release a media resource (decrement reference count)
     */
    public releaseResource(resourceId: string): void {
        if (this.resourceCache.has(resourceId)) {
            const resource = this.resourceCache.get(resourceId)!;
            resource.refCount--;

            if (resource.refCount <= 0) {
                this.cleanupResource(resourceId);
            } else {
                this.resourceCache.set(resourceId, resource);
            }
        }
    }

    /**
     * Cleanup a specific resource
     */
    private cleanupResource(resourceId: string): void {
        const resource = this.resourceCache.get(resourceId);
        if (!resource) return;

        // Clear any existing timeout
        if (resource.cleanupTimeout) {
            clearTimeout(resource.cleanupTimeout);
        }

        // Schedule cleanup after a delay to ensure it's no longer needed
        const cleanupTimeout = setTimeout(() => {
            try {
                if (resource.url.startsWith('blob:')) {
                    URL.revokeObjectURL(resource.url);
                }
                this.resourceCache.delete(resourceId);
            } catch (error) {
                console.warn(`Failed to cleanup resource ${resourceId}:`, error);
            }
        }, 5000); // 5 second delay

        // Update resource with cleanup timeout
        this.resourceCache.set(resourceId, {
            ...resource,
            cleanupTimeout
        });
    }

    /**
     * Start monitoring for unused resources
     */
    private startMonitoring(): void {
        if (this.isMonitoring) return;
        this.isMonitoring = true;

        this.cleanupInterval = setInterval(() => {
            this.cleanupUnusedResources();
        }, 30000); // Check every 30 seconds
    }

    /**
     * Cleanup unused resources (refCount = 0)
     */
    private cleanupUnusedResources(): void {
        this.resourceCache.forEach((resource, resourceId) => {
            if (resource.refCount <= 0) {
                this.cleanupResource(resourceId);
            }
        });
    }

    /**
     * Get memory usage statistics
     */
    public getMemoryStats(): { activeResources: number, totalResources: number, memoryUsageMb: number } {
        let activeResources = 0;
        let totalResources = 0;

        this.resourceCache.forEach(resource => {
            totalResources++;
            if (resource.refCount > 0) {
                activeResources++;
            }
        });

        // Estimate memory usage (very rough estimate)
        const memoryUsageMb = (totalResources * 0.5) / 1024; // ~0.5MB per resource

        return {
            activeResources,
            totalResources,
            memoryUsageMb
        };
    }

    /**
     * Force cleanup all resources
     */
    public forceCleanupAll(): void {
        this.resourceCache.forEach((resource, resourceId) => {
            if (resource.cleanupTimeout) {
                clearTimeout(resource.cleanupTimeout);
            }
            try {
                if (resource.url.startsWith('blob:')) {
                    URL.revokeObjectURL(resource.url);
                }
            } catch (error) {
                console.warn(`Failed to cleanup resource ${resourceId}:`, error);
            }
        });

        this.resourceCache.clear();

        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }

        this.isMonitoring = false;
    }

    /**
     * Get current resource count
     */
    public getResourceCount(): number {
        return this.resourceCache.size;
    }
}

// Singleton instance
export const mediaResourceManager = MediaResourceManager.getInstance();

/**
 * Media cleanup utility functions
 */
export const cleanupMediaResources = (mediaItems: MediaItem[]): void => {
    mediaItems.forEach(media => {
        if (media.url && media.url.startsWith('blob:')) {
            try {
                URL.revokeObjectURL(media.url);
            } catch (error) {
                console.warn(`Failed to cleanup media URL: ${media.url}`, error);
            }
        }
    });
};

/**
 * Optimized image loading with memory management
 */
export const loadImageWithMemoryManagement = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();

        // Generate a unique ID for this image
        const imageId = `img-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

        img.onload = () => {
            mediaResourceManager.registerResource(imageId, src);
            resolve(img);
        };

        img.onerror = (error) => {
            reject(error);
        };

        img.src = src;
    });
};

/**
 * Release image resources
 */
export const releaseImageResource = (imageId: string): void => {
    mediaResourceManager.releaseResource(imageId);
};