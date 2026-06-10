import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/index.js';
import logger from '../config/logger.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_this_in_production';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';
const REFRESH_TOKEN_EXPIRE = '30d';

export class AuthService {
  // Generate JWT token
  static generateToken(user) {
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    return jwt.sign(
      {
        user_id: user.id,
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: fullName,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRE },
    );
  }

  // Generate refresh token
  static generateRefreshToken(user) {
    return jwt.sign(
      {
        user_id: user.id,
        id: user.id,
      },
      JWT_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRE },
    );
  }

  // Verify token
  static verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      logger.error('Token verification failed:', error.message);
      return null;
    }
  }

  // Register user
  static async register(email, password, full_name, role = 'staff', department = null) {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        throw new Error('Email already registered');
      }

      // Parse full_name into first_name and last_name
      const nameParts = full_name.trim().split(/\s+/);
      const first_name = nameParts[0] || '';
      const last_name = nameParts.slice(1).join(' ') || '';

      // Validate role
      const validRoles = ['admin', 'manager', 'staff', 'user'];
      const userRole = validRoles.includes(role) ? role : 'staff';

      // Create new user
      const user = await User.create({
        email,
        password,
        first_name,
        last_name,
        role: userRole,
        status: 'active',
      });

      const fullName = `${user.first_name} ${user.last_name}`.trim();
      logger.info(`New user registered: ${email} with role ${userRole}`);

      return {
        success: true,
        data: {
          user_id: user.id,
          id: user.id,
          email: user.email,
          full_name: fullName,
          role: user.role,
        },
      };
    } catch (error) {
      logger.error(`Registration error: ${error.message}`);
      throw error;
    }
  }

  // Login user
  static async login(email, password) {
    try {
      // Find user by email
      const user = await User.findOne({ where: { email } });
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Check if user is active
      if (user.status !== 'active') {
        throw new Error('User account is inactive');
      }

      // Compare password
      const passwordMatch = await user.comparePassword(password);
      if (!passwordMatch) {
        throw new Error('Invalid email or password');
      }

      // Update last login
      await user.update({ updated_at: new Date() });

      // Generate tokens
      const accessToken = this.generateToken(user);
      const refreshToken = this.generateRefreshToken(user);

      const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
      logger.info(`User logged in: ${email}`);

      return {
        success: true,
        data: {
          accessToken,
          refreshToken,
          user: {
            user_id: user.id,
            id: user.id,
            email: user.email,
            full_name: fullName,
            role: user.role,
          },
        },
      };
    } catch (error) {
      logger.error(`Login error: ${error.message}`);
      throw error;
    }
  }

  // Refresh access token
  static async refreshAccessToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, JWT_SECRET);
      const userId = decoded.user_id || decoded.id;
      
      const user = await User.findByPk(userId);
      if (!user || user.status !== 'active') {
        throw new Error('User not found or inactive');
      }

      const newAccessToken = this.generateToken(user);

      return {
        success: true,
        data: {
          accessToken: newAccessToken,
        },
      };
    } catch (error) {
      logger.error(`Token refresh error: ${error.message}`);
      throw new Error('Invalid or expired refresh token');
    }
  }

  // Get user profile
  static async getUserProfile(userId) {
    try {
      const user = await User.findByPk(userId, {
        attributes: { exclude: ['password'] },
      });

      if (!user) {
        throw new Error('User not found');
      }

      return {
        success: true,
        data: user,
      };
    } catch (error) {
      logger.error(`Get profile error: ${error.message}`);
      throw error;
    }
  }

  // Logout user (optional - for tracking purposes)
  static async logout(userId) {
    try {
      logger.info(`User logged out: ${userId}`);
      return {
        success: true,
        message: 'Logged out successfully',
      };
    } catch (error) {
      logger.error(`Logout error: ${error.message}`);
      throw error;
    }
  }
}

export default AuthService;
