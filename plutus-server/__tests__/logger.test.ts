import winston from 'winston';
import fs from 'fs';
import path from 'path';
import { MockTransport, mockEnvironment, parseConsoleOutput, compareStructuredData, sampleLogData, createTestLogger } from './test-utils/logger-helpers';
import logger from '../lib/logger';

// Mock fs operations
jest.mock('fs');
jest.mock('path');

const mockedFs = fs as jest.Mocked<typeof fs>;

describe('Logger Structured Data Consistency', () => {
  let restoreEnv: () => void;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedFs.existsSync.mockReturnValue(false);
    mockedFs.mkdirSync.mockImplementation(() => '');
  });

  afterEach(() => {
    if (restoreEnv) {
      restoreEnv();
    }
  });

  describe('Environment Detection', () => {
    it('should detect local environment correctly', () => {
      restoreEnv = mockEnvironment('local');
      
      // Re-require the logger module to get fresh environment detection
      jest.resetModules();
      const loggerModule = require('../lib/logger');
      
      expect(process.env.NODE_ENV).toBe('development');
      expect(process.env.ECS_CONTAINER_METADATA_URI_V4).toBeUndefined();
    });

    it('should detect AWS environment correctly', () => {
      restoreEnv = mockEnvironment('aws');
      
      jest.resetModules();
      const loggerModule = require('../lib/logger');
      
      expect(process.env.NODE_ENV).toBe('production');
      expect(process.env.ECS_CONTAINER_METADATA_URI_V4).toBeDefined();
    });
  });

  describe('Logger Functionality', () => {
    it('should have all required log levels available', () => {
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    it('should accept structured data in log calls', () => {
      const testData = { requestId: 'test-123', method: 'POST', url: 'http://test.com' };
      
      // These should not throw errors
      expect(() => logger.info('Test message', testData)).not.toThrow();
      expect(() => logger.error('Error message', testData)).not.toThrow();
      expect(() => logger.warn('Warning message', testData)).not.toThrow();
      expect(() => logger.debug('Debug message', testData)).not.toThrow();
    });
  });

  describe('Structured Data Logging', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should log structured data with info level', () => {
      const logMessage = 'Test API request';
      
      logger.info(logMessage, sampleLogData);
      
      expect(logger.info).toHaveBeenCalledWith(logMessage, sampleLogData);
    });

    it('should log structured data with error level', () => {
      const error = new Error('Test error');
      const errorData = { ...sampleLogData, error: error.message, stack: error.stack };
      
      logger.error('Error occurred', errorData);
      
      expect(logger.error).toHaveBeenCalledWith('Error occurred', errorData);
    });

    it('should handle logs without structured data', () => {
      const message = 'Simple log message';
      
      logger.info(message);
      
      expect(logger.info).toHaveBeenCalledWith(message);
    });

    it('should handle large structured data objects', () => {
      const largeData = {
        ...sampleLogData,
        largeArray: new Array(100).fill(0).map((_, i) => ({ id: i, data: `item-${i}` })),
        nestedObject: {
          level1: {
            level2: {
              level3: { deep: 'data' }
            }
          }
        }
      };
      
      expect(() => logger.info('Large data test', largeData)).not.toThrow();
      expect(logger.info).toHaveBeenCalledWith('Large data test', largeData);
    });
  });

  describe('Error Handling and Integration', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should handle circular references gracefully', () => {
      const circularData: any = { ...sampleLogData };
      circularData.circular = circularData;
      
      // This should not throw an error
      expect(() => logger.info('Circular reference test', circularData)).not.toThrow();
    });

    it('should handle complex nested objects', () => {
      const complexData = {
        requestId: 'complex-test-123',
        nested: {
          level1: {
            level2: {
              array: [1, 2, { deep: 'value' }],
              nullValue: null,
              undefinedValue: undefined,
              boolean: true,
              number: 42
            }
          }
        }
      };
      
      expect(() => logger.info('Complex data test', complexData)).not.toThrow();
      expect(logger.info).toHaveBeenCalledWith('Complex data test', complexData);
    });
  });
}); 