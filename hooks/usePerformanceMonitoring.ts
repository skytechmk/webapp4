import { useState, useEffect, useRef } from 'react';
import { performanceMonitoringService, EnhancedPerformanceMetrics, MonitoringAlert } from '../services/monitoring/performanceMonitoringService';

// Custom hook for performance monitoring integration
export const usePerformanceMonitoring = (config: {
    enableMonitoring?: boolean;
    alertThresholds?: {
        cpuUsage?: number;
        memoryUsage?: number;
        errorRate?: number;
        responseTime?: number;
    };
} = {}) => {
    const { enableMonitoring = true, alertThresholds } = config;
    const [metrics, setMetrics] = useState<EnhancedPerformanceMetrics | null>(null);
    const [alerts, setAlerts] = useState<MonitoringAlert[]>([]);
    const [isMonitoring, setIsMonitoring] = useState(false);
    const monitoringRef = useRef(performanceMonitoringService);

    // Start monitoring on mount
    useEffect(() => {
        if (!enableMonitoring) return;

        // Configure monitoring service
        if (alertThresholds) {
            monitoringRef.current = performanceMonitoringService;
            const currentConfig = monitoringRef.current['config'];
            monitoringRef.current['config'] = {
                ...currentConfig,
                alertThresholds: {
                    ...currentConfig.alertThresholds,
                    ...alertThresholds
                }
            };
        }

        // Start monitoring
        monitoringRef.current.startMonitoring();
        setIsMonitoring(true);

        // Set up metrics update
        const updateMetrics = () => {
            const currentMetrics = monitoringRef.current.getCurrentMetrics();
            setMetrics(currentMetrics);
        };

        // Set up alert listener
        const alertCallback = (alert: MonitoringAlert) => {
            setAlerts(prevAlerts => [...prevAlerts, alert]);
        };

        monitoringRef.current.addAlertCallback(alertCallback);

        // Set up interval for metrics updates
        const intervalId = setInterval(updateMetrics, 5000);
        updateMetrics(); // Initial update

        // Cleanup
        return () => {
            clearInterval(intervalId);
            monitoringRef.current.removeAlertCallback(alertCallback);
            if (enableMonitoring) {
                monitoringRef.current.stopMonitoring();
                setIsMonitoring(false);
            }
        };
    }, [enableMonitoring, alertThresholds]);

    // Acknowledge an alert
    const acknowledgeAlert = (alertId: string) => {
        setAlerts(prevAlerts =>
            prevAlerts.map(alert =>
                alert.id === alertId ? { ...alert, acknowledged: true } : alert
            )
        );
    };

    // Resolve an alert
    const resolveAlert = (alertId: string) => {
        setAlerts(prevAlerts =>
            prevAlerts.map(alert =>
                alert.id === alertId ? { ...alert, resolved: true } : alert
            )
        );
    };

    // Clear all alerts
    const clearAlerts = () => {
        setAlerts([]);
    };

    // Get metrics for time range
    const getMetricsForTimeRange = (startTime: Date, endTime: Date): EnhancedPerformanceMetrics[] => {
        return monitoringRef.current.getMetricsForTimeRange(startTime, endTime);
    };

    // Get service health status
    const getServiceHealthStatus = (): {
        status: 'normal' | 'warning' | 'critical';
        availability: number;
        degradationLevel: string;
        circuitBreakerStatus: string;
    } => {
        const currentMetrics = monitoringRef.current.getCurrentMetrics();
        if (!currentMetrics) {
            return {
                status: 'normal',
                availability: 100,
                degradationLevel: 'normal',
                circuitBreakerStatus: 'closed'
            };
        }

        return {
            status: currentMetrics.serviceHealthMetrics.degradationLevel,
            availability: currentMetrics.serviceHealthMetrics.serviceAvailability,
            degradationLevel: currentMetrics.serviceHealthMetrics.degradationLevel,
            circuitBreakerStatus: currentMetrics.serviceHealthMetrics.circuitBreakerStatus
        };
    };

    // Get infrastructure health status
    const getInfrastructureHealthStatus = (): {
        cpuStatus: 'normal' | 'warning' | 'critical';
        memoryStatus: 'normal' | 'warning' | 'critical';
        diskStatus: 'normal' | 'warning' | 'critical';
        overallStatus: 'normal' | 'warning' | 'critical';
    } => {
        const currentMetrics = monitoringRef.current.getCurrentMetrics();
        if (!currentMetrics) {
            return {
                cpuStatus: 'normal',
                memoryStatus: 'normal',
                diskStatus: 'normal',
                overallStatus: 'normal'
            };
        }

        const { cpuUsage, memoryUsage, diskUsage } = currentMetrics.infrastructureMetrics;

        return {
            cpuStatus: cpuUsage > 90 ? 'critical' : cpuUsage > 75 ? 'warning' : 'normal',
            memoryStatus: memoryUsage > 85 ? 'critical' : memoryUsage > 70 ? 'warning' : 'normal',
            diskStatus: diskUsage > 90 ? 'critical' : diskUsage > 80 ? 'warning' : 'normal',
            overallStatus:
                cpuUsage > 90 || memoryUsage > 85 || diskUsage > 90 ? 'critical' :
                    cpuUsage > 75 || memoryUsage > 70 || diskUsage > 80 ? 'warning' : 'normal'
        };
    };

    return {
        metrics,
        alerts,
        isMonitoring,
        serviceHealth: getServiceHealthStatus(),
        infrastructureHealth: getInfrastructureHealthStatus(),
        acknowledgeAlert,
        resolveAlert,
        clearAlerts,
        getMetricsForTimeRange,
        startMonitoring: () => {
            monitoringRef.current.startMonitoring();
            setIsMonitoring(true);
        },
        stopMonitoring: () => {
            monitoringRef.current.stopMonitoring();
            setIsMonitoring(false);
        },
        monitoringService: monitoringRef.current
    };
};

// Hook for service health monitoring
export const useServiceHealthMonitoring = () => {
    const { serviceHealth, metrics } = usePerformanceMonitoring();

    // Get detailed service health metrics
    const getDetailedServiceHealth = (): {
        availability: number;
        dependencyHealth: number;
        circuitBreakerStatus: string;
        degradationLevel: string;
        responseTime: number;
        errorRate: number;
    } => {
        const currentMetrics = metrics;
        if (!currentMetrics) {
            return {
                availability: 100,
                dependencyHealth: 100,
                circuitBreakerStatus: 'closed',
                degradationLevel: 'normal',
                responseTime: 0,
                errorRate: 0
            };
        }

        return {
            availability: currentMetrics.serviceHealthMetrics.serviceAvailability,
            dependencyHealth: currentMetrics.serviceHealthMetrics.dependencyHealth,
            circuitBreakerStatus: currentMetrics.serviceHealthMetrics.circuitBreakerStatus,
            degradationLevel: currentMetrics.serviceHealthMetrics.degradationLevel,
            responseTime: currentMetrics.backendMetrics.apiResponseTime,
            errorRate: currentMetrics.backendMetrics.errorRate
        };
    };

    // Check if service is degraded
    const isServiceDegraded = (): boolean => {
        return serviceHealth.status === 'warning' || serviceHealth.status === 'critical';
    };

    // Check if circuit breaker is open
    const isCircuitBreakerOpen = (): boolean => {
        return serviceHealth.circuitBreakerStatus === 'open';
    };

    return {
        serviceHealth,
        detailedServiceHealth: getDetailedServiceHealth(),
        isServiceDegraded,
        isCircuitBreakerOpen,
        status: serviceHealth.status,
        availability: serviceHealth.availability
    };
};

// Hook for infrastructure monitoring
export const useInfrastructureMonitoring = () => {
    const { infrastructureHealth, metrics } = usePerformanceMonitoring();

    // Get detailed infrastructure metrics
    const getDetailedInfrastructureMetrics = (): {
        cpuUsage: number;
        memoryUsage: number;
        diskUsage: number;
        networkBandwidth: number;
        storageCapacity: number;
    } => {
        const currentMetrics = metrics;
        if (!currentMetrics) {
            return {
                cpuUsage: 0,
                memoryUsage: 0,
                diskUsage: 0,
                networkBandwidth: 0,
                storageCapacity: 0
            };
        }

        return {
            cpuUsage: currentMetrics.infrastructureMetrics.cpuUsage,
            memoryUsage: currentMetrics.infrastructureMetrics.memoryUsage,
            diskUsage: currentMetrics.infrastructureMetrics.diskUsage,
            networkBandwidth: currentMetrics.infrastructureMetrics.networkBandwidth,
            storageCapacity: currentMetrics.infrastructureMetrics.storageCapacity
        };
    };

    // Check if infrastructure is under stress
    const isInfrastructureUnderStress = (): boolean => {
        return infrastructureHealth.overallStatus === 'warning' ||
            infrastructureHealth.overallStatus === 'critical';
    };

    return {
        infrastructureHealth,
        detailedMetrics: getDetailedInfrastructureMetrics(),
        isUnderStress: isInfrastructureUnderStress(),
        cpuStatus: infrastructureHealth.cpuStatus,
        memoryStatus: infrastructureHealth.memoryStatus,
        diskStatus: infrastructureHealth.diskStatus
    };
};