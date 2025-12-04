import { MonitoringAlert } from './performanceMonitoringService';
import { api } from '../api';

// Alert notification channels
export type NotificationChannel = 'dashboard' | 'email' | 'slack' | 'sms' | 'webhook';

// Alert severity levels
export type AlertSeverity = 'info' | 'warning' | 'critical';

// Alert notification interface
export interface AlertNotification {
    alert: MonitoringAlert;
    channel: NotificationChannel;
    timestamp: string;
    deliveryStatus: 'pending' | 'delivered' | 'failed';
    retryCount: number;
}

// Alerting service configuration
export interface AlertingServiceConfig {
    notificationChannels?: NotificationChannel[];
    emailSettings?: {
        enabled: boolean;
        adminEmails: string[];
        smtpServer?: string;
    };
    slackSettings?: {
        enabled: boolean;
        webhookUrl?: string;
        channel?: string;
    };
    smsSettings?: {
        enabled: boolean;
        phoneNumbers: string[];
        provider?: string;
    };
    webhookSettings?: {
        enabled: boolean;
        urls: string[];
    };
    escalationPolicy?: {
        warningAfterMinutes: number;
        criticalAfterMinutes: number;
        maxRetries: number;
    };
}

// Alerting Service
export class AlertingService {
    private static instance: AlertingService;
    private config: AlertingServiceConfig;
    private notificationQueue: AlertNotification[] = [];
    private deliveryHistory: AlertNotification[] = [];
    private isProcessing = false;
    private cleanupFunctions: Set<() => void> = new Set();

    private constructor(config: AlertingServiceConfig = {}) {
        this.config = {
            notificationChannels: ['dashboard'],
            emailSettings: {
                enabled: false,
                adminEmails: []
            },
            slackSettings: {
                enabled: false
            },
            smsSettings: {
                enabled: false,
                phoneNumbers: []
            },
            webhookSettings: {
                enabled: false,
                urls: []
            },
            escalationPolicy: {
                warningAfterMinutes: 5,
                criticalAfterMinutes: 1,
                maxRetries: 3
            },
            ...config
        };
    }

    public static getInstance(config: AlertingServiceConfig = {}): AlertingService {
        if (!AlertingService.instance) {
            AlertingService.instance = new AlertingService(config);
        }
        return AlertingService.instance;
    }

    // Start alerting service
    public startAlerting(): void {
        if (this.isProcessing) return;
        this.isProcessing = true;

        // Start processing queue
        this.processQueue();

        // Set up periodic processing
        const intervalId = setInterval(() => {
            this.processQueue();
        }, 30000); // Process every 30 seconds

        this.cleanupFunctions.add(() => {
            clearInterval(intervalId);
        });
    }

    // Stop alerting service
    public stopAlerting(): void {
        this.isProcessing = false;
        this.cleanupFunctions.forEach(cleanup => cleanup());
        this.cleanupFunctions.clear();
    }

    // Add alert to notification queue
    public addAlert(alert: MonitoringAlert): void {
        const notificationChannels = this.config.notificationChannels || ['dashboard'];

        // Create notifications for each channel
        notificationChannels.forEach(channel => {
            const notification: AlertNotification = {
                alert,
                channel,
                timestamp: new Date().toISOString(),
                deliveryStatus: 'pending',
                retryCount: 0
            };

            this.notificationQueue.push(notification);
        });

        // Log the alert
        this.logAlert(alert);

        // Process queue immediately for critical alerts
        if (alert.severity === 'critical') {
            this.processQueue();
        }
    }

    // Process notification queue
    private async processQueue(): Promise<void> {
        if (!this.isProcessing || this.notificationQueue.length === 0) return;

        // Process each notification in queue
        for (const notification of [...this.notificationQueue]) {
            try {
                await this.processNotification(notification);

                // Remove from queue after processing
                this.notificationQueue = this.notificationQueue.filter(
                    n => n !== notification
                );

            } catch (error) {
                console.error('Failed to process notification:', error);
                // Keep in queue for retry
            }
        }
    }

    // Process individual notification
    private async processNotification(notification: AlertNotification): Promise<void> {
        try {
            // Determine delivery method based on channel
            switch (notification.channel) {
                case 'dashboard':
                    await this.deliverToDashboard(notification);
                    break;
                case 'email':
                    await this.deliverToEmail(notification);
                    break;
                case 'slack':
                    await this.deliverToSlack(notification);
                    break;
                case 'sms':
                    await this.deliverToSMS(notification);
                    break;
                case 'webhook':
                    await this.deliverToWebhook(notification);
                    break;
                default:
                    console.warn(`Unknown notification channel: ${notification.channel}`);
                    notification.deliveryStatus = 'failed';
            }

            // Add to delivery history
            this.deliveryHistory.push(notification);
            if (this.deliveryHistory.length > 1000) {
                this.deliveryHistory.shift();
            }

        } catch (error) {
            console.error(`Failed to deliver notification via ${notification.channel}:`, error);

            // Mark as failed and increment retry count
            notification.deliveryStatus = 'failed';
            notification.retryCount++;

            // Requeue if under max retries
            if (notification.retryCount < (this.config.escalationPolicy?.maxRetries || 3)) {
                this.notificationQueue.push(notification);
            } else {
                this.deliveryHistory.push(notification);
            }
        }
    }

    // Deliver to dashboard (immediate)
    private async deliverToDashboard(notification: AlertNotification): Promise<void> {
        // Dashboard notifications are handled by the UI components
        notification.deliveryStatus = 'delivered';
        console.log(`📊 Dashboard Alert: ${notification.alert.title} - ${notification.alert.message}`);
    }

    // Deliver to email
    private async deliverToEmail(notification: AlertNotification): Promise<void> {
        if (!this.config.emailSettings?.enabled) {
            notification.deliveryStatus = 'failed';
            return;
        }

        try {
            // Simulate email delivery
            console.log(`📧 Email Alert to ${this.config.emailSettings.adminEmails.join(', ')}:`);
            console.log(`   Subject: [SnapifY Alert] ${notification.alert.severity.toUpperCase()}: ${notification.alert.title}`);
            console.log(`   Message: ${notification.alert.message}`);
            console.log(`   Severity: ${notification.alert.severity}`);
            console.log(`   Timestamp: ${notification.alert.timestamp}`);

            // In production, this would call an email service
            // await emailService.sendAlertEmail(...);

            notification.deliveryStatus = 'delivered';
        } catch (error) {
            console.error('Email delivery failed:', error);
            notification.deliveryStatus = 'failed';
            throw error;
        }
    }

    // Deliver to Slack
    private async deliverToSlack(notification: AlertNotification): Promise<void> {
        if (!this.config.slackSettings?.enabled || !this.config.slackSettings.webhookUrl) {
            notification.deliveryStatus = 'failed';
            return;
        }

        try {
            // Simulate Slack delivery
            console.log(`💬 Slack Alert to ${this.config.slackSettings.channel || '#alerts'}:`);
            console.log(`   :warning: *${notification.alert.severity.toUpperCase()} ALERT*`);
            console.log(`   *${notification.alert.title}*`);
            console.log(`   ${notification.alert.message}`);
            console.log(`   _Timestamp: ${notification.alert.timestamp}_`);

            // In production, this would call Slack API
            // await slackService.sendWebhook(...);

            notification.deliveryStatus = 'delivered';
        } catch (error) {
            console.error('Slack delivery failed:', error);
            notification.deliveryStatus = 'failed';
            throw error;
        }
    }

    // Deliver to SMS
    private async deliverToSMS(notification: AlertNotification): Promise<void> {
        if (!this.config.smsSettings?.enabled || this.config.smsSettings.phoneNumbers.length === 0) {
            notification.deliveryStatus = 'failed';
            return;
        }

        try {
            // Simulate SMS delivery
            console.log(`📱 SMS Alert to ${this.config.smsSettings.phoneNumbers.join(', ')}:`);
            console.log(`   [SnapifY] ${notification.alert.severity.toUpperCase()} ALERT: ${notification.alert.title}`);
            console.log(`   ${notification.alert.message}`);

            // In production, this would call SMS service
            // await smsService.sendAlert(...);

            notification.deliveryStatus = 'delivered';
        } catch (error) {
            console.error('SMS delivery failed:', error);
            notification.deliveryStatus = 'failed';
            throw error;
        }
    }

    // Deliver to Webhook
    private async deliverToWebhook(notification: AlertNotification): Promise<void> {
        if (!this.config.webhookSettings?.enabled || this.config.webhookSettings.urls.length === 0) {
            notification.deliveryStatus = 'failed';
            return;
        }

        try {
            // Simulate webhook delivery
            console.log(`🌐 Webhook Alert to ${this.config.webhookSettings.urls.length} endpoints:`);
            console.log(`   Payload: ${JSON.stringify({
                alertId: notification.alert.id,
                title: notification.alert.title,
                message: notification.alert.message,
                severity: notification.alert.severity,
                timestamp: notification.alert.timestamp,
                metrics: notification.alert.metrics
            }, null, 2)}`);

            // In production, this would call webhook endpoints
            // await Promise.all(this.config.webhookSettings.urls.map(url =>
            //     fetch(url, { method: 'POST', body: JSON.stringify(payload) })
            // ));

            notification.deliveryStatus = 'delivered';
        } catch (error) {
            console.error('Webhook delivery failed:', error);
            notification.deliveryStatus = 'failed';
            throw error;
        }
    }

    // Log alert for debugging
    private logAlert(alert: MonitoringAlert): void {
        const severityEmoji = alert.severity === 'critical' ? '🔴' :
            alert.severity === 'warning' ? '🟡' : '🔵';

        console.groupCollapsed(`${severityEmoji} [ALERT] ${alert.title} @ ${new Date(alert.timestamp).toLocaleTimeString()}`);
        console.log(`Severity: ${alert.severity.toUpperCase()}`);
        console.log(`Message: ${alert.message}`);
        console.log(`Metrics:`);
        console.log(`  - CPU: ${alert.metrics.infrastructureMetrics.cpuUsage.toFixed(1)}%`);
        console.log(`  - Memory: ${alert.metrics.infrastructureMetrics.memoryUsage.toFixed(1)}%`);
        console.log(`  - API Response: ${alert.metrics.backendMetrics.apiResponseTime.toFixed(0)}ms`);
        console.log(`  - Error Rate: ${alert.metrics.backendMetrics.errorRate.toFixed(1)}%`);
        console.groupEnd();
    }

    // Get alert delivery history
    public getDeliveryHistory(): AlertNotification[] {
        return [...this.deliveryHistory];
    }

    // Get pending notifications
    public getPendingNotifications(): AlertNotification[] {
        return this.notificationQueue.filter(n => n.deliveryStatus === 'pending');
    }

    // Get failed notifications
    public getFailedNotifications(): AlertNotification[] {
        return this.deliveryHistory.filter(n => n.deliveryStatus === 'failed');
    }

    // Get notification statistics
    public getNotificationStatistics(): {
        totalNotifications: number;
        deliveredCount: number;
        failedCount: number;
        pendingCount: number;
        deliveryRate: number;
    } {
        const totalNotifications = this.deliveryHistory.length + this.notificationQueue.length;
        const deliveredCount = this.deliveryHistory.filter(n => n.deliveryStatus === 'delivered').length;
        const failedCount = this.deliveryHistory.filter(n => n.deliveryStatus === 'failed').length;
        const pendingCount = this.notificationQueue.length;

        return {
            totalNotifications,
            deliveredCount,
            failedCount,
            pendingCount,
            deliveryRate: totalNotifications > 0 ? (deliveredCount / totalNotifications) * 100 : 100
        };
    }

    // Cleanup all resources
    public cleanup(): void {
        this.stopAlerting();
        this.notificationQueue = [];
        this.deliveryHistory = [];
        this.cleanupFunctions.clear();
    }
}

// Alert escalation policy
export interface AlertEscalationPolicy {
    initialResponseTimeMinutes: number;
    warningEscalationMinutes: number;
    criticalEscalationMinutes: number;
    notificationChannels: NotificationChannel[];
    teamRouting: Record<string, string[]>;
}

// Alert escalation service
export class AlertEscalationService {
    private static instance: AlertEscalationService;
    private escalationPolicies: Record<string, AlertEscalationPolicy>;
    private activeEscalations: Map<string, {
        alertId: string;
        escalationLevel: number;
        lastNotified: Date;
        notifiedTeams: string[];
    }>;

    private constructor() {
        this.escalationPolicies = {};
        this.activeEscalations = new Map();
    }

    public static getInstance(): AlertEscalationService {
        if (!AlertEscalationService.instance) {
            AlertEscalationService.instance = new AlertEscalationService();
        }
        return AlertEscalationService.instance;
    }

    // Add escalation policy
    public addEscalationPolicy(alertType: string, policy: AlertEscalationPolicy): void {
        this.escalationPolicies[alertType] = policy;
    }

    // Start escalation for alert
    public startEscalation(alert: MonitoringAlert): void {
        const alertType = alert.id.split('_')[0]; // Extract alert type from ID
        const policy = this.escalationPolicies[alertType];

        if (!policy) {
            console.warn(`No escalation policy found for alert type: ${alertType}`);
            return;
        }

        this.activeEscalations.set(alert.id, {
            alertId: alert.id,
            escalationLevel: 0,
            lastNotified: new Date(),
            notifiedTeams: []
        });

        console.log(`🚨 Escalation started for alert: ${alert.title}`);
    }

    // Check and escalate alerts
    public checkEscalations(alertingService: AlertingService): void {
        const now = new Date();

        this.activeEscalations.forEach((escalation, alertId) => {
            const alertType = alertId.split('_')[0];
            const policy = this.escalationPolicies[alertType];

            if (!policy) return;

            const timeSinceLastNotification = (now.getTime() - escalation.lastNotified.getTime()) / (1000 * 60); // minutes

            // Determine escalation timing based on severity
            let escalationThresholdMinutes;
            if (escalation.escalationLevel === 0) {
                escalationThresholdMinutes = policy.initialResponseTimeMinutes;
            } else if (escalation.escalationLevel === 1) {
                escalationThresholdMinutes = policy.warningEscalationMinutes;
            } else {
                escalationThresholdMinutes = policy.criticalEscalationMinutes;
            }

            // Check if escalation is needed
            if (timeSinceLastNotification >= escalationThresholdMinutes) {
                this.escalateAlert(alertId, policy, alertingService);
            }
        });
    }

    // Escalate alert
    private escalateAlert(alertId: string, policy: AlertEscalationPolicy, alertingService: AlertingService): void {
        const escalation = this.activeEscalations.get(alertId);
        if (!escalation) return;

        escalation.escalationLevel++;
        escalation.lastNotified = new Date();

        // Determine which teams to notify based on escalation level
        const teamsToNotify = this.getTeamsForEscalationLevel(escalation.escalationLevel, policy);

        // Create escalation alert
        const escalationAlert: MonitoringAlert = {
            id: `${alertId}_escalation_${escalation.escalationLevel}`,
            title: `[ESCALATION L${escalation.escalationLevel}] ${alertId}`,
            message: `Alert ${alertId} has been escalated to level ${escalation.escalationLevel}. Notifying teams: ${teamsToNotify.join(', ')}`,
            severity: escalation.escalationLevel >= 2 ? 'critical' : 'warning',
            timestamp: new Date().toISOString(),
            metrics: this.createDefaultMetrics(),
            acknowledged: false,
            resolved: false
        };

        // Add to alerting service
        alertingService.addAlert(escalationAlert);

        console.log(`📢 Escalation Level ${escalation.escalationLevel} for ${alertId}: Notifying ${teamsToNotify.join(', ')}`);

        // Update notified teams
        escalation.notifiedTeams.push(...teamsToNotify);
    }

    // Get teams for escalation level
    private getTeamsForEscalationLevel(level: number, policy: AlertEscalationPolicy): string[] {
        // Simple escalation routing - in production this would be more sophisticated
        if (level === 1) {
            return ['devops', 'backend'];
        } else if (level === 2) {
            return ['devops', 'backend', 'frontend', 'management'];
        } else {
            return Object.keys(policy.teamRouting);
        }
    }

    // Create default metrics for escalation alerts
    private createDefaultMetrics(): any {
        return {
            frontendMetrics: { fcp: 0, lcp: 0, cls: 0, ttfb: 0, fps: 0, memoryUsage: 0, networkLatency: 0, resourceLoadTime: 0 },
            backendMetrics: { apiResponseTime: 0, databaseQueryTime: 0, serviceProcessingTime: 0, errorRate: 0, requestThroughput: 0 },
            infrastructureMetrics: { cpuUsage: 0, memoryUsage: 0, diskUsage: 0, networkBandwidth: 0, storageCapacity: 0 },
            userExperienceMetrics: { pageLoadTime: 0, interactionResponseTime: 0, sessionSuccessRate: 0, devicePerformanceScore: 0, userSatisfactionScore: 0 },
            serviceHealthMetrics: { serviceAvailability: 0, dependencyHealth: 0, circuitBreakerStatus: 'closed', degradationLevel: 'normal' },
            metadata: { deviceType: 'unknown', browser: 'unknown', networkType: 'unknown' },
            memoryUsage: 0,
            cpuUsage: 0,
            fps: 0,
            networkLatency: 0,
            storageUsage: 0,
            activeWorkers: 0,
            cacheHits: 0,
            cacheMisses: 0,
            timestamp: new Date().toISOString()
        };
    }

    // Cleanup
    public cleanup(): void {
        this.escalationPolicies = {};
        this.activeEscalations.clear();
    }
}

// Export singleton instances
export const alertingService = AlertingService.getInstance();
export const alertEscalationService = AlertEscalationService.getInstance();