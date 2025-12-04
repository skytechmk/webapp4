/**
 * CI/CD Configuration
 * Centralized configuration for continuous integration and deployment
 */

module.exports = {
    // Pipeline configuration
    pipeline: {
        name: 'SnapifY CI/CD Pipeline',
        version: '1.0.0',
        description: 'Comprehensive continuous integration and deployment pipeline'
    },

    // Environment configurations
    environments: {
        development: {
            name: 'Development',
            host: 'dev.snapify.com',
            branch: 'main',
            requiresApproval: false,
            qualityGates: {
                testCoverage: 75,
                codeQuality: 80,
                securityScore: 85
            }
        },
        staging: {
            name: 'Staging',
            host: 'staging.snapify.com',
            branch: 'staging',
            requiresApproval: false,
            qualityGates: {
                testCoverage: 80,
                codeQuality: 85,
                securityScore: 90
            }
        },
        production: {
            name: 'Production',
            host: 'snapify.com',
            branch: 'production',
            requiresApproval: true,
            approvalRequirements: {
                minimumApprovers: 2,
                approverRoles: ['team-leads', 'tech-leads', 'senior-developers']
            },
            qualityGates: {
                testCoverage: 85,
                codeQuality: 90,
                securityScore: 95
            }
        }
    },

    // Build configuration
    build: {
        nodeVersion: '20',
        packageManager: 'npm',
        buildCommand: 'vite build',
        buildArtifacts: ['dist/'],
        buildCache: {
            enabled: true,
            paths: ['node_modules/', '.next/cache/']
        }
    },

    // Test configuration
    test: {
        unit: {
            command: 'npm run test:unit',
            timeout: 10000,
            retries: 2
        },
        integration: {
            command: 'npm run test:integration',
            timeout: 30000,
            retries: 1
        },
        e2e: {
            command: 'npm run test:e2e',
            timeout: 60000,
            retries: 1
        },
        performance: {
            command: 'npm run test:performance',
            timeout: 120000,
            retries: 0
        },
        coverage: {
            threshold: 85,
            reportFormats: ['json', 'lcov', 'text', 'clover']
        }
    },

    // Quality gates configuration
    qualityGates: {
        codeQuality: {
            eslint: {
                enabled: true,
                maxWarnings: 0,
                config: '.eslintrc.js'
            },
            prettier: {
                enabled: true,
                checkOnly: true
            },
            typeChecking: {
                enabled: true,
                strict: true
            }
        },
        security: {
            audit: {
                enabled: true,
                level: 'high'
            },
            dependencyScan: {
                enabled: true,
                failOn: ['critical', 'high']
            }
        },
        performance: {
            buildSizeLimit: '5MB',
            bundleAnalysis: true,
            performanceBudget: {
                javascript: '1MB',
                css: '500KB',
                images: '2MB'
            }
        }
    },

    // Deployment configuration
    deployment: {
        strategies: {
            development: {
                type: 'rolling',
                batchSize: 1,
                waitTime: 30
            },
            staging: {
                type: 'canary',
                percentage: 20,
                duration: 300
            },
            production: {
                type: 'blue-green',
                verification: {
                    healthCheck: '/health',
                    timeout: 60,
                    interval: 5
                }
            }
        },
        notifications: {
            success: {
                channels: ['slack', 'email', 'teams'],
                recipients: ['dev-team', 'tech-leads']
            },
            failure: {
                channels: ['slack', 'email', 'teams', 'pagerduty'],
                recipients: ['dev-team', 'tech-leads', 'oncall']
            }
        },
        rollback: {
            enabled: true,
            triggers: ['deployment-failure', 'health-check-failure', 'manual'],
            strategy: 'automatic',
            timeout: 300
        }
    },

    // Monitoring configuration
    monitoring: {
        metrics: {
            collectionInterval: 60,
            retentionDays: 30,
            dashboards: ['pipeline-performance', 'test-coverage', 'deployment-success']
        },
        alerts: {
            testFailure: {
                threshold: 3,
                window: 300,
                channels: ['slack', 'email']
            },
            deploymentFailure: {
                threshold: 1,
                window: 60,
                channels: ['slack', 'email', 'pagerduty']
            },
            performanceDegradation: {
                threshold: 20, // percentage
                window: 3600,
                channels: ['slack', 'email']
            }
        },
        reporting: {
            formats: ['html', 'json', 'pdf'],
            storage: {
                local: 'testing/reporting/',
                cloud: 's3://snapify-reports/',
                retention: 90 // days
            }
        }
    },

    // Notification configuration
    notifications: {
        webhooks: {
            slack: process.env.SLACK_WEBHOOK_URL,
            teams: process.env.TEAMS_WEBHOOK_URL,
            discord: process.env.DISCORD_WEBHOOK_URL
        },
        email: {
            smtp: process.env.SMTP_SERVER,
            from: 'ci-cd@snapify.com',
            to: {
                success: ['dev-team@snapify.com', 'tech-leads@snapify.com'],
                failure: ['dev-team@snapify.com', 'tech-leads@snapify.com', 'oncall@snapify.com']
            }
        }
    },

    // Artifact management
    artifacts: {
        retention: {
            build: 7, // days
            testResults: 30, // days
            reports: 90, // days
            logs: 30 // days
        },
        storage: {
            local: '.github/artifacts/',
            cloud: 's3://snapify-artifacts/'
        }
    },

    // Cache configuration
    cache: {
        nodeModules: true,
        buildOutput: true,
        testResults: false,
        dependencies: {
            paths: ['node_modules/', 'package-lock.json'],
            restoreKeys: ['${{ runner.os }}-node-modules-']
        }
    }
};