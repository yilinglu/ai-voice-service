import logger from './logger';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

/**
 * Environment Validation Utility
 * Validates critical environment variables required for the Plutus server
 */

interface ValidationResult {
  isValid: boolean;
  missing: string[];
  errors: string[];
}

export function validateEnvironment(): ValidationResult {
  logger.info('Starting environment validation');
  
  const criticalVars = [
    'LAYERCODE_API_KEY',
    'LAYERCODE_WEBHOOK_SECRET',
    'GOOGLE_GENERATIVE_AI_API_KEY'
  ];

  const missing: string[] = [];
  const errors: string[] = [];

  // Check for missing variables
  criticalVars.forEach(key => {
    if (!process.env[key]) {
      missing.push(key);
      errors.push(`${key} is not set`);
      logger.error(`Missing environment variable: ${key}`);
    } else {
      logger.debug(`Environment variable found: ${key}`);
    }
  });

  // Additional validation for specific variables
  if (process.env.LAYERCODE_API_KEY && process.env.LAYERCODE_API_KEY.length < 10) {
    errors.push('LAYERCODE_API_KEY appears to be invalid (too short)');
    logger.error('LAYERCODE_API_KEY appears to be invalid (too short)');
  }

  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY && process.env.GOOGLE_GENERATIVE_AI_API_KEY.length < 10) {
    errors.push('GOOGLE_GENERATIVE_AI_API_KEY appears to be invalid (too short)');
    logger.error('GOOGLE_GENERATIVE_AI_API_KEY appears to be invalid (too short)');
  }

  const result = {
    isValid: missing.length === 0 && errors.length === 0,
    missing,
    errors
  };

  if (result.isValid) {
    logger.info('Environment validation passed successfully');
  } else {
    logger.error('Environment validation failed', {
      missing: result.missing,
      errors: result.errors
    });
  }

  return result;
}

export function validateAndExit(): void {
  logger.info('🔍 Validating Plutus server environment...');
  
  const result = validateEnvironment();

  if (!result.isValid) {
    logger.error('❌ Critical environment validation failed!');
    logger.error('The Plutus server cannot start without proper configuration.');
    
    if (result.missing.length > 0) {
      logger.error('Missing environment variables:', { missing: result.missing });
    }

    if (result.errors.length > 0) {
      logger.error('Configuration errors:', { errors: result.errors });
    }

    logger.error('📋 Setup Instructions:');
    logger.error('1. Copy env.example to .env.local');
    logger.error('2. Add your API keys to .env.local:');
    logger.error('   - LAYERCODE_API_KEY (from Layercode dashboard)');
    logger.error('   - LAYERCODE_WEBHOOK_SECRET (from your pipeline settings)');
    logger.error('   - GOOGLE_GENERATIVE_AI_API_KEY (from Google AI Studio)');
    logger.error('3. Restart the server');
    logger.error('🔗 Get your keys from:');
    logger.error('   - Layercode: https://dash.layercode.com');
    logger.error('   - Google AI: https://aistudio.google.com/app/apikey');
    
    process.exit(1);
  }

  logger.info('✅ Environment validation passed');
  logger.info('✅ All critical environment variables are configured');
}

// Run validation if this file is executed directly
if (require.main === module) {
  logger.info('🔍 Validating Plutus server environment...');
  validateAndExit();
} 