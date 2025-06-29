#!/usr/bin/env node

/**
 * Frontend Environment Validation Script
 * Validates environment variables for the Plutus frontend
 */

const path = require('path');
const fs = require('fs');

// Load environment variables from .env.local if it exists
const envLocalPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envLocalPath)) {
  const envConfig = require('dotenv').config({ path: envLocalPath });
  if (envConfig.error) {
    console.log('📝 No .env.local file found, checking system environment...');
  } else {
    console.log('✅ Loaded .env.local file');
  }
} else {
  console.log('📝 No .env.local file found, checking system environment...');
}

/**
 * Validate frontend environment variables
 */
function validateFrontendEnvironment() {
  const errors = [];
  const warnings = [];
  const config = {};

  console.log('\n🔍 Frontend Environment Validation:');
  console.log('=====================================');

  // Check required environment variables
  const pipelineId = process.env.NEXT_PUBLIC_LAYERCODE_PIPELINE_ID;
  if (!pipelineId) {
    errors.push('NEXT_PUBLIC_LAYERCODE_PIPELINE_ID is required but not set');
    console.log('❌ NEXT_PUBLIC_LAYERCODE_PIPELINE_ID: MISSING');
  } else {
    config.NEXT_PUBLIC_LAYERCODE_PIPELINE_ID = pipelineId;
    console.log(`✅ NEXT_PUBLIC_LAYERCODE_PIPELINE_ID: ${pipelineId.substring(0, 8)}...`);
  }

  // Check optional environment variables with defaults
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
  config.NEXT_PUBLIC_API_BASE_URL = apiBaseUrl;

  if (!process.env.NEXT_PUBLIC_API_BASE_URL) {
    warnings.push('NEXT_PUBLIC_API_BASE_URL not set, using default: http://localhost:3000');
    console.log('⚠️  NEXT_PUBLIC_API_BASE_URL: Using default (http://localhost:3000)');
  } else {
    console.log(`✅ NEXT_PUBLIC_API_BASE_URL: ${apiBaseUrl}`);
  }

  // Check debug flag
  const debugFlag = process.env.NEXT_PUBLIC_DEBUG === 'true';
  if (debugFlag) {
    config.NEXT_PUBLIC_DEBUG = true;
    console.log('🐛 NEXT_PUBLIC_DEBUG: Enabled');
  } else {
    console.log('📝 NEXT_PUBLIC_DEBUG: Disabled');
  }

  const isValid = errors.length === 0;

  console.log('\n📊 Validation Summary:');
  console.log('======================');
  
  if (errors.length > 0) {
    console.log('❌ Errors:');
    errors.forEach(error => console.log(`   - ${error}`));
  }
  
  if (warnings.length > 0) {
    console.log('⚠️  Warnings:');
    warnings.forEach(warning => console.log(`   - ${warning}`));
  }
  
  if (isValid) {
    console.log('✅ Environment validation passed!');
    console.log('\n🚀 Your frontend is ready to start.');
    console.log('\nNext steps:');
    console.log('  1. Start the backend server: cd ../plutus-server && npm run dev');
    console.log('  2. Start the frontend: npm run dev');
    console.log('  3. Open http://localhost:3001 in your browser');
  } else {
    console.log('❌ Environment validation failed!');
    console.log('\n🔧 To fix:');
    console.log('  1. Copy env.example to .env.local');
    console.log('  2. Update NEXT_PUBLIC_LAYERCODE_PIPELINE_ID with your pipeline ID');
    console.log('  3. Get your pipeline ID from: https://dash.layercode.com/pipelines/');
  }

  return {
    isValid,
    config,
    errors,
    warnings,
  };
}

// Install dotenv if not available
try {
  require('dotenv');
} catch (error) {
  console.log('Installing dotenv for environment file loading...');
  require('child_process').execSync('npm install dotenv', { stdio: 'inherit' });
  console.log('✅ dotenv installed');
}

// Run validation
if (require.main === module) {
  const result = validateFrontendEnvironment();
  process.exit(result.isValid ? 0 : 1);
}

module.exports = { validateFrontendEnvironment }; 