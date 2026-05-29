import AuthService from '../services/authService.js';
import logger from '../config/logger.js';
import { AuditLog } from '../models/index.js';

export class AuthController {
  // Register
  static async register(req, res, next) {
    try {
      const { email, password, full_name, department } = req.body;

      // Validate input
      if (!email || !password || !full_name) {
        return res.status(400).json({
          success: false,
          error: 'Email, password, and full_name are required',
        });
      }

      const result = await AuthService.register(email, password, full_name, department);
      res.status(201).json(result);
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

      // Log login action
      await AuditLog.create({
        user_id: result.data.user.user_id,
        action: 'login',
        ip_address: req.ip,
      }).catch((err) => logger.error('Audit log error:', err));

      res.status(200).json(result);
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
      const userId = req.user.user_id;

      const result = await AuthService.logout(userId);

      // Log logout action
      await AuditLog.create({
        user_id: userId,
        action: 'logout',
        ip_address: req.ip,
      }).catch((err) => logger.error('Audit log error:', err));

      res.status(200).json(result);
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

      const result = AuthService.refreshAccessToken(refreshToken);
      res.status(200).json(result);
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
      const userId = req.user.user_id;
      const result = await AuthService.getUserProfile(userId);
      res.status(200).json(result);
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
