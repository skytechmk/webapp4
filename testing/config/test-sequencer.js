/**
 * Custom Test Sequencer for SnapifY Automated Testing Framework
 * Intelligent test ordering and prioritization
 */

const Sequencer = require('@jest/test-sequencer').default;

class SnapifYTestSequencer extends Sequencer {
    /**
     * Sort test files based on priority and dependencies
     * @param {Array} tests - List of test files
     * @returns {Array} - Sorted test files
     */
    sort(tests) {
        // Define test priorities and categories
        const testPriorities = {
            'critical': 1,
            'high': 2,
            'medium': 3,
            'low': 4,
            'default': 5
        };

        const testCategories = {
            'unit': 1,
            'integration': 2,
            'e2e': 3,
            'performance': 4
        };

        // Extract priority and category from test file names and content
        const testsWithMetadata = tests.map(test => {
            const priorityMatch = test.match(/@priority-(critical|high|medium|low)/i);
            const categoryMatch = test.match(/\/testing\/([^\/]+)\//);

            let priority = 'default';
            if (priorityMatch) {
                priority = priorityMatch[1].toLowerCase();
            }

            let category = 'unit';
            if (categoryMatch) {
                category = categoryMatch[1].toLowerCase();
            }

            return {
                path: test,
                priority: testPriorities[priority] || testPriorities.default,
                category: testCategories[category] || testCategories.unit,
                // Extract test size from file content if needed
                isLarge: test.includes('.large.') || test.includes('.comprehensive.')
            };
        });

        // Sort tests by:
        // 1. Priority (critical tests first)
        // 2. Category (unit tests before integration/e2e)
        // 3. Test size (small tests before large tests)
        // 4. Alphabetical order for consistency
        return testsWithMetadata
            .sort((a, b) => {
                // First by priority
                if (a.priority !== b.priority) {
                    return a.priority - b.priority;
                }

                // Then by category
                if (a.category !== b.category) {
                    return a.category - b.category;
                }

                // Then by test size (small tests first)
                if (a.isLarge !== b.isLarge) {
                    return a.isLarge ? 1 : -1;
                }

                // Finally by path for consistency
                return a.path.localeCompare(b.path);
            })
            .map(test => test.path);
    }

    /**
     * Shuffle tests for random execution (useful for detecting hidden dependencies)
     * @param {Array} tests - List of test files
     * @param {Object} options - Sequencer options
     * @returns {Array} - Shuffled test files
     */
    shuffle(tests, options = {}) {
        const { seed, excludeCritical } = options;

        // Filter out critical tests if requested
        const filteredTests = excludeCritical
            ? tests.filter(test => !test.includes('@priority-critical'))
            : tests;

        // Create a copy to avoid mutating original array
        const shuffledTests = [...filteredTests];

        // Use seed for reproducible shuffling
        if (seed) {
            // Simple deterministic shuffle based on seed
            shuffledTests.sort((a, b) => {
                const hashA = this._hashString(a + seed);
                const hashB = this._hashString(b + seed);
                return hashA - hashB;
            });
        } else {
            // Random shuffle
            for (let i = shuffledTests.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffledTests[i], shuffledTests[j]] = [shuffledTests[j], shuffledTests[i]];
            }
        }

        // Add critical tests back at the beginning if they were excluded
        if (excludeCritical) {
            const criticalTests = tests.filter(test => test.includes('@priority-critical'));
            return [...criticalTests, ...shuffledTests];
        }

        return shuffledTests;
    }

    /**
     * Simple string hashing function for deterministic shuffling
     * @param {string} str - String to hash
     * @returns {number} - Hash value
     */
    _hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash;
    }

    /**
     * Cache test results for faster re-runs
     * @param {Array} tests - List of test files
     * @param {Object} cache - Cache object
     * @returns {Array} - Optimized test order
     */
    cacheAwareSort(tests, cache = {}) {
        const { testResults = {}, changedFiles = [] } = cache;

        // Separate tests into changed and unchanged
        const changedTests = [];
        const unchangedTests = [];

        tests.forEach(test => {
            const isChanged = changedFiles.some(changedFile =>
                test.includes(changedFile) ||
                changedFile.includes(test.split('/').pop())
            );

            if (isChanged) {
                changedTests.push(test);
            } else {
                // Check if test has failed before
                const testKey = test.replace(/^.*[\\\/]/, '');
                const hasFailedBefore = testResults[testKey]?.status === 'failed';

                if (hasFailedBefore) {
                    changedTests.push(test);
                } else {
                    unchangedTests.push(test);
                }
            }
        });

        // Run changed/previously failed tests first
        return [...changedTests, ...unchangedTests];
    }
}

module.exports = SnapifYTestSequencer;