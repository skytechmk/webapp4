#!/usr/bin/env node

/**
 * WebSocket Connection Test for Production Backend
 * Tests WebSocket connections to snapify.mk
 */

import { io } from 'socket.io-client';

const WEBSOCKET_URL = 'wss://snapify.mk';
const TEST_DURATION = 30000; // 30 seconds
const PING_INTERVAL = 5000; // 5 seconds

console.log('🧪 Starting WebSocket Connection Test for Production Backend...');
console.log(`🔗 Target URL: ${WEBSOCKET_URL}`);
console.log(`⏱️  Test Duration: ${TEST_DURATION / 1000} seconds\n`);

let connectionAttempts = 0;
let successfulConnections = 0;
let connectionErrors = 0;
let eventTests = 0;
let eventSuccesses = 0;
let pingCount = 0;
let pongCount = 0;
let latencies = [];
let startTime = Date.now();
let socket = null;

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: 'ℹ️ ',
    success: '✅ ',
    error: '❌ ',
    warning: '⚠️ ',
    test: '🧪 '
  }[type] || '📝 ';

  console.log(`[${timestamp}] ${prefix}${message}`);
}

function calculateStats() {
  const duration = Date.now() - startTime;
  const avgLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
  const minLatency = latencies.length > 0 ? Math.min(...latencies) : 0;
  const maxLatency = latencies.length > 0 ? Math.max(...latencies) : 0;

  return {
    duration,
    connectionAttempts,
    successfulConnections,
    connectionErrors,
    eventTests,
    eventSuccesses,
    pingCount,
    pongCount,
    avgLatency: Math.round(avgLatency),
    minLatency,
    maxLatency,
    connectionSuccessRate: connectionAttempts > 0 ? (successfulConnections / connectionAttempts * 100).toFixed(1) : 0,
    eventSuccessRate: eventTests > 0 ? (eventSuccesses / eventTests * 100).toFixed(1) : 0,
    pingPongRatio: pingCount > 0 ? (pongCount / pingCount * 100).toFixed(1) : 0
  };
}

function printStats() {
  const stats = calculateStats();
  console.log('\n📊 Test Statistics:');
  console.log('==================');
  console.log(`Duration: ${Math.round(stats.duration / 1000)}s`);
  console.log(`Connection Attempts: ${stats.connectionAttempts}`);
  console.log(`Successful Connections: ${stats.successfulConnections}`);
  console.log(`Connection Errors: ${stats.connectionErrors}`);
  console.log(`Connection Success Rate: ${stats.connectionSuccessRate}%`);
  console.log(`Event Tests: ${stats.eventTests}`);
  console.log(`Event Successes: ${stats.eventSuccesses}`);
  console.log(`Event Success Rate: ${stats.eventSuccessRate}%`);
  console.log(`Ping Count: ${stats.pingCount}`);
  console.log(`Pong Count: ${stats.pongCount}`);
  console.log(`Ping/Pong Ratio: ${stats.pingPongRatio}%`);
  if (stats.avgLatency > 0) {
    console.log(`Average Latency: ${stats.avgLatency}ms (Min: ${stats.minLatency}ms, Max: ${stats.maxLatency}ms)`);
  }
}

function testConnection() {
  connectionAttempts++;
  log(`Attempting connection ${connectionAttempts}...`);

  socket = io(WEBSOCKET_URL, {
    transports: ['polling', 'websocket'],
    timeout: 10000,
    forceNew: true,
    reconnection: false, // We'll handle reconnection manually for testing
    autoConnect: true
  });

  socket.on('connect', () => {
    successfulConnections++;
    log('WebSocket connected successfully!', 'success');

    // Test basic event emission
    testEventEmission();
  });

  socket.on('disconnect', (reason) => {
    log(`WebSocket disconnected: ${reason}`, reason === 'io server disconnect' ? 'warning' : 'error');
  });

  socket.on('connect_error', (error) => {
    connectionErrors++;
    log(`Connection error: ${error.message}`, 'error');
  });

  socket.on('connect_timeout', () => {
    connectionErrors++;
    log('Connection timeout', 'error');
  });

  socket.on('pong', (data) => {
    pongCount++;
    if (data && data.latency) {
      latencies.push(data.latency);
      log(`Pong received - Latency: ${data.latency}ms`);
    } else {
      log('Pong received');
    }
  });

  // Listen for server events that indicate successful communication
  socket.on('admin_status_update', (data) => {
    eventSuccesses++;
    log(`Received admin status update: ${JSON.stringify(data)}`, 'success');
  });

  socket.on('force_client_reload', (data) => {
    eventSuccesses++;
    log(`Received force reload: ${JSON.stringify(data)}`, 'success');
  });

  socket.on('error', (error) => {
    log(`Socket error: ${error}`, 'error');
  });

  // Socket.IO built-in ping/pong tracking
  socket.on('ping', () => {
    log('Received Socket.IO ping');
  });

  socket.on('pong', (latency) => {
    pongCount++;
    if (latency) {
      latencies.push(latency);
      log(`Received Socket.IO pong - Latency: ${latency}ms`);
    } else {
      log('Received Socket.IO pong');
    }
  });
}

function testEventEmission() {
  if (!socket || !socket.connected) {
    log('Cannot test events - socket not connected', 'error');
    return;
  }

  eventTests++;
  log('Testing event emission...');

  // Test joining an event room (this is implemented on server)
  socket.emit('join_event', 'test-room');
  log('Attempted to join test event room');

  // Test authentication (if we had a token)
  // socket.emit('authenticate', 'fake-token');
  // log('Sent authentication event');

  // Note: Server doesn't implement custom ping/pong, only Socket.IO built-in
  // The ping/pong we track is Socket.IO's internal mechanism
}

function runStabilityTest() {
  log('Starting stability test...', 'test');

  // Initial connection
  testConnection();

  // Monitor connection stability
  const stabilityInterval = setInterval(() => {
    if (socket && socket.connected) {
      log(`Connection stable - Socket.IO status: connected`);
    } else {
      log(`Connection unstable - Socket.IO status: disconnected`, 'warning');
    }
  }, PING_INTERVAL);

  // Test event emission once after connection
  setTimeout(() => {
    if (socket && socket.connected) {
      testEventEmission();
    }
  }, 2000);

  // End test after duration
  setTimeout(() => {
    clearInterval(stabilityInterval);

    if (socket) {
      socket.disconnect();
    }

    log('Test completed!', 'success');
    printStats();

    // Final assessment
    const stats = calculateStats();
    console.log('\n🎯 Test Results Assessment:');
    console.log('==========================');

    const assessments = [
      {
        test: 'WebSocket Connection Establishment',
        passed: stats.successfulConnections > 0,
        details: `${stats.successfulConnections} successful connections out of ${stats.connectionAttempts} attempts`
      },
      {
        test: 'Real-time Communication',
        passed: stats.eventSuccesses > 0,
        details: `${stats.eventSuccesses} successful events out of ${stats.eventTests} tests`
      },
      {
        test: 'Connection Stability',
        passed: stats.connectionSuccessRate >= 80,
        details: `${stats.connectionSuccessRate}% connection success rate`
      },
      {
        test: 'Error Handling',
        passed: stats.connectionErrors < stats.connectionAttempts,
        details: `${stats.connectionErrors} errors handled out of ${stats.connectionAttempts} attempts`
      },
      {
        test: 'Ping/Pong Mechanism',
        passed: stats.pingPongRatio >= 80,
        details: `${stats.pingPongRatio}% ping responses received`
      }
    ];

    let allPassed = true;
    assessments.forEach(assessment => {
      const status = assessment.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${assessment.test}: ${assessment.details}`);
      if (!assessment.passed) allPassed = false;
    });

    console.log('\n' + (allPassed ? '🎉 All tests passed! WebSocket connections are working properly.' : '⚠️ Some tests failed. Check the details above.'));

    process.exit(allPassed ? 0 : 1);
  }, TEST_DURATION);
}

// Handle process termination
process.on('SIGINT', () => {
  log('Test interrupted by user', 'warning');
  if (socket) {
    socket.disconnect();
  }
  printStats();
  process.exit(1);
});

process.on('SIGTERM', () => {
  log('Test terminated', 'warning');
  if (socket) {
    socket.disconnect();
  }
  printStats();
  process.exit(1);
});

// Start the test
runStabilityTest();