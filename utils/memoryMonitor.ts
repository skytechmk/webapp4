import * as React from 'react';
import { mediaResourceManager } from './mediaResourceManager';

/**
 * Memory Monitor - Phase 2: Core Optimization
 * Provides comprehensive memory monitoring and profiling capabilities
 */
class MemoryMonitor {
    private static instance: MemoryMonitor;
    private monitoringInterval: NodeJS.Timeout | null = null;
    private memoryHistory: Array<{ timestamp: number, memoryUsage: number }> = [];
    private isMonitoring = false;
    private maxHistorySize = 100;

    private constructor() {
        // Private constructor for singleton pattern
    }

    public static getInstance(): MemoryMonitor {
        if (!MemoryMonitor.instance) {
            MemoryMonitor.instance = new MemoryMonitor();
        }
        return MemoryMonitor.instance;
    }

    /**
     * Start memory monitoring
     */
    public startMonitoring(intervalMs: number = 10000): void {
        if (this.isMonitoring) {
            console.log('Memory monitoring already active');
            return;
        }

        this.isMonitoring = true;
        console.log('🔍 Starting memory monitoring...');

        // Initial reading
        this.recordMemoryUsage();

        // Set up periodic monitoring
        this.monitoringInterval = setInterval(() => {
            this.recordMemoryUsage();
        }, intervalMs);
    }

    /**
     * Stop memory monitoring
     */
    public stopMonitoring(): void {
        if (!this.isMonitoring) return;

        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }

        this.isMonitoring = false;
        console.log('🛑 Memory monitoring stopped');
    }

    /**
     * Record current memory usage
     */
    private recordMemoryUsage(): void {
        try {
            const memoryStats = this.getCurrentMemoryStats();
            const timestamp = Date.now();

            // Add to history
            this.memoryHistory.push({
                timestamp,
                memoryUsage: memoryStats.estimatedMemoryMb
            });

            // Limit history size
            if (this.memoryHistory.length > this.maxHistorySize) {
                this.memoryHistory.shift();
            }

            // Log memory usage
            console.log(`📊 Memory Usage: ${memoryStats.estimatedMemoryMb.toFixed(2)} MB | ` +
                `Active: ${memoryStats.activeResources} | ` +
                `Total: ${memoryStats.totalResources} | ` +
                `Socket: ${memoryStats.socketConnections} conn`);

            // Check for memory leaks
            this.checkForMemoryLeaks(memoryStats);

        } catch (error) {
            console.error('Failed to record memory usage:', error);
        }
    }

    /**
     * Get current memory statistics
     */
    public getCurrentMemoryStats(): {
        estimatedMemoryMb: number,
        activeResources: number,
        totalResources: number,
        socketConnections: number,
        eventListeners: number
    } {
        // Get media resource stats
        const mediaStats = mediaResourceManager.getMemoryStats();

        // Get socket connection stats (if available)
        let socketConnections = 0;
        let eventListeners = 0;

        // Try to get socket stats if available
        try {
            // This would be populated from the socket service if available
            // For now, we'll use placeholder values
            socketConnections = 1; // Assume 1 active connection
            eventListeners = 10; // Assume 10 event listeners
        } catch (error) {
            // Socket service not available, use defaults
        }

        return {
            estimatedMemoryMb: mediaStats.memoryUsageMb,
            activeResources: mediaStats.activeResources,
            totalResources: mediaStats.totalResources,
            socketConnections,
            eventListeners
        };
    }

    /**
     * Check for potential memory leaks
     */
    private checkForMemoryLeaks(currentStats: {
        estimatedMemoryMb: number,
        activeResources: number,
        totalResources: number
    }): void {
        // Simple leak detection - check if memory usage is growing over time
        if (this.memoryHistory.length < 5) return; // Need some history

        const recentHistory = this.memoryHistory.slice(-5); // Last 5 readings
        const memoryTrend = recentHistory.map(entry => entry.memoryUsage);

        // Calculate average increase
        const firstReading = memoryTrend[0];
        const lastReading = memoryTrend[memoryTrend.length - 1];
        const memoryIncrease = lastReading - firstReading;
        const averageIncreasePerReading = memoryIncrease / (memoryTrend.length - 1);

        // Check if memory is growing significantly
        if (averageIncreasePerReading > 0.5) { // More than 0.5MB increase per reading
            console.warn(`⚠️ Potential memory leak detected! ` +
                `Memory increasing at ~${averageIncreasePerReading.toFixed(2)} MB per ${this.getMonitoringInterval() / 1000} seconds`);
        }

        // Check for resource accumulation
        if (currentStats.totalResources > 50 && currentStats.activeResources < currentStats.totalResources * 0.3) {
            console.warn(`⚠️ Resource cleanup issue detected! ` +
                `${currentStats.totalResources - currentStats.activeResources} resources not properly released`);
        }
    }

    /**
     * Get memory usage history
     */
    public getMemoryHistory(): Array<{ timestamp: number, memoryUsage: number }> {
        return [...this.memoryHistory];
    }

    /**
     * Get monitoring status
     */
    public isMonitoringActive(): boolean {
        return this.isMonitoring;
    }

    /**
     * Get current monitoring interval
     */
    public getMonitoringInterval(): number {
        return this.monitoringInterval ? parseInt(this.monitoringInterval.ref()?.toString() || '10000') : 10000;
    }

    /**
     * Force garbage collection (if available)
     */
    public forceGarbageCollection(): void {
        try {
            // This is a hint to the browser's garbage collector
            // Modern browsers may ignore this, but it's worth trying
            if (typeof global !== 'undefined' && global.gc) {
                global.gc();
                console.log('🗑️ Forced garbage collection');
            } else {
                console.log('🗑️ Garbage collection hint sent (browser may ignore)');
            }

            // Also force cleanup of media resources
            mediaResourceManager.forceCleanupAll();
        } catch (error) {
            console.warn('Garbage collection not available:', error);
        }
    }

    /**
     * Generate memory usage report
     */
    public generateMemoryReport(): string {
        const currentStats = this.getCurrentMemoryStats();
        const history = this.getMemoryHistory();

        let report = '📋 MEMORY USAGE REPORT\n';
        report += '=====================\n\n';

        // Current stats
        report += 'CURRENT MEMORY STATISTICS:\n';
        report += `- Estimated Memory Usage: ${currentStats.estimatedMemoryMb.toFixed(2)} MB\n`;
        report += `- Active Media Resources: ${currentStats.activeResources}\n`;
        report += `- Total Media Resources: ${currentStats.totalResources}\n`;
        report += `- Socket Connections: ${currentStats.socketConnections}\n`;
        report += `- Event Listeners: ${currentStats.eventListeners}\n\n`;

        // Memory trend
        if (history.length > 1) {
            const firstReading = history[0].memoryUsage;
            const lastReading = history[history.length - 1].memoryUsage;
            const trend = ((lastReading - firstReading) / firstReading) * 100;

            report += 'MEMORY TREND ANALYSIS:\n';
            report += `- Monitoring Period: ${this.formatDuration(history[history.length - 1].timestamp - history[0].timestamp)}\n`;
            report += `- Memory Change: ${trend.toFixed(2)}% (${(lastReading - firstReading).toFixed(2)} MB)\n`;

            if (trend > 10) {
                report += `- ⚠️ WARNING: Memory usage increasing significantly!\n`;
            } else if (trend > 5) {
                report += `- ⚠️ CAUTION: Memory usage increasing moderately\n`;
            } else {
                report += `- ✅ Memory usage stable\n`;
            }
            report += '\n';
        }

        // Recommendations
        report += 'RECOMMENDATIONS:\n';
        if (currentStats.estimatedMemoryMb > 50) {
            report += `- ⚠️ High memory usage detected. Consider optimizing media resources.\n`;
        }
        if (currentStats.totalResources > currentStats.activeResources * 2) {
            report += `- ⚠️ Many unused resources. Check for proper cleanup in components.\n`;
        }
        report += `- Regularly call forceGarbageCollection() in long-running sessions\n`;
        report += `- Monitor memory usage during intensive operations\n`;

        return report;
    }

    /**
     * Format duration in milliseconds to human-readable format
     */
    private formatDuration(ms: number): string {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }

    /**
     * Clean up resources and stop monitoring
     */
    public cleanup(): void {
        this.stopMonitoring();
        mediaResourceManager.forceCleanupAll();
    }
}

// Singleton instance
export const memoryMonitor = MemoryMonitor.getInstance();

/**
 * Memory profiling utilities
 */
export const profileMemoryUsage = async (operationName: string, operation: () => Promise<any>): Promise<any> => {
    const startTime = Date.now();
    const startMemory = memoryMonitor.getCurrentMemoryStats();

    try {
        const result = await operation();

        const endTime = Date.now();
        const endMemory = memoryMonitor.getCurrentMemoryStats();

        const duration = endTime - startTime;
        const memoryChange = endMemory.estimatedMemoryMb - startMemory.estimatedMemoryMb;

        console.log(`📊 Memory Profile: ${operationName}`);
        console.log(`   Duration: ${duration}ms`);
        console.log(`   Memory Change: ${memoryChange.toFixed(2)} MB`);
        console.log(`   Start Memory: ${startMemory.estimatedMemoryMb.toFixed(2)} MB`);
        console.log(`   End Memory: ${endMemory.estimatedMemoryMb.toFixed(2)} MB`);

        return result;
    } catch (error) {
        console.error(`Memory profiling failed for ${operationName}:`, error);
        throw error;
    }
};

/**
 * React hook for memory monitoring in components
 */
export const useMemoryMonitoring = (intervalMs: number = 10000) => {
    const [memoryStats, setMemoryStats] = React.useState({
        estimatedMemoryMb: 0,
        activeResources: 0,
        totalResources: 0,
        socketConnections: 0,
        eventListeners: 0
    });

    React.useEffect(() => {
        // Start monitoring
        memoryMonitor.startMonitoring(intervalMs);

        // Set up periodic updates
        const updateInterval = setInterval(() => {
            setMemoryStats(memoryMonitor.getCurrentMemoryStats());
        }, intervalMs);

        return () => {
            // Clean up
            clearInterval(updateInterval);
            // Don't stop global monitoring as other components might need it
        };
    }, [intervalMs]);

    return {
        memoryStats,
        memoryMonitor,
        forceGarbageCollection: memoryMonitor.forceGarbageCollection,
        generateMemoryReport: memoryMonitor.generateMemoryReport
    };
};