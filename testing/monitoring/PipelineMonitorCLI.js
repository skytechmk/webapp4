#!/usr/bin/env node

/**
 * Pipeline Monitor CLI
 * Command line interface for pipeline monitoring
 */

import { pipelineMonitor } from './PipelineMonitor.js';

const args = process.argv.slice(2);
const command = args[0] || 'help';

const cli = {
    start: () => {
        try {
            console.log('👁️  Starting Pipeline Monitoring...');
            pipelineMonitor.startPipelineMonitoring();
            console.log('✅ Pipeline monitoring started');
            process.exit(0);
        } catch (error) {
            console.error('❌ Failed to start pipeline monitoring:', error.message);
            process.exit(1);
        }
    },

    end: () => {
        try {
            console.log('🏁 Ending Pipeline Monitoring...');
            const report = pipelineMonitor.generatePipelineReport();
            console.log('✅ Pipeline monitoring ended');
            console.log(`📄 JSON Report: ${report.jsonPath}`);
            console.log(`📄 HTML Report: ${report.htmlPath}`);
            process.exit(0);
        } catch (error) {
            console.error('❌ Failed to end pipeline monitoring:', error.message);
            process.exit(1);
        }
    },

    stage: async () => {
        if (args.length < 2) {
            console.error('❌ Usage: node PipelineMonitorCLI.js stage [start|end] [stage-name]');
            process.exit(1);
        }

        const action = args[1];
        const stageName = args[2];

        if (action === 'start') {
            try {
                console.log(`🔍 Starting stage: ${stageName}`);
                pipelineMonitor.startStage(stageName);
                console.log('✅ Stage started');
                process.exit(0);
            } catch (error) {
                console.error('❌ Failed to start stage:', error.message);
                process.exit(1);
            }
        } else if (action === 'end') {
            try {
                console.log(`✅ Ending stage: ${stageName}`);
                pipelineMonitor.endStage('success');
                console.log('✅ Stage ended');
                process.exit(0);
            } catch (error) {
                console.error('❌ Failed to end stage:', error.message);
                process.exit(1);
            }
        } else {
            console.error('❌ Unknown stage action. Use "start" or "end"');
            process.exit(1);
        }
    },

    error: () => {
        if (args.length < 2) {
            console.error('❌ Usage: node PipelineMonitorCLI.js error [message]');
            process.exit(1);
        }

        const errorMessage = args.slice(1).join(' ');
        try {
            console.log(`❌ Logging error: ${errorMessage}`);
            pipelineMonitor.logError(new Error(errorMessage));
            console.log('✅ Error logged');
            process.exit(0);
        } catch (error) {
            console.error('❌ Failed to log error:', error.message);
            process.exit(1);
        }
    },

    warning: () => {
        if (args.length < 2) {
            console.error('❌ Usage: node PipelineMonitorCLI.js warning [message]');
            process.exit(1);
        }

        const warningMessage = args.slice(1).join(' ');
        try {
            console.log(`⚠️  Logging warning: ${warningMessage}`);
            pipelineMonitor.logWarning(warningMessage);
            console.log('✅ Warning logged');
            process.exit(0);
        } catch (error) {
            console.error('❌ Failed to log warning:', error.message);
            process.exit(1);
        }
    },

    metrics: () => {
        try {
            console.log('📊 Current Pipeline Metrics:');
            const metrics = pipelineMonitor.getMetrics();
            console.log(JSON.stringify(metrics, null, 2));
            process.exit(0);
        } catch (error) {
            console.error('❌ Failed to get metrics:', error.message);
            process.exit(1);
        }
    },

    reset: () => {
        try {
            console.log('🔄 Resetting Pipeline Monitor...');
            pipelineMonitor.reset();
            console.log('✅ Pipeline monitor reset');
            process.exit(0);
        } catch (error) {
            console.error('❌ Failed to reset pipeline monitor:', error.message);
            process.exit(1);
        }
    },

    help: () => {
        console.log('📋 Pipeline Monitor CLI Help');
        console.log('Usage: node PipelineMonitorCLI.js [command] [args]');
        console.log('');
        console.log('Commands:');
        console.log('  start          Start pipeline monitoring');
        console.log('  end            End pipeline monitoring and generate report');
        console.log('  stage start    Start a pipeline stage');
        console.log('  stage end      End a pipeline stage');
        console.log('  error          Log a pipeline error');
        console.log('  warning        Log a pipeline warning');
        console.log('  metrics        Show current pipeline metrics');
        console.log('  reset          Reset pipeline monitor');
        console.log('  help           Show this help message');
        process.exit(0);
    }
};

if (cli[command]) {
    cli[command]();
} else {
    console.error(`❌ Unknown command: ${command}`);
    cli.help();
}