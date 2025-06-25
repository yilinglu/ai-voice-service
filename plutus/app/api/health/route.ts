import { NextResponse } from 'next/server';
import { validateEnvironment } from '../../../lib/env-validation';
import { withEnhancedLogging } from '../../../lib/request-logger';

async function healthHandler() {
  const envValidation = validateEnvironment();
  
  if (!envValidation.isValid) {
    return NextResponse.json({
      status: 'unhealthy',
      error: 'Critical configuration missing',
      missing: envValidation.missing,
      errors: envValidation.errors,
      timestamp: new Date().toISOString(),
      service: 'plutus-layercode-backend'
    }, { status: 503 }); // Service Unavailable
  }

  return NextResponse.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'plutus-layercode-backend',
    environment: 'configured'
  });
}

// Export the enhanced wrapped handler
export const GET = withEnhancedLogging(healthHandler, {
  name: 'health-check',
  sensitiveFields: [] // No sensitive data in health checks
}); 