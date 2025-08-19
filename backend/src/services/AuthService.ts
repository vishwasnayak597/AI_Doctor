import * as crypto from 'crypto';
import User, { IUserDocument } from '../models/User';
import { 
  generateAccessToken, 
  generateRefreshToken, 
  generateEmailVerificationToken,
  generatePasswordResetToken,
  verifyRefreshToken,
  verifyEmailVerificationToken,
  verifyPasswordResetToken
} from '../utils/jwt';
import { ApiResponse, User as IUser } from '../../../shared/types';

const MIN_PASSWORD_LENGTH = 7;
const PASSWORD_RESET_EXPIRY = 60 * 60 * 1000;

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'patient' | 'doctor' | 'admin';
  
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other';
  
  specialization?: string;
  licenseNumber?: string;
  experience?: number;
  qualifications?: string[];
  consultationFee?: number;
  
  permissions?: string[];
}

interface LoginData {
  email: string;
  password: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthResponse {
  user: IUser;
  tokens: AuthTokens;
}

export class AuthService {
  /**
   * Register a new user
   */
  static async register(userData: RegisterData): Promise<ApiResponse<AuthResponse>> {
    try {
      const existingUser = await User.findOne({ email: userData.email.toLowerCase() });
      
      if (existingUser) {
        return {
          success: false,
          error: 'Email already registered'
        };
      }
      
      if (userData.password.length < MIN_PASSWORD_LENGTH) {
        return {
          success: false,
          error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`
        };
      }
      
      if (userData.role === 'doctor' && (!userData.specialization || !userData.licenseNumber)) {
        return {
          success: false,
          error: 'Specialization and license number are required for doctors'
        };
      }
      
      const user = new User({
        ...userData,
        email: userData.email.toLowerCase()
      });
      
      await user.save();
      
      const tokens = this.generateTokensForUser(user);
      await user.addRefreshToken(tokens.refreshToken);
      
      return {
        success: true,
        data: {
          user: user.toUserObject(),
          tokens
        },
        message: 'Registration successful. Please verify your email.'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Registration failed. Please try again.'
      };
    }
  }
  
  /**
   * Login user
   */
  static async login(loginData: LoginData): Promise<ApiResponse<AuthResponse>> {
    try {
      const user = await User.findOne({ email: loginData.email.toLowerCase() });
      
      if (!user) {
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }
      
      if (!user.isActive) {
        return {
          success: false,
          error: 'Account is deactivated'
        };
      }
      
      if (user.isLocked()) {
        return {
          success: false,
          error: 'Account is temporarily locked due to multiple failed login attempts'
        };
      }
      
      const isPasswordValid = await user.comparePassword(loginData.password);
      
      if (!isPasswordValid) {
        await user.incLoginAttempts();
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }
      
      await user.resetLoginAttempts();
      
      const tokens = this.generateTokensForUser(user);
      await user.addRefreshToken(tokens.refreshToken);
      
      return {
        success: true,
        data: {
          user: user.toUserObject(),
          tokens
        },
        message: 'Login successful'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Login failed. Please try again.'
      };
    }
  }
  
  /**
   * Refresh access token
   */
  static async refreshToken(refreshToken: string): Promise<ApiResponse<AuthTokens>> {
    try {
      const payload = verifyRefreshToken(refreshToken);
      const user = await User.findById(payload.userId);
      
      if (!user || !user.isActive) {
        return {
          success: false,
          error: 'Invalid refresh token'
        };
      }
      
      if (!user.refreshTokens.includes(refreshToken)) {
        return {
          success: false,
          error: 'Invalid refresh token'
        };
      }
      
      await user.removeRefreshToken(refreshToken);
      
      const newTokens = this.generateTokensForUser(user);
      await user.addRefreshToken(newTokens.refreshToken);
      
      return {
        success: true,
        data: newTokens,
        message: 'Token refreshed successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Token refresh failed'
      };
    }
  }
  
  /**
   * Logout user
   */
  static async logout(userId: string, refreshToken: string): Promise<ApiResponse> {
    try {
      const user = await User.findById(userId);
      
      if (user) {
        await user.removeRefreshToken(refreshToken);
      }
      
      return {
        success: true,
        message: 'Logout successful'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Logout failed'
      };
    }
  }
  
  /**
   * Logout from all devices
   */
  static async logoutAll(userId: string): Promise<ApiResponse> {
    try {
      const user = await User.findById(userId);
      
      if (user) {
        user.refreshTokens = [];
        await user.save();
      }
      
      return {
        success: true,
        message: 'Logged out from all devices'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Logout failed'
      };
    }
  }
  
  /**
   * Verify email
   */
  static async verifyEmail(token: string): Promise<ApiResponse> {
    try {
      const payload = verifyEmailVerificationToken(token);
      const user = await User.findById(payload.userId);
      
      if (!user) {
        return {
          success: false,
          error: 'Invalid verification token'
        };
      }
      
      if (user.email !== payload.email) {
        return {
          success: false,
          error: 'Invalid verification token'
        };
      }
      
      if (user.isEmailVerified) {
        return {
          success: true,
          message: 'Email already verified'
        };
      }
      
      user.isEmailVerified = true;
      user.emailVerificationToken = undefined;
      await user.save();
      
      return {
        success: true,
        message: 'Email verified successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Email verification failed'
      };
    }
  }
  
  /**
   * Request password reset
   */
  static async requestPasswordReset(email: string): Promise<ApiResponse> {
    try {
      const user = await User.findOne({ email: email.toLowerCase() });
      
      if (!user) {
        return {
          success: true,
          message: 'If an account with that email exists, a password reset link has been sent.'
        };
      }
      
      const resetToken = generatePasswordResetToken(user._id.toString(), user.email);
      
      user.passwordResetToken = resetToken;
      user.passwordResetExpires = new Date(Date.now() + PASSWORD_RESET_EXPIRY);
      await user.save();
      
      return {
        success: true,
        message: 'Password reset link sent to your email',
        data: { resetToken }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Password reset request failed'
      };
    }
  }
  
  /**
   * Reset password
   */
  static async resetPassword(token: string, newPassword: string): Promise<ApiResponse> {
    try {
      if (newPassword.length < MIN_PASSWORD_LENGTH) {
        return {
          success: false,
          error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`
        };
      }
      
      const payload = verifyPasswordResetToken(token);
      const user = await User.findById(payload.userId);
      
      if (!user) {
        return {
          success: false,
          error: 'Invalid or expired reset token'
        };
      }
      
      if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
        return {
          success: false,
          error: 'Password reset token has expired'
        };
      }
      
      user.password = newPassword;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      user.refreshTokens = [];
      await user.save();
      
      return {
        success: true,
        message: 'Password reset successful'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Password reset failed'
      };
    }
  }
  
  /**
   * Change password
   */
  static async changePassword(
    userId: string, 
    currentPassword: string, 
    newPassword: string
  ): Promise<ApiResponse> {
    try {
      if (newPassword.length < MIN_PASSWORD_LENGTH) {
        return {
          success: false,
          error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`
        };
      }
      
      const user = await User.findById(userId);
      
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }
      
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      
      if (!isCurrentPasswordValid) {
        return {
          success: false,
          error: 'Current password is incorrect'
        };
      }
      
      user.password = newPassword;
      user.refreshTokens = [];
      await user.save();
      
      return {
        success: true,
        message: 'Password changed successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Password change failed'
      };
    }
  }
  
  /**
   * Generate access and refresh tokens for user
   */
  private static generateTokensForUser(user: IUserDocument): AuthTokens {
    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified
    });
    
    const { token: refreshToken } = generateRefreshToken(user._id.toString());
    
    return {
      accessToken,
      refreshToken
    };
  }
} 