/**
 * Frontend Environment Validation Utility
 * Validates client-side environment variables for the Plutus frontend
 */

export interface FrontendConfig {
  NEXT_PUBLIC_LAYERCODE_PIPELINE_ID: string;
  NEXT_PUBLIC_API_BASE_URL: string;
  NEXT_PUBLIC_DEBUG?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  config: Partial<FrontendConfig>;
  errors: string[];
  warnings: string[];
}

/**
 * Validates frontend environment variables
 * Only checks NEXT_PUBLIC_* variables that are available in the browser
 */
export function validateFrontendEnvironment(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const config: Partial<FrontendConfig> = {};

  // Check required environment variables
  const pipelineId = process.env.NEXT_PUBLIC_LAYERCODE_PIPELINE_ID;
  if (!pipelineId) {
    errors.push('NEXT_PUBLIC_LAYERCODE_PIPELINE_ID is required but not set');
  } else {
    config.NEXT_PUBLIC_LAYERCODE_PIPELINE_ID = pipelineId;
  }

  // Check optional environment variables with defaults
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
  config.NEXT_PUBLIC_API_BASE_URL = apiBaseUrl;

  if (!process.env.NEXT_PUBLIC_API_BASE_URL) {
    warnings.push('NEXT_PUBLIC_API_BASE_URL not set, using default: http://localhost:3000');
  }

  // Check debug flag
  const debugFlag = process.env.NEXT_PUBLIC_DEBUG === 'true';
  if (debugFlag) {
    config.NEXT_PUBLIC_DEBUG = true;
    console.log('🐛 Debug mode enabled for frontend');
  }

  const isValid = errors.length === 0;

  // Log validation results in development
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Frontend Environment Validation:');
    console.log(`  Pipeline ID: ${pipelineId ? '✅ SET' : '❌ MISSING'}`);
    console.log(`  API Base URL: ${apiBaseUrl}`);
    
    if (errors.length > 0) {
      console.error('❌ Frontend environment errors:', errors);
    }
    
    if (warnings.length > 0) {
      console.warn('⚠️ Frontend environment warnings:', warnings);
    }
    
    if (isValid) {
      console.log('✅ Frontend environment validation passed');
    }
  }

  return {
    isValid,
    config,
    errors,
    warnings,
  };
}

/**
 * Gets the validated frontend configuration
 * Throws an error if validation fails
 */
export function getFrontendConfig(): FrontendConfig {
  const validation = validateFrontendEnvironment();
  
  if (!validation.isValid) {
    throw new Error(`Frontend environment validation failed: ${validation.errors.join(', ')}`);
  }
  
  return validation.config as FrontendConfig;
}

/**
 * Hook for React components to access validated config
 */
export function useFrontendConfig(): FrontendConfig {
  try {
    return getFrontendConfig();
  } catch (error) {
    console.error('Frontend configuration error:', error);
    // Return minimal fallback config
    return {
      NEXT_PUBLIC_LAYERCODE_PIPELINE_ID: '',
      NEXT_PUBLIC_API_BASE_URL: 'http://localhost:3000',
    };
  }
} 