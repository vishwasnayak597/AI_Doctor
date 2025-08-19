import { Request, Response, NextFunction } from 'express';
import winston from 'winston';
import { ApiResponse } from '../../../shared/types';

const NODE_ENV = process.env.NODE_ENV || 'development';

interface CustomError extends Error {
  statusCode?: number;
  code?: string;
  keyValue?: any;
  errors?: any;
}

/**
 * Global error handling middleware
 */
export const errorHandler = (
  error: CustomError,
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): void => {
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal server error';
  
  winston.error('Error occurred:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation error';
    
    if (error.errors) {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      message = validationErrors.join(', ');
    }
  }
  
  if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid resource ID';
  }
  
  if (error.code === '11000' || (error as any).code === 11000) {
    statusCode = 400;
    message = 'Duplicate field value';
    
    if (error.keyValue) {
      const field = Object.keys(error.keyValue)[0];
      message = `${field} already exists`;
    }
  }
  
  if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }
  
  if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }
  
  if (error.name === 'MongoNetworkError') {
    statusCode = 503;
    message = 'Database connection error';
  }
  
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(NODE_ENV === 'development' && { stack: error.stack })
  });
};

/**
 * Middleware to handle 404 errors
 */
export const notFoundHandler = (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): void => {
  const message = `Route ${req.originalUrl} not found`;
  
  winston.warn('Route not found:', {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });
  
  res.status(404).json({
    success: false,
    error: message
  });
};

/**
 * Async error handler wrapper
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}; 