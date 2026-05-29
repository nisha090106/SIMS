import AuthService from '../services/authService.js';
import logger from '../config/logger.js';

// Verify JWT token middleware
export const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
      });
    }

    const token = authHeader.slice(7); // Remove 'Bearer '

    const decoded = AuthService.verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    logger.error(`Auth middleware error: ${error.message}`);
    res.status(401).json({
      success: false,
      error: 'Authentication failed',
    });
  }
};

// Role-based access control middleware
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
      }

      if (!allowedRoles.includes(req.user.role)) {
        logger.warn(`Unauthorized access attempt by user ${req.user.user_id} with role ${req.user.role}`);
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to access this resource',
        });
      }

      next();
    } catch (error) {
      logger.error(`Authorization middleware error: ${error.message}`);
      res.status(403).json({
        success: false,
        error: 'Authorization failed',
      });
    }
  };
};

// Optional auth middleware - doesn't fail if no token
export const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const decoded = AuthService.verifyToken(token);
      if (decoded) {
        req.user = decoded;
      }
    }

    next();
  } catch (error) {
    logger.error(`Optional auth middleware error: ${error.message}`);
    next();
  }
};

export default {
  authMiddleware,
  authorize,
  optionalAuth,
};
