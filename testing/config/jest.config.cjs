/**
 * Jest Configuration for Unit Tests
 * Comprehensive unit testing configuration
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
        '<rootDir>/components/**/__tests__/**/*.test.(ts|tsx)',
        '<rootDir>/lib/**/__tests__/**/*.test.(ts|tsx)',
        '<rootDir>/services/**/__tests__/**/*.test.(ts|tsx)',
        '<rootDir>/hooks/**/__tests__/**/*.test.(ts|tsx)',
        '<rootDir>/context/**/__tests__/**/*.test.(ts|tsx)'
    ],
    collectCoverageFrom: [
        'components/**/*.{ts,tsx}',
        'lib/**/*.{ts,tsx}',
        'services/**/*.{ts,tsx}',
        'hooks/**/*.{ts,tsx}',
        'context/**/*.{ts,tsx}',
        '!**/*.d.ts',
        '!**/node_modules/**',
        '!**/dist/**',
        '!**/coverage/**'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['json', 'lcov', 'text', 'clover'],
    coverageThreshold: {
        global: {
            lines: 85,
            statements: 85,
            functions: 85,
            branches: 85
        }
    },
    reporters: [
        'default',
        ['jest-junit', { outputDirectory: 'testing/results', outputName: 'unit-results.xml' }],
        ['jest-html-reporter', { outputPath: 'testing/results/unit-report.html' }]
    ],
    verbose: true,
    testTimeout: 10000
};