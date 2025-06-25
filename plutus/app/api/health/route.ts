import { NextResponse } from 'next/server';
const { validateEnvironment } = require('../../../lib/env-validation.js');

export async function GET() {
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