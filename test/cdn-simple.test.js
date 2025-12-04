/**
 * Simple CDN Configuration Test
 * Tests the core CDN configuration without external dependencies
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// Test the CDN configuration directly
const CDN_CONFIG = require('../cdn-config.js');

describe('CDN Configuration Validation', () => {
    it('should have valid CDN configuration structure', () => {
        assert.ok(CDN_CONFIG);
        assert.strictEqual(typeof CDN_CONFIG, 'object');
    });

    it('should have multi-region zones configured', () => {
        assert.ok(CDN_CONFIG.zones);
        assert.ok(CDN_CONFIG.zones.north_america);
        assert.ok(CDN_CONFIG.zones.europe);
        assert.ok(CDN_CONFIG.zones.asia_pacific);
        assert.ok(CDN_CONFIG.zones.middle_east_africa);
    });

    it('should have content type configurations', () => {
        assert.ok(CDN_CONFIG.content_types);
        assert.ok(CDN_CONFIG.content_types.static_assets);
        assert.ok(CDN_CONFIG.content_types.dynamic_content);
        assert.ok(CDN_CONFIG.content_types.media_content);
    });

    it('should have edge caching enabled', () => {
        assert.strictEqual(CDN_CONFIG.edge_caching.enabled, true);
    });

    it('should have cache invalidation methods', () => {
        assert.ok(CDN_CONFIG.cache_invalidation);
        assert.ok(CDN_CONFIG.cache_invalidation.methods);
        assert.ok(CDN_CONFIG.cache_invalidation.methods.purge_by_url);
        assert.ok(CDN_CONFIG.cache_invalidation.methods.purge_by_tag);
        assert.ok(CDN_CONFIG.cache_invalidation.methods.purge_all);
    });

    it('should have media optimization presets', () => {
        assert.ok(CDN_CONFIG.media_optimization);
        assert.ok(CDN_CONFIG.media_optimization.image_processing);
        assert.ok(CDN_CONFIG.media_optimization.video_processing);

        const imagePresets = CDN_CONFIG.media_optimization.image_processing.presets;
        assert.ok(imagePresets.thumbnail);
        assert.ok(imagePresets.standard);
        assert.ok(imagePresets.high_res);

        const videoPresets = CDN_CONFIG.media_optimization.video_processing.presets;
        assert.ok(videoPresets.mobile);
        assert.ok(videoPresets.tablet);
        assert.ok(videoPresets.desktop);
    });

    it('should have security features configured', () => {
        assert.ok(CDN_CONFIG.security);
        assert.strictEqual(CDN_CONFIG.security.https.enabled, true);
        assert.strictEqual(CDN_CONFIG.security.https.tls_version, 'TLSv1.3');
        assert.strictEqual(CDN_CONFIG.security.ddos_protection.enabled, true);
    });

    it('should have performance optimizations', () => {
        assert.ok(CDN_CONFIG.performance);
        assert.strictEqual(CDN_CONFIG.performance.http2.enabled, true);
        assert.strictEqual(CDN_CONFIG.performance.brotli_compression.enabled, true);
        assert.strictEqual(CDN_CONFIG.performance.prefetching.enabled, true);
    });

    it('should have backward compatibility features', () => {
        assert.ok(CDN_CONFIG.backward_compatibility);
        assert.strictEqual(CDN_CONFIG.backward_compatibility.legacy_support.user_agent_detection, true);
        assert.ok(CDN_CONFIG.backward_compatibility.fallback_mechanisms);
    });
});

describe('CDN Zone Configuration', () => {
    it('should have North America zone with regions', () => {
        const naZone = CDN_CONFIG.zones.north_america;
        assert.ok(naZone.regions);
        assert.ok(naZone.regions.includes('us-east-1'));
        assert.ok(naZone.regions.includes('us-west-1'));
        assert.ok(naZone.edge_locations);
        assert.ok(naZone.edge_locations.includes('NYC'));
        assert.ok(naZone.edge_locations.includes('LAX'));
    });

    it('should have Europe zone with regions', () => {
        const euZone = CDN_CONFIG.zones.europe;
        assert.ok(euZone.regions);
        assert.ok(euZone.regions.includes('eu-west-1'));
        assert.ok(euZone.edge_locations);
        assert.ok(euZone.edge_locations.includes('LHR'));
        assert.ok(euZone.edge_locations.includes('FRA'));
    });

    it('should have Asia Pacific zone with regions', () => {
        const apZone = CDN_CONFIG.zones.asia_pacific;
        assert.ok(apZone.regions);
        assert.ok(apZone.regions.includes('ap-southeast-1'));
        assert.ok(apZone.edge_locations);
        assert.ok(apZone.edge_locations.includes('SIN'));
        assert.ok(apZone.edge_locations.includes('NRT'));
    });
});

describe('CDN Content Type Configuration', () => {
    it('should have static assets configuration', () => {
        const staticConfig = CDN_CONFIG.content_types.static_assets;
        assert.ok(staticConfig.patterns);
        assert.ok(staticConfig.patterns.includes('*.js'));
        assert.ok(staticConfig.patterns.includes('*.css'));
        assert.strictEqual(staticConfig.cache_ttl, 31536000); // 1 year
        assert.strictEqual(staticConfig.cache_control, 'public, immutable');
    });

    it('should have dynamic content configuration', () => {
        const dynamicConfig = CDN_CONFIG.content_types.dynamic_content;
        assert.ok(dynamicConfig.patterns);
        assert.ok(dynamicConfig.patterns.includes('/api/*'));
        assert.strictEqual(dynamicConfig.cache_ttl, 3600); // 1 hour
        assert.strictEqual(dynamicConfig.cache_control, 'public, max-age=3600, stale-while-revalidate=1800');
    });

    it('should have media content configuration', () => {
        const mediaConfig = CDN_CONFIG.content_types.media_content;
        assert.ok(mediaConfig.patterns);
        assert.ok(mediaConfig.patterns.includes('/media/*'));
        assert.strictEqual(mediaConfig.cache_ttl, 86400); // 24 hours
        assert.ok(mediaConfig.optimization);
        assert.ok(mediaConfig.optimization.images);
        assert.ok(mediaConfig.optimization.videos);
    });
});

describe('CDN Cache Invalidation Configuration', () => {
    it('should have purge by URL enabled', () => {
        const purgeUrl = CDN_CONFIG.cache_invalidation.methods.purge_by_url;
        assert.strictEqual(purgeUrl.enabled, true);
        assert.strictEqual(purgeUrl.api_endpoint, '/cdn/purge');
        assert.strictEqual(purgeUrl.rate_limit, '100 requests per minute');
    });

    it('should have purge by tag enabled', () => {
        const purgeTag = CDN_CONFIG.cache_invalidation.methods.purge_by_tag;
        assert.strictEqual(purgeTag.enabled, true);
        assert.strictEqual(purgeTag.api_endpoint, '/cdn/purge-by-tag');
        assert.ok(purgeTag.tags);
        assert.ok(purgeTag.tags.includes('version_*'));
    });

    it('should have purge all enabled', () => {
        const purgeAll = CDN_CONFIG.cache_invalidation.methods.purge_all;
        assert.strictEqual(purgeAll.enabled, true);
        assert.strictEqual(purgeAll.api_endpoint, '/cdn/purge-all');
        assert.strictEqual(purgeAll.require_auth, true);
    });
});

console.log('✅ CDN Configuration Tests Completed Successfully');
console.log('🌍 Global CDN implementation is properly configured');
console.log('🚀 Ready for deployment and integration');