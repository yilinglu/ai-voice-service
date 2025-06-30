import winston from 'winston';

// Mock transport that captures logged data
export class MockTransport extends winston.Transport {
  public logs: any[] = [];
  
  constructor(opts?: winston.TransportOptions) {
    super(opts);
  }

  log(info: any, callback: () => void) {
    this.logs.push(info);
    callback();
  }

  clear() {
    this.logs = [];
  }

  getLastLog() {
    return this.logs[this.logs.length - 1];
  }

  getAllLogs() {
    return [...this.logs];
  }
}

// Helper to mock environment variables
export function mockEnvironment(env: 'local' | 'aws') {
  const originalEnv = process.env.NODE_ENV;
  const originalECS = process.env.ECS_CONTAINER_METADATA_URI_V4;

  if (env === 'local') {
    process.env.NODE_ENV = 'development';
    delete process.env.ECS_CONTAINER_METADATA_URI_V4;
  } else {
    process.env.NODE_ENV = 'production';
    process.env.ECS_CONTAINER_METADATA_URI_V4 = 'mock-ecs-url';
  }

  return () => {
    if (originalEnv) {
      process.env.NODE_ENV = originalEnv;
    } else {
      delete process.env.NODE_ENV;
    }
    
    if (originalECS) {
      process.env.ECS_CONTAINER_METADATA_URI_V4 = originalECS;
    } else {
      delete process.env.ECS_CONTAINER_METADATA_URI_V4;
    }
  };
}

// Helper to extract structured data from formatted output
export function parseConsoleOutput(formattedOutput: string) {
  try {
    // Split on newlines - first line is the message, rest is JSON
    const lines = formattedOutput.split('\n');
    if (lines.length < 2) {
      return null;
    }
    
    // Join everything after the first line and parse as JSON
    const jsonPart = lines.slice(1).join('\n');
    return JSON.parse(jsonPart);
  } catch {
    return null;
  }
}

// Helper to compare structured data across different transports
export function compareStructuredData(data1: any, data2: any, excludeFields: string[] = []) {
  const clean = (obj: any) => {
    const cleaned = { ...obj };
    excludeFields.forEach(field => delete cleaned[field]);
    // Remove winston internals
    delete cleaned[Symbol.for('level')];
    delete cleaned[Symbol.for('message')];
    delete cleaned[Symbol.for('splat')];
    return cleaned;
  };

  const cleaned1 = clean(data1);
  const cleaned2 = clean(data2);
  
  return JSON.stringify(cleaned1) === JSON.stringify(cleaned2);
}

// Sample structured log data for testing
export const sampleLogData = {
  requestId: 'test-request-123',
  method: 'POST',
  url: 'http://localhost:3000/api/test',
  endpoint: '/api/test',
  context: 'test-context',
  requestBody: { test: 'data' },
  timestamp: '2024-01-01T12:00:00.000Z',
  processing_time_ms: 150,
  status: 200
};

// Helper to create a test logger with mock transports
export function createTestLogger(transports: winston.Transport[]) {
  return winston.createLogger({
    level: 'debug',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    transports
  });
} 