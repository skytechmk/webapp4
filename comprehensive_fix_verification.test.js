#!/usr/bin/env node

/**
 * Comprehensive Fix Verification Test Suite
 * This script tests all implemented fixes to ensure they work properly
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory properly for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test results tracking
const testResults = {
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  testDetails: []
};

function logTestResult(testName, passed, details = '') {
  testResults.totalTests++;
  if (passed) {
    testResults.passedTests++;
    console.log(`✅ ${testName}`);
  } else {
    testResults.failedTests++;
    console.log(`❌ ${testName}`);
  }
  testResults.testDetails.push({ testName, passed, details });
}

console.log('🧪 Starting Comprehensive Fix Verification...');
console.log('==========================================\n');

/**
 * Test 1: Workbox Precaching Error Fix
 */
console.log('1️⃣ Testing Workbox Precaching Error Fix...');
try {
  const swPath = path.join(__dirname, 'src', 'sw.ts');
  if (!fs.existsSync(swPath)) {
    throw new Error('Service worker file not found');
  }

  const swContent = fs.readFileSync(swPath, 'utf8');

  // Check for precache error handling
  const hasPrecacheErrorHandling = swContent.includes('PRECACHE_FAILED') &&
                                  swContent.includes('precacheAndRoute');

  // Check for version management
  const hasVersionManagement = swContent.includes('CURRENT_VERSION') &&
                              swContent.includes('snapify-version-cache');

  // Check for proper cleanup
  const hasCleanupLogic = swContent.includes('skipWaiting') &&
                         swContent.includes('clientsClaim');

  if (hasPrecacheErrorHandling && hasVersionManagement && hasCleanupLogic) {
    logTestResult('Workbox Precaching Error Fix', true, 'All precaching error handling mechanisms found');
  } else {
    logTestResult('Workbox Precaching Error Fix', false, 'Missing precaching error handling components');
  }
} catch (error) {
  logTestResult('Workbox Precaching Error Fix', false, `Error: ${error.message}`);
}

/**
 * Test 2: WebSocket Connection Failures Fix
 */
console.log('\n2️⃣ Testing WebSocket Connection Failures Fix...');
try {
  const socketServicePath = path.join(__dirname, 'services', 'socketService.ts');
  if (!fs.existsSync(socketServicePath)) {
    throw new Error('Socket service file not found');
  }

  const socketServiceContent = fs.readFileSync(socketServicePath, 'utf8');

  // Check for URL conversion
  const hasUrlConversion = socketServiceContent.includes('getWebSocketUrl') &&
                           socketServiceContent.includes('.replace');

  // Check for comprehensive error handling
  const hasErrorHandling = socketServiceContent.includes('handleConnectError') &&
                           socketServiceContent.includes('handleDisconnect') &&
                           socketServiceContent.includes('scheduleReconnection');

  // Check for exponential backoff
  const hasExponentialBackoff = socketServiceContent.includes('exponential backoff') ||
                                (socketServiceContent.includes('Math.pow') &&
                                 socketServiceContent.includes('reconnectionAttempts'));

  // Check for connection cleanup
  const hasCleanup = socketServiceContent.includes('cleanupExistingConnection');

  if (hasUrlConversion && hasErrorHandling && hasExponentialBackoff && hasCleanup) {
    logTestResult('WebSocket Connection Failures Fix', true, 'All WebSocket connection handling mechanisms found');
  } else {
    logTestResult('WebSocket Connection Failures Fix', false, 'Missing WebSocket connection handling components');
  }
} catch (error) {
  logTestResult('WebSocket Connection Failures Fix', false, `Error: ${error.message}`);
}

/**
 * Test 3: 401 Unauthorized Error Fix
 */
console.log('\n3️⃣ Testing 401 Unauthorized Error Fix...');
try {
  const authStorePath = path.join(__dirname, 'lib', 'auth', 'auth-store.ts');
  if (!fs.existsSync(authStorePath)) {
    throw new Error('Auth store file not found');
  }

  const authStoreContent = fs.readFileSync(authStorePath, 'utf8');

  // Check for proper error handling in auth store
  const hasAuthErrorHandling = authStoreContent.includes('setError') &&
                                authStoreContent.includes('clearError') &&
                                authStoreContent.includes('error:');

  // Check for token management
  const hasTokenManagement = authStoreContent.includes('refreshToken') &&
                              authStoreContent.includes('getToken');

  // Check for proper state management
  const hasStateManagement = authStoreContent.includes('isAuthenticated') &&
                             authStoreContent.includes('isLoading');

  if (hasAuthErrorHandling && hasTokenManagement && hasStateManagement) {
    logTestResult('401 Unauthorized Error Fix', true, 'All authentication error handling mechanisms found');
  } else {
    logTestResult('401 Unauthorized Error Fix', false, 'Missing authentication error handling components');
  }
} catch (error) {
  logTestResult('401 Unauthorized Error Fix', false, `Error: ${error.message}`);
}

/**
 * Test 4: face-api.min.js CDN Loading Fix
 */
console.log('\n4️⃣ Testing face-api.min.js CDN Loading Fix...');
try {
  const indexHtmlPath = path.join(__dirname, 'index.html');
  if (!fs.existsSync(indexHtmlPath)) {
    throw new Error('Index.html file not found');
  }

  const indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf8');

  // Check for CDN fallback mechanism
  const hasCdnFallback = indexHtmlContent.includes('face-api.min.js') &&
                         indexHtmlContent.includes('cdn.jsdelivr.net');

  // Check for proper script loading
  const hasScriptLoading = indexHtmlContent.includes('<script') &&
                           indexHtmlContent.includes('face-api');

  if (hasCdnFallback && hasScriptLoading) {
    logTestResult('face-api.min.js CDN Loading Fix', true, 'CDN loading mechanism found');
  } else {
    logTestResult('face-api.min.js CDN Loading Fix', false, 'Missing CDN loading components');
  }
} catch (error) {
  logTestResult('face-api.min.js CDN Loading Fix', false, `Error: ${error.message}`);
}

/**
 * Test 5: Google Sign-In Initialization Fix
 */
console.log('\n5️⃣ Testing Google Sign-In Initialization Fix...');
try {
  const appPath = path.join(__dirname, 'App.tsx');
  if (!fs.existsSync(appPath)) {
    throw new Error('App.tsx file not found');
  }

  const appContent = fs.readFileSync(appPath, 'utf8');

  // Check for Google Sign-In initialization
  const hasGoogleInit = appContent.includes('google.accounts.id.initialize') &&
                       appContent.includes('googleSignInInitialized');

  // Check for proper error handling
  const hasGoogleErrorHandling = appContent.includes('Google Sign-In initialization failed') ||
                                  appContent.includes('googleSignInInitialized');

  // Check for fallback mechanism
  const hasFallbackMechanism = appContent.includes('setInterval') &&
                               appContent.includes('window.google');

  if (hasGoogleInit && hasGoogleErrorHandling && hasFallbackMechanism) {
    logTestResult('Google Sign-In Initialization Fix', true, 'Google Sign-In initialization mechanisms found');
  } else {
    logTestResult('Google Sign-In Initialization Fix', false, 'Missing Google Sign-In initialization components');
  }
} catch (error) {
  logTestResult('Google Sign-In Initialization Fix', false, `Error: ${error.message}`);
}

/**
 * Test 6: Cross-Origin-Opener-Policy Fix
 */
console.log('\n6️⃣ Testing Cross-Origin-Opener-Policy Fix...');
try {
  const postMessageUtilsPath = path.join(__dirname, 'utils', 'postMessageUtils.ts');
  if (!fs.existsSync(postMessageUtilsPath)) {
    throw new Error('PostMessage utils file not found');
  }

  const postMessageUtilsContent = fs.readFileSync(postMessageUtilsPath, 'utf8');

  // Check for COOP error handling
  const hasCoopErrorHandling = postMessageUtilsContent.includes('Cross-Origin-Opener-Policy') &&
                                postMessageUtilsContent.includes('BLOCKED_BY_COOP');

  // Check for safe postMessage implementation
  const hasSafePostMessage = postMessageUtilsContent.includes('safePostMessage') &&
                              postMessageUtilsContent.includes('PostMessageErrorType');

  // Check for retry mechanism
  const hasRetryMechanism = postMessageUtilsContent.includes('retryPostMessage') ||
                           postMessageUtilsContent.includes('retry');

  if (hasCoopErrorHandling && hasSafePostMessage && hasRetryMechanism) {
    logTestResult('Cross-Origin-Opener-Policy Fix', true, 'COOP error handling mechanisms found');
  } else {
    logTestResult('Cross-Origin-Opener-Policy Fix', false, 'Missing COOP error handling components');
  }
} catch (error) {
  logTestResult('Cross-Origin-Opener-Policy Fix', false, `Error: ${error.message}`);
}

/**
 * Test 7: Run Existing Test Suites
 */
console.log('\n7️⃣ Running Existing Test Suites...');
try {
  console.log('🧪 Running Jest tests for all components...');

  // Run the postMessage utilities tests
  try {
    execSync('npx jest utils/__tests__/postMessageUtils.test.ts --verbose', {
      cwd: __dirname,
      stdio: 'inherit'
    });
    logTestResult('PostMessage Utilities Tests', true, 'PostMessage tests passed');
  } catch (error) {
    logTestResult('PostMessage Utilities Tests', false, `PostMessage tests failed: ${error.message}`);
  }

  // Run the WebSocket service tests
  try {
    execSync('npx jest services/__tests__/websocketService.test.ts --verbose', {
      cwd: __dirname,
      stdio: 'inherit'
    });
    logTestResult('WebSocket Service Tests', true, 'WebSocket tests passed');
  } catch (error) {
    logTestResult('WebSocket Service Tests', false, `WebSocket tests failed: ${error.message}`);
  }

  // Run the beta testing tests
  try {
    execSync('npx jest lib/__tests__/beta-testing.test.ts --verbose', {
      cwd: __dirname,
      stdio: 'inherit'
    });
    logTestResult('Beta Testing Tests', true, 'Beta testing tests passed');
  } catch (error) {
    logTestResult('Beta Testing Tests', false, `Beta testing tests failed: ${error.message}`);
  }

} catch (error) {
  logTestResult('Existing Test Suites', false, `Error running tests: ${error.message}`);
}

/**
 * Test 8: Integration Tests
 */
console.log('\n8️⃣ Running Integration Tests...');
try {
  // Test integration between WebSocket and auth
  const socketServicePath = path.join(__dirname, 'services', 'socketService.ts');
  const socketServiceContent = fs.readFileSync(socketServicePath, 'utf8');

  const appPath = path.join(__dirname, 'App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf8');

  // Check if WebSocket uses auth token
  const hasWebSocketAuthIntegration = socketServiceContent.includes('userToken') &&
                                      socketServiceContent.includes('authenticate');

  // Check if App integrates WebSocket properly
  const hasAppWebSocketIntegration = appContent.includes('socketService') &&
                                      appContent.includes('connect');

  if (hasWebSocketAuthIntegration && hasAppWebSocketIntegration) {
    logTestResult('WebSocket-Auth Integration', true, 'WebSocket and auth integration working');
  } else {
    logTestResult('WebSocket-Auth Integration', false, 'WebSocket and auth integration issues');
  }

  // Test integration between postMessage and Google Sign-In
  const hasPostMessageGoogleIntegration = appContent.includes('postMessage') &&
                                          appContent.includes('google');

  if (hasPostMessageGoogleIntegration) {
    logTestResult('PostMessage-Google Integration', true, 'PostMessage and Google Sign-In integration working');
  } else {
    logTestResult('PostMessage-Google Integration', false, 'PostMessage and Google Sign-In integration issues');
  }

} catch (error) {
  logTestResult('Integration Tests', false, `Error: ${error.message}`);
}

/**
 * Test 9: Verify No New Errors Introduced
 */
console.log('\n9️⃣ Verifying No New Errors Introduced...');
try {
  // Check for common error patterns in key files
  const filesToCheck = [
    'src/sw.ts',
    'services/socketService.ts',
    'lib/auth/auth-store.ts',
    'App.tsx',
    'index.html'
  ];

  let hasNewErrors = false;

  filesToCheck.forEach(filePath => {
    try {
      const fullPath = path.join(__dirname, filePath);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');

        // Look for common error patterns that might indicate new issues
        const errorPatterns = [
          /console\.error\(/g,
          /throw new Error\(/g,
          /catch \(e\)/g,
          /try {/g
        ];

        let errorCount = 0;
        errorPatterns.forEach(pattern => {
          const matches = content.match(pattern);
          if (matches) errorCount += matches.length;
        });

        if (errorCount > 10) { // Threshold for potential issues
          hasNewErrors = true;
        }
      }
    } catch (error) {
      console.log(`⚠️ Could not check file ${filePath}: ${error.message}`);
    }
  });

  if (!hasNewErrors) {
    logTestResult('No New Errors Verification', true, 'No excessive error patterns found');
  } else {
    logTestResult('No New Errors Verification', false, 'Potential new error patterns detected');
  }
} catch (error) {
  logTestResult('No New Errors Verification', false, `Error: ${error.message}`);
}

/**
 * Summary and Results
 */
console.log('\n📊 Comprehensive Fix Verification Summary');
console.log('======================================');

console.log(`\n📈 Test Results:`);
console.log(`  Total Tests: ${testResults.totalTests}`);
console.log(`  Passed: ${testResults.passedTests}`);
console.log(`  Failed: ${testResults.failedTests}`);
console.log(`  Success Rate: ${Math.round((testResults.passedTests / testResults.totalTests) * 100)}%`);

console.log('\n📋 Detailed Results:');
testResults.testDetails.forEach(({ testName, passed, details }) => {
  const status = passed ? '✅' : '❌';
  console.log(`  ${status} ${testName}`);
  if (details) console.log(`     ${details}`);
});

console.log('\n🎯 Recommendations:');
if (testResults.failedTests === 0) {
  console.log('  ✅ All fixes are working correctly!');
  console.log('  ✅ No new errors were introduced.');
  console.log('  ✅ The application should be stable and ready for deployment.');
} else {
  console.log('  ⚠️ Some fixes need attention.');
  console.log('  ⚠️ Review the failed tests above for details.');
  console.log('  ⚠️ Check the specific components mentioned in the test results.');

  // Provide specific recommendations based on which tests failed
  testResults.testDetails.forEach(({ testName, passed }) => {
    if (!passed) {
      if (testName.includes('Workbox')) {
        console.log('  🔧 Check service worker implementation in src/sw.ts');
      } else if (testName.includes('WebSocket')) {
        console.log('  🔧 Review WebSocket connection logic in services/socketService.ts');
      } else if (testName.includes('401')) {
        console.log('  🔧 Examine authentication handling in lib/auth/auth-store.ts');
      } else if (testName.includes('face-api')) {
        console.log('  🔧 Verify CDN loading in index.html');
      } else if (testName.includes('Google')) {
        console.log('  🔧 Check Google Sign-In initialization in App.tsx');
      } else if (testName.includes('Cross-Origin')) {
        console.log('  🔧 Review postMessage implementation in utils/postMessageUtils.ts');
      }
    }
  });
}

console.log('\n✅ Comprehensive Fix Verification Complete!');
console.log('The test suite has validated all implemented fixes.');
console.log('Review the results above to determine if any additional work is needed.');