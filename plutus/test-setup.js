#!/usr/bin/env node

/**
 * Plutus Backend Test Suite
 * 
 * This script tests all endpoints of the Plutus Layercode backend
 * Run with: node test-setup.js
 */

const BASE_URL = 'http://localhost:3000';

// Test colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName, status, details = '') {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  const color = status === 'PASS' ? 'green' : status === 'FAIL' ? 'red' : 'yellow';
  log(`${icon} ${testName}: ${status}`, color);
  if (details) {
    log(`   ${details}`, 'blue');
  }
}

async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    
    return {
      status: response.status,
      ok: response.ok,
      data,
      headers: Object.fromEntries(response.headers.entries())
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message,
      data: null
    };
  }
}

// Test 1: Health Endpoint
async function testHealthEndpoint() {
  log('\n🔍 Testing Health Endpoint', 'bold');
  
  const result = await makeRequest(`${BASE_URL}/api/health`);
  
  if (result.ok && result.status === 200) {
    if (result.data && result.data.status === 'healthy') {
      logTest('Health Endpoint', 'PASS', `Status: ${result.data.status}, Service: ${result.data.service}`);
      return true;
    } else {
      logTest('Health Endpoint', 'FAIL', 'Response missing expected health data');
      return false;
    }
  } else {
    logTest('Health Endpoint', 'FAIL', `Status: ${result.status}, Error: ${result.error || result.data}`);
    return false;
  }
}

// Test 2: Authorization Endpoint (without API key)
async function testAuthorizationEndpointNoKey() {
  log('\n🔍 Testing Authorization Endpoint (No API Key)', 'bold');
  
  const result = await makeRequest(`${BASE_URL}/api/authorize`, {
    method: 'POST',
    body: JSON.stringify({
      pipeline_id: 'test-pipeline'
    })
  });
  
  // Should fail without API key (expected behavior)
  if (result.status === 500) {
    logTest('Authorization Endpoint (No API Key)', 'PASS', 'Correctly rejected without API key');
    return true;
  } else {
    logTest('Authorization Endpoint (No API Key)', 'FAIL', `Unexpected status: ${result.status}`);
    return false;
  }
}

// Test 3: Webhook Endpoint (without signature)
async function testWebhookEndpointNoSignature() {
  log('\n🔍 Testing Webhook Endpoint (No Signature)', 'bold');
  
  const result = await makeRequest(`${BASE_URL}/api/agent`, {
    method: 'POST',
    body: JSON.stringify({
      text: 'Hello, this is a test message',
      session_id: 'test-session-123',
      turn_id: 'test-turn-456',
      type: 'message'
    })
  });
  
  // Should return 401 Unauthorized without proper signature (expected behavior)
  if (result.status === 401) {
    logTest('Webhook Endpoint (No Signature)', 'PASS', 'Correctly rejected without signature');
    return true;
  } else {
    logTest('Webhook Endpoint (No Signature)', 'FAIL', `Unexpected status: ${result.status}`);
    return false;
  }
}

// Test 4: Webhook Endpoint (with invalid signature)
async function testWebhookEndpointInvalidSignature() {
  log('\n🔍 Testing Webhook Endpoint (Invalid Signature)', 'bold');
  
  const result = await makeRequest(`${BASE_URL}/api/agent`, {
    method: 'POST',
    headers: {
      'layercode-signature': 't=1234567890,v1=invalid_signature'
    },
    body: JSON.stringify({
      text: 'Hello, this is a test message',
      session_id: 'test-session-123',
      turn_id: 'test-turn-456',
      type: 'message'
    })
  });
  
  // Should return 401 Unauthorized with invalid signature (expected behavior)
  if (result.status === 401) {
    logTest('Webhook Endpoint (Invalid Signature)', 'PASS', 'Correctly rejected with invalid signature');
    return true;
  } else {
    logTest('Webhook Endpoint (Invalid Signature)', 'FAIL', `Unexpected status: ${result.status}`);
    return false;
  }
}

// Test 5: Frontend Page Load
async function testFrontendPage() {
  log('\n🔍 Testing Frontend Page', 'bold');
  
  const result = await makeRequest(`${BASE_URL}/`);
  
  if (result.ok && result.status === 200) {
    // Check if the page contains expected content
    if (result.data && typeof result.data === 'string') {
      if (result.data.includes('Plutus Voice Agent') || result.data.includes('Test Webhook Endpoint')) {
        logTest('Frontend Page', 'PASS', 'Page loads successfully with expected content');
        return true;
      } else {
        logTest('Frontend Page', 'FAIL', 'Page loads but missing expected content');
        return false;
      }
    } else {
      logTest('Frontend Page', 'FAIL', 'Page response is not HTML');
      return false;
    }
  } else {
    logTest('Frontend Page', 'FAIL', `Status: ${result.status}, Error: ${result.error || 'Unknown'}`);
    return false;
  }
}

// Test 6: Environment Variables Check
async function testEnvironmentVariables() {
  log('\n🔍 Testing Environment Variables', 'bold');
  
  // This test checks if the server is properly configured
  const result = await makeRequest(`${BASE_URL}/api/authorize`, {
    method: 'POST',
    body: JSON.stringify({
      pipeline_id: 'test-pipeline'
    })
  });
  
  if (result.status === 500 && result.data && result.data.error) {
    if (result.data.error.includes('LAYERCODE_API_KEY is not set')) {
      logTest('Environment Variables', 'WARN', 'API keys not configured (expected for testing)');
      return true;
    } else {
      logTest('Environment Variables', 'PASS', 'Server responding to configuration errors');
      return true;
    }
  } else {
    logTest('Environment Variables', 'FAIL', 'Unexpected response for missing API keys');
    return false;
  }
}

// Test 7: Server Response Time
async function testResponseTime() {
  log('\n🔍 Testing Response Time', 'bold');
  
  const startTime = Date.now();
  const result = await makeRequest(`${BASE_URL}/api/health`);
  const endTime = Date.now();
  const responseTime = endTime - startTime;
  
  if (result.ok && responseTime < 5000) { // Less than 5 seconds
    logTest('Response Time', 'PASS', `Response time: ${responseTime}ms`);
    return true;
  } else {
    logTest('Response Time', 'FAIL', `Response time: ${responseTime}ms (too slow)`);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  log('🚀 Starting Plutus Backend Test Suite', 'bold');
  log(`Base URL: ${BASE_URL}`, 'blue');
  log(`Timestamp: ${new Date().toISOString()}`, 'blue');
  
  const tests = [
    testHealthEndpoint,
    testAuthorizationEndpointNoKey,
    testWebhookEndpointNoSignature,
    testWebhookEndpointInvalidSignature,
    testFrontendPage,
    testEnvironmentVariables,
    testResponseTime
  ];
  
  let passed = 0;
  let failed = 0;
  let warned = 0;
  
  for (const test of tests) {
    try {
      const result = await test();
      if (result === true) passed++;
      else if (result === false) failed++;
      else warned++;
    } catch (error) {
      logTest(test.name, 'FAIL', `Test error: ${error.message}`);
      failed++;
    }
  }
  
  // Summary
  log('\n📊 Test Summary', 'bold');
  log(`✅ Passed: ${passed}`, 'green');
  log(`⚠️  Warnings: ${warned}`, 'yellow');
  log(`❌ Failed: ${failed}`, 'red');
  
  const total = passed + failed + warned;
  const successRate = ((passed + warned) / total * 100).toFixed(1);
  
  log(`\n🎯 Success Rate: ${successRate}%`, 'bold');
  
  if (failed === 0) {
    log('\n🎉 All critical tests passed! Your Plutus backend is working correctly.', 'green');
  } else {
    log('\n🔧 Some tests failed. Check the errors above and fix the issues.', 'red');
  }
  
  return { passed, failed, warned, successRate };
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    log(`\n💥 Test suite crashed: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  testHealthEndpoint,
  testAuthorizationEndpointNoKey,
  testWebhookEndpointNoSignature,
  testWebhookEndpointInvalidSignature,
  testFrontendPage,
  testEnvironmentVariables,
  testResponseTime
}; 