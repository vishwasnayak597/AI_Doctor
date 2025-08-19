import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const EMAIL_VERIFICATION_EXPIRY = '24h';
const PASSWORD_RESET_EXPIRY = '1h';

interface TokenPayload {
  userId: string;
  email: string;
  role: 'patient' | 'doctor' | 'admin';
  isEmailVerified?: boolean;
}

interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
}

interface EmailVerificationPayload {
  userId: string;
  email: string;
  type: 'email-verification';
}

interface PasswordResetPayload {
  userId: string;
  email: string;
  type: 'password-reset';
}

/**
 * Generate access token for authenticated user
 */
export const generateAccessToken = (payload: TokenPayload): string => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    issuer: 'aidoc-api',
    audience: 'aidoc-app'
  });
};

/**
 * Generate refresh token for token renewal
 */
export const generateRefreshToken = (userId: string): { token: string; tokenId: string } => {
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET environment variable is required');
  }
  
  const tokenId = crypto.randomUUID();
  const payload: RefreshTokenPayload = { userId, tokenId };
  
  const token = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
    issuer: 'aidoc-api',
    audience: 'aidoc-app'
  });
  
  return { token, tokenId };
};

/**
 * Generate email verification token
 */
export const generateEmailVerificationToken = (userId: string, email: string): string => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  
  const payload: EmailVerificationPayload = {
    userId,
    email,
    type: 'email-verification'
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: EMAIL_VERIFICATION_EXPIRY,
    issuer: 'aidoc-api',
    audience: 'aidoc-app'
  });
};

/**
 * Generate password reset token
 */
export const generatePasswordResetToken = (userId: string, email: string): string => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  
  const payload: PasswordResetPayload = {
    userId,
    email,
    type: 'password-reset'
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: PASSWORD_RESET_EXPIRY,
    issuer: 'aidoc-api',
    audience: 'aidoc-app'
  });
};

/**
 * Verify access token and return payload
 */
export const verifyAccessToken = (token: string): TokenPayload => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  
  return jwt.verify(token, process.env.JWT_SECRET, {
    issuer: 'aidoc-api',
    audience: 'aidoc-app'
  }) as TokenPayload;
};

/**
 * Verify refresh token and return payload
 */
export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET environment variable is required');
  }
  
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
    issuer: 'aidoc-api',
    audience: 'aidoc-app'
  }) as RefreshTokenPayload;
};

/**
 * Verify email verification token
 */
export const verifyEmailVerificationToken = (token: string): EmailVerificationPayload => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  
  const payload = jwt.verify(token, process.env.JWT_SECRET, {
    issuer: 'aidoc-api',
    audience: 'aidoc-app'
  }) as EmailVerificationPayload;
  
  if (payload.type !== 'email-verification') {
    throw new Error('Invalid token type');
  }
  
  return payload;
};

/**
 * Verify password reset token
 */
export const verifyPasswordResetToken = (token: string): PasswordResetPayload => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  
  const payload = jwt.verify(token, process.env.JWT_SECRET, {
    issuer: 'aidoc-api',
    audience: 'aidoc-app'
  }) as PasswordResetPayload;
  
  if (payload.type !== 'password-reset') {
    throw new Error('Invalid token type');
  }
  
  return payload;
};

/**
 * Extract token from Authorization header
 */
export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  
  return parts[1];
}; 