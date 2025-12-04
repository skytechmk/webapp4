/**
 * Jest Configuration for Performance Tests
 * Performance benchmarking and monitoring
 */

module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    setupFilesAfterEnv: ['<rootDir>/testing/config/jest.performance.setup.js'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1'
    },
    transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
            tsconfig: 'tsconfig.json',
            isolatedModules: true
        }]
    },
    testMatch: [
        '<rootDir>/testing/performance/**/*.test.(ts|tsx)',
        '<rootDir>/services/monitoring/**/*.test.(ts|tsx)'
    ],
    collectCoverage: false,
    reporters: [
        'default',
        ['jest-junit', { outputDirectory: 'testing/results', outputName: 'performance-results.xml' }],
        ['jest-html-reporter', { outputPath: 'testing/results/performance-report.html' }]
    ],
    verbose: true,
    testTimeout: 60000,
    maxWorkers: 1
};