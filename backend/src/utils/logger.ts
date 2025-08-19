import winston from 'winston';
import path from 'path';

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const NODE_ENV = process.env.NODE_ENV || 'development';
const LOG_DIR = 'logs';
const MAX_LOG_SIZE = 5242880;
const MAX_LOG_FILES = 5;

/**
 * Custom log format for development
 */
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

/**
 * Custom log format for production
 */
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Create transports based on environment
 */
const createTransports = (): winston.transport[] => {
  const transports: winston.transport[] = [];
  
  if (NODE_ENV === 'development') {
    transports.push(
      new winston.transports.Console({
        format: developmentFormat,
        level: LOG_LEVEL
      })
    );
  } else {
    transports.push(
      new winston.transports.Console({
        format: productionFormat,
        level: LOG_LEVEL
      })
    );
    
    transports.push(
      new winston.transports.File({
        filename: path.join(LOG_DIR, 'error.log'),
        level: 'error',
        format: productionFormat,
        maxsize: MAX_LOG_SIZE,
        maxFiles: MAX_LOG_FILES
      })
    );
    
    transports.push(
      new winston.transports.File({
        filename: path.join(LOG_DIR, 'combined.log'),
        format: productionFormat,
        maxsize: MAX_LOG_SIZE,
        maxFiles: MAX_LOG_FILES
      })
    );
  }
  
  return transports;
};

/**
 * Create and configure winston logger
 */
const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: NODE_ENV === 'production' ? productionFormat : developmentFormat,
  transports: createTransports(),
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'exceptions.log'),
      maxsize: MAX_LOG_SIZE,
      maxFiles: MAX_LOG_FILES
    })
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'rejections.log'),
      maxsize: MAX_LOG_SIZE,
      maxFiles: MAX_LOG_FILES
    })
  ],
  exitOnError: false
});

/**
 * Stream interface for Morgan HTTP logger
 */
export const morganStream = {
  write: (message: string): void => {
    logger.info(message.trim());
  }
};

export default logger; 