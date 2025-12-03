import { logger } from '../../server/services/loggerService.js';
import { advancedCache } from '../advanced-cache/index.js';
import { serviceDiscovery } from '../service-discovery/index.js';

class BackwardCompatibility {
    constructor() {
        this.compatibilityConfig = {
            // API versioning
            currentApiVersion: 'v2',
            supportedVersions: ['v1', 'v2'],
            defaultVersion: 'v1',

            // Feature flags
            featureFlags: {
                newAuthSystem: false,
                newMediaSystem: false,
                newCacheSystem: false,
                newWebSocketSystem: false
            },

            // Fallback mechanisms
            fallbackTimeout: 5000, // 5 seconds
            retryAttempts: 3,
            retryDelay: 1000
        };

        this.compatibilityStats = {
            apiCalls: 0,
            fallbackCalls: 0,
            versionMismatches: 0,
            successfulMigrations: 0,
            failedMigrations: 0
        };
    }

    // Check API version compatibility
    checkApiVersion(version) {
        return this.compatibilityConfig.supportedVersions.includes(version);
    }

    // Get current API version
    getCurrentApiVersion() {
        return this.compatibilityConfig.currentApiVersion;
    }

    // Set API version
    setApiVersion(version) {
        if (this.checkApiVersion(version)) {
            this.compatibilityConfig.currentApiVersion = version;
            logger.info('API version updated', { version });
            return true;
        }
        return false;
    }

    // Handle API request with versioning
    async handleVersionedRequest(req, res, next, handler) {
        try {
            // Get requested version from headers or query params
            const requestedVersion = req.headers['x-api-version'] ||
                req.query.api_version ||
                this.compatibilityConfig.defaultVersion;

            // Check if version is supported
            if (!this.checkApiVersion(requestedVersion)) {
                logger.warn('Unsupported API version requested', {
                    version: requestedVersion,
                    supportedVersions: this.compatibilityConfig.supportedVersions
                });

                return res.status(400).json({
                    error: 'Unsupported API version',
                    supportedVersions: this.compatibilityConfig.supportedVersions,
                    currentVersion: this.compatibilityConfig.currentApiVersion
                });
            }

            // Route to appropriate handler based on version
            if (requestedVersion === 'v1') {
                return this.handleV1Request(req, res, next);
            } else if (requestedVersion === 'v2') {
                return handler(req, res, next);
            }

            // Default to v1 for backward compatibility
            return this.handleV1Request(req, res, next);

        } catch (error) {
            logger.error('Versioned request handling error:', { error: error.message });
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    // Handle V1 requests (backward compatibility)
    async handleV1Request(req, res, next) {
        try {
            logger.info('Handling V1 API request', {
                method: req.method,
                path: req.path
            });

            // In a real implementation, this would route to legacy handlers
            // For now, simulate V1 response format

            const response = {
                status: 'success',
                version: 'v1',
                data: {
                    message: 'V1 API endpoint (mock)',
                    timestamp: new Date().toISOString()
                }
            };

            res.json(response);

        } catch (error) {
            logger.error('V1 request handling error:', { error: error.message });
            res.status(500).json({
                status: 'error',
                version: 'v1',
                error: 'Internal server error'
            });
        }
    }

    // Feature flag management
    setFeatureFlag(flagName, enabled) {
        if (this.compatibilityConfig.featureFlags[flagName] !== undefined) {
            this.compatibilityConfig.featureFlags[flagName] = enabled;
            logger.info('Feature flag updated', { flagName, enabled });
            return true;
        }
        return false;
    }

    getFeatureFlag(flagName) {
        return this.compatibilityConfig.featureFlags[flagName];
    }

    // Check if new feature should be used
    shouldUseNewFeature(featureName) {
        const flag = this.getFeatureFlag(featureName);
        return flag === true;
    }

    // Fallback mechanism
    async withFallback(primaryOperation, fallbackOperation, featureName) {
        try {
            // Try primary operation first
            const result = await primaryOperation();
            this.compatibilityStats.apiCalls++;
            return result;

        } catch (error) {
            logger.warn('Primary operation failed, using fallback', {
                error: error.message,
                feature: featureName
            });

            this.compatibilityStats.fallbackCalls++;

            try {
                // Use fallback operation
                const fallbackResult = await fallbackOperation();
                return fallbackResult;

            } catch (fallbackError) {
                logger.error('Fallback operation also failed', {
                    primaryError: error.message,
                    fallbackError: fallbackError.message,
                    feature: featureName
                });

                this.compatibilityStats.failedMigrations++;
                throw fallbackError;
            }
        }
    }

    // Migration assistance
    async assistMigration(oldSystem, newSystem, data) {
        try {
            // Check if migration is needed
            const needsMigration = await this.checkMigrationNeeded(data);

            if (!needsMigration) {
                logger.info('Migration not needed, using new system directly');
                return newSystem(data);
            }

            // Perform migration
            logger.info('Performing migration from old to new system');
            const migratedData = await this.migrateData(data);

            // Use new system with migrated data
            const result = await newSystem(migratedData);
            this.compatibilityStats.successfulMigrations++;

            return result;

        } catch (error) {
            logger.error('Migration failed', { error: error.message });
            this.compatibilityStats.failedMigrations++;
            throw error;
        }
    }

    // Check if migration is needed
    async checkMigrationNeeded(data) {
        // In a real implementation, this would check data format/version
        // For now, return false to simulate no migration needed
        return false;
    }

    // Migrate data from old to new format
    async migrateData(data) {
        // In a real implementation, this would transform data
        logger.info('Data migration performed (mock)');
        return { ...data, migrated: true };
    }

    // Legacy endpoint routing
    async routeLegacyEndpoint(req, res) {
        try {
            const endpoint = req.path;

            // Route to appropriate legacy handler
            switch (endpoint) {
                case '/api/legacy/auth':
                    return this.handleLegacyAuth(req, res);

                case '/api/legacy/media':
                    return this.handleLegacyMedia(req, res);

                case '/api/legacy/events':
                    return this.handleLegacyEvents(req, res);

                default:
                    return res.status(404).json({
                        error: 'Legacy endpoint not found',
                        availableEndpoints: ['/api/legacy/auth', '/api/legacy/media', '/api/legacy/events']
                    });
            }

        } catch (error) {
            logger.error('Legacy endpoint routing error:', { error: error.message });
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // Handle legacy auth
    async handleLegacyAuth(req, res) {
        try {
            logger.info('Handling legacy auth request');

            // Simulate legacy auth response
            res.json({
                status: 'success',
                message: 'Legacy auth endpoint',
                version: 'v1',
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Legacy auth handling error:', { error: error.message });
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // Handle legacy media
    async handleLegacyMedia(req, res) {
        try {
            logger.info('Handling legacy media request');

            // Simulate legacy media response
            res.json({
                status: 'success',
                message: 'Legacy media endpoint',
                version: 'v1',
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Legacy media handling error:', { error: error.message });
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // Handle legacy events
    async handleLegacyEvents(req, res) {
        try {
            logger.info('Handling legacy events request');

            // Simulate legacy events response
            res.json({
                status: 'success',
                message: 'Legacy events endpoint',
                version: 'v1',
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Legacy events handling error:', { error: error.message });
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // Get compatibility statistics
    getCompatibilityStats() {
        return {
            ...this.compatibilityStats,
            supportedVersions: this.compatibilityConfig.supportedVersions,
            currentVersion: this.compatibilityConfig.currentApiVersion,
            featureFlags: this.compatibilityConfig.featureFlags,
            timestamp: new Date().toISOString()
        };
    }

    // Reset compatibility statistics
    resetCompatibilityStats() {
        this.compatibilityStats = {
            apiCalls: 0,
            fallbackCalls: 0,
            versionMismatches: 0,
            successfulMigrations: 0,
            failedMigrations: 0
        };
    }

    // Check system compatibility
    async checkSystemCompatibility() {
        try {
            // Check service compatibility
            const services = serviceDiscovery.getAllServicesInfo();
            const compatibilityResults = {};

            for (const [serviceName, serviceInfo] of Object.entries(services)) {
                compatibilityResults[serviceName] = {
                    compatible: serviceInfo.health?.status === 'healthy',
                    version: serviceInfo.health?.version || 'unknown',
                    issues: serviceInfo.health?.status !== 'healthy' ? ['Service unhealthy'] : []
                };
            }

            return {
                overallCompatibility: 'compatible',
                services: compatibilityResults,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            logger.error('System compatibility check error:', { error: error.message });
            return {
                overallCompatibility: 'error',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Get migration report
    async getMigrationReport() {
        try {
            const stats = this.getCompatibilityStats();
            const systemCompatibility = await this.checkSystemCompatibility();

            return {
                stats,
                systemCompatibility,
                recommendations: this.generateMigrationRecommendations(stats),
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            logger.error('Migration report generation error:', { error: error.message });
            return {
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Generate migration recommendations
    generateMigrationRecommendations(stats) {
        const recommendations = [];

        // Check version usage
        if (stats.versionMismatches > 0) {
            recommendations.push({
                type: 'version_migration',
                priority: 'high',
                message: `Version mismatches detected (${stats.versionMismatches}). Consider updating clients.`,
                action: 'Review API version usage and update clients'
            });
        }

        // Check fallback usage
        if (stats.fallbackCalls > stats.apiCalls * 0.1) {
            recommendations.push({
                type: 'fallback_usage',
                priority: 'medium',
                message: `High fallback usage (${stats.fallbackCalls}/${stats.apiCalls} calls).`,
                action: 'Investigate why new systems are failing'
            });
        }

        // Check migration success rate
        if (stats.failedMigrations > 0 && stats.successfulMigrations > 0) {
            const failureRate = stats.failedMigrations / (stats.successfulMigrations + stats.failedMigrations);
            if (failureRate > 0.05) { // 5% failure rate
                recommendations.push({
                    type: 'migration_failure',
                    priority: 'high',
                    message: `Migration failure rate is high (${(failureRate * 100).toFixed(1)}%).`,
                    action: 'Review migration logic and data validation'
                });
            }
        }

        return recommendations;
    }

    // Get compatibility configuration
    getCompatibilityConfig() {
        return this.compatibilityConfig;
    }

    // Set compatibility configuration
    setCompatibilityConfig(config) {
        this.compatibilityConfig = { ...this.compatibilityConfig, ...config };
        logger.info('Compatibility configuration updated', { config: this.compatibilityConfig });
    }

    // Check client compatibility
    async checkClientCompatibility(userAgent) {
        try {
            // Parse user agent
            const parsed = this.parseUserAgent(userAgent);

            // Check browser compatibility
            const browserCompatibility = this.checkBrowserCompatibility(parsed);

            // Check device compatibility
            const deviceCompatibility = this.checkDeviceCompatibility(parsed);

            return {
                userAgent,
                parsed,
                browser: browserCompatibility,
                device: deviceCompatibility,
                overall: browserCompatibility.compatible && deviceCompatibility.compatible
                    ? 'compatible'
                    : 'limited_support',
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            logger.error('Client compatibility check error:', { error: error.message });
            return {
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Parse user agent
    parseUserAgent(userAgent) {
        const parsed = {
            browser: 'unknown',
            version: 'unknown',
            os: 'unknown',
            device: 'unknown'
        };

        // Simple parsing logic
        if (userAgent.includes('Chrome')) {
            parsed.browser = 'Chrome';
        } else if (userAgent.includes('Firefox')) {
            parsed.browser = 'Firefox';
        } else if (userAgent.includes('Safari')) {
            parsed.browser = 'Safari';
        } else if (userAgent.includes('Edge')) {
            parsed.browser = 'Edge';
        }

        if (userAgent.includes('Android')) {
            parsed.os = 'Android';
            parsed.device = 'mobile';
        } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
            parsed.os = 'iOS';
            parsed.device = 'mobile';
        } else if (userAgent.includes('Mac')) {
            parsed.os = 'Mac';
            parsed.device = 'desktop';
        } else if (userAgent.includes('Windows')) {
            parsed.os = 'Windows';
            parsed.device = 'desktop';
        }

        return parsed;
    }

    // Check browser compatibility
    checkBrowserCompatibility(parsed) {
        const supportedBrowsers = ['Chrome', 'Firefox', 'Safari', 'Edge'];
        const compatible = supportedBrowsers.includes(parsed.browser);

        return {
            browser: parsed.browser,
            version: parsed.version,
            compatible,
            issues: compatible ? [] : ['Browser not officially supported'],
            recommendations: compatible ? [] : ['Use Chrome, Firefox, Safari, or Edge for best experience']
        };
    }

    // Check device compatibility
    checkDeviceCompatibility(parsed) {
        const supportedDevices = ['desktop', 'mobile'];
        const compatible = supportedDevices.includes(parsed.device);

        return {
            device: parsed.device,
            os: parsed.os,
            compatible,
            issues: compatible ? [] : ['Device type not officially supported'],
            recommendations: compatible ? [] : ['Use desktop or standard mobile devices']
        };
    }

    // Get comprehensive compatibility report
    async getComprehensiveReport() {
        try {
            const stats = this.getCompatibilityStats();
            const migrationReport = await this.getMigrationReport();
            const systemCompatibility = await this.checkSystemCompatibility();

            return {
                stats,
                migration: migrationReport,
                systemCompatibility,
                config: this.compatibilityConfig,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            logger.error('Comprehensive compatibility report error:', { error: error.message });
            return {
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

export const backwardCompatibility = new BackwardCompatibility();
export default backwardCompatibility;