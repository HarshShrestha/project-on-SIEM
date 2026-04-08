// src/routes/auth.js
const express = require('express');
const { signToken } = require('../middleware/auth');
const logger = require('../config/logger');

const router = express.Router();

/**
 * POST /api/auth/login
 * Validates credentials against env vars, returns signed JWT
 */
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      error: 'Username and password are required',
      code: 'AUTH_MISSING_CREDENTIALS',
      status: 400,
    });
  }

  const validUser = process.env.ADMIN_USER || 'admin';
  const validPass = process.env.ADMIN_PASS || 'admin123';

  if (username !== validUser || password !== validPass) {
    logger.warn('Failed login attempt', { username, ip: req.ip });
    return res.status(401).json({
      error: 'Invalid credentials',
      code: 'AUTH_INVALID_CREDENTIALS',
      status: 401,
    });
  }

  const token = signToken({ username, role: 'admin' });
  logger.info('Successful login', { username, ip: req.ip });

  res.json({
    token,
    user: { username, role: 'admin' },
    expiresIn: 3600,
  });
});

module.exports = router;
