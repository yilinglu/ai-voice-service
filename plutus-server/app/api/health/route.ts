import { NextResponse } from 'next/server';
import { withEnhancedLogging } from '../../../lib/request-logger';
import { isEnvironmentHealthy, getEnvironmentErrors } from '../../../lib/env-validation';

async function healthHandler() {
  const healthy = isEnvironmentHealthy();
  const errors = getEnvironmentErrors();
  
  const status = healthy ? 'healthy' : 'degraded';
  const environment = healthy ? 'configured' : 'misconfigured';
  
  const response = {
    status,
    timestamp: new Date().toISOString(),
    service: 'plutus-layercode-backend',
    environment,
    checks: {
      environment: {
        status: healthy ? 'pass' : 'fail',
        errors: errors.length > 0 ? errors : undefined
      }
    }
  };

  // Return appropriate HTTP status code
  const statusCode = healthy ? 200 : 503; // 503 Service Unavailable for degraded state
  
  return NextResponse.json(response, { status: statusCode });
}

// Export the enhanced wrapped handler
export const GET = withEnhancedLogging(healthHandler, {
  name: 'health-check',
  sensitiveFields: [] // No sensitive data in health checks
}); 