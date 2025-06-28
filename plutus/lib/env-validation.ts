import logger from './logger';
import dotenv from 'dotenv';

// Only load .env.local in local development, not in AWS containers
const isLocal = process.env.NODE_ENV === 'development' || !process.env.ECS_CONTAINER_METADATA_URI_V4;
if (isLocal) {
  dotenv.config({ path: '.env.local' });
}

/**
 * Environment Validation Utility
 * Validates critical environment variables required for the Plutus server
 */

export interface EnvironmentConfig {
  LAYERCODE_API_KEY: string;
  LAYERCODE_WEBHOOK_SECRET: string;
  GOOGLE_GENERATIVE_AI_API_KEY: string;
  NODE_ENV: string;
}

// Global state to track environment health
let environmentHealthy = true;
const environmentErrors: string[] = [];
const MAX_VALIDATION_ATTEMPTS = 5;

export function validateEnvironment(): EnvironmentConfig {
  console.log('🚀 Starting Plutus server startup process...');
  console.log(`⏰ Startup timestamp: ${new Date().toISOString()}`);
  console.log(`🔧 Node.js version: ${process.version}`);
  console.log(`📦 NODE_ENV: ${process.env.NODE_ENV || 'NOT_SET'}`);
  
  const startTime = Date.now();
  
  // Log all environment variables (without sensitive values)
  console.log('📋 Environment variables present:');
  Object.keys(process.env).forEach(key => {
    if (key.includes('KEY') || key.includes('SECRET') || key.includes('PASSWORD')) {
      console.log(`  ${key}: [REDACTED]`);
    } else {
      console.log(`  ${key}: ${process.env[key]}`);
    }
  });

  const requiredEnvVars = [
    'LAYERCODE_API_KEY',
    'LAYERCODE_WEBHOOK_SECRET', 
    'GOOGLE_GENERATIVE_AI_API_KEY'
  ];

  console.log('🔍 Validating required environment variables...');
  
  const config: Partial<EnvironmentConfig> = {
    NODE_ENV: process.env.NODE_ENV || 'development'
  };

  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar];
    console.log(`  Checking ${envVar}: ${value ? '✅ PRESENT' : '❌ MISSING'}`);
    
    if (!value) {
      environmentErrors.push(`Missing required environment variable: ${envVar}`);
      environmentHealthy = false;
    } else {
      // Add to config using proper typing
      if (envVar === 'LAYERCODE_API_KEY') {
        config.LAYERCODE_API_KEY = value;
      } else if (envVar === 'LAYERCODE_WEBHOOK_SECRET') {
        config.LAYERCODE_WEBHOOK_SECRET = value;
      } else if (envVar === 'GOOGLE_GENERATIVE_AI_API_KEY') {
        config.GOOGLE_GENERATIVE_AI_API_KEY = value;
      }
    }
  }

  const validationTime = Date.now() - startTime;
  console.log(`⏱️  Environment validation completed in ${validationTime}ms`);

  if (!environmentHealthy) {
    console.error('❌ Environment validation failed:');
    environmentErrors.forEach(error => console.error(`  - ${error}`));
    
    // Don't exit immediately - log the error and continue for debugging
    console.log('⚠️  Continuing startup despite validation failures for debugging...');
    logger.error('Environment validation failed', { errors: environmentErrors });
  } else {
    console.log('✅ Environment validation passed');
    logger.info('Environment validation passed successfully');
  }

  console.log('🎯 Final environment configuration:');
  console.log(`  NODE_ENV: ${config.NODE_ENV}`);
  console.log(`  LAYERCODE_API_KEY: ${config.LAYERCODE_API_KEY ? '[SET]' : '[MISSING]'}`);
  console.log(`  LAYERCODE_WEBHOOK_SECRET: ${config.LAYERCODE_WEBHOOK_SECRET ? '[SET]' : '[MISSING]'}`);
  console.log(`  GOOGLE_GENERATIVE_AI_API_KEY: ${config.GOOGLE_GENERATIVE_AI_API_KEY ? '[SET]' : '[MISSING]'}`);

  return config as EnvironmentConfig;
}

export function getEnvironmentHealth(): { healthy: boolean; errors: string[] } {
  return {
    healthy: environmentHealthy,
    errors: environmentErrors
  };
}

export function retryEnvironmentValidation(maxAttempts: number = MAX_VALIDATION_ATTEMPTS): Promise<EnvironmentConfig> {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const attemptValidation = () => {
      attempts++;
      console.log(`🔄 Environment validation attempt ${attempts}/${maxAttempts}`);
      
      try {
        const config = validateEnvironment();
        if (environmentHealthy) {
          console.log(`✅ Environment validation succeeded on attempt ${attempts}`);
          resolve(config);
        } else if (attempts >= maxAttempts) {
          console.error(`❌ Environment validation failed after ${maxAttempts} attempts`);
          reject(new Error(`Environment validation failed after ${maxAttempts} attempts: ${environmentErrors.join(', ')}`));
        } else {
          console.log(`⏳ Retrying in 2 seconds...`);
          setTimeout(attemptValidation, 2000);
        }
      } catch (error) {
        console.error(`❌ Environment validation error on attempt ${attempts}:`, error);
        if (attempts >= maxAttempts) {
          reject(error);
        } else {
          console.log(`⏳ Retrying in 2 seconds...`);
          setTimeout(attemptValidation, 2000);
        }
      }
    };
    
    attemptValidation();
  });
}

// Function to check if environment is healthy
export function isEnvironmentHealthy(): boolean {
  return environmentHealthy;
}

// Function to get environment errors
export function getEnvironmentErrors(): string[] {
  return environmentErrors;
}

// Run validation if this file is executed directly
if (require.main === module) {
  console.log('🔍 Validating Plutus server environment...');
  validateEnvironment();
} 