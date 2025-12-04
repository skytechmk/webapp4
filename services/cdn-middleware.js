/**
 * CDN Middleware for Express
 * Integrates global CDN with SnapifY backend
 */

import cdnService from './cdn-service.js';
import CDN_CONFIG from '../cdn-config.js';

/**
 * CDN Middleware Factory
 */
function createCDNMiddleware(options = {}) {
    const config = {
        enabled: true,
        bypassRoutes: ['/health', '/api/auth', '/api/upload'],
        debug: process.env.NODE_ENV === 'development',
        ...options
    };

    return (req, res, next) => {
        // Skip CDN for bypass routes
        if (config.bypassRoutes.some(route => req.path.startsWith(route))) {
            return next();
        }

        // Handle CDN cache purge requests
        if (req.path === '/cdn/purge' && req.method === 'POST') {
            return handleCachePurge(req, res);
        }

        if (req.path === '/cdn/purge-by-tag' && req.method === 'POST') {
            return handleCachePurgeByTag(req, res);
        }

        if (req.path === '/cdn/purge-all' && req.method === 'POST') {
            return handleFullCachePurge(req, res);
        }

        if (req.path === '/cdn/metrics' && req.method === 'GET') {
            return handleMetricsRequest(req, res);
        }

        // Handle regular requests through CDN
        handleCDNRequest(req, res, next);
    };
}

/**
 * Handle CDN request processing
 */
async function handleCDNRequest(req, res, next) {
    try {
        // Create CDN request object
        const cdnRequest = {
            url: req.originalUrl,
            method: req.method,
            headers: req.headers,
            body: req.body,
            query: req.query
        };

        // Process through CDN service
        const cdnResponse = await cdnService.handleRequest(cdnRequest);

        if (cdnResponse) {
            // Apply CDN response headers
            applyCDNHeaders(res, cdnResponse);

            // Send the response
            if (cdnResponse.redirect) {
                return res.redirect(cdnResponse.redirect);
            } else if (cdnResponse.stream) {
                return cdnResponse.stream.pipe(res);
            } else {
                return res.status(cdnResponse.status || 200).send(cdnResponse.body);
            }
        }

        // Continue to normal request handling if CDN doesn't have a response
        next();
    } catch (error) {
        console.error('CDN Middleware Error:', error);
        next();
    }
}

/**
 * Apply CDN-specific headers to response
 */
function applyCDNHeaders(res, cdnResponse) {
    // Set caching headers
    if (cdnResponse.cacheControl) {
        res.set('Cache-Control', cdnResponse.cacheControl);
    }

    if (cdnResponse.expires) {
        res.set('Expires', cdnResponse.expires);
    }

    if (cdnResponse.etag) {
        res.set('ETag', cdnResponse.etag);
    }

    // Set CDN-specific headers
    res.set('X-CDN', 'SnapifY-Global');
    res.set('X-CDN-Zone', cdnResponse.zone || 'unknown');
    res.set('X-Cache', cdnResponse.cacheStatus || 'MISS');

    // Set security headers
    res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'SAMEORIGIN');
}

/**
 * Handle cache purge requests
 */
async function handleCachePurge(req, res) {
    try {
        // Validate request
        if (!req.headers.authorization || req.headers.authorization !== `Bearer ${process.env.CDN_PURGE_TOKEN}`) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        // Purge cache
        const result = await cdnService.purgeCacheByUrl(url);

        return res.json({
            success: true,
            result,
            message: `Cache purged for ${url}`
        });
    } catch (error) {
        console.error('Cache purge error:', error);
        return res.status(500).json({
            error: 'Cache purge failed',
            details: error.message
        });
    }
}

/**
 * Handle cache purge by tag requests
 */
async function handleCachePurgeByTag(req, res) {
    try {
        // Validate request
        if (!req.headers.authorization || req.headers.authorization !== `Bearer ${process.env.CDN_PURGE_TOKEN}`) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { tag } = req.body;
        if (!tag) {
            return res.status(400).json({ error: 'Tag is required' });
        }

        // Purge cache by tag
        const result = await cdnService.purgeCacheByTag(tag);

        return res.json({
            success: true,
            result,
            message: `Cache purged for tag ${tag}`
        });
    } catch (error) {
        console.error('Cache purge by tag error:', error);
        return res.status(500).json({
            error: 'Cache purge by tag failed',
            details: error.message
        });
    }
}

/**
 * Handle full cache purge requests
 */
async function handleFullCachePurge(req, res) {
    try {
        // Validate request - this is more restrictive
        if (!req.headers.authorization || req.headers.authorization !== `Bearer ${process.env.CDN_ADMIN_TOKEN}`) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Purge all cache
        const result = await cdnService.purgeAllCache();

        return res.json({
            success: true,
            result,
            message: 'Full cache purge completed'
        });
    } catch (error) {
        console.error('Full cache purge error:', error);
        return res.status(500).json({
            error: 'Full cache purge failed',
            details: error.message
        });
    }
}

/**
 * Handle metrics requests
 */
function handleMetricsRequest(req, res) {
    try {
        const metrics = cdnService.getMetrics();

        return res.json({
            success: true,
            metrics,
            config: {
                provider: CDN_CONFIG.provider,
                zones: Object.keys(CDN_CONFIG.zones),
                edge_caching: CDN_CONFIG.edge_caching.enabled,
                cache_invalidation: {
                    purge_by_url: CDN_CONFIG.cache_invalidation.methods.purge_by_url.enabled,
                    purge_by_tag: CDN_CONFIG.cache_invalidation.methods.purge_by_tag.enabled,
                    purge_all: CDN_CONFIG.cache_invalidation.methods.purge_all.enabled
                }
            }
        });
    } catch (error) {
        console.error('Metrics request error:', error);
        return res.status(500).json({
            error: 'Metrics request failed',
            details: error.message
        });
    }
}

/**
 * CDN Health Check Middleware
 */
function cdnHealthCheck(req, res, next) {
    if (req.path === '/cdn/health') {
        return res.json({
            status: 'healthy',
            cdn: {
                provider: CDN_CONFIG.provider,
                zones: Object.keys(CDN_CONFIG.zones).length,
                edge_caching: CDN_CONFIG.edge_caching.enabled,
                cache_invalidation: CDN_CONFIG.cache_invalidation.methods.purge_by_url.enabled
            },
            timestamp: new Date().toISOString()
        });
    }
    next();
}

/**
 * CDN Response Optimization Middleware
 * Applies optimizations to API responses before sending to client
 */
function cdnResponseOptimizer(req, res, next) {
    const originalSend = res.send;
    const originalJson = res.json;

    res.send = function (body) {
        if (res.get('Content-Type')?.includes('application/json')) {
            try {
                const jsonBody = typeof body === 'string' ? JSON.parse(body) : body;
                const optimizedBody = optimizeJsonResponse(jsonBody);
                originalJson.call(this, optimizedBody);
            } catch (error) {
                originalSend.call(this, body);
            }
        } else {
            originalSend.call(this, body);
        }
    };

    res.json = function (body) {
        const optimizedBody = optimizeJsonResponse(body);
        originalJson.call(this, optimizedBody);
    };

    next();
}

/**
 * Optimize JSON responses for better performance
 */
function optimizeJsonResponse(jsonData) {
    if (!jsonData || typeof jsonData !== 'object') {
        return jsonData;
    }

    // Remove null/undefined values
    const cleanData = JSON.parse(JSON.stringify(jsonData));

    // Apply data saver optimizations if requested
    if (req.headers['save-data'] === 'on') {
        return applyDataSaverOptimizations(cleanData);
    }

    return cleanData;
}

/**
 * Apply data saver optimizations for low-bandwidth connections
 */
function applyDataSaverOptimizations(data) {
    if (Array.isArray(data)) {
        // For arrays, limit size and simplify items
        return data.slice(0, 20).map(item => simplifyDataItem(item));
    } else if (typeof data === 'object') {
        // For objects, simplify nested structures
        const simplified = {};

        // Keep only essential fields
        const essentialFields = ['id', 'name', 'title', 'url', 'thumbnail', 'created_at', 'updated_at'];
        for (const [key, value] of Object.entries(data)) {
            if (essentialFields.includes(key)) {
                simplified[key] = typeof value === 'object' ? simplifyDataItem(value) : value;
            }
        }

        return simplified;
    }

    return data;
}

/**
 * Simplify individual data items
 */
function simplifyDataItem(item) {
    if (!item || typeof item !== 'object') return item;

    if (Array.isArray(item)) {
        return item.slice(0, 5).map(simplifyDataItem);
    }

    const simplified = {};
    const maxFields = 10;
    let fieldCount = 0;

    for (const [key, value] of Object.entries(item)) {
        if (fieldCount >= maxFields) break;

        simplified[key] = typeof value === 'object' && value !== null
            ? simplifyDataItem(value)
            : value;

        fieldCount++;
    }

    return simplified;
}

/**
 * CDN Asset URL Generator
 * Generates optimized CDN URLs for assets
 */
function createCDNAssetUrlGenerator() {
    return (assetPath, options = {}) => {
        const baseUrl = process.env.CDN_DOMAIN || 'https://cdn.snapify.mk';

        // Apply optimizations based on options
        const optimizations = [];

        if (options.width) optimizations.push(`width=${options.width}`);
        if (options.height) optimizations.push(`height=${options.height}`);
        if (options.quality) optimizations.push(`quality=${options.quality}`);
        if (options.format) optimizations.push(`format=${options.format}`);

        const optimizationString = optimizations.length > 0
            ? `?${optimizations.join('&')}`
            : '';

        // Generate versioned URL for cache busting
        const version = options.version || 'v1';
        const versionedPath = assetPath.replace(/(\.[a-zA-Z0-9]+)$/, `-${version}$1`);

        return `${baseUrl}${versionedPath}${optimizationString}`;
    };
}

export {
    createCDNMiddleware,
    cdnHealthCheck,
    cdnResponseOptimizer,
    createCDNAssetUrlGenerator
};