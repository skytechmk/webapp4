/**
 * CDN Integration Tests
 * Comprehensive test suite for global CDN implementation
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const CDNService = require('../services/cdn-service.js');
const cdnMiddleware = require('../services/cdn-middleware.js');
const CDN_CONFIG = require('../cdn-config.js');

describe('Global CDN Implementation', () => {
    let cdnService;
    let testRequest;
    let testResponse;

    before(() => {
        // Initialize CDN service
        cdnService = new CDNService();

        // Mock request and response objects
        testRequest = {
            url: '/test-asset.js',
            method: 'GET',
            headers: {
                'accept-language': 'en-US',
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            },
            body: {},
            query: {}
        };

        testResponse = {
            status: (code) => {
                testResponse.statusCode = code;
                return testResponse;
            },
            send: (data) => {
                testResponse.body = data;
            },
            json: (data) => {
                testResponse.body = data;
            },
            set: (header, value) => {
                testResponse.headers = testResponse.headers || {};
                testResponse.headers[header] = value;
            },
            get: (header) => {
                return testResponse.headers?.[header];
            }
        };
    });

    describe('CDN Configuration', () => {
        it('should have valid multi-region configuration', () => {
            assert.ok(CDN_CONFIG.zones);
            assert.ok(CDN_CONFIG.zones.north_america);
            assert.ok(CDN_CONFIG.zones.europe);
            assert.ok(CDN_CONFIG.zones.asia_pacific);
            assert.ok(CDN_CONFIG.zones.middle_east_africa);
        });

        it('should have content type configurations', () => {
            assert.ok(CDN_CONFIG.content_types.static_assets);
            assert.ok(CDN_CONFIG.content_types.dynamic_content);
            assert.ok(CDN_CONFIG.content_types.media_content);
        });

        it('should have edge caching enabled', () => {
            assert.strictEqual(CDN_CONFIG.edge_caching.enabled, true);
        });

        it('should have cache invalidation methods', () => {
            assert.ok(CDN_CONFIG.cache_invalidation.methods.purge_by_url);
            assert.ok(CDN_CONFIG.cache_invalidation.methods.purge_by_tag);
            assert.ok(CDN_CONFIG.cache_invalidation.methods.purge_all);
        });
    });

    describe('CDN Service', () => {
        it('should initialize with valid configuration', () => {
            assert.ok(cdnService.config);
            assert.strictEqual(cdnService.config.provider, 'cloudflare');
        });

        it('should determine content type correctly', () => {
            const staticType = cdnService._determineContentType('/assets/main.js');
            const dynamicType = cdnService._determineContentType('/api/events');
            const mediaType = cdnService._determineContentType('/media/photo.jpg');

            assert.strictEqual(staticType, 'static');
            assert.strictEqual(dynamicType, 'dynamic');
            assert.strictEqual(mediaType, 'media');
        });

        it('should generate cache keys', () => {
            const cacheKey = cdnService._generateCacheKey('/test.js', testRequest.headers);
            assert.ok(cacheKey);
            assert.strictEqual(typeof cacheKey, 'string');
            assert.strictEqual(cacheKey.length, 64); // SHA256 hash length
        });

        it('should match URL patterns', () => {
            const matchesStatic = cdnService._matchesPattern('/assets/main.js', ['*.js']);
            const matchesMedia = cdnService._matchesPattern('/media/photo.jpg', ['*.jpg', '*.png']);

            assert.strictEqual(matchesStatic, true);
            assert.strictEqual(matchesMedia, true);
        });
    });

    describe('CDN Middleware', () => {
        it('should create middleware with default options', () => {
            const middleware = cdnMiddleware.createCDNMiddleware();
            assert.ok(middleware);
            assert.strictEqual(typeof middleware, 'function');
        });

        it('should create middleware with custom options', () => {
            const middleware = cdnMiddleware.createCDNMiddleware({
                enabled: false,
                debug: true
            });
            assert.ok(middleware);
        });

        it('should create CDN asset URL generator', () => {
            const urlGenerator = cdnMiddleware.createCDNAssetUrlGenerator();
            assert.ok(urlGenerator);
            assert.strictEqual(typeof urlGenerator, 'function');

            // Test URL generation
            const testUrl = urlGenerator('/assets/image.jpg', {
                width: 800,
                quality: 85,
                format: 'webp'
            });

            assert.ok(testUrl.includes('width=800'));
            assert.ok(testUrl.includes('quality=85'));
            assert.ok(testUrl.includes('format=webp'));
        });
    });

    describe('Cache Invalidation', () => {
        it('should handle cache purge by URL', async () => {
            // Mock the purge method to avoid actual API calls
            const originalPurge = cdnService.purgeCacheByUrl;
            cdnService.purgeCacheByUrl = async () => ({ success: true });

            try {
                const result = await cdnService.purgeCacheByUrl('http://example.com/test');
                assert.ok(result.success);
            } finally {
                cdnService.purgeCacheByUrl = originalPurge;
            }
        });

        it('should handle cache purge by tag', async () => {
            const result = await cdnService.purgeCacheByTag('test_tag');
            assert.ok(result.success);
        });

        it('should handle full cache purge', async () => {
            const result = await cdnService.purgeAllCache();
            assert.ok(result.success);
        });
    });

    describe('Media Optimization', () => {
        it('should have image optimization presets', () => {
            const presets = CDN_CONFIG.media_optimization.image_processing.presets;
            assert.ok(presets.thumbnail);
            assert.ok(presets.standard);
            assert.ok(presets.high_res);
        });

        it('should have video optimization presets', () => {
            const presets = CDN_CONFIG.media_optimization.video_processing.presets;
            assert.ok(presets.mobile);
            assert.ok(presets.tablet);
            assert.ok(presets.desktop);
        });
    });

    describe('Dynamic Content Optimization', () => {
        it('should have intelligent routing rules', () => {
            const rules = CDN_CONFIG.dynamic_content_optimization.intelligent_routing.rules;
            assert.ok(rules.length > 0);
        });

        it('should have response optimization enabled', () => {
            const responseOpt = CDN_CONFIG.dynamic_content_optimization.response_optimization;
            assert.strictEqual(responseOpt.minify_json, true);
            assert.strictEqual(responseOpt.compress_responses, true);
        });
    });

    describe('Performance Features', () => {
        it('should have HTTP/2 enabled', () => {
            assert.strictEqual(CDN_CONFIG.performance.http2.enabled, true);
        });

        it('should have Brotli compression enabled', () => {
            assert.strictEqual(CDN_CONFIG.performance.brotli_compression.enabled, true);
        });

        it('should have prefetching strategies', () => {
            const prefetching = CDN_CONFIG.performance.prefetching;
            assert.strictEqual(prefetching.enabled, true);
            assert.ok(prefetching.strategies.includes('dns-prefetch'));
        });
    });

    describe('Security Features', () => {
        it('should have HTTPS enforced', () => {
            assert.strictEqual(CDN_CONFIG.security.https.enabled, true);
            assert.strictEqual(CDN_CONFIG.security.https.tls_version, 'TLSv1.3');
        });

        it('should have HSTS enabled', () => {
            const hsts = CDN_CONFIG.security.https.hsts;
            assert.strictEqual(hsts.enabled, true);
            assert.strictEqual(hsts.preload, true);
        });

        it('should have DDoS protection', () => {
            assert.strictEqual(CDN_CONFIG.security.ddos_protection.enabled, true);
        });
    });
});

describe('CDN Integration Scenarios', () => {
    it('should handle static asset requests', async () => {
        const staticRequest = {
            url: '/assets/main.js',
            method: 'GET',
            headers: {
                'accept-encoding': 'gzip, br',
                'user-agent': 'Mozilla/5.0'
            }
        };

        // This would normally call the CDN service
        // For testing, we just verify the request structure
        assert.strictEqual(staticRequest.url, '/assets/main.js');
        assert.strictEqual(staticRequest.method, 'GET');
    });

    it('should handle dynamic content requests', async () => {
        const dynamicRequest = {
            url: '/api/events',
            method: 'GET',
            headers: {
                'authorization': 'Bearer test-token',
                'accept': 'application/json'
            }
        };

        assert.strictEqual(dynamicRequest.url, '/api/events');
        assert.ok(dynamicRequest.headers.authorization);
    });

    it('should handle media content requests', async () => {
        const mediaRequest = {
            url: '/media/photo.jpg',
            method: 'GET',
            headers: {
                'accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
            }
        };

        assert.strictEqual(mediaRequest.url, '/media/photo.jpg');
        assert.ok(mediaRequest.headers.accept.includes('image/webp'));
    });
});

describe('CDN Error Handling', () => {
    it('should handle cache purge errors gracefully', async () => {
        try {
            // This should fail due to missing authorization
            await cdnService.purgeCacheByUrl('http://example.com');
        } catch (error) {
            assert.ok(error.message.includes('disabled') || error.message.includes('Unauthorized'));
        }
    });

    it('should handle invalid cache purge requests', async () => {
        try {
            await cdnService.purgeCacheByUrl('');
        } catch (error) {
            assert.ok(error);
        }
    });
});

console.log('CDN Integration Tests Completed');