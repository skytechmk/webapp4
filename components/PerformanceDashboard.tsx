import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Download, RefreshCw, Trash2, FileText, Clock, Cpu, MemoryStick, Network, Database } from 'lucide-react';

// Performance metric types
interface PerformanceMetric {
  id: string;
  timestamp: string;
  type: 'load' | 'render' | 'api' | 'memory' | 'network';
  duration: number;
  endpoint?: string;
  success: boolean;
  metadata?: Record<string, any>;
}

interface PerformanceReport {
  timestamp: string;
  metrics: PerformanceMetric[];
  summary: {
    totalRequests: number;
    successRate: number;
    avgLoadTime: number;
    avgRenderTime: number;
    avgApiTime: number;
    memoryUsage: number;
    networkLatency: number;
  };
  recommendations: string[];
}

// Performance Dashboard Component
export const PerformanceDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock data generator for demonstration
  const generateMockMetrics = (): PerformanceMetric[] => {
    const mockData: PerformanceMetric[] = [];
    const now = Date.now();

    for (let i = 0; i < 100; i++) {
      const types: PerformanceMetric['type'][] = ['load', 'render', 'api', 'memory', 'network'];
      const type = types[Math.floor(Math.random() * types.length)];
      const timestamp = new Date(now - i * 15 * 60 * 1000).toISOString();

      mockData.push({
        id: `metric_${Date.now()}_${i}`,
        timestamp,
        type,
        duration: Math.random() * 2000 + 50,
        endpoint: type === 'api' ? `/api/${['media', 'events', 'auth'][Math.floor(Math.random() * 3)]}` : undefined,
        success: Math.random() > 0.1,
        metadata: {
          userAgent: 'Mozilla/5.0',
          deviceType: ['mobile', 'desktop', 'tablet'][Math.floor(Math.random() * 3)]
        }
      });
    }

    return mockData;
  };

  // Load initial metrics
  useEffect(() => {
    // In a real app, this would fetch from an API
    const mockMetrics = generateMockMetrics();
    setMetrics(mockMetrics);
  }, []);

  // Generate performance report
  const generateReport = (): PerformanceReport => {
    setIsGenerating(true);
    setError(null);

    try {
      // Filter metrics by time range
      const now = Date.now();
      let timeFilterMs: number;

      switch (timeRange) {
        case '1h': timeFilterMs = 60 * 60 * 1000; break;
        case '24h': timeFilterMs = 24 * 60 * 60 * 1000; break;
        case '7d': timeFilterMs = 7 * 24 * 60 * 60 * 1000; break;
        case '30d': timeFilterMs = 30 * 24 * 60 * 60 * 1000; break;
        default: timeFilterMs = 24 * 60 * 60 * 1000;
      }

      const filteredMetrics = metrics.filter(metric => {
        const metricTime = new Date(metric.timestamp).getTime();
        return now - metricTime <= timeFilterMs;
      });

      if (filteredMetrics.length === 0) {
        throw new Error('No metrics available for the selected time range');
      }

      // Calculate summary statistics
      const totalRequests = filteredMetrics.length;
      const successfulRequests = filteredMetrics.filter(m => m.success).length;
      const successRate = (successfulRequests / totalRequests) * 100;

      const loadMetrics = filteredMetrics.filter(m => m.type === 'load');
      const renderMetrics = filteredMetrics.filter(m => m.type === 'render');
      const apiMetrics = filteredMetrics.filter(m => m.type === 'api');
      const memoryMetrics = filteredMetrics.filter(m => m.type === 'memory');
      const networkMetrics = filteredMetrics.filter(m => m.type === 'network');

      const avgLoadTime = loadMetrics.reduce((sum, m) => sum + m.duration, 0) / (loadMetrics.length || 1);
      const avgRenderTime = renderMetrics.reduce((sum, m) => sum + m.duration, 0) / (renderMetrics.length || 1);
      const avgApiTime = apiMetrics.reduce((sum, m) => sum + m.duration, 0) / (apiMetrics.length || 1);
      const avgMemoryUsage = memoryMetrics.reduce((sum, m) => sum + m.duration, 0) / (memoryMetrics.length || 1);
      const avgNetworkLatency = networkMetrics.reduce((sum, m) => sum + m.duration, 0) / (networkMetrics.length || 1);

      // Generate recommendations
      const recommendations: string[] = [];

      if (successRate < 95) {
        recommendations.push(`Success rate (${successRate.toFixed(1)}%) is below 95%. Investigate failed requests.`);
      }

      if (avgLoadTime > 1000) {
        recommendations.push(`Average load time (${avgLoadTime.toFixed(0)}ms) exceeds 1 second. Optimize asset loading.`);
      }

      if (avgRenderTime > 500) {
        recommendations.push(`Average render time (${avgRenderTime.toFixed(0)}ms) exceeds 500ms. Review component rendering.`);
      }

      if (avgApiTime > 800) {
        recommendations.push(`Average API response time (${avgApiTime.toFixed(0)}ms) exceeds 800ms. Check backend performance.`);
      }

      if (avgMemoryUsage > 1500) {
        recommendations.push(`Memory usage (${avgMemoryUsage.toFixed(0)}MB) is high. Check for memory leaks.`);
      }

      if (avgNetworkLatency > 300) {
        recommendations.push(`Network latency (${avgNetworkLatency.toFixed(0)}ms) is high. Review CDN and hosting.`);
      }

      if (recommendations.length === 0) {
        recommendations.push('Performance metrics look good! Continue monitoring for trends.');
      }

      const generatedReport: PerformanceReport = {
        timestamp: new Date().toISOString(),
        metrics: filteredMetrics,
        summary: {
          totalRequests,
          successRate,
          avgLoadTime,
          avgRenderTime,
          avgApiTime,
          memoryUsage: avgMemoryUsage,
          networkLatency: avgNetworkLatency
        },
        recommendations
      };

      setReport(generatedReport);
      return generatedReport;

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
      throw err;
    } finally {
      setIsGenerating(false);
    }
  };

  // Clear report and metrics
  const clearReport = () => {
    setReport(null);
    setError(null);
  };

  // Export report as JSON
  const exportReport = () => {
    if (!report) return;

    const reportData = JSON.stringify(report, null, 2);
    const blob = new Blob([reportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Format duration for display
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // Get chart data for visualization
  const getChartData = () => {
    const typeCounts: Record<string, number> = {};
    const typeDurations: Record<string, { total: number; count: number }> = {};

    metrics.forEach(metric => {
      typeCounts[metric.type] = (typeCounts[metric.type] || 0) + 1;

      if (!typeDurations[metric.type]) {
        typeDurations[metric.type] = { total: 0, count: 0 };
      }
      typeDurations[metric.type].total += metric.duration;
      typeDurations[metric.type].count += 1;
    });

    return Object.entries(typeCounts).map(([type, count]) => ({
      type,
      count,
      avgDuration: typeDurations[type] ? typeDurations[type].total / typeDurations[type].count : 0
    }));
  };

  const chartData = getChartData();

  // Color mapping for charts
  const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
        <Cpu className="w-6 h-6 text-indigo-600" />
        Performance Dashboard
      </h1>

      {/* Controls */}
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

        <button
          onClick={generateReport}
          disabled={isGenerating || metrics.length === 0}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
          {isGenerating ? 'Generating...' : 'Generate Report'}
        </button>

        {report && (
          <>
            <button
              onClick={exportReport}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export Report
            </button>

            <button
              onClick={clearReport}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear Report
            </button>
          </>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
          ⚠️ {error}
        </div>
      )}

      {/* Metrics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Total Metrics</span>
          </div>
          <div className="text-2xl font-bold text-blue-800">{metrics.length}</div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <Cpu className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-700">Success Rate</span>
          </div>
          <div className="text-2xl font-bold text-green-800">
            {metrics.length > 0 ? `${((metrics.filter(m => m.success).length / metrics.length) * 100).toFixed(1)}%` : 'N/A'}
          </div>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="flex items-center gap-2 mb-2">
            <MemoryStick className="w-5 h-5 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-700">Avg Load Time</span>
          </div>
          <div className="text-2xl font-bold text-yellow-800">
            {metrics.filter(m => m.type === 'load').length > 0
              ? formatDuration(metrics.filter(m => m.type === 'load').reduce((sum, m) => sum + m.duration, 0) / metrics.filter(m => m.type === 'load').length)
              : 'N/A'}
          </div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <Network className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-purple-700">Avg API Time</span>
          </div>
          <div className="text-2xl font-bold text-purple-800">
            {metrics.filter(m => m.type === 'api').length > 0
              ? formatDuration(metrics.filter(m => m.type === 'api').reduce((sum, m) => sum + m.duration, 0) / metrics.filter(m => m.type === 'api').length)
              : 'N/A'}
          </div>
        </div>
      </div>

      {/* Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Metric Type Distribution */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-indigo-600" />
            Metric Type Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Performance Trends */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <BarChart className="w-5 h-5 text-indigo-600" />
            Average Duration by Type
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip formatter={(value) => formatDuration(value as number)} />
                <Legend />
                <Bar dataKey="avgDuration" fill="#4F46E5" name="Avg Duration" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Report Section */}
      {report && (
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <FileText className="w-6 h-6 text-indigo-600" />
              Performance Report
            </h3>
            <span className="text-sm text-gray-500">
              Generated: {new Date(report.timestamp).toLocaleString()}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-3 rounded border">
              <dt className="text-sm font-medium text-gray-500">Total Requests</dt>
              <dd className="text-2xl font-bold text-indigo-600">{report.summary.totalRequests}</dd>
            </div>
            <div className="bg-white p-3 rounded border">
              <dt className="text-sm font-medium text-gray-500">Success Rate</dt>
              <dd className="text-2xl font-bold text-green-600">{report.summary.successRate.toFixed(1)}%</dd>
            </div>
            <div className="bg-white p-3 rounded border">
              <dt className="text-sm font-medium text-gray-500">Memory Usage</dt>
              <dd className="text-2xl font-bold text-yellow-600">{report.summary.memoryUsage.toFixed(0)} MB</dd>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-600" />
              Recommendations
            </h4>
            <ul className="space-y-2">
              {report.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2 p-3 bg-white rounded border border-gray-100">
                  <span className="text-indigo-600 mt-1">•</span>
                  <span className="text-gray-700">{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white p-4 rounded border">
            <h4 className="font-semibold text-gray-700 mb-3">Detailed Metrics</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Duration</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Success Rate</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {chartData.map((data, index) => {
                    const typeMetrics = metrics.filter(m => m.type === data.type);
                    const successRate = typeMetrics.length > 0
                      ? (typeMetrics.filter(m => m.success).length / typeMetrics.length) * 100
                      : 0;

                    return (
                      <tr key={data.type} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{data.type}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{data.count}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{formatDuration(data.avgDuration)}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            successRate >= 95 ? 'bg-green-100 text-green-800' :
                            successRate >= 80 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {successRate.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* No data state */}
      {metrics.length === 0 && !isGenerating && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <Cpu className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">No Performance Data Available</h3>
          <p className="text-gray-500">Performance metrics will appear here once collected.</p>
        </div>
      )}
    </div>
  );
};

// Export the generateReport function for external use
export const generatePerformanceReport = (metrics: PerformanceMetric[], timeRange: '1h' | '24h' | '7d' | '30d' = '24h'): PerformanceReport => {
  const now = Date.now();
  let timeFilterMs: number;

  switch (timeRange) {
    case '1h': timeFilterMs = 60 * 60 * 1000; break;
    case '24h': timeFilterMs = 24 * 60 * 60 * 1000; break;
    case '7d': timeFilterMs = 7 * 24 * 60 * 60 * 1000; break;
    case '30d': timeFilterMs = 30 * 24 * 60 * 60 * 1000; break;
    default: timeFilterMs = 24 * 60 * 60 * 1000;
  }

  const filteredMetrics = metrics.filter(metric => {
    const metricTime = new Date(metric.timestamp).getTime();
    return now - metricTime <= timeFilterMs;
  });

  if (filteredMetrics.length === 0) {
    throw new Error('No metrics available for the selected time range');
  }

  // Calculate summary statistics
  const totalRequests = filteredMetrics.length;
  const successfulRequests = filteredMetrics.filter(m => m.success).length;
  const successRate = (successfulRequests / totalRequests) * 100;

  const loadMetrics = filteredMetrics.filter(m => m.type === 'load');
  const renderMetrics = filteredMetrics.filter(m => m.type === 'render');
  const apiMetrics = filteredMetrics.filter(m => m.type === 'api');
  const memoryMetrics = filteredMetrics.filter(m => m.type === 'memory');
  const networkMetrics = filteredMetrics.filter(m => m.type === 'network');

  const avgLoadTime = loadMetrics.reduce((sum, m) => sum + m.duration, 0) / (loadMetrics.length || 1);
  const avgRenderTime = renderMetrics.reduce((sum, m) => sum + m.duration, 0) / (renderMetrics.length || 1);
  const avgApiTime = apiMetrics.reduce((sum, m) => sum + m.duration, 0) / (apiMetrics.length || 1);
  const avgMemoryUsage = memoryMetrics.reduce((sum, m) => sum + m.duration, 0) / (memoryMetrics.length || 1);
  const avgNetworkLatency = networkMetrics.reduce((sum, m) => sum + m.duration, 0) / (networkMetrics.length || 1);

  // Generate recommendations
  const recommendations: string[] = [];

  if (successRate < 95) {
    recommendations.push(`Success rate (${successRate.toFixed(1)}%) is below 95%. Investigate failed requests.`);
  }

  if (avgLoadTime > 1000) {
    recommendations.push(`Average load time (${avgLoadTime.toFixed(0)}ms) exceeds 1 second. Optimize asset loading.`);
  }

  if (avgRenderTime > 500) {
    recommendations.push(`Average render time (${avgRenderTime.toFixed(0)}ms) exceeds 500ms. Review component rendering.`);
  }

  if (avgApiTime > 800) {
    recommendations.push(`Average API response time (${avgApiTime.toFixed(0)}ms) exceeds 800ms. Check backend performance.`);
  }

  if (avgMemoryUsage > 1500) {
    recommendations.push(`Memory usage (${avgMemoryUsage.toFixed(0)}MB) is high. Check for memory leaks.`);
  }

  if (avgNetworkLatency > 300) {
    recommendations.push(`Network latency (${avgNetworkLatency.toFixed(0)}ms) is high. Review CDN and hosting.`);
  }

  if (recommendations.length === 0) {
    recommendations.push('Performance metrics look good! Continue monitoring for trends.');
  }

  return {
    timestamp: new Date().toISOString(),
    metrics: filteredMetrics,
    summary: {
      totalRequests,
      successRate,
      avgLoadTime,
      avgRenderTime,
      avgApiTime,
      memoryUsage: avgMemoryUsage,
      networkLatency: avgNetworkLatency
    },
    recommendations
  };
};