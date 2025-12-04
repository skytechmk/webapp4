#!/usr/bin/env node

/**
 * Quality Gate CLI
 * Command line interface for running quality gates
 */

import { qualityGateManager } from './QualityGateManager.js';

const args = process.argv.slice(2);
const command = args[0] || 'run';

const cli = {
    run: async () => {
        try {
            console.log('🚧 Running Quality Gates...');
            const result = await qualityGateManager.runAllQualityGates();

            if (result.success) {
                console.log('✅ All quality gates passed!');
                process.exit(0);
            } else {
                console.log('❌ Quality gates failed!');
                console.log(`Failed gates: ${result.failedGates.join(', ')}`);
                process.exit(1);
            }
        } catch (error) {
            console.error('❌ Quality gate execution failed:', error.message);
            process.exit(1);
        }
    },

    testCoverage: async () => {
        try {
            console.log('📊 Running Test Coverage Quality Gate...');
            const result = await qualityGateManager.runTestCoverageGate();

            if (result.success) {
                console.log(`✅ Test coverage gate passed (${result.coverage}%)`);
                process.exit(0);
            } else {
                console.log(`❌ Test coverage gate failed (${result.coverage}%)`);
                process.exit(1);
            }
        } catch (error) {
            console.error('❌ Test coverage gate failed:', error.message);
            process.exit(1);
        }
    },

    codeQuality: async () => {
        try {
            console.log('🔍 Running Code Quality Gate...');
            const result = await qualityGateManager.runCodeQualityGate();

            if (result.success) {
                console.log(`✅ Code quality gate passed (${result.score}%)`);
                process.exit(0);
            } else {
                console.log(`❌ Code quality gate failed (${result.score}%)`);
                process.exit(1);
            }
        } catch (error) {
            console.error('❌ Code quality gate failed:', error.message);
            process.exit(1);
        }
    },

    security: async () => {
        try {
            console.log('🔒 Running Security Quality Gate...');
            const result = await qualityGateManager.runSecurityGate();

            if (result.success) {
                console.log(`✅ Security gate passed (${result.score}%)`);
                process.exit(0);
            } else {
                console.log(`❌ Security gate failed (${result.score}%)`);
                process.exit(1);
            }
        } catch (error) {
            console.error('❌ Security gate failed:', error.message);
            process.exit(1);
        }
    },

    performance: async () => {
        try {
            console.log('⚡ Running Performance Quality Gate...');
            const result = await qualityGateManager.runPerformanceGate();

            if (result.success) {
                console.log('✅ Performance gate passed');
                process.exit(0);
            } else {
                console.log('❌ Performance gate failed');
                process.exit(1);
            }
        } catch (error) {
            console.error('❌ Performance gate failed:', error.message);
            process.exit(1);
        }
    },

    report: () => {
        try {
            console.log('📊 Generating Quality Gate Report...');
            const report = qualityGateManager.generateQualityGateReport();
            console.log('✅ Quality gate report generated');
            console.log(`📄 Report path: ${report}`);
            process.exit(0);
        } catch (error) {
            console.error('❌ Failed to generate quality gate report:', error.message);
            process.exit(1);
        }
    },

    help: () => {
        console.log('📋 Quality Gate CLI Help');
        console.log('Usage: node QualityGateCLI.js [command]');
        console.log('');
        console.log('Commands:');
        console.log('  run          Run all quality gates');
        console.log('  testCoverage Run test coverage quality gate');
        console.log('  codeQuality  Run code quality gate');
        console.log('  security     Run security quality gate');
        console.log('  performance  Run performance quality gate');
        console.log('  report       Generate quality gate report');
        console.log('  help         Show this help message');
        process.exit(0);
    }
};

if (cli[command]) {
    cli[command]();
} else {
    console.error(`❌ Unknown command: ${command}`);
    cli.help();
}