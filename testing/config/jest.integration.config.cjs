/**
 * Jest Configuration for Integration Tests
 * End-to-end component integration testing
 */

const path = require('path');

module.exports = {
    rootDir: path.resolve(__dirname, '../..'),
    preset: 'ts-jest',
    testEnvironment: 'jest-environment-jsdom',
    setupFilesAfterEnv: ['<rootDir>/testing/config/jest.setup.ts'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/testing/config/fileMock.js'
    },
    transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
            tsconfig: 'tsconfig.json',
            isolatedModules: true
        }]
    },
    testMatch: [
        '<rootDir>/testing/integration/**/*.test.(ts|tsx)',
        '<rootDir>/components/**/integration/**/*.test.(ts|tsx)',
        '<rootDir>/services/**/integration/**/*.test.(ts|tsx)'
    ],
    collectCoverage: false,
    reporters: [
        'default',
        ['jest-junit', { outputDirectory: 'testing/results', outputName: 'integration-results.xml' }],
        ['jest-html-reporter', { outputPath: 'testing/results/integration-report.html' }]
    ],
    verbose: true,
    testTimeout: 30000,
    maxWorkers: 2
};