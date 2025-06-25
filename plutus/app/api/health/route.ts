import { NextResponse } from 'next/server';
import { withEnhancedLogging } from '../../../lib/request-logger';

async function healthHandler() {
  // Environment validation already runs at startup, so we just return healthy
  // If the server is running, the environment is valid
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