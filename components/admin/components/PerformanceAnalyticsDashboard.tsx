import React, { useState, useEffect } from 'react';
import { usePerformanceMonitoring, useServiceHealthMonitoring, useInfrastructureMonitoring } from '../../../hooks/usePerformanceMonitoring';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { Cpu, MemoryStick, Network, Database, AlertTriangle, CheckCircle, XCircle, Activity, Server, Users, Clock, TrendingUp, TrendingDown } from 'lucide-react';

// Performance Analytics Dashboard Component
export const PerformanceAnalyticsDashboard: React.FC = () => {
    const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
    const [activeTab, setActiveTab] = useState<'overview' | 'service-health' | 'infrastructure' | 'user-experience'>('overview');

    // Initialize performance monitoring
    const {
        metrics,
        alerts,
        serviceHealth,
        infrastructureHealth,
        acknowledgeAlert,
        resolveAlert,
        clearAlerts,
        getMetricsForTimeRange
    } = usePerformanceMonitoring({
        enableMonitoring: true,
        alertThresholds: {
            cpuUsage: 90,
            memoryUsage: 85,
            errorRate: 5,
            responseTime: 1000
        }
    });

    // Service health monitoring
    const { detailedServiceHealth, isServiceDegraded } = useServiceHealthMonitoring();

    // Infrastructure monitoring
    const { detailedMetrics, isUnderStress } = useInfrastructureMonitoring();

    // Calculate time range for metrics
    const getTimeRangeDates = (): { startTime: Date, endTime: Date } => {
        const now = new Date();
        let startTime: Date;

        switch (timeRange) {
            case '1h':
                startTime = new Date(now.getTime() - 60 * 60 * 1000);
                break;
            case '24h':
                startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                break;
            case '7d':
                startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            default:
                startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        }

        return { startTime, endTime: now };
    };

    // Get metrics for current time range
    const timeRangeDates = getTimeRangeDates();
    const timeRangeMetrics = getMetricsForTimeRange(timeRangeDates.startTime, timeRangeDates.endTime);

    // Format duration for display
    const formatDuration = (ms: number) => {
        if (ms < 1000) return `${ms.toFixed(0)}ms`;
        return `${(ms / 1000).toFixed(2)}s`;
    };

    // Get status color
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'critical': return 'bg-red-500 text-white';
            case 'warning': return 'bg-yellow-500 text-white';
            case 'normal': return 'bg-green-500 text-white';
            default: return 'bg-gray-500 text-white';
        }
    };

    // Get trend indicator
    const getTrendIndicator = (current: number, previous: number) => {
        if (current > previous) return <TrendingUp className="w-4 h-4 text-red-500" />;
        if (current < previous) return <TrendingDown className="w-4 h-4 text-green-500" />;
        return <Activity className="w-4 h-4 text-blue-500" />;
    };

    // Chart data preparation
    const prepareChartData = () => {
        if (!metrics || timeRangeMetrics.length === 0) return [];

        return timeRangeMetrics.map((metric, index) => ({
            time: new Date(metric.timestamp).toLocaleTimeString(),
            cpuUsage: metric.infrastructureMetrics.cpuUsage,
            memoryUsage: metric.infrastructureMetrics.memoryUsage,
            apiResponse: metric.backendMetrics.apiResponseTime,
            errorRate: metric.backendMetrics.errorRate,
            pageLoad: metric.userExperienceMetrics.pageLoadTime,
            availability: metric.serviceHealthMetrics.serviceAvailability
        }));
    };

    const chartData = prepareChartData();

    // Color constants
    const COLORS = {
        primary: '#4F46E5',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#3B82F6'
    };

    return (
        <div className="max-w-7xl mx-auto p-6 bg-white rounded-lg shadow-md">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                <Cpu className="w-6 h-6 text-indigo-600" />
                Performance Analytics Dashboard
            </h1>

            {/* Alerts Banner */}
            {alerts.length > 0 && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-semibold text-red-700 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5" />
                            Active Alerts ({alerts.length})
                        </h3>
                        <button
                            onClick={clearAlerts}
                            className="text-sm text-red-600 hover:text-red-800 flex items-center gap-1"
                        >
                            <XCircle className="w-4 h-4" />
                            Clear All
                        </button>
                    </div>
                    <div className="space-y-2">
                        {alerts.slice(0, 3).map(alert => (
                            <div key={alert.id} className="p-3 bg-white rounded border border-red-100 flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(alert.severity)}`}>
                                        {alert.severity}
                                    </span>
                                    <span className="text-sm text-gray-700">{alert.title}: {alert.message}</span>
                                </div>
                                <div className="flex gap-2">
                                    {!alert.acknowledged && (
                                        <button
                                            onClick={() => acknowledgeAlert(alert.id)}
                                            className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                                        >
                                            Acknowledge
                                        </button>
                                    )}
                                    {!alert.resolved && (
                                        <button
                                            onClick={() => resolveAlert(alert.id)}
                                            className="px-2 py-1 text-xs bg-green-50 text-green-600 rounded hover:bg-green-100"
                                        >
                                            Resolve
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                        {alerts.length > 3 && (
                            <div className="text-sm text-red-600 mt-2">
                                + {alerts.length - 3} more alerts
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200">
                {['overview', 'service-health', 'infrastructure', 'user-experience'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`px-4 py-2 text-sm font-medium rounded-t-md ${activeTab === tab
                            ? 'bg-indigo-600 text-white border border-indigo-600'
                            : 'text-gray-600 hover:text-indigo-600 bg-gray-50 hover:bg-gray-100'
                            }`}
                    >
                        {tab.replace('-', ' ').toUpperCase()}
                    </button>
                ))}
            </div>

            {/* Time Range Selector */}
            <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600">Time Range:</span>
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value as '1h' | '24h' | '7d' | '30d')}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                    >
                        <option value="1h">Last 1 hour</option>
                        <option value="24h">Last 24 hours</option>
                        <option value="7d">Last 7 days</option>
                        <option value="30d">Last 30 days</option>
                    </select>
                </div>
            </div>

            {/* Dashboard Content */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* System Health Overview */}
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                            <Server className="w-5 h-5 text-indigo-600" />
                            System Health Overview
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-indigo-600 mb-1">
                                    {serviceHealth.availability.toFixed(1)}%
                                </div>
                                <div className="text-sm text-gray-500">Service Availability</div>
                                <div className={`text-xs font-medium mt-1 px-2 py-1 rounded-full ${getStatusColor(serviceHealth.status)}`}>
                                    {serviceHealth.status.toUpperCase()}
                                </div>
                            </div>

                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-600 mb-1">
                                    {infrastructureHealth.overallStatus.toUpperCase()}
                                </div>
                                <div className="text-sm text-gray-500">Infrastructure Status</div>
                                <div className={`text-xs font-medium mt-1 px-2 py-1 rounded-full ${getStatusColor(infrastructureHealth.overallStatus)}`}>
                                    {isUnderStress ? 'UNDER STRESS' : 'STABLE'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Performance Metrics */}
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-indigo-600" />
                            Key Performance Metrics
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="text-center">
                                <div className="text-lg font-bold text-blue-600 mb-1">
                                    {metrics?.frontendMetrics.fcp.toFixed(0)}ms
                                </div>
                                <div className="text-sm text-gray-500">First Contentful Paint</div>
                            </div>

                            <div className="text-center">
                                <div className="text-lg font-bold text-green-600 mb-1">
                                    {metrics?.backendMetrics.apiResponseTime.toFixed(0)}ms
                                </div>
                                <div className="text-sm text-gray-500">API Response Time</div>
                            </div>

                            <div className="text-center">
                                <div className="text-lg font-bold text-purple-600 mb-1">
                                    {metrics?.userExperienceMetrics.pageLoadTime.toFixed(0)}ms
                                </div>
                                <div className="text-sm text-gray-500">Page Load Time</div>
                            </div>

                            <div className="text-center">
                                <div className="text-lg font-bold text-yellow-600 mb-1">
                                    {metrics?.backendMetrics.errorRate.toFixed(1)}%
                                </div>
                                <div className="text-sm text-gray-500">Error Rate</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'service-health' && (
                <div className="space-y-6">
                    {/* Service Health Status */}
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            Service Health Status
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-gray-50 p-3 rounded border">
                                <dt className="text-sm font-medium text-gray-500">Availability</dt>
                                <dd className="text-2xl font-bold text-indigo-600 flex items-center gap-2">
                                    {detailedServiceHealth.availability.toFixed(1)}%
                                    {getTrendIndicator(detailedServiceHealth.availability, 99.5)}
                                </dd>
                                <div className={`text-xs font-medium mt-1 px-2 py-1 rounded-full ${getStatusColor(serviceHealth.status)}`}>
                                    {serviceHealth.status.toUpperCase()}
                                </div>
                            </div>

                            <div className="bg-gray-50 p-3 rounded border">
                                <dt className="text-sm font-medium text-gray-500">Dependency Health</dt>
                                <dd className="text-2xl font-bold text-green-600 flex items-center gap-2">
                                    {detailedServiceHealth.dependencyHealth.toFixed(1)}%
                                    {getTrendIndicator(detailedServiceHealth.dependencyHealth, 98.0)}
                                </dd>
                                <div className="text-xs font-medium mt-1 px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                                    {detailedServiceHealth.circuitBreakerStatus.toUpperCase()}
                                </div>
                            </div>

                            <div className="bg-gray-50 p-3 rounded border">
                                <dt className="text-sm font-medium text-gray-500">Response Time</dt>
                                <dd className="text-2xl font-bold text-yellow-600 flex items-center gap-2">
                                    {formatDuration(detailedServiceHealth.responseTime)}
                                    {getTrendIndicator(detailedServiceHealth.responseTime, 250)}
                                </dd>
                                <div className={`text-xs font-medium mt-1 px-2 py-1 rounded-full ${getStatusColor(detailedServiceHealth.errorRate > 5 ? 'warning' : 'normal')}`}>
                                    {detailedServiceHealth.errorRate.toFixed(1)}% ERRORS
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Service Health Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                            <h4 className="font-semibold text-gray-700 mb-3">Service Availability Trend</h4>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="time" />
                                        <YAxis domain={[90, 100]} />
                                        <Tooltip />
                                        <Area
                                            type="monotone"
                                            dataKey="availability"
                                            stroke={COLORS.success}
                                            fill={COLORS.success}
                                            fillOpacity={0.3}
                                            name="Availability %"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="bg-white p-4 rounded-lg border border-gray-200">
                                <h4 className="font-semibold text-gray-700 mb-3">Error Rate Trend</h4>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="time" />
                                            <YAxis domain={[0, 10]} />
                                            <Tooltip />
                                            <Line
                                                type="monotone"
                                                dataKey="errorRate"
                                                stroke={COLORS.danger}
                                                strokeWidth={2}
                                                name="Error Rate %"
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'infrastructure' && (
                <div className="space-y-6">
                    {/* Infrastructure Health */}
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                            <Server className="w-5 h-5 text-blue-600" />
                            Infrastructure Health
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="bg-gray-50 p-3 rounded border">
                                <dt className="text-sm font-medium text-gray-500">CPU Usage</dt>
                                <dd className="text-2xl font-bold text-blue-600 flex items-center gap-2">
                                    {detailedMetrics.cpuUsage.toFixed(1)}%
                                    {getTrendIndicator(detailedMetrics.cpuUsage, 40)}
                                </dd>
                                <div className={`text-xs font-medium mt-1 px-2 py-1 rounded-full ${getStatusColor(infrastructureHealth.cpuStatus)}`}>
                                    {infrastructureHealth.cpuStatus.toUpperCase()}
                                </div>
                            </div>

                            <div className="bg-gray-50 p-3 rounded border">
                                <dt className="text-sm font-medium text-gray-500">Memory Usage</dt>
                                <dd className="text-2xl font-bold text-green-600 flex items-center gap-2">
                                    {detailedMetrics.memoryUsage.toFixed(1)}%
                                    {getTrendIndicator(detailedMetrics.memoryUsage, 50)}
                                </dd>
                                <div className={`text-xs font-medium mt-1 px-2 py-1 rounded-full ${getStatusColor(infrastructureHealth.memoryStatus)}`}>
                                    {infrastructureHealth.memoryStatus.toUpperCase()}
                                </div>
                            </div>

                            <div className="bg-gray-50 p-3 rounded border">
                                <dt className="text-sm font-medium text-gray-500">Disk Usage</dt>
                                <dd className="text-2xl font-bold text-purple-600 flex items-center gap-2">
                                    {detailedMetrics.diskUsage.toFixed(1)}%
                                    {getTrendIndicator(detailedMetrics.diskUsage, 60)}
                                </dd>
                                <div className={`text-xs font-medium mt-1 px-2 py-1 rounded-full ${getStatusColor(infrastructureHealth.diskStatus)}`}>
                                    {infrastructureHealth.diskStatus.toUpperCase()}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-gray-50 p-3 rounded border">
                                <dt className="text-sm font-medium text-gray-500">Network Bandwidth</dt>
                                <dd className="text-xl font-bold text-indigo-600">
                                    {detailedMetrics.networkBandwidth.toFixed(1)} Mbps
                                </dd>
                            </div>

                            <div className="bg-gray-50 p-3 rounded border">
                                <dt className="text-sm font-medium text-gray-500">Storage Available</dt>
                                <dd className="text-xl font-bold text-yellow-600">
                                    {detailedMetrics.storageCapacity.toFixed(1)} GB
                                </dd>
                            </div>
                        </div>
                    </div>

                    {/* Infrastructure Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                            <h4 className="font-semibold text-gray-700 mb-3">Resource Utilization</h4>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="time" />
                                        <YAxis domain={[0, 100]} />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="cpuUsage" fill={COLORS.primary} name="CPU Usage" />
                                        <Bar dataKey="memoryUsage" fill={COLORS.success} name="Memory Usage" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="bg-white p-4 rounded-lg border border-gray-200">
                                <h4 className="font-semibold text-gray-700 mb-3">API Performance</h4>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="time" />
                                            <YAxis domain={[0, 'auto']} />
                                            <Tooltip />
                                            <Line
                                                type="monotone"
                                                dataKey="apiResponse"
                                                stroke={COLORS.info}
                                                strokeWidth={2}
                                                name="API Response Time (ms)"
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'user-experience' && (
                <div className="space-y-6">
                    {/* User Experience Metrics */}
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                            <Users className="w-5 h-5 text-purple-600" />
                            User Experience Metrics
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-gray-50 p-3 rounded border">
                                <dt className="text-sm font-medium text-gray-500">Page Load Time</dt>
                                <dd className="text-2xl font-bold text-indigo-600">
                                    {metrics?.userExperienceMetrics.pageLoadTime?.toFixed(0)}ms
                                </dd>
                                <div className="text-xs font-medium mt-1 px-2 py-1 rounded-full bg-green-100 text-green-800">
                                    {metrics?.userExperienceMetrics.pageLoadTime && metrics.userExperienceMetrics.pageLoadTime < 2000 ? 'FAST' : 'SLOW'}
                                </div>
                            </div>

                            <div className="bg-gray-50 p-3 rounded border">
                                <dt className="text-sm font-medium text-gray-500">Interaction Response</dt>
                                <dd className="text-2xl font-bold text-green-600">
                                    {metrics?.userExperienceMetrics.interactionResponseTime?.toFixed(0)}ms
                                </dd>
                                <div className="text-xs font-medium mt-1 px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                                    {metrics?.userExperienceMetrics.interactionResponseTime && metrics.userExperienceMetrics.interactionResponseTime < 100 ? 'RESPONSIVE' : 'DELAYED'}
                                </div>
                            </div>

                            <div className="bg-gray-50 p-3 rounded border">
                                <dt className="text-sm font-medium text-gray-500">Session Success Rate</dt>
                                <dd className="text-2xl font-bold text-purple-600">
                                    {metrics?.userExperienceMetrics.sessionSuccessRate?.toFixed(1)}%
                                </dd>
                                <div className="text-xs font-medium mt-1 px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                                    {metrics?.userExperienceMetrics.sessionSuccessRate && metrics.userExperienceMetrics.sessionSuccessRate > 95 ? 'EXCELLENT' : 'NEEDS IMPROVEMENT'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Performance Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                            <h4 className="font-semibold text-gray-700 mb-3">Performance Trends</h4>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="time" />
                                        <YAxis domain={[0, 'auto']} />
                                        <Tooltip />
                                        <Legend />
                                        <Line
                                            type="monotone"
                                            dataKey="pageLoad"
                                            stroke={COLORS.primary}
                                            strokeWidth={2}
                                            name="Page Load Time"
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="apiResponse"
                                            stroke={COLORS.success}
                                            strokeWidth={2}
                                            name="API Response Time"
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="bg-white p-4 rounded-lg border border-gray-200">
                                <h4 className="font-semibold text-gray-700 mb-3">Resource Impact</h4>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="time" />
                                            <YAxis domain={[0, 100]} />
                                            <Tooltip />
                                            <Area
                                                type="monotone"
                                                dataKey="cpuUsage"
                                                stroke={COLORS.warning}
                                                fill={COLORS.warning}
                                                fillOpacity={0.3}
                                                name="CPU Impact"
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="memoryUsage"
                                                stroke={COLORS.danger}
                                                fill={COLORS.danger}
                                                fillOpacity={0.3}
                                                name="Memory Impact"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* No data state */}
            {!metrics && (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                    <Cpu className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-600 mb-2">Collecting Performance Data</h3>
                    <p className="text-gray-500">Performance metrics will appear here once collected.</p>
                </div>
            )}
        </div>
    );
};