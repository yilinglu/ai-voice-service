require('dotenv').config({ path: '.env.local' });

/**
 * Environment Validation Utility
 * Validates critical environment variables required for the Plutus server
 */

function validateEnvironment() {
  const criticalVars = [
    'LAYERCODE_API_KEY',
    'LAYERCODE_WEBHOOK_SECRET',
    'GOOGLE_GENERATIVE_AI_API_KEY'
  ];

  const missing = [];
  const errors = [];

  // Check for missing variables
  criticalVars.forEach(key => {
    if (!process.env[key]) {
      missing.push(key);
      errors.push(`${key} is not set`);
    }
  });

  // Additional validation for specific variables
  if (process.env.LAYERCODE_API_KEY && process.env.LAYERCODE_API_KEY.length < 10) {
    errors.push('LAYERCODE_API_KEY appears to be invalid (too short)');
  }

  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY && process.env.GOOGLE_GENERATIVE_AI_API_KEY.length < 10) {
    errors.push('GOOGLE_GENERATIVE_AI_API_KEY appears to be invalid (too short)');
  }

  return {
    isValid: missing.length === 0 && errors.length === 0,
    missing,
    errors
  };
}

function validateAndExit() {
  const result = validateEnvironment();

  if (!result.isValid) {
    console.error('\n❌ Critical environment validation failed!');
    console.error('The Plutus server cannot start without proper configuration.\n');
    
    if (result.missing.length > 0) {
      console.error('Missing environment variables:');
      result.missing.forEach(key => {
        console.error(`  - ${key}`);
      });
      console.error('');
    }

    if (result.errors.length > 0) {
      console.error('Configuration errors:');
      result.errors.forEach(error => {
        console.error(`  - ${error}`);
      });
      console.error('');
    }

    console.error('📋 Setup Instructions:');
    console.error('1. Copy env.example to .env.local');
    console.error('2. Add your API keys to .env.local:');
    console.error('   - LAYERCODE_API_KEY (from Layercode dashboard)');
    console.error('   - LAYERCODE_WEBHOOK_SECRET (from your pipeline settings)');
    console.error('   - GOOGLE_GENERATIVE_AI_API_KEY (from Google AI Studio)');
    console.error('3. Restart the server');
    console.error('\n🔗 Get your keys from:');
    console.error('   - Layercode: https://dash.layercode.com');
    console.error('   - Google AI: https://aistudio.google.com/app/apikey');
    
    process.exit(1);
  }

  console.log('✅ Environment validation passed');
  console.log('✅ All critical environment variables are configured');
}

// Run validation if this file is executed directly
if (require.main === module) {
  console.log('🔍 Validating Plutus server environment...\n');
  validateAndExit();
}

module.exports = {
  validateEnvironment,
  validateAndExit
}; 