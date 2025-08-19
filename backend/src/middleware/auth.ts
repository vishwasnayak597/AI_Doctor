import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, extractTokenFromHeader } from '../utils/jwt';
import User, { IUserDocument } from '../models/User';
import { ApiResponse } from '../../../shared/types';

declare global {
  namespace Express {
    interface Request {
      user?: IUserDocument;
    }
  }
}

const UNAUTHORIZED_MESSAGE = 'Authentication required';
const FORBIDDEN_MESSAGE = 'Insufficient permissions';
const INVALID_TOKEN_MESSAGE = 'Invalid or expired token';
const ACCOUNT_LOCKED_MESSAGE = 'Account is temporarily locked';
const EMAIL_NOT_VERIFIED_MESSAGE = 'Email verification required';

/**
 * Middleware to authenticate requests using JWT
 */
export const authenticate = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      res.status(401).json({
        success: false,
        error: UNAUTHORIZED_MESSAGE
      });
      return;
    }
    
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.userId);
    
    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        error: INVALID_TOKEN_MESSAGE
      });
      return;
    }
    
    if (user.isLocked()) {
      res.status(423).json({
        success: false,
        error: ACCOUNT_LOCKED_MESSAGE
      });
      return;
    }
    
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: INVALID_TOKEN_MESSAGE
    });
  }
};

/**
 * Middleware to require email verification
 */
export const requireEmailVerification = (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): void => {
  if (!req.user?.isEmailVerified) {
    res.status(403).json({
      success: false,
      error: EMAIL_NOT_VERIFIED_MESSAGE
    });
    return;
  }
  
  next();
};

/**
 * Middleware to authorize specific roles
 */
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response<ApiResponse>, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: UNAUTHORIZED_MESSAGE
      });
      return;
    }
    
    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: FORBIDDEN_MESSAGE
      });
      return;
    }
    
    next();
  };
};

/**
 * Middleware to authorize doctors with verification
 */
export const authorizeVerifiedDoctor = (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: UNAUTHORIZED_MESSAGE
    });
    return;
  }
  
  if (req.user.role !== 'doctor') {
    res.status(403).json({
      success: false,
      error: FORBIDDEN_MESSAGE
    });
    return;
  }
  
  if (!req.user.isVerified) {
    res.status(403).json({
      success: false,
      error: 'Doctor verification required'
    });
    return;
  }
  
  next();
};

/**
 * Middleware to authorize admin with specific permissions
 */
export const authorizeAdminWithPermissions = (...permissions: string[]) => {
  return (req: Request, res: Response<ApiResponse>, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: UNAUTHORIZED_MESSAGE
      });
      return;
    }
    
    if (req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: FORBIDDEN_MESSAGE
      });
      return;
    }
    
    const userPermissions = req.user.permissions || [];
    const hasRequiredPermissions = permissions.every(permission => 
      userPermissions.includes(permission)
    );
    
    if (!hasRequiredPermissions) {
      res.status(403).json({
        success: false,
        error: 'Insufficient admin permissions'
      });
      return;
    }
    
    next();
  };
};

/**
 * Middleware to authorize resource owner or admin
 */
export const authorizeOwnerOrAdmin = (userIdParam: string = 'userId') => {
  return (req: Request, res: Response<ApiResponse>, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: UNAUTHORIZED_MESSAGE
      });
      return;
    }
    
    const requestedUserId = req.params[userIdParam];
    const isOwner = req.user._id.toString() === requestedUserId;
    const isAdmin = req.user.role === 'admin';
    
    if (!isOwner && !isAdmin) {
      res.status(403).json({
        success: false,
        error: FORBIDDEN_MESSAGE
      });
      return;
    }
    
    next();
  };
};

/**
 * Optional authentication middleware (does not require token)
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (token) {
      const payload = verifyAccessToken(token);
      const user = await User.findById(payload.userId);
      
      if (user && user.isActive && !user.isLocked()) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    next();
  }
};

// Export alias for backward compatibility
export const auth = authenticate; 