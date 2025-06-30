import { NextResponse } from 'next/server';
import { withEnhancedLogging, type ApiHandler } from '../lib/request-logger';
import { MockTransport, sampleLogData } from './test-utils/logger-helpers';
import winston from 'winston';

// Import the mocked logger (already mocked in jest.setup.js)
import logger from '../lib/logger';

// Mock Next.js Request and Response
const createMockRequest = (options: {
  method?: string;
  url?: string;
  body?: any;
  pathname?: string;
} = {}) => {
  const request = {
    method: options.method || 'GET',
    url: options.url || 'http://localhost:3000/api/test',
    nextUrl: { pathname: options.pathname || '/api/test' },
    clone: jest.fn(() => ({
      json: jest.fn().mockResolvedValue(options.body || null)
    })),
    json: jest.fn().mockResolvedValue(options.body || null),
    headers: {
      get: jest.fn().mockReturnValue(null)
    }
  } as any;

  return request;
};

const createMockResponse = (status: number = 200, data: any = { success: true }) => {
  return NextResponse.json(data, { status });
};

describe('Request Logger Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('withEnhancedLogging Wrapper', () => {
    it('should preserve structured data in successful requests', async () => {
      const handler: ApiHandler = async (request) => {
        return createMockResponse(200, { message: 'success' });
      };

      const wrappedHandler = withEnhancedLogging(handler, {
        name: 'test-endpoint',
        sensitiveFields: []
      });

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/test',
        pathname: '/api/test',
        body: { test: 'data' }
      });

      await wrappedHandler(request);

      // Should have logged request start and completion
      expect(logger.info).toHaveBeenCalledTimes(2);

      const startCall = (logger.info as jest.Mock).mock.calls[0];
      const endCall = (logger.info as jest.Mock).mock.calls[1];

      // Verify request start log
      expect(startCall[0]).toBe('API request started');
      expect(startCall[1]).toMatchObject({
        requestId: expect.any(String),
        method: 'POST',
        url: 'http://localhost:3000/api/test',
        endpoint: '/api/test',
        context: 'test-endpoint',
        requestBody: { test: 'data' },
        timestamp: expect.any(String)
      });

      // Verify request completion log
      expect(endCall[0]).toBe('API request completed successfully');
      expect(endCall[1]).toMatchObject({
        requestId: expect.any(String),
        method: 'POST',
        url: 'http://localhost:3000/api/test',
        endpoint: '/api/test',
        context: 'test-endpoint',
        status: 200,
        processing_time_ms: expect.any(Number),
        requestBody: { test: 'data' },
        timestamp: expect.any(String)
      });

      // Request IDs should match
      expect(startCall[1].requestId).toBe(endCall[1].requestId);
    });

    it('should mask sensitive fields in request body', async () => {
      const handler: ApiHandler = async (request) => {
        return createMockResponse(200);
      };

      const wrappedHandler = withEnhancedLogging(handler, {
        name: 'sensitive-endpoint',
        sensitiveFields: ['password', 'api_key', 'secret']
      });

      const sensitiveBody = {
        username: 'testuser',
        password: 'secret123',
        api_key: 'sk-1234567890',
        secret: 'mysecret',
        data: 'public'
      };

      const request = createMockRequest({
        method: 'POST',
        body: sensitiveBody
      });

      await wrappedHandler(request);

      const startCall = (logger.info as jest.Mock).mock.calls[0];
      const loggedBody = startCall[1].requestBody;

      // Sensitive fields should be masked
      expect(loggedBody.password).toBe('***');
      expect(loggedBody.api_key).toBe('***');
      expect(loggedBody.secret).toBe('***');

      // Non-sensitive fields should remain
      expect(loggedBody.username).toBe('testuser');
      expect(loggedBody.data).toBe('public');
    });

    it('should log errors with full structured data', async () => {
      const testError = new Error('Test error');
      testError.stack = 'Error: Test error\n    at test (file.js:1:1)';

      const handler: ApiHandler = async (request) => {
        throw testError;
      };

      const wrappedHandler = withEnhancedLogging(handler, {
        name: 'error-endpoint',
        sensitiveFields: []
      });

      const request = createMockRequest({
        method: 'POST',
        body: { test: 'data' }
      });

      await expect(wrappedHandler(request)).rejects.toThrow('Test error');

      // Should have logged request start and error
      expect(logger.info).toHaveBeenCalledTimes(1); // Start only
      expect(logger.error).toHaveBeenCalledTimes(1); // Error

      const errorCall = (logger.error as jest.Mock).mock.calls[0];

      expect(errorCall[0]).toBe('API request failed');
      expect(errorCall[1]).toMatchObject({
        requestId: expect.any(String),
        method: 'POST',
        endpoint: '/api/test',
        context: 'error-endpoint',
        error: 'Test error',
        stack: expect.stringContaining('Error: Test error'),
        processing_time_ms: expect.any(Number),
        requestBody: { test: 'data' },
        timestamp: expect.any(String)
      });
    });

    it('should handle requests without body gracefully', async () => {
      const handler: ApiHandler = async (request) => {
        return createMockResponse(200);
      };

      const wrappedHandler = withEnhancedLogging(handler, {
        name: 'get-endpoint'
      });

      const request = createMockRequest({
        method: 'GET',
        body: null
      });

      await wrappedHandler(request);

      const startCall = (logger.info as jest.Mock).mock.calls[0];

      expect(startCall[1].requestBody).toBeNull();
      expect(startCall[1].method).toBe('GET');
    });

    it('should handle invalid JSON body gracefully', async () => {
      const handler: ApiHandler = async (request) => {
        return createMockResponse(200);
      };

      const wrappedHandler = withEnhancedLogging(handler, {
        name: 'invalid-json-endpoint'
      });

      const request = createMockRequest({
        method: 'POST'
      });

      // Mock clone to return a request that throws on json()
      request.clone.mockReturnValue({
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
      });

      await wrappedHandler(request);

      const startCall = (logger.info as jest.Mock).mock.calls[0];

      expect(startCall[1].requestBody).toBe('Unable to parse body');
    });

    it('should preserve all metadata through request lifecycle', async () => {
      const handler: ApiHandler = async (request) => {
        // Simulate some processing time
        await new Promise(resolve => setTimeout(resolve, 10));
        return createMockResponse(201, { created: true });
      };

      const wrappedHandler = withEnhancedLogging(handler, {
        name: 'lifecycle-test',
        sensitiveFields: ['token']
      });

      const requestBody = {
        data: 'test',
        token: 'secret-token',
        timestamp: '2024-01-01T12:00:00.000Z'
      };

      const request = createMockRequest({
        method: 'PUT',
        url: 'http://localhost:3000/api/lifecycle',
        pathname: '/api/lifecycle',
        body: requestBody
      });

      await wrappedHandler(request);

      const startCall = (logger.info as jest.Mock).mock.calls[0];
      const endCall = (logger.info as jest.Mock).mock.calls[1];

      // Verify same request ID is used throughout
      expect(startCall[1].requestId).toBe(endCall[1].requestId);

      // Verify all expected fields are present
      const expectedFields = ['requestId', 'method', 'url', 'endpoint', 'context', 'timestamp'];
      
      expectedFields.forEach(field => {
        expect(startCall[1]).toHaveProperty(field);
        expect(endCall[1]).toHaveProperty(field);
      });

      // Verify processing time is captured
      expect(endCall[1].processing_time_ms).toBeGreaterThan(0);

      // Verify status is captured
      expect(endCall[1].status).toBe(201);

      // Verify sensitive field masking
      expect(startCall[1].requestBody.token).toBe('***');
      expect(endCall[1].requestBody.token).toBe('***');
    });
  });

  describe('Real API Endpoint Simulation', () => {
    it('should log complete Layercode authorize endpoint flow', async () => {
      const authorizeHandler: ApiHandler = async (request) => {
        const body = await request.json();
        
        if (!body.pipeline_id) {
          return NextResponse.json({ error: 'Missing pipeline_id' }, { status: 400 });
        }

        // Simulate Layercode API call
        await new Promise(resolve => setTimeout(resolve, 50));

        return NextResponse.json({
          client_session_key: 'csk_test123',
          session_id: 'sess_456'
        });
      };

      const wrappedHandler = withEnhancedLogging(authorizeHandler, {
        name: 'layercode-authorize',
        sensitiveFields: ['api_key', 'client_session_key', 'session_id', 'pipeline_id']
      });

      const request = createMockRequest({
        method: 'POST',
        pathname: '/api/authorize',
        body: {
          pipeline_id: 'pl_test123',
          metadata: { user_id: 'user_456' }
        }
      });

      await wrappedHandler(request);

      // Verify structured logging captured all relevant data
      const startCall = (logger.info as jest.Mock).mock.calls[0];
      const endCall = (logger.info as jest.Mock).mock.calls[1];

      expect(startCall[1]).toMatchObject({
        context: 'layercode-authorize',
        endpoint: '/api/authorize',
        method: 'POST',
        requestBody: {
          pipeline_id: '***', // Should be masked
          metadata: { user_id: 'user_456' }
        }
      });

      expect(endCall[1]).toMatchObject({
        context: 'layercode-authorize',
        status: 200,
        processing_time_ms: expect.any(Number)
      });
    });

    it('should log complete Layercode agent webhook flow', async () => {
      const agentHandler: ApiHandler = async (request) => {
        const body = await request.json();
        
        // Simulate AI processing
        await new Promise(resolve => setTimeout(resolve, 100));

        return new Response('AI response stream', {
          status: 200,
          headers: { 'Content-Type': 'text/plain' }
        });
      };

      const wrappedHandler = withEnhancedLogging(agentHandler, {
        name: 'layercode-agent-webhook',
        sensitiveFields: ['text', 'session_id', 'turn_id', 'connection_id']
      });

      const request = createMockRequest({
        method: 'POST',
        pathname: '/api/agent',
        body: {
          text: 'User speech to process',
          session_id: 'sess_123',
          turn_id: 'turn_456',
          connection_id: 'conn_789'
        }
      });

      await wrappedHandler(request);

      const startCall = (logger.info as jest.Mock).mock.calls[0];
      const endCall = (logger.info as jest.Mock).mock.calls[1];

      // Verify sensitive webhook data is masked
      expect(startCall[1].requestBody).toEqual({
        text: '***',
        session_id: '***',
        turn_id: '***',
        connection_id: '***'
      });

      expect(endCall[1]).toMatchObject({
        context: 'layercode-agent-webhook',
        status: 200,
        processing_time_ms: expect.any(Number) // AI processing time
      });
      
      // Verify processing time is reasonable
      expect(endCall[1].processing_time_ms).toBeGreaterThan(50);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle high-frequency requests efficiently', async () => {
      const handler: ApiHandler = async (request) => {
        return createMockResponse(200);
      };

      const wrappedHandler = withEnhancedLogging(handler, {
        name: 'high-frequency-test'
      });

      const startTime = Date.now();

      // Simulate 10 concurrent requests
      const requests = Array.from({ length: 10 }, (_, i) => 
        createMockRequest({
          method: 'GET',
          url: `http://localhost:3000/api/test${i}`
        })
      );

      await Promise.all(requests.map(request => wrappedHandler(request)));

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should complete in reasonable time (less than 100ms for 10 requests)
      expect(totalTime).toBeLessThan(100);

      // Should have logged all requests
      expect(logger.info).toHaveBeenCalledTimes(20); // 10 start + 10 end
    });

    it('should handle very large request bodies', async () => {
      const handler: ApiHandler = async (request) => {
        return createMockResponse(200);
      };

      const wrappedHandler = withEnhancedLogging(handler);

      const largeBody = {
        data: new Array(1000).fill(0).map((_, i) => ({ id: i, content: `item-${i}`.repeat(10) }))
      };

      const request = createMockRequest({
        method: 'POST',
        body: largeBody
      });

      await wrappedHandler(request);

      const startCall = (logger.info as jest.Mock).mock.calls[0];

      // Should handle large body without errors
      expect(startCall[1].requestBody.data).toHaveLength(1000);
      expect(typeof startCall[1].requestBody.data[0].content).toBe('string');
    });
  });
}); 