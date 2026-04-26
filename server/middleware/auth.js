/**
 * JWT Auth Middleware
 * Validates token and attaches user to req
 * Integrates with Redis session management
 */

const jwt  = require('jsonwebtoken');
const User = require('../models/User');
const { getSessionManager } = require('../services/sessionManager');

const protect = async (req, res, next) => {
  let token;
  let sessionId;

  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Extract session ID from custom header
  if (req.headers['x-session-id']) {
    sessionId = req.headers['x-session-id'];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided. Please sign in.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found. Please sign in again.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated. Contact your admin.' });
    }

    // Validate session if session ID is provided
    if (sessionId) {
      const sessionManager = getSessionManager();
      const session = await sessionManager.validateSession(sessionId, token);

      if (!session) {
        return res.status(401).json({
          success: false,
          message: 'Session expired or invalid. Please sign in again.',
          code: 'SESSION_EXPIRED'
        });
      }

      // Attach session ID to request for later use
      req.sessionId = sessionId;
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Session expired. Please sign in again.', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ success: false, message: 'Invalid authentication token.' });
  }
};

// Role-based access control
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Your role (${req.user.role}) does not have permission to perform this action.`
      });
    }
    next();
  };
};

// Ensure storeId matches (prevents cross-store data access)
const samStore = (req, res, next) => {
  if (req.params.storeId && req.params.storeId !== req.user.storeId) {
    return res.status(403).json({ success: false, message: 'Access denied to this store.' });
  }
  next();
};

module.exports = { protect, authorize, samStore };
