#!/usr/bin/env node

/**
 * Startup Validation Script
 * Run this before starting the Next.js server to validate environment
 */

const { validateAndExit } = require('../lib/env-validation.ts');

console.log('🔍 Validating Plutus server environment...\n');

try {
  validateAndExit();
} catch (error) {
  console.error('❌ Validation script error:', error.message);
  process.exit(1);
} 