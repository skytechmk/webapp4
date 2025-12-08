#!/usr/bin/env node

/**
 * Comprehensive test suite for Hack backend services
 */

const axios = require('axios');

const HACK_SERVICES = {
    'event-management': 'http://localhost:8081',
    'user-auth': 'http://localhost:8082',
    'analytics': 'http://localhost:8083'
};

class HackServicesTester {
    constructor() {
        this.testResults = {
            passed: 0,
            failed: 0,
            errors: []
        };
    }

    async runAllTests() {
        console.log('🧪 Starting Hack Services Test Suite\n');

        try {
            // Test service health
            await this.testServiceHealth();

            // Test Event Management Service
            await this.testEventManagement();

            // Test User Auth Service
            await this.testUserAuth();

            // Test Analytics Service
            await this.testAnalytics();

            // Test cross-service integration
            await this.testIntegration();

        } catch (error) {
            console.error('❌ Test suite failed:', error.message);
            this.testResults.errors.push(error.message);
        }

        this.printResults();
    }

    async testServiceHealth() {
        console.log('🏥 Testing service health...');

        for (const [service, url] of Object.entries(HACK_SERVICES)) {
            try {
                const response = await axios.get(`${url}/health`);
                this.assert(response.status === 200, `${service} health check`);
                this.assert(response.data.success === true, `${service} health response`);
                console.log(`✅ ${service} is healthy`);
            } catch (error) {
                console.log(`❌ ${service} health check failed:`, error.message);
                this.testResults.failed++;
            }
        }
    }

    async testEventManagement() {
        console.log('\n📅 Testing Event Management Service...');

        const eventData = {
            title: 'Test Hack Event',
            description: 'Testing Hack backend services',
            startTime: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
            userId: 'test-user-1',
            location: 'Virtual',
            tags: ['test', 'hack', 'backend']
        };

        try {
            // Create event
            const createResponse = await axios.post(`${HACK_SERVICES['event-management']}/api/events`, eventData);
            this.assert(createResponse.status === 200, 'Create event status');
            this.assert(createResponse.data.success === true, 'Create event success');
            const event = createResponse.data.data.event;
            console.log(`✅ Created event: ${event.title}`);

            // Get event
            const getResponse = await axios.get(`${HACK_SERVICES['event-management']}/api/events/${event.id}`);
            this.assert(getResponse.status === 200, 'Get event status');
            this.assert(getResponse.data.data.event.id === event.id, 'Get event data');
            console.log(`✅ Retrieved event: ${getResponse.data.data.event.title}`);

            // List events
            const listResponse = await axios.get(`${HACK_SERVICES['event-management']}/api/events?userId=test-user-1`);
            this.assert(listResponse.status === 200, 'List events status');
            this.assert(Array.isArray(listResponse.data.data.events), 'List events response');
            console.log(`✅ Listed ${listResponse.data.data.events.length} events`);

        } catch (error) {
            console.log(`❌ Event management test failed:`, error.message);
            this.testResults.failed++;
        }
    }

    async testUserAuth() {
        console.log('\n🔐 Testing User Auth Service...');

        const userData = {
            email: `test-${Date.now()}@hack.test`,
            username: `testuser${Date.now()}`,
            password: 'TestPass123!'
        };

        try {
            // Register user
            const registerResponse = await axios.post(`${HACK_SERVICES['user-auth']}/api/auth/register`, userData);
            this.assert(registerResponse.status === 200, 'Register user status');
            this.assert(registerResponse.data.success === true, 'Register user success');
            console.log(`✅ Registered user: ${registerResponse.data.data.user.username}`);

            // Login user
            const loginResponse = await axios.post(`${HACK_SERVICES['user-auth']}/api/auth/login`, {
                email: userData.email,
                password: userData.password
            });
            this.assert(loginResponse.status === 200, 'Login user status');
            this.assert(loginResponse.data.success === true, 'Login user success');
            this.assert(loginResponse.data.data.accessToken, 'Login token present');
            console.log(`✅ Logged in user: ${loginResponse.data.data.user.username}`);

            // Validate token
            const tokenResponse = await axios.post(`${HACK_SERVICES['user-auth']}/api/auth/validate`, {
                token: loginResponse.data.data.accessToken
            });
            this.assert(tokenResponse.status === 200, 'Validate token status');
            this.assert(tokenResponse.data.data.valid === true, 'Token validation');
            console.log(`✅ Validated token for user: ${tokenResponse.data.data.user.username}`);

        } catch (error) {
            console.log(`❌ User auth test failed:`, error.message);
            this.testResults.failed++;
        }
    }

    async testAnalytics() {
        console.log('\n📊 Testing Analytics Service...');

        try {
            // Record event view
            const viewData = {
                eventId: 'test-event-1',
                timestamp: Math.floor(Date.now() / 1000),
                count: 5,
                interactions: 2
            };

            const recordResponse = await axios.post(`${HACK_SERVICES['analytics']}/api/analytics/views`, viewData);
            this.assert(recordResponse.status === 200, 'Record view status');
            console.log(`✅ Recorded event view`);

            // Get event analytics
            const analyticsResponse = await axios.get(`${HACK_SERVICES['analytics']}/api/analytics/events?eventId=test-event-1`);
            this.assert(analyticsResponse.status === 200, 'Get analytics status');
            this.assert(typeof analyticsResponse.data.data.analytics.totalViews === 'number', 'Analytics data');
            console.log(`✅ Retrieved analytics: ${analyticsResponse.data.data.analytics.totalViews} views`);

        } catch (error) {
            console.log(`❌ Analytics test failed:`, error.message);
            this.testResults.failed++;
        }
    }

    async testIntegration() {
        console.log('\n🔗 Testing Cross-Service Integration...');

        try {
            // Test that services can communicate
            const eventService = axios.create({ baseURL: HACK_SERVICES['event-management'] });
            const authService = axios.create({ baseURL: HACK_SERVICES['user-auth'] });

            // Create user via auth service
            const userData = {
                email: `integration-${Date.now()}@test.com`,
                username: `integration${Date.now()}`,
                password: 'Integration123!'
            };

            const userResponse = await authService.post('/api/auth/register', userData);
            const userId = userResponse.data.data.user.id;

            // Create event for that user
            const eventData = {
                title: 'Integration Test Event',
                description: 'Testing cross-service integration',
                startTime: Math.floor(Date.now() / 1000) + 7200, // 2 hours from now
                userId: userId,
                tags: ['integration', 'test']
            };

            const eventResponse = await eventService.post('/api/events', eventData);
            const eventId = eventResponse.data.data.event.id;

            console.log(`✅ Created user ${userId} and event ${eventId} successfully`);

        } catch (error) {
            console.log(`❌ Integration test failed:`, error.message);
            this.testResults.failed++;
        }
    }

    assert(condition, description) {
        if (condition) {
            this.testResults.passed++;
        } else {
            this.testResults.failed++;
            throw new Error(`Assertion failed: ${description}`);
        }
    }

    printResults() {
        console.log('\n' + '='.repeat(50));
        console.log('📋 TEST RESULTS');
        console.log('='.repeat(50));
        console.log(`✅ Passed: ${this.testResults.passed}`);
        console.log(`❌ Failed: ${this.testResults.failed}`);

        if (this.testResults.errors.length > 0) {
            console.log('\n🚨 ERRORS:');
            this.testResults.errors.forEach(error => console.log(`   - ${error}`));
        }

        const total = this.testResults.passed + this.testResults.failed;
        const successRate = total > 0 ? (this.testResults.passed / total * 100).toFixed(1) : '0.0';

        console.log(`\n🎯 Success Rate: ${successRate}%`);

        if (this.testResults.failed === 0) {
            console.log('🎉 All tests passed!');
        } else {
            console.log('⚠️  Some tests failed. Check the output above.');
        }
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new HackServicesTester();
    tester.runAllTests().catch(console.error);
}

module.exports = HackServicesTester;