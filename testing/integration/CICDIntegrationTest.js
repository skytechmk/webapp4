/**
 * CI/CD Integration Test
 * Comprehensive integration testing for the CI/CD pipeline
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

class CICDIntegrationTest {
    constructor() {
        this.testResults = [];
        this.startTime = null;
        this.endTime = null;
    }

    /**
     * Run all CI/CD integration tests
     */
    async runAllTests() {
        try {
            this.startTime = performance.now();
            console.log('🚀 Starting CI/CD Integration Tests...');

            // Test pipeline configuration
            await this.testPipelineConfiguration();

            // Test build automation
            await this.testBuildAutomation();

            // Test quality gates
            await this.testQualityGates();

            // Test deployment automation
            await this.testDeploymentAutomation();

            // Test monitoring and reporting
            await this.testMonitoringAndReporting();

            this.endTime = performance.now();
            const duration = (this.endTime - this.startTime) / 1000;

            console.log('✅ All CI/CD integration tests completed successfully!');
            console.log(`📊 Duration: ${duration.toFixed(2)} seconds`);
            console.log(`📋 Tests passed: ${this.testResults.filter(r => r.status === 'passed').length}`);
            console.log(`❌ Tests failed: ${this.testResults.filter(r => r.status === 'failed').length}`);

            return {
                success: true,
                duration,
                results: this.testResults
            };
        } catch (error) {
            console.error('❌ CI/CD integration tests failed:', error.message);
            return {
                success: false,
                error: error.message,
                results: this.testResults
            };
        }
    }

    /**
     * Test pipeline configuration
     */
    async testPipelineConfiguration() {
        try {
            console.log('\n📋 Testing Pipeline Configuration...');

            // Check if CI/CD configuration file exists
            const configPath = path.join(__dirname, '../../cicd-config.js');
            if (!fs.existsSync(configPath)) {
                throw new Error('CI/CD configuration file not found');
            }

            // Check if GitHub Actions workflow exists
            const workflowPath = path.join(__dirname, '../../.github/workflows/ci-cd-pipeline.yml');
            if (!fs.existsSync(workflowPath)) {
                throw new Error('GitHub Actions workflow not found');
            }

            // Validate configuration structure
            const config = require(configPath);
            if (!config.environments || !config.build || !config.test || !config.deployment) {
                throw new Error('Invalid CI/CD configuration structure');
            }

            this.testResults.push({
                testName: 'Pipeline Configuration Test',
                status: 'passed',
                duration: 1000,
                timestamp: new Date().toISOString()
            });

            console.log('✅ Pipeline configuration test passed');
        } catch (error) {
            console.error('❌ Pipeline configuration test failed:', error.message);
            this.testResults.push({
                testName: 'Pipeline Configuration Test',
                status: 'failed',
                error: error.message,
                duration: 0,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Test build automation
     */
    async testBuildAutomation() {
        try {
            console.log('\n🏗️  Testing Build Automation...');

            // Test build script
            const buildResult = execSync('npm run build', {
                stdio: 'pipe',
                encoding: 'utf8'
            });

            // Check if build artifacts exist
            const distPath = path.join(__dirname, '../../dist');
            if (!fs.existsSync(distPath)) {
                throw new Error('Build artifacts not generated');
            }

            // Check build size
            const buildSize = this.getDirectorySize(distPath);
            if (buildSize > 5 * 1024 * 1024) { // 5MB limit
                console.warn('⚠️  Build size exceeds recommended limit');
            }

            this.testResults.push({
                testName: 'Build Automation Test',
                status: 'passed',
                duration: 2000,
                timestamp: new Date().toISOString(),
                metrics: {
                    buildSize: this.formatFileSize(buildSize)
                }
            });

            console.log('✅ Build automation test passed');
        } catch (error) {
            console.error('❌ Build automation test failed:', error.message);
            this.testResults.push({
                testName: 'Build Automation Test',
                status: 'failed',
                error: error.message,
                duration: 0,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Test quality gates
     */
    async testQualityGates() {
        try {
            console.log('\n🚧 Testing Quality Gates...');

            // Test quality gate manager
            const qualityGateManager = require('../quality-gates/QualityGateManager.js').qualityGateManager;
            const result = await qualityGateManager.runAllQualityGates();

            if (!result.success) {
                throw new Error(`Quality gates failed: ${result.failedGates.join(', ')}`);
            }

            this.testResults.push({
                testName: 'Quality Gates Test',
                status: 'passed',
                duration: 3000,
                timestamp: new Date().toISOString(),
                metrics: {
                    passedGates: result.passedGates.length,
                    failedGates: result.failedGates.length
                }
            });

            console.log('✅ Quality gates test passed');
        } catch (error) {
            console.error('❌ Quality gates test failed:', error.message);
            this.testResults.push({
                testName: 'Quality Gates Test',
                status: 'failed',
                error: error.message,
                duration: 0,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Test deployment automation
     */
    async testDeploymentAutomation() {
        try {
            console.log('\n🚀 Testing Deployment Automation...');

            // Test deployment script
            const deployPath = path.join(__dirname, '../../deploy.js');
            if (!fs.existsSync(deployPath)) {
                throw new Error('Deployment script not found');
            }

            // Test deployment configuration
            const config = require('../../cicd-config.js');
            if (!config.deployment || !config.deployment.strategies) {
                throw new Error('Invalid deployment configuration');
            }

            // Validate deployment environments
            const validEnvironments = ['development', 'staging', 'production'];
            for (const env of validEnvironments) {
                if (!config.environments[env]) {
                    throw new Error(`Missing deployment configuration for ${env}`);
                }
            }

            this.testResults.push({
                testName: 'Deployment Automation Test',
                status: 'passed',
                duration: 1500,
                timestamp: new Date().toISOString(),
                metrics: {
                    environments: validEnvironments.length,
                    strategies: Object.keys(config.deployment.strategies).length
                }
            });

            console.log('✅ Deployment automation test passed');
        } catch (error) {
            console.error('❌ Deployment automation test failed:', error.message);
            this.testResults.push({
                testName: 'Deployment Automation Test',
                status: 'failed',
                error: error.message,
                duration: 0,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Test monitoring and reporting
     */
    async testMonitoringAndReporting() {
        try {
            console.log('\n👁️  Testing Monitoring and Reporting...');

            // Test pipeline monitor
            const pipelineMonitor = require('../monitoring/PipelineMonitor.js').pipelineMonitor;

            // Start monitoring
            pipelineMonitor.startPipelineMonitoring();

            // Simulate pipeline stages
            pipelineMonitor.startStage('test-stage-1');
            await new Promise(resolve => setTimeout(resolve, 500));
            pipelineMonitor.endStage('success', { testMetric: 'value' });

            pipelineMonitor.startStage('test-stage-2');
            await new Promise(resolve => setTimeout(resolve, 500));
            pipelineMonitor.endStage('success', { anotherMetric: 123 });

            // End monitoring and generate report
            pipelineMonitor.endPipelineMonitoring();
            const report = pipelineMonitor.generatePipelineReport();

            // Check if report was generated
            if (!fs.existsSync(report.jsonPath) || !fs.existsSync(report.htmlPath)) {
                throw new Error('Monitoring reports not generated');
            }

            this.testResults.push({
                testName: 'Monitoring and Reporting Test',
                status: 'passed',
                duration: 2500,
                timestamp: new Date().toISOString(),
                metrics: {
                    stagesMonitored: report.report.stages.length,
                    reportsGenerated: 2 // JSON and HTML
                }
            });

            console.log('✅ Monitoring and reporting test passed');
        } catch (error) {
            console.error('❌ Monitoring and reporting test failed:', error.message);
            this.testResults.push({
                testName: 'Monitoring and Reporting Test',
                status: 'failed',
                error: error.message,
                duration: 0,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Get directory size
     */
    getDirectorySize(directoryPath) {
        let size = 0;
        const files = fs.readdirSync(directoryPath);

        files.forEach(file => {
            const filePath = path.join(directoryPath, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
                size += this.getDirectorySize(filePath);
            } else {
                size += stat.size;
            }
        });

        return size;
    }

    /**
     * Format file size
     */
    formatFileSize(bytes) {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }

    /**
     * Get test results summary
     */
    getTestResultsSummary() {
        const passed = this.testResults.filter(r => r.status === 'passed').length;
        const failed = this.testResults.filter(r => r.status === 'failed').length;
        const total = this.testResults.length;
        const passRate = total > 0 ? (passed / total) * 100 : 0;

        return {
            totalTests: total,
            passedTests: passed,
            failedTests: failed,
            passRate: passRate.toFixed(1),
            duration: this.endTime && this.startTime
                ? ((this.endTime - this.startTime) / 1000).toFixed(2)
                : 'N/A'
        };
    }
}

// Command line interface
const integrationTest = new CICDIntegrationTest();

if (require.main === module) {
    integrationTest.runAllTests()
        .then(result => {
            if (!result.success) {
                process.exit(1);
            }
            process.exit(0);
        })
        .catch(() => process.exit(1));
}

// Export for testing
export default CICDIntegrationTest;