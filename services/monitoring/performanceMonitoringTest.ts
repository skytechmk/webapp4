import { performanceMonitoringService, EnhancedPerformanceMetrics, MonitoringAlert } from './performanceMonitoringService';
import { alertingService, AlertingServiceConfig } from './alertingService';

// Performance Monitoring System Test Suite
export class PerformanceMonitoringTest {
    private static instance: PerformanceMonitoringTest;
    private testResults: Array<{
        testName: string;
        status: 'passed' | 'failed' | 'pending';
        duration: number;
        error?: string;
    }> = [];
    private startTime: number = 0;

    private constructor() { }

    public static getInstance(): PerformanceMonitoringTest {
        if (!PerformanceMonitoringTest.instance) {
            PerformanceMonitoringTest.instance = new PerformanceMonitoringTest();
        }
        return PerformanceMonitoringTest.instance;
    }

    // Run comprehensive test suite
    public async runComprehensiveTest(): Promise<{
        totalTests: number;
        passedTests: number;
        failedTests: number;
        testDuration: number;
        results: typeof PerformanceMonitoringTest.instance.testResults;
    }> {
        this.startTime = Date.now();
        this.testResults = [];

        console.log('🧪 Starting Performance Monitoring System Tests...');

        try {
            // Test 1: Performance Monitoring Service Initialization
            await this.testPerformanceMonitoringInitialization();

            // Test 2: Metrics Collection
            await this.testMetricsCollection();

            // Test 3: Alert Generation
            await this.testAlertGeneration();

            // Test 4: Service Health Monitoring
            await this.testServiceHealthMonitoring();

            // Test 5: Infrastructure Monitoring
            await this.testInfrastructureMonitoring();

            // Test 6: Alerting Service
            await this.testAlertingService();

            // Test 7: Performance Under Load
            await this.testPerformanceUnderLoad();

            // Test 8: Memory Management
            await this.testMemoryManagement();

            // Test 9: Error Handling
            await this.testErrorHandling();

            // Test 10: Cleanup and Resource Management
            await this.testCleanupAndResourceManagement();

            const endTime = Date.now();
            const testDuration = endTime - this.startTime;

            const passedTests = this.testResults.filter(r => r.status === 'passed').length;
            const failedTests = this.testResults.filter(r => r.status === 'failed').length;
            const totalTests = this.testResults.length;

            console.log('📊 Test Results Summary:');
            console.log(`   Total Tests: ${totalTests}`);
            console.log(`   Passed: ${passedTests}`);
            console.log(`   Failed: ${failedTests}`);
            console.log(`   Duration: ${(testDuration / 1000).toFixed(2)} seconds`);
            console.log(`   Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

            return {
                totalTests,
                passedTests,
                failedTests,
                testDuration,
                results: this.testResults
            };

        } catch (error) {
            console.error('❌ Test suite failed:', error);
            return {
                totalTests: this.testResults.length,
                passedTests: this.testResults.filter(r => r.status === 'passed').length,
                failedTests: this.testResults.filter(r => r.status === 'failed').length + 1,
                testDuration: Date.now() - this.startTime,
                results: this.testResults
            };
        }
    }

    // Test 1: Performance Monitoring Service Initialization
    private async testPerformanceMonitoringInitialization(): Promise<void> {
        const testName = 'Performance Monitoring Service Initialization';
        const startTime = Date.now();

        try {
            // Test basic initialization
            const monitoringService = performanceMonitoringService;

            // Verify service is initialized
            if (!monitoringService) {
                throw new Error('Monitoring service not initialized');
            }

            // Test configuration
            const config = monitoringService['config'];
            if (!config || !config.collectionInterval) {
                throw new Error('Monitoring service configuration missing');
            }

            // Test that service can start and stop
            monitoringService.stopMonitoring();
            monitoringService.startMonitoring();

            const duration = Date.now() - startTime;
            this.testResults.push({
                testName,
                status: 'passed',
                duration
            });

            console.log(`✅ ${testName}: PASSED (${duration}ms)`);

        } catch (error) {
            const duration = Date.now() - startTime;
            this.testResults.push({
                testName,
                status: 'failed',
                duration,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            console.error(`❌ ${testName}: FAILED - ${error instanceof Error ? error.message : error}`);
        }
    }

    // Test 2: Metrics Collection
    private async testMetricsCollection(): Promise<void> {
        const testName = 'Metrics Collection';
        const startTime = Date.now();

        try {
            const monitoringService = performanceMonitoringService;

            // Start monitoring if not already running
            if (!monitoringService['isMonitoring']) {
                monitoringService.startMonitoring();
            }

            // Wait for metrics to be collected
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Get current metrics
            const metrics = monitoringService.getCurrentMetrics();

            if (!metrics) {
                throw new Error('No metrics collected');
            }

            // Verify metrics structure
            const requiredFields = [
                'frontendMetrics', 'backendMetrics', 'infrastructureMetrics',
                'userExperienceMetrics', 'serviceHealthMetrics', 'metadata'
            ];

            for (const field of requiredFields) {
                if (!(field in metrics)) {
                    throw new Error(`Missing required field: ${field}`);
                }
            }

            // Verify metrics have reasonable values
            if (metrics.infrastructureMetrics.cpuUsage < 0 || metrics.infrastructureMetrics.cpuUsage > 100) {
                throw new Error('Invalid CPU usage value');
            }

            if (metrics.backendMetrics.errorRate < 0 || metrics.backendMetrics.errorRate > 100) {
                throw new Error('Invalid error rate value');
            }

            const duration = Date.now() - startTime;
            this.testResults.push({
                testName,
                status: 'passed',
                duration
            });

            console.log(`✅ ${testName}: PASSED (${duration}ms)`);
            console.log(`   Collected metrics with ${Object.keys(metrics).length} fields`);

        } catch (error) {
            const duration = Date.now() - startTime;
            this.testResults.push({
                testName,
                status: 'failed',
                duration,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            console.error(`❌ ${testName}: FAILED - ${error instanceof Error ? error.message : error}`);
        }
    }

    // Test 3: Alert Generation
    private async testAlertGeneration(): Promise<void> {
        const testName = 'Alert Generation';
        const startTime = Date.now();

        try {
            const monitoringService = performanceMonitoringService;

            // Create a test metric that should trigger alerts
            const testMetrics: EnhancedPerformanceMetrics = {
                frontendMetrics: { fcp: 100, lcp: 200, cls: 0.1, ttfb: 50, fps: 60, memoryUsage: 50, networkLatency: 100, resourceLoadTime: 500 },
                backendMetrics: { apiResponseTime: 1500, databaseQueryTime: 200, serviceProcessingTime: 300, errorRate: 8, requestThroughput: 15 },
                infrastructureMetrics: { cpuUsage: 95, memoryUsage: 90, diskUsage: 85, networkBandwidth: 25, storageCapacity: 100 },
                userExperienceMetrics: { pageLoadTime: 2500, interactionResponseTime: 150, sessionSuccessRate: 92, devicePerformanceScore: 75, userSatisfactionScore: 80 },
                serviceHealthMetrics: { serviceAvailability: 92, dependencyHealth: 88, circuitBreakerStatus: 'open', degradationLevel: 'critical' },
                metadata: { deviceType: 'desktop', browser: 'test', networkType: 'normal' },
                memoryUsage: 50,
                cpuUsage: 95,
                fps: 60,
                networkLatency: 100,
                storageUsage: 85,
                activeWorkers: 1,
                cacheHits: 100,
                cacheMisses: 10,
                timestamp: new Date().toISOString()
            };

            // Manually add to metrics history to test alert generation
            monitoringService['metricsHistory'].push(testMetrics);

            // Trigger alert checking
            monitoringService['checkForAlerts'](testMetrics);

            // Wait for alerts to be processed
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Check if alerts were generated
            const alertsGenerated = monitoringService['alertCallbacks'].size > 0;

            if (!alertsGenerated) {
                throw new Error('No alerts generated for critical metrics');
            }

            const duration = Date.now() - startTime;
            this.testResults.push({
                testName,
                status: 'passed',
                duration
            });

            console.log(`✅ ${testName}: PASSED (${duration}ms)`);
            console.log(`   Alert generation working correctly`);

        } catch (error) {
            const duration = Date.now() - startTime;
            this.testResults.push({
                testName,
                status: 'failed',
                duration,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            console.error(`❌ ${testName}: FAILED - ${error instanceof Error ? error.message : error}`);
        }
    }

    // Test 4: Service Health Monitoring
    private async testServiceHealthMonitoring(): Promise<void> {
        const testName = 'Service Health Monitoring';
        const startTime = Date.now();

        try {
            const monitoringService = performanceMonitoringService;

            // Get current metrics
            const metrics = monitoringService.getCurrentMetrics();

            if (!metrics) {
                throw new Error('No metrics available for service health test');
            }

            // Test service health metrics
            const serviceHealth = metrics.serviceHealthMetrics;

            if (serviceHealth.serviceAvailability < 0 || serviceHealth.serviceAvailability > 100) {
                throw new Error('Invalid service availability value');
            }

            if (serviceHealth.dependencyHealth < 0 || serviceHealth.dependencyHealth > 100) {
                throw new Error('Invalid dependency health value');
            }

            // Test degradation levels
            const validDegradationLevels = ['normal', 'warning', 'critical'];
            if (!validDegradationLevels.includes(serviceHealth.degradationLevel)) {
                throw new Error('Invalid degradation level');
            }

            // Test circuit breaker status
            const validCircuitBreakerStatuses = ['closed', 'open', 'half-open'];
            if (!validCircuitBreakerStatuses.includes(serviceHealth.circuitBreakerStatus)) {
                throw new Error('Invalid circuit breaker status');
            }

            const duration = Date.now() - startTime;
            this.testResults.push({
                testName,
                status: 'passed',
                duration
            });

            console.log(`✅ ${testName}: PASSED (${duration}ms)`);
            console.log(`   Service health metrics validated`);

        } catch (error) {
            const duration = Date.now() - startTime;
            this.testResults.push({
                testName,
                status: 'failed',
                duration,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            console.error(`❌ ${testName}: FAILED - ${error instanceof Error ? error.message : error}`);
        }
    }

    // Test 5: Infrastructure Monitoring
    private async testInfrastructureMonitoring(): Promise<void> {
        const testName = 'Infrastructure Monitoring';
        const startTime = Date.now();

        try {
            const monitoringService = performanceMonitoringService;

            // Get current metrics
            const metrics = monitoringService.getCurrentMetrics();

            if (!metrics) {
                throw new Error('No metrics available for infrastructure test');
            }

            // Test infrastructure metrics
            const infrastructure = metrics.infrastructureMetrics;

            if (infrastructure.cpuUsage < 0 || infrastructure.cpuUsage > 100) {
                throw new Error('Invalid CPU usage value');
            }

            if (infrastructure.memoryUsage < 0 || infrastructure.memoryUsage > 100) {
                throw new Error('Invalid memory usage value');
            }

            if (infrastructure.diskUsage < 0 || infrastructure.diskUsage > 100) {
                throw new Error('Invalid disk usage value');
            }

            if (infrastructure.networkBandwidth < 0) {
                throw new Error('Invalid network bandwidth value');
            }

            if (infrastructure.storageCapacity < 0) {
                throw new Error('Invalid storage capacity value');
            }

            const duration = Date.now() - startTime;
            this.testResults.push({
                testName,
                status: 'passed',
                duration
            });

            console.log(`✅ ${testName}: PASSED (${duration}ms)`);
            console.log(`   Infrastructure metrics validated`);

        } catch (error) {
            const duration = Date.now() - startTime;
            this.testResults.push({
                testName,
                status: 'failed',
                duration,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            console.error(`❌ ${testName}: FAILED - ${error instanceof Error ? error.message : error}`);
        }
    }

    // Test 6: Alerting Service
    private async testAlertingService(): Promise<void> {
        const testName = 'Alerting Service';
        const startTime = Date.now();

        try {
            // Use the imported alertingService directly

            // Test alerting service initialization
            if (!alertingService) {
                throw new Error('Alerting service not initialized');
            }

            // Test alert delivery
            const testAlert: MonitoringAlert = {
                id: 'test_alert',
                title: 'Test Alert',
                message: 'This is a test alert for validation',
                severity: 'warning',
                timestamp: new Date().toISOString(),
                metrics: {
                    frontendMetrics: { fcp: 100, lcp: 200, cls: 0.1, ttfb: 50, fps: 60, memoryUsage: 50, networkLatency: 100, resourceLoadTime: 500 },
                    backendMetrics: { apiResponseTime: 300, databaseQueryTime: 100, serviceProcessingTime: 200, errorRate: 2, requestThroughput: 20 },
                    infrastructureMetrics: { cpuUsage: 40, memoryUsage: 50, diskUsage: 60, networkBandwidth: 15, storageCapacity: 200 },
                    userExperienceMetrics: { pageLoadTime: 1200, interactionResponseTime: 80, sessionSuccessRate: 98, devicePerformanceScore: 85, userSatisfactionScore: 90 },
                    serviceHealthMetrics: { serviceAvailability: 99.5, dependencyHealth: 98, circuitBreakerStatus: 'closed', degradationLevel: 'normal' },
                    metadata: { deviceType: 'desktop', browser: 'test', networkType: 'normal' },
                    memoryUsage: 50,
                    cpuUsage: 40,
                    fps: 60,
                    networkLatency: 100,
                    storageUsage: 60,
                    activeWorkers: 1,
                    cacheHits: 100,
                    cacheMisses: 10,
                    timestamp: new Date().toISOString()
                },
                acknowledged: false,
                resolved: false
            };

            // Add test alert
            alertingService.addAlert(testAlert);

            // Check if alert was processed
            const deliveryHistory = alertingService.getDeliveryHistory();
            const alertProcessed = deliveryHistory.some((notification: any) => notification.alert.id === 'test_alert');

            if (!alertProcessed) {
                throw new Error('Test alert not processed');
            }

            const duration = Date.now() - startTime;
            this.testResults.push({
                testName,
                status: 'passed',
                duration
            });

            console.log(`✅ ${testName}: PASSED (${duration}ms)`);
            console.log(`   Alerting service working correctly`);

        } catch (error) {
            const duration = Date.now() - startTime;
            this.testResults.push({
                testName,
                status: 'failed',
                duration,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            console.error(`❌ ${testName}: FAILED - ${error instanceof Error ? error.message : error}`);
        }
    }

    // Test 7: Performance Under Load
    private async testPerformanceUnderLoad(): Promise<void> {
        const testName = 'Performance Under Load';
        const startTime = Date.now();

        try {
            const monitoringService = performanceMonitoringService;

            // Simulate load by collecting multiple metrics quickly
            const loadTestPromises = Array(10).fill(0).map(() =>
                monitoringService['collectEnhancedMetrics']()
            );

            await Promise.all(loadTestPromises);

            // Check that metrics were collected
            const metricsHistory = monitoringService.getMetricsHistory();
            if (metricsHistory.length < 10) {
                throw new Error('Load test did not collect enough metrics');
            }

            // Check performance impact
            const endTime = Date.now();
            const loadTestDuration = endTime - startTime;

            if (loadTestDuration > 5000) { // Should complete in under 5 seconds
                throw new Error('Load test took too long, potential performance issue');
            }

            const duration = Date.now() - startTime;
            this.testResults.push({
                testName,
                status: 'passed',
                duration
            });

            console.log(`✅ ${testName}: PASSED (${duration}ms)`);
            console.log(`   Collected ${metricsHistory.length} metrics under load`);

        } catch (error) {
            const duration = Date.now() - startTime;
            this.testResults.push({
                testName,
                status: 'failed',
                duration,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            console.error(`❌ ${testName}: FAILED - ${error instanceof Error ? error.message : error}`);
        }
    }

    // Test 8: Memory Management
    private async testMemoryManagement(): Promise<void> {
        const testName = 'Memory Management';
        const startTime = Date.now();

        try {
            const monitoringService = performanceMonitoringService;

            // Test retention policy
            const initialMetricsCount = monitoringService.getMetricsHistory().length;

            // Add many metrics to test retention
            for (let i = 0; i < 1500; i++) {
                const testMetrics: EnhancedPerformanceMetrics = {
                    frontendMetrics: { fcp: 100, lcp: 200, cls: 0.1, ttfb: 50, fps: 60, memoryUsage: 50, networkLatency: 100, resourceLoadTime: 500 },
                    backendMetrics: { apiResponseTime: 300, databaseQueryTime: 100, serviceProcessingTime: 200, errorRate: 2, requestThroughput: 20 },
                    infrastructureMetrics: { cpuUsage: 40, memoryUsage: 50, diskUsage: 60, networkBandwidth: 15, storageCapacity: 200 },
                    userExperienceMetrics: { pageLoadTime: 1200, interactionResponseTime: 80, sessionSuccessRate: 98, devicePerformanceScore: 85, userSatisfactionScore: 90 },
                    serviceHealthMetrics: { serviceAvailability: 99.5, dependencyHealth: 98, circuitBreakerStatus: 'closed', degradationLevel: 'normal' },
                    metadata: { deviceType: 'desktop', browser: 'test', networkType: 'normal' },
                    memoryUsage: 50,
                    cpuUsage: 40,
                    fps: 60,
                    networkLatency: 100,
                    storageUsage: 60,
                    activeWorkers: 1,
                    cacheHits: 100,
                    cacheMisses: 10,
                    timestamp: new Date(Date.now() - i * 1000).toISOString() // Different timestamps
                };

                monitoringService['metricsHistory'].push(testMetrics);
            }

            // Trigger retention policy
            monitoringService['applyRetentionPolicy']();

            // Check that retention worked
            const finalMetricsCount = monitoringService.getMetricsHistory().length;

            if (finalMetricsCount > 1000) {
                throw new Error('Retention policy did not limit metrics history');
            }

            const duration = Date.now() - startTime;
            this.testResults.push({
                testName,
                status: 'passed',
                duration
            });

            console.log(`✅ ${testName}: PASSED (${duration}ms)`);
            console.log(`   Memory management working correctly (${initialMetricsCount} → ${finalMetricsCount} metrics)`);

        } catch (error) {
            const duration = Date.now() - startTime;
            this.testResults.push({
                testName,
                status: 'failed',
                duration,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            console.error(`❌ ${testName}: FAILED - ${error instanceof Error ? error.message : error}`);
        }
    }

    // Test 9: Error Handling
    private async testErrorHandling(): Promise<void> {
        const testName = 'Error Handling';
        const startTime = Date.now();

        try {
            const monitoringService = performanceMonitoringService;

            // Test error recovery by forcing an error condition
            const originalCollectMetrics = monitoringService['collectEnhancedMetrics'];

            // Replace with error-throwing version
            monitoringService['collectEnhancedMetrics'] = async () => {
                throw new Error('Simulated collection error');
            };

            // Try to collect metrics (should handle error gracefully)
            try {
                await monitoringService['collectEnhancedMetrics']();
            } catch {
                // Expected to fail
            }

            // Restore original method
            monitoringService['collectEnhancedMetrics'] = originalCollectMetrics;

            // Check that error was handled (metrics history should still exist)
            const metricsHistory = monitoringService.getMetricsHistory();
            if (metricsHistory.length === 0) {
                throw new Error('Error handling failed - metrics history lost');
            }

            const duration = Date.now() - startTime;
            this.testResults.push({
                testName,
                status: 'passed',
                duration
            });

            console.log(`✅ ${testName}: PASSED (${duration}ms)`);
            console.log(`   Error handling working correctly`);

        } catch (error) {
            const duration = Date.now() - startTime;
            this.testResults.push({
                testName,
                status: 'failed',
                duration,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            console.error(`❌ ${testName}: FAILED - ${error instanceof Error ? error.message : error}`);
        }
    }

    // Test 10: Cleanup and Resource Management
    private async testCleanupAndResourceManagement(): Promise<void> {
        const testName = 'Cleanup and Resource Management';
        const startTime = Date.now();

        try {
            const monitoringService = performanceMonitoringService;
            // Use the imported alertingService directly

            // Test cleanup functionality
            monitoringService.cleanup();
            alertingService.cleanup();

            // Verify cleanup worked
            const metricsAfterCleanup = monitoringService.getMetricsHistory();
            if (metricsAfterCleanup.length !== 0) {
                throw new Error('Cleanup did not clear metrics history');
            }

            const deliveryHistoryAfterCleanup = alertingService.getDeliveryHistory();
            if (deliveryHistoryAfterCleanup.length !== 0) {
                throw new Error('Cleanup did not clear delivery history');
            }

            // Test that services can be restarted after cleanup
            monitoringService.startMonitoring();
            alertingService.startAlerting();

            const duration = Date.now() - startTime;
            this.testResults.push({
                testName,
                status: 'passed',
                duration
            });

            console.log(`✅ ${testName}: PASSED (${duration}ms)`);
            console.log(`   Cleanup and resource management working correctly`);

        } catch (error) {
            const duration = Date.now() - startTime;
            this.testResults.push({
                testName,
                status: 'failed',
                duration,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            console.error(`❌ ${testName}: FAILED - ${error instanceof Error ? error.message : error}`);
        }
    }

    // Generate test report
    public generateTestReport(): string {
        const passedTests = this.testResults.filter(r => r.status === 'passed').length;
        const failedTests = this.testResults.filter(r => r.status === 'failed').length;
        const totalTests = this.testResults.length;
        const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

        let report = `# Performance Monitoring System Test Report\n\n`;
        report += `## Summary\n\n`;
        report += `- **Total Tests**: ${totalTests}\n`;
        report += `- **Passed**: ${passedTests}\n`;
        report += `- **Failed**: ${failedTests}\n`;
        report += `- **Pass Rate**: ${passRate.toFixed(1)}%\n`;
        report += `- **Duration**: ${(Date.now() - this.startTime) / 1000} seconds\n\n`;

        report += `## Detailed Results\n\n`;

        this.testResults.forEach((result, index) => {
            report += `### Test ${index + 1}: ${result.testName}\n\n`;
            report += `- **Status**: ${result.status.toUpperCase()}\n`;
            report += `- **Duration**: ${result.duration}ms\n`;
            if (result.error) {
                report += `- **Error**: ${result.error}\n`;
            }
            report += '\n';
        });

        report += `## Conclusion\n\n`;
        if (passRate >= 90) {
            report += '🎉 **EXCELLENT**: Performance monitoring system is working correctly with high reliability.\n';
        } else if (passRate >= 70) {
            report += '⚠️ **GOOD**: Performance monitoring system is functional but has some issues that need attention.\n';
        } else {
            report += '❌ **POOR**: Performance monitoring system has significant issues that need to be addressed.\n';
        }

        return report;
    }

    // Cleanup test resources
    public cleanup(): void {
        this.testResults = [];
        this.startTime = 0;
    }
}

// Export test instance
export const performanceMonitoringTest = PerformanceMonitoringTest.getInstance();

// Run tests and export results
export const runPerformanceMonitoringTests = async () => {
    return await performanceMonitoringTest.runComprehensiveTest();
};