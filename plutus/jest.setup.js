// Mock environment variables for testing
process.env.LAYERCODE_API_KEY = 'test-layercode-api-key';
process.env.LAYERCODE_WEBHOOK_SECRET = 'test-webhook-secret';
process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-google-api-key';
process.env.NEXT_PUBLIC_LAYERCODE_PIPELINE_ID = 'test-pipeline-id';

// Fix setImmediate for Jest environment
global.setImmediate = global.setImmediate || ((fn, ...args) => global.setTimeout(fn, 0, ...args));

// Mock fetch globally
global.fetch = jest.fn();

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
};

// Mock Request constructor with proper method and url properties
global.Request = class Request {
  constructor(url, init = {}) {
    this.url = url || 'http://localhost:3000/api/test';
    this.method = init.method || 'GET';
    this.headers = new Map(Object.entries(init.headers || {}));
    this.body = init.body || null;
    this.nextUrl = { pathname: '/api/test' };
  }

  json() {
    return Promise.resolve(JSON.parse(this.body || '{}'));
  }

  text() {
    return Promise.resolve(this.body || '');
  }

  clone() {
    return new Request(this.url, {
      method: this.method,
      headers: this.headers,
      body: this.body
    });
  }
};

// Mock Next.js Response
global.Response = class Response {
  constructor(body, init = {}) {
    this.body = body;
    this.status = init.status || 200;
    this.statusText = init.statusText || 'OK';
    this.headers = new Map(Object.entries(init.headers || {}));
    this.ok = this.status >= 200 && this.status < 300;
  }

  json() {
    return Promise.resolve(JSON.parse(this.body));
  }

  text() {
    return Promise.resolve(this.body);
  }
};

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, init = {}) => {
      return new Response(JSON.stringify(data), {
        status: init.status || 200,
        headers: {
          'Content-Type': 'application/json',
          ...init.headers,
        },
      });
    }),
  },
}));

// Mock the logger to prevent Winston issues in tests
jest.mock('./lib/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
})); 