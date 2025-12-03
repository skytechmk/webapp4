import { logger } from '../../server/services/loggerService.js';
import { advancedCache } from '../advanced-cache/index.js';
import { serviceDiscovery } from '../service-discovery/index.js';

class ConnectionThrottling {
    constructor() {
        this.throttlingConfig = {
            // Connection rate limits
            maxConnectionsPerIp: 10,
            connectionRateWindow: 60000, // 1 minute
            maxConnectionRate: 30, // connections per minute

            // Message rate limits
            maxMessagesPerSecond: 100,
            messageBurstLimit: 200,
            messageRateWindow: 1000, // 1 second

            // Bandwidth limits
            maxBandwidthPerMinute: 10 * 1024 * 1024, // 10 MB per minute
            bandwidthWindow: 60000, // 1 minute

            // Abuse detection
            abuseThreshold: 5,
            abuseWindow: 300000, // 5 minutes
            banDuration: 3600000 // 1 hour
        };

        this.connectionTracking = {};
        this.messageTracking = {};
        this.bandwidthTracking = {};
        this.abuseTracking = {};
        this.bannedIps = new Set();

        this.stats = {
            connectionsBlocked: 0,
            messagesBlocked: 0,
            bandwidthExceeded: 0,
            abuseDetected: 0,
            ipsBanned: 0
        };
    }

    // Check if connection should be allowed
    async shouldAllowConnection(ip) {
        try {
            // Check if IP is banned
            if (this.isIpBanned(ip)) {
                this.stats.connectionsBlocked++;
                logger.warn('Connection blocked: IP banned', { ip });
                return false;
            }

            // Check connection rate
            if (!await this.checkConnectionRate(ip)) {
                this.stats.connectionsBlocked++;
                logger.warn('Connection blocked: rate limit exceeded', { ip });
                return false;
            }

            return true;

        } catch (error) {
            logger.error('Connection check error:', { error: error.message, ip });
            return true; // Allow connection on error
        }
    }

    // Check if IP is banned
    isIpBanned(ip) {
        return this.bannedIps.has(ip);
    }

    // Check connection rate
    async checkConnectionRate(ip) {
        try {
            const now = Date.now();
            const key = `throttle:conn:${ip}`;

            // Get current connection data
            let connectionData = await advancedCache.get(key);

            if (!connectionData) {
                connectionData = {
                    connections: [],
                    firstConnection: now,
                    totalConnections: 0
                };
            }

            // Clean up old connections
            const windowStart = now - this.throttlingConfig.connectionRateWindow;
            connectionData.connections = connectionData.connections.filter(
                time => time >= windowStart
            );

            // Check rate limit
            if (connectionData.connections.length >= this.throttlingConfig.maxConnectionRate) {
                return false;
            }

            // Add current connection
            connectionData.connections.push(now);
            connectionData.totalConnections++;
            connectionData.lastConnection = now;

            // Update cache
            await advancedCache.set(key, connectionData, 'throttling', 300);

            return true;

        } catch (error) {
            logger.error('Connection rate check error:', { error: error.message, ip });
            return true; // Allow connection on error
        }
    }

    // Check if message should be allowed
    async shouldAllowMessage(ip, messageSize) {
        try {
            // Check if IP is banned
            if (this.isIpBanned(ip)) {
                this.stats.messagesBlocked++;
                logger.warn('Message blocked: IP banned', { ip });
                return false;
            }

            // Check message rate
            if (!await this.checkMessageRate(ip)) {
                this.stats.messagesBlocked++;
                logger.warn('Message blocked: rate limit exceeded', { ip });
                return false;
            }

            // Check bandwidth
            if (!await this.checkBandwidth(ip, messageSize)) {
                this.stats.bandwidthExceeded++;
                logger.warn('Message blocked: bandwidth limit exceeded', { ip });
                return false;
            }

            return true;

        } catch (error) {
            logger.error('Message check error:', { error: error.message, ip });
            return true; // Allow message on error
        }
    }

    // Check message rate
    async checkMessageRate(ip) {
        try {
            const now = Date.now();
            const key = `throttle:msg:${ip}`;

            // Get current message data
            let messageData = await advancedCache.get(key);

            if (!messageData) {
                messageData = {
                    messages: [],
                    firstMessage: now,
                    totalMessages: 0,
                    currentBurst: 0
                };
            }

            // Clean up old messages
            const windowStart = now - this.throttlingConfig.messageRateWindow;
            messageData.messages = messageData.messages.filter(
                time => time >= windowStart
            );

            // Check burst limit
            const currentTimeWindow = now - (now % this.throttlingConfig.messageRateWindow);
            const messagesInWindow = messageData.messages.filter(
                time => time >= currentTimeWindow
            ).length;

            if (messagesInWindow >= this.throttlingConfig.messageBurstLimit) {
                return false;
            }

            // Check sustained rate
            if (messageData.messages.length >= this.throttlingConfig.maxMessagesPerSecond) {
                return false;
            }

            // Add current message
            messageData.messages.push(now);
            messageData.totalMessages++;
            messageData.lastMessage = now;

            // Update cache
            await advancedCache.set(key, messageData, 'throttling', 60);

            return true;

        } catch (error) {
            logger.error('Message rate check error:', { error: error.message, ip });
            return true; // Allow message on error
        }
    }

    // Check bandwidth usage
    async checkBandwidth(ip, messageSize) {
        try {
            const now = Date.now();
            const key = `throttle:bw:${ip}`;

            // Get current bandwidth data
            let bandwidthData = await advancedCache.get(key);

            if (!bandwidthData) {
                bandwidthData = {
                    bytesUsed: 0,
                    firstByte: now,
                    totalBytes: 0,
                    periods: []
                };
            }

            // Clean up old periods
            const windowStart = now - this.throttlingConfig.bandwidthWindow;
            bandwidthData.periods = bandwidthData.periods.filter(
                period => period.time >= windowStart
            );

            // Calculate current period
            const currentPeriod = now - (now % this.throttlingConfig.bandwidthWindow);
            let periodData = bandwidthData.periods.find(p => p.time === currentPeriod);

            if (!periodData) {
                periodData = { time: currentPeriod, bytes: 0 };
                bandwidthData.periods.push(periodData);
            }

            // Check bandwidth limit
            const totalPeriodBytes = bandwidthData.periods.reduce((sum, p) => sum + p.bytes, 0);
            if (totalPeriodBytes + messageSize > this.throttlingConfig.maxBandwidthPerMinute) {
                return false;
            }

            // Add message size
            periodData.bytes += messageSize;
            bandwidthData.bytesUsed += messageSize;
            bandwidthData.totalBytes += messageSize;
            bandwidthData.lastByte = now;

            // Update cache
            await advancedCache.set(key, bandwidthData, 'throttling', 120);

            return true;

        } catch (error) {
            logger.error('Bandwidth check error:', { error: error.message, ip });
            return true; // Allow message on error
        }
    }

    // Detect abuse patterns
    async detectAbuse(ip, action) {
        try {
            const now = Date.now();
            const key = `throttle:abuse:${ip}`;

            // Get current abuse data
            let abuseData = await advancedCache.get(key);

            if (!abuseData) {
                abuseData = {
                    actions: [],
                    firstAction: now,
                    totalActions: 0,
                    abuseScore: 0
                };
            }

            // Add current action
            abuseData.actions.push({
                type: action,
                time: now,
                score: this.calculateActionScore(action)
            });

            abuseData.totalActions++;
            abuseData.lastAction = now;

            // Calculate abuse score
            const windowStart = now - this.throttlingConfig.abuseWindow;
            const recentActions = abuseData.actions.filter(a => a.time >= windowStart);
            abuseData.abuseScore = recentActions.reduce((sum, a) => sum + a.score, 0);

            // Check if abuse threshold exceeded
            if (abuseData.abuseScore >= this.throttlingConfig.abuseThreshold) {
                await this.handleAbuseDetected(ip, abuseData);
                return true;
            }

            // Update cache
            await advancedCache.set(key, abuseData, 'throttling', 600);

            return false;

        } catch (error) {
            logger.error('Abuse detection error:', { error: error.message, ip });
            return false;
        }
    }

    // Calculate action score
    calculateActionScore(action) {
        const scoreMap = {
            'failed_auth': 2,
            'rate_limit_exceeded': 3,
            'invalid_request': 1,
            'malformed_data': 2,
            'suspicious_pattern': 4
        };

        return scoreMap[action] || 1;
    }

    // Handle detected abuse
    async handleAbuseDetected(ip, abuseData) {
        try {
            this.stats.abuseDetected++;
            logger.warn('Abuse detected', {
                ip,
                abuseScore: abuseData.abuseScore,
                recentActions: abuseData.actions.length
            });

            // Ban the IP
            await this.banIp(ip);

            // Notify other services
            await this.notifyServicesOfAbuse(ip, abuseData);

        } catch (error) {
            logger.error('Abuse handling error:', { error: error.message, ip });
        }
    }

    // Ban IP
    async banIp(ip) {
        try {
            // Add to banned set
            this.bannedIps.add(ip);
            this.stats.ipsBanned++;

            // Store in cache
            await advancedCache.set(`throttle:ban:${ip}`, {
                ip,
                bannedAt: new Date().toISOString(),
                banExpires: new Date(Date.now() + this.throttlingConfig.banDuration).toISOString(),
                reason: 'Abuse detected'
            }, 'throttling', Math.floor(this.throttlingConfig.banDuration / 1000));

            logger.info('IP banned', {
                ip,
                banDuration: this.throttlingConfig.banDuration / 1000 / 60, // minutes
                expiresAt: new Date(Date.now() + this.throttlingConfig.banDuration).toISOString()
            });

        } catch (error) {
            logger.error('IP ban error:', { error: error.message, ip });
        }
    }

    // Unban IP
    async unbanIp(ip) {
        try {
            // Remove from banned set
            this.bannedIps.delete(ip);

            // Remove from cache
            await advancedCache.delete(`throttle:ban:${ip}`, 'throttling');

            logger.info('IP unbanned', { ip });

        } catch (error) {
            logger.error('IP unban error:', { error: error.message, ip });
        }
    }

    // Notify services of abuse
    async notifyServicesOfAbuse(ip, abuseData) {
        try {
            // Get all services
            const services = serviceDiscovery.getAllServicesInfo();

            // Notify each service
            for (const serviceName in services) {
                try {
                    // In a real implementation, this would call service APIs
                    logger.info('Notifying service of abuse', {
                        service: serviceName,
                        ip,
                        abuseScore: abuseData.abuseScore
                    });

                } catch (error) {
                    logger.error('Service abuse notification error:', {
                        error: error.message,
                        service: serviceName,
                        ip
                    });
                }
            }

        } catch (error) {
            logger.error('Abuse notification error:', { error: error.message, ip });
        }
    }

    // Get throttling statistics
    getStats() {
        return {
            ...this.stats,
            bannedIps: this.bannedIps.size,
            activeTracking: Object.keys(this.connectionTracking).length,
            timestamp: new Date().toISOString()
        };
    }

    // Reset statistics
    resetStats() {
        this.stats = {
            connectionsBlocked: 0,
            messagesBlocked: 0,
            bandwidthExceeded: 0,
            abuseDetected: 0,
            ipsBanned: 0
        };
    }

    // Get banned IPs
    getBannedIps() {
        return Array.from(this.bannedIps);
    }

    // Check if IP should be unbanned
    async checkUnbanIp(ip) {
        try {
            const banData = await advancedCache.get(`throttle:ban:${ip}`);

            if (!banData) {
                return true; // Not banned
            }

            const now = new Date();
            const banExpires = new Date(banData.banExpires);

            if (now >= banExpires) {
                await this.unbanIp(ip);
                return true;
            }

            return false;

        } catch (error) {
            logger.error('Unban check error:', { error: error.message, ip });
            return false;
        }
    }

    // Get throttling configuration
    getThrottlingConfig() {
        return this.throttlingConfig;
    }

    // Set throttling configuration
    setThrottlingConfig(config) {
        this.throttlingConfig = { ...this.throttlingConfig, ...config };
        logger.info('Throttling configuration updated', { config: this.throttlingConfig });
    }

    // Get abuse detection report
    async getAbuseReport() {
        try {
            const bannedIps = this.getBannedIps();
            const stats = this.getStats();

            // Get recent abuse data
            const abuseKeys = await advancedCache.getKeysByPattern('throttle:abuse:*');
            const recentAbuse = [];

            for (const key of abuseKeys) {
                const abuseData = await advancedCache.get(key);
                if (abuseData) {
                    recentAbuse.push({
                        ip: key.replace('throttle:abuse:', ''),
                        ...abuseData
                    });
                }
            }

            return {
                bannedIps,
                recentAbuse,
                stats,
                config: this.throttlingConfig,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            logger.error('Abuse report generation error:', { error: error.message });
            return {
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Get connection throttling report
    async getConnectionReport() {
        try {
            const stats = this.getStats();
            const bannedIps = this.getBannedIps();

            // Get recent connection data
            const connectionKeys = await advancedCache.getKeysByPattern('throttle:conn:*');
            const recentConnections = [];

            for (const key of connectionKeys) {
                const connData = await advancedCache.get(key);
                if (connData) {
                    recentConnections.push({
                        ip: key.replace('throttle:conn:', ''),
                        ...connData
                    });
                }
            }

            return {
                stats,
                bannedIps,
                recentConnections,
                config: this.throttlingConfig,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            logger.error('Connection report generation error:', { error: error.message });
            return {
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Get message throttling report
    async getMessageReport() {
        try {
            const stats = this.getStats();

            // Get recent message data
            const messageKeys = await advancedCache.getKeysByPattern('throttle:msg:*');
            const recentMessages = [];

            for (const key of messageKeys) {
                const msgData = await advancedCache.get(key);
                if (msgData) {
                    recentMessages.push({
                        ip: key.replace('throttle:msg:', ''),
                        ...msgData
                    });
                }
            }

            return {
                stats,
                recentMessages,
                config: this.throttlingConfig,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            logger.error('Message report generation error:', { error: error.message });
            return {
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Get bandwidth throttling report
    async getBandwidthReport() {
        try {
            const stats = this.getStats();

            // Get recent bandwidth data
            const bandwidthKeys = await advancedCache.getKeysByPattern('throttle:bw:*');
            const recentBandwidth = [];

            for (const key of bandwidthKeys) {
                const bwData = await advancedCache.get(key);
                if (bwData) {
                    recentBandwidth.push({
                        ip: key.replace('throttle:bw:', ''),
                        ...bwData
                    });
                }
            }

            return {
                stats,
                recentBandwidth,
                config: this.throttlingConfig,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            logger.error('Bandwidth report generation error:', { error: error.message });
            return {
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Get comprehensive throttling report
    async getComprehensiveReport() {
        try {
            const connectionReport = await this.getConnectionReport();
            const messageReport = await this.getMessageReport();
            const bandwidthReport = await this.getBandwidthReport();
            const abuseReport = await this.getAbuseReport();

            return {
                connection: connectionReport,
                message: messageReport,
                bandwidth: bandwidthReport,
                abuse: abuseReport,
                overallStats: this.getStats(),
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            logger.error('Comprehensive report generation error:', { error: error.message });
            return {
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

export const connectionThrottling = new ConnectionThrottling();
export default connectionThrottling;