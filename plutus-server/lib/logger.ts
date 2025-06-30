import winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Environment detection
const isLocal = process.env.NODE_ENV === 'development' || !process.env.ECS_CONTAINER_METADATA_URI_V4;

// Create logs directory for local development
const createLocalLogsDir = () => {
  if (isLocal) {
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  }
};  

// Create transports based on environment
const createTransports = () => {
  const transports: winston.transport[] = [];

  if (isLocal) {
    // Local development: Console + File logging
    createLocalLogsDir();
    
    // Colorized console for development with full structured data
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize({ all: true }),
          winston.format.printf((info) => {
            const { timestamp, level, message, ...meta } = info;
            let output = `${timestamp} ${level}: ${message}`;
            
            // Add structured data if present
            if (Object.keys(meta).length > 0) {
              output += '\n' + JSON.stringify(meta, null, 2);
            }
            
            return output;
          })
        )
      })
    );

    // File transports for local persistence
    transports.push(
      new winston.transports.File({
        filename: 'logs/plutus-server.error.log',
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
      new winston.transports.File({
        filename: 'logs/plutus-server.combined.log',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      })
    );
  } else {
    // AWS environments (staging/production): Console only
    // ECS automatically captures stdout/stderr and sends to CloudWatch
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        )
      })
    );
  }

  return transports;
};

// Create the logger
const logger = winston.createLogger({
  levels,
  level: process.env.LOG_LEVEL || (isLocal ? 'debug' : 'info'),
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { 
    service: 'plutus-voice-agent',
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  },
  transports: createTransports(),
});

// Log environment info on startup
logger.info('Logger initialized', {
  environment: isLocal ? 'local' : 'aws',
  logLevel: logger.level,
  transports: logger.transports.map(t => t.constructor.name)
});

export default logger; 