import AuthService from '../services/authService.js';
import logger from '../config/logger.js';
import { AuditLog } from '../models/index.js';

export class AuthController {
  // Register
  static async register(req, res, next) {
    try {
      const { email, password, full_name, role, department } = req.body;

      // Validate input
      if (!email || !password || !full_name) {
        return res.status(400).json({
          success: false,
          error: 'Email, password, and full_name are required',
        });
      }

      const result = await AuthService.register(email, password, full_name, role, department);
      const user = result.data;
      
      // Log registration action (use standard 'create' to match enum constraints)
      if (user && user.id) {
        await AuditLog.create({
          user_id: user.id,
          action: 'create',
          table_name: 'users',
          changes: JSON.stringify({ email, full_name, role, department }),
          ip_address: req.ip,
        }).catch((err) => logger.error('Audit log error:', err));
      }

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      logger.error(`Register controller error: ${error.message}`);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Login
  static async login(req, res, next) {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required',
        });
      }

      const result = await AuthService.login(email, password);
      const { accessToken, refreshToken, user } = result.data;

      // Log login action
      await AuditLog.create({
        user_id: user.id,
        action: 'login',
        table_name: 'users',
        ip_address: req.ip,
      }).catch((err) => logger.error('Audit log error:', err));

      res.status(200).json({
        message: 'Login successful',
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
        },
        accessToken,
        refreshToken,
      });
    } catch (error) {
      logger.error(`Login controller error: ${error.message}`);
      res.status(401).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Logout
  static async logout(req, res, next) {
    try {
      const userId = req.user.user_id || req.user.id;

      // Log logout action
      await AuditLog.create({
        user_id: userId,
        action: 'logout',
        table_name: 'users',
        ip_address: req.ip,
      }).catch((err) => logger.error('Audit log error:', err));

      res.status(200).json({
        message: 'Logged out successfully',
      });
    } catch (error) {
      logger.error(`Logout controller error: ${error.message}`);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Refresh token
  static async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: 'Refresh token is required',
        });
      }

      const result = await AuthService.refreshAccessToken(refreshToken);
      res.status(200).json({
        accessToken: result.data.accessToken,
      });
    } catch (error) {
      logger.error(`Refresh token error: ${error.message}`);
      res.status(401).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Get profile
  static async getProfile(req, res, next) {
    try {
      // Return logged-in user's profile from req.user
      res.status(200).json(req.user);
    } catch (error) {
      logger.error(`Get profile error: ${error.message}`);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
}

export default AuthController;
