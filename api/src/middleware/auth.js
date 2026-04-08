// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me';

/**
 * Generate a signed JWT token
 */
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

/**
 * Verify JWT token from Authorization header
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'AUTH_REQUIRED',
      status: 401,
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    logger.warn('Invalid JWT token attempt', { ip: req.ip });
    return res.status(401).json({
      error: 'Invalid or expired token',
      code: 'AUTH_INVALID_TOKEN',
      status: 401,
    });
  }
}

module.exports = { signToken, verifyToken };
