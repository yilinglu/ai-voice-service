import logger from './logger';
import { randomUUID } from 'crypto';

// Type definitions
interface RequestContext {
  name?: string;
  sensitiveFields?: string[];
}

interface LogData {
  requestId: string;
  method: string;
  url: string;
  endpoint: string;
  processing_time_ms: number;
  timestamp: string;
  context?: string;
  status?: number;
  statusText?: string;
  error?: string;
  stack?: string;
  requestBody?: unknown;
}

type ApiHandler = (request: Request, ...args: unknown[]) => Promise<Response>;

/**
 * Request Logger Interceptor
 * Wraps API handlers to add automatic logging
 */
function withRequestLogging(handler: ApiHandler): ApiHandler {
  return async (request: Request, ...args: unknown[]): Promise<Response> => {
    const startTime = Date.now();
    const requestId = randomUUID();
    
    // Log request start
    logger.info('API request started', {
      requestId,
      method: request.method,
      url: request.url,
      endpoint: (request as { nextUrl?: { pathname?: string } }).nextUrl?.pathname || 'unknown',
      timestamp: new Date().toISOString()
    });

    try {
      // Call the original handler
      const response = await handler(request, ...args);
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      // Log successful completion
      logger.info('API request completed successfully', {
        requestId,
        method: request.method,
        url: request.url,
        endpoint: (request as { nextUrl?: { pathname?: string } }).nextUrl?.pathname || 'unknown',
        status: response?.status || 200,
        processing_time_ms: processingTime,
        timestamp: new Date().toISOString()
      });
      
      return response;
    } catch (error: unknown) {
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      // Log error
      logger.error('API request failed', {
        requestId,
        method: request.method,
        url: request.url,
        endpoint: (request as { nextUrl?: { pathname?: string } }).nextUrl?.pathname || 'unknown',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        processing_time_ms: processingTime,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  };
}

/**
 * Enhanced Request Logger with Custom Context
 * Allows passing additional context for specific endpoints
 */
function withEnhancedLogging(handler: ApiHandler, context: RequestContext = {}): ApiHandler {
  return async (request: Request, ...args: unknown[]): Promise<Response> => {
    const startTime = Date.now();
    const requestId = randomUUID();
    
    // Extract request body for logging (if needed)
    let requestBody: unknown = null;
    if (request.method === 'POST' || request.method === 'PUT') {
      try {
        // Clone request to avoid consuming the body
        const clonedRequest = request.clone();
        requestBody = await clonedRequest.json();
      } catch {
        // Body might not be JSON or already consumed
        requestBody = 'Unable to parse body';
      }
    }
    
    // Mask sensitive fields if provided
    if (requestBody && context.sensitiveFields && typeof requestBody === 'object' && requestBody !== null) {
      const maskedBody = { ...(requestBody as Record<string, unknown>) };
      context.sensitiveFields.forEach(field => {
        if (maskedBody[field]) {
          maskedBody[field] = '***';
        }
      });
      requestBody = maskedBody;
    }
    
    // Log request start with context
    logger.info('API request started', {
      requestId,
      method: request.method,
      url: request.url,
      endpoint: (request as { nextUrl?: { pathname?: string } }).nextUrl?.pathname || 'unknown',
      context: context.name || 'api',
      requestBody,
      timestamp: new Date().toISOString()
    });

    try {
      // Call the original handler
      const response = await handler(request, ...args);
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      // Log successful completion
      logger.info('API request completed successfully', {
        requestId,
        method: request.method,
        url: request.url,
        endpoint: (request as { nextUrl?: { pathname?: string } }).nextUrl?.pathname || 'unknown',
        context: context.name || 'api',
        status: response?.status || 200,
        processing_time_ms: processingTime,
        requestBody,
        timestamp: new Date().toISOString()
      });
      
      return response;
    } catch (error: unknown) {
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      // Log error
      logger.error('API request failed', {
        requestId,
        method: request.method,
        url: request.url,
        endpoint: (request as { nextUrl?: { pathname?: string } }).nextUrl?.pathname || 'unknown',
        context: context.name || 'api',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        processing_time_ms: processingTime,
        requestBody,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  };
}

export {
  withRequestLogging,
  withEnhancedLogging,
  type ApiHandler,
  type RequestContext,
  type LogData
}; 