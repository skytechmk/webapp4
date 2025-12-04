/**
 * Pipeline Monitor
 * Comprehensive CI/CD pipeline monitoring and analytics
 */

import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';

class PipelineMonitor {
    constructor() {
        this.pipelineMetrics = {
            startTime: null,
            endTime: null,
            stages: [],
            errors: [],
            warnings: [],
            performanceData: {}
        };
        this.currentStage = null;
        this.stageStartTime = null;
    }

    /**
     * Start pipeline monitoring
     */
    startPipelineMonitoring() {
        this.pipelineMetrics.startTime = performance.now();
        console.log('👁️  Pipeline monitoring started');
    }

    /**
     * End pipeline monitoring
     */
    endPipelineMonitoring() {
        this.pipelineMetrics.endTime = performance.now();
        const duration = (this.pipelineMetrics.endTime - this.pipelineMetrics.startTime) / 1000;
        console.log(`🏁 Pipeline monitoring ended (duration: ${duration.toFixed(2)}s)`);
    }

    /**
     * Start monitoring a pipeline stage
     */
    startStage(stageName) {
        this.currentStage = stageName;
        this.stageStartTime = performance.now();

        console.log(`🔍 Starting stage: ${stageName}`);

        this.pipelineMetrics.stages.push({
            name: stageName,
            startTime: new Date().toISOString(),
            status: 'running',
            metrics: {}
        });
    }

    /**
     * End monitoring a pipeline stage
     */
    endStage(status = 'success', metrics = {}) {
        if (!this.currentStage) {
            console.warn('⚠️  No active stage to end');
            return;
        }

        const stageDuration = (performance.now() - this.stageStartTime) / 1000;
        const stageIndex = this.pipelineMetrics.stages.findIndex(s => s.name === this.currentStage);

        if (stageIndex >= 0) {
            this.pipelineMetrics.stages[stageIndex] = {
                ...this.pipelineMetrics.stages[stageIndex],
                endTime: new Date().toISOString(),
                status,
                duration: stageDuration,
                metrics: {
                    ...this.pipelineMetrics.stages[stageIndex].metrics,
                    ...metrics
                }
            };
        }

        console.log(`✅ Completed stage: ${this.currentStage} (${stageDuration.toFixed(2)}s)`);

        // Reset current stage
        this.currentStage = null;
        this.stageStartTime = null;
    }

    /**
     * Log pipeline error
     */
    logError(error, context = {}) {
        const errorEntry = {
            timestamp: new Date().toISOString(),
            message: error.message,
            stack: error.stack,
            context,
            stage: this.currentStage || 'unknown'
        };

        this.pipelineMetrics.errors.push(errorEntry);
        console.error(`❌ Pipeline error in ${errorEntry.stage}: ${error.message}`);
    }

    /**
     * Log pipeline warning
     */
    logWarning(message, context = {}) {
        const warningEntry = {
            timestamp: new Date().toISOString(),
            message,
            context,
            stage: this.currentStage || 'unknown'
        };

        this.pipelineMetrics.warnings.push(warningEntry);
        console.warn(`⚠️  Pipeline warning in ${warningEntry.stage}: ${message}`);
    }

    /**
     * Add performance metrics
     */
    addPerformanceMetrics(metrics) {
        this.pipelineMetrics.performanceData = {
            ...this.pipelineMetrics.performanceData,
            ...metrics
        };
    }

    /**
     * Add stage metrics
     */
    addStageMetrics(metrics) {
        if (this.currentStage) {
            const stageIndex = this.pipelineMetrics.stages.findIndex(s => s.name === this.currentStage);
            if (stageIndex >= 0) {
                this.pipelineMetrics.stages[stageIndex].metrics = {
                    ...this.pipelineMetrics.stages[stageIndex].metrics,
                    ...metrics
                };
            }
        }
    }

    /**
     * Generate comprehensive pipeline report
     */
    generatePipelineReport() {
        if (!this.pipelineMetrics.startTime || !this.pipelineMetrics.endTime) {
            throw new Error('Pipeline monitoring has not been properly started or ended');
        }

        const totalDuration = (this.pipelineMetrics.endTime - this.pipelineMetrics.startTime) / 1000;
        const successfulStages = this.pipelineMetrics.stages.filter(s => s.status === 'success').length;
        const failedStages = this.pipelineMetrics.stages.filter(s => s.status === 'failed').length;
        const stageSuccessRate = this.pipelineMetrics.stages.length > 0
            ? (successfulStages / this.pipelineMetrics.stages.length) * 100
            : 0;

        const report = {
            pipelineId: `pipeline-${Date.now()}`,
            timestamp: new Date().toISOString(),
            startTime: new Date(this.pipelineMetrics.startTime).toISOString(),
            endTime: new Date(this.pipelineMetrics.endTime).toISOString(),
            totalDuration: totalDuration.toFixed(2),
            stages: this.pipelineMetrics.stages.length,
            successfulStages,
            failedStages,
            stageSuccessRate: stageSuccessRate.toFixed(1),
            errors: this.pipelineMetrics.errors.length,
            warnings: this.pipelineMetrics.warnings.length,
            overallStatus: failedStages === 0 ? 'success' : 'failed',
            stages: this.pipelineMetrics.stages.map(stage => ({
                name: stage.name,
                status: stage.status,
                duration: stage.duration?.toFixed(2),
                metrics: stage.metrics
            })),
            performance: this.pipelineMetrics.performanceData,
            errors: this.pipelineMetrics.errors,
            warnings: this.pipelineMetrics.warnings
        };

        // Generate JSON report
        const jsonReportPath = path.join(__dirname, '../results/pipeline-report.json');
        fs.writeFileSync(jsonReportPath, JSON.stringify(report, null, 2));

        // Generate HTML report
        const htmlReport = this.generateHTMLReport(report);
        const htmlReportPath = path.join(__dirname, '../results/pipeline-report.html');
        fs.writeFileSync(htmlReportPath, htmlReport);

        console.log('📊 Pipeline monitoring report generated');
        console.log(`📄 JSON Report: ${jsonReportPath}`);
        console.log(`📄 HTML Report: ${htmlReportPath}`);

        return {
            jsonPath: jsonReportPath,
            htmlPath: htmlReportPath,
            report
        };
    }

    /**
     * Generate HTML report
     */
    generateHTMLReport(report) {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SnapifY CI/CD Pipeline Report</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 2rem;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .report-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      overflow: hidden;
      margin-bottom: 2rem;
    }

    .report-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2rem;
      text-align: center;
    }

    .report-title {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
    }

    .report-subtitle {
      font-size: 1.25rem;
      opacity: 0.9;
      margin-bottom: 1rem;
    }

    .report-meta {
      display: flex;
      justify-content: space-between;
      font-size: 0.9rem;
      opacity: 0.8;
      margin-top: 1rem;
    }

    .report-content {
      padding: 2rem;
    }

    .section {
      margin-bottom: 2rem;
    }

    .section-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: #2d3748;
      margin-bottom: 1rem;
      border-bottom: 3px solid #667eea;
      padding-bottom: 0.5rem;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .stat-card {
      background: #f7fafc;
      border-radius: 12px;
      padding: 1.5rem;
      text-align: center;
      border: 2px solid #e2e8f0;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      color: #667eea;
      margin-bottom: 0.5rem;
    }

    .stat-label {
      font-size: 0.9rem;
      color: #718096;
      font-weight: 500;
    }

    .success {
      color: #48bb78;
    }

    .failure {
      color: #f56565;
    }

    .warning {
      color: #ed8936;
    }

    .stage-item {
      background: #f7fafc;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1rem;
      border: 1px solid #e2e8f0;
    }

    .stage-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .stage-name {
      font-size: 1.25rem;
      font-weight: 600;
      color: #2d3748;
    }

    .stage-status {
      font-size: 1rem;
      font-weight: 600;
      padding: 0.5rem 1rem;
      border-radius: 20px;
    }

    .stage-metrics {
      display: grid;
      gap: 0.5rem;
    }

    .metric-item {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem;
      background: white;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }

    .metric-label {
      font-size: 0.9rem;
      color: #718096;
    }

    .metric-value {
      font-size: 0.9rem;
      color: #2d3748;
      font-weight: 500;
    }

    .error-item {
      background: #fff5f5;
      border-left: 4px solid #f56565;
      padding: 1rem;
      margin-bottom: 0.5rem;
      border-radius: 8px;
    }

    .warning-item {
      background: #fffaf0;
      border-left: 4px solid #ed8936;
      padding: 1rem;
      margin-bottom: 0.5rem;
      border-radius: 8px;
    }

    .error-message {
      color: #f56565;
      font-weight: 500;
      margin-bottom: 0.5rem;
    }

    .error-stack {
      color: #718096;
      font-size: 0.8rem;
      white-space: pre-wrap;
      background: #fef2f2;
      padding: 0.5rem;
      border-radius: 4px;
      margin-top: 0.5rem;
    }

    .warning-message {
      color: #ed8936;
      font-weight: 500;
      margin-bottom: 0.5rem;
    }

    .warning-context {
      color: #718096;
      font-size: 0.8rem;
      background: #fff8e1;
      padding: 0.5rem;
      border-radius: 4px;
      margin-top: 0.5rem;
    }

    .progress-bar {
      height: 8px;
      background: #e2e8f0;
      border-radius: 4px;
      margin: 0.5rem 0;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      border-radius: 4px;
      transition: width 0.3s ease;
    }

    @media (max-width: 768px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="report-card">
      <div class="report-header">
        <h1 class="report-title">🚀 SnapifY CI/CD Pipeline Report</h1>
        <p class="report-subtitle">Comprehensive Pipeline Monitoring & Analytics</p>
        <div class="report-meta">
          <span>Generated: ${new Date(report.timestamp).toLocaleString()}</span>
          <span>Duration: ${report.totalDuration}s</span>
        </div>
      </div>

      <div class="report-content">
        <!-- Overall Statistics -->
        <div class="section">
          <h2 class="section-title">📊 Pipeline Overview</h2>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value ${report.overallStatus === 'success' ? 'success' : 'failure'}">
                ${report.overallStatus.toUpperCase()}
              </div>
              <div class="stat-label">Overall Status</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${report.totalDuration}</div>
              <div class="stat-label">Total Duration (s)</div>
            </div>
            <div class="stat-card">
              <div class="stat-value ${report.successfulStages > 0 ? 'success' : 'failure'}">${report.successfulStages}</div>
              <div class="stat-label">Successful Stages</div>
            </div>
            <div class="stat-card">
              <div class="stat-value ${report.failedStages > 0 ? 'failure' : 'success'}">${report.failedStages}</div>
              <div class="stat-label">Failed Stages</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${report.stageSuccessRate}%</div>
              <div class="stat-label">Stage Success Rate</div>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${report.stageSuccessRate}%"></div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-value ${report.errors > 0 ? 'failure' : 'success'}">${report.errors}</div>
              <div class="stat-label">Errors</div>
            </div>
            <div class="stat-card">
              <div class="stat-value ${report.warnings > 0 ? 'warning' : 'success'}">${report.warnings}</div>
              <div class="stat-label">Warnings</div>
            </div>
          </div>
        </div>

        <!-- Pipeline Stages -->
        <div class="section">
          <h2 class="section-title">🧪 Pipeline Stages</h2>
          ${report.stages.map(stage => `
            <div class="stage-item">
              <div class="stage-header">
                <h3 class="stage-name">${stage.name}</h3>
                <span class="stage-status ${stage.status === 'success' ? 'success' : 'failure'}">
                  ${stage.status.toUpperCase()}
                </span>
              </div>
              <div class="stage-metrics">
                <div class="metric-item">
                  <span class="metric-label">Duration</span>
                  <span class="metric-value">${stage.duration || 'N/A'}s</span>
                </div>
                ${Object.entries(stage.metrics).map(([key, value]) => `
                  <div class="metric-item">
                    <span class="metric-label">${key}</span>
                    <span class="metric-value">${typeof value === 'object' ? JSON.stringify(value) : value}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Performance Metrics -->
        <div class="section">
          <h2 class="section-title">⚡ Performance Metrics</h2>
          <div class="stats-grid">
            ${Object.entries(report.performance).map(([key, value]) => `
              <div class="stat-card">
                <div class="stat-value">${typeof value === 'number' ? value.toFixed(2) : value}</div>
                <div class="stat-label">${key.replace(/([A-Z])/g, ' $1')}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Errors -->
        ${report.errors.length > 0 ? `
        <div class="section">
          <h2 class="section-title">❌ Pipeline Errors</h2>
          ${report.errors.map(error => `
            <div class="error-item">
              <div class="error-message">[${error.stage}] ${error.message}</div>
              <div class="error-context">Context: ${JSON.stringify(error.context)}</div>
              <div class="error-stack">${error.stack}</div>
            </div>
          `).join('')}
        </div>
        ` : ''}

        <!-- Warnings -->
        ${report.warnings.length > 0 ? `
        <div class="section">
          <h2 class="section-title">⚠️ Pipeline Warnings</h2>
          ${report.warnings.map(warning => `
            <div class="warning-item">
              <div class="warning-message">[${warning.stage}] ${warning.message}</div>
              <div class="warning-context">Context: ${JSON.stringify(warning.context)}</div>
            </div>
          `).join('')}
        </div>
        ` : ''}

        <!-- Report Footer -->
        <div class="section" style="text-align: center; padding: 2rem; background: #f7fafc; border-radius: 12px;">
          <h2 class="section-title" style="margin-bottom: 1rem;">📋 Report Summary</h2>
          <p style="color: #718096; margin-bottom: 1rem;">
            This comprehensive report provides detailed insights into the SnapifY CI/CD pipeline execution,
            including stage performance, errors, warnings, and overall pipeline health.
          </p>
          <p style="color: #718096; margin-bottom: 1rem;">
            Generated by SnapifY Pipeline Monitoring System v1.0.0
          </p>
          <p style="color: #718096; font-size: 0.8rem;">
            © ${new Date().getFullYear()} SnapifY. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
    `;
    }

    /**
     * Get pipeline metrics
     */
    getMetrics() {
        return this.pipelineMetrics;
    }

    /**
     * Reset monitoring
     */
    reset() {
        this.pipelineMetrics = {
            startTime: null,
            endTime: null,
            stages: [],
            errors: [],
            warnings: [],
            performanceData: {}
        };
        this.currentStage = null;
        this.stageStartTime = null;
    }
}

// Export singleton instance
export const pipelineMonitor = new PipelineMonitor();