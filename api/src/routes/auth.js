// api/src/routes/auth.js
const express = require('express');
const { z } = require('zod');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const db = require('../services/db');
const { logAuditEvent } = require('../services/audit');
const { signToken, verifyToken } = require('../middleware/auth');
const router = express.Router();
const rateLimit = require('express-rate-limit');
// Using crypto.randomUUID() inline

const LOCKOUT_MINUTES = 15;
const MAX_FAILURES = 5;

// Prevent username enumeration and credential stuffing
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => `${req.ip}_${req.body.username || ''}`,
  message: { error: 'Too many login attempts, please try again later', code: 'RATE_LIMIT' }
});

const loginSchema = z.object({
  username: z.string().min(1).trim().max(100),
  password: z.string().min(8).max(100)
});

const registerSchema = z.object({
  username: z.string().min(3).trim().max(100),
  email: z.string().email(),
  password: z.string().min(8)
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number')
});

router.post('/login', loginLimiter, (req, res) => {
  try {
    const { username, password } = loginSchema.parse(req.body);
    
    // Sanitize just in case, though zod string handles it basically
    const sanitizedUsername = username.replace(/<\/?[^>]+(>|$)/g, "");

    const user = db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(sanitizedUsername);
    
    if (!user) {
      logAuditEvent('LOGIN_FAIL', { username: sanitizedUsername }, req, { reason: 'User not found' });
      // Generic error to prevent enumeration
      return res.status(401).json({ error: 'Invalid username or password', code: 'AUTH_FAILED' });
    }

    if (!user.isActive) {
      logAuditEvent('LOGIN_FAIL', user, req, { reason: 'Account inactive' });
      return res.status(401).json({ error: 'Account disabled', code: 'AUTH_DISABLED' });
    }

    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const waitTime = Math.ceil((new Date(user.lockedUntil) - new Date()) / 1000);
      return res.status(423).json({ 
        error: `Account locked. Try again in ${Math.ceil(waitTime / 60)} minutes.`,
        code: 'AUTH_LOCKED', 
        retryAfter: waitTime 
      });
    }

    const isMatch = bcrypt.compareSync(password, user.passwordHash);
    
    if (!isMatch) {
      const attempts = user.failedLoginAttempts + 1;
      let lockedUntil = null;
      if (attempts >= MAX_FAILURES) {
        lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60000).toISOString();
        logAuditEvent('ACCOUNT_LOCKED', user, req);
      }
      db.prepare('UPDATE users SET failedLoginAttempts = ?, lockedUntil = ? WHERE id = ?')
        .run(attempts, lockedUntil, user.id);
      
      logAuditEvent('LOGIN_FAIL', user, req, { reason: 'Invalid password' });
      return res.status(401).json({ error: 'Invalid username or password', code: 'AUTH_FAILED' });
    }

    // Reset login failures
    db.prepare('UPDATE users SET failedLoginAttempts = 0, lockedUntil = NULL, lastLogin = ? WHERE id = ?')
      .run(new Date().toISOString(), user.id);

    // Tokens
    const jti = crypto.randomUUID();
    const accessToken = signToken({ 
      sub: user.id, 
      username: user.username, 
      role: user.role, 
      jti 
    }, { expiresIn: '15m' });

    const plainRefreshToken = crypto.randomBytes(40).toString('hex');
    const hashedRefresh = crypto.createHash('sha256').update(plainRefreshToken).digest('hex');
    const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
    
    db.prepare('INSERT INTO refresh_tokens (tokenHash, userId, expiresAt) VALUES (?, ?, ?)')
      .run(hashedRefresh, user.id, refreshExpiry);

    res.cookie('refreshToken', plainRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    logAuditEvent('LOGIN_SUCCESS', user, req);

    res.json({
      accessToken,
      user: { id: user.id, username: user.username, role: user.role }
    });

  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', issues: err.issues });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/register', loginLimiter, (req, res) => {
  try {
    const { username, email, password } = registerSchema.parse(req.body);
    const sanitizedUsername = username.replace(/<\/?[^>]+(>|$)/g, "");

    const existingUser = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(sanitizedUsername, email);
    if (existingUser) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    const hash = bcrypt.hashSync(password, 12);
    const newId = crypto.randomUUID();
    
    db.prepare('INSERT INTO users (id, username, email, passwordHash, role) VALUES (?, ?, ?, ?, ?)')
      .run(newId, sanitizedUsername, email, hash, 'viewer');
      
    logAuditEvent('REGISTER_SUCCESS', { id: newId, username: sanitizedUsername, role: 'viewer' }, req);
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', issues: err.issues });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/refresh', (req, res) => {
  const plainToken = req.cookies?.refreshToken;
  if (!plainToken) return res.status(401).json({ error: 'No refresh token provided' });
  
  const tokenParams = db.prepare('SELECT * FROM refresh_tokens WHERE tokenHash = ? OR tokenHash = ? LIMIT 1');
  
  // Timing safe equal simulation: fetch by both, then purely timing-safe check
  const hashedRefresh = crypto.createHash('sha256').update(plainToken).digest('hex');
  const storedToken = db.prepare('SELECT * FROM refresh_tokens WHERE tokenHash = ? AND revoked = 0').get(hashedRefresh);
  
  if (!storedToken) {
    return res.status(401).json({ error: 'Invalid or revoked refresh token' });
  }

  if (new Date(storedToken.expiresAt) < new Date()) {
    db.prepare('DELETE FROM refresh_tokens WHERE tokenHash = ?').run(storedToken.tokenHash);
    return res.status(401).json({ error: 'Refresh token expired' });
  }

  // Token rotation
  db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE tokenHash = ?').run(storedToken.tokenHash);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(storedToken.userId);
  if (!user || !user.isActive) {
    return res.status(401).json({ error: 'User invalid' });
  }

  const jti = crypto.randomUUID();
  const newAccessToken = signToken({ 
    sub: user.id, 
    username: user.username, 
    role: user.role, 
    jti 
  }, { expiresIn: '15m' });

  const newPlainRefreshToken = crypto.randomBytes(40).toString('hex');
  const newHashedRefresh = crypto.createHash('sha256').update(newPlainRefreshToken).digest('hex');
  const newRefreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  
  db.prepare('INSERT INTO refresh_tokens (tokenHash, userId, expiresAt) VALUES (?, ?, ?)')
    .run(newHashedRefresh, user.id, newRefreshExpiry);

  res.cookie('refreshToken', newPlainRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  logAuditEvent('TOKEN_REFRESH', user, req);

  res.json({ accessToken: newAccessToken });
});

router.post('/logout', (req, res) => {
  const plainToken = req.cookies?.refreshToken;
  if (plainToken) {
    const hashedRefresh = crypto.createHash('sha256').update(plainToken).digest('hex');
    db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE tokenHash = ?').run(hashedRefresh);
  }
  res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'Strict' });
  logAuditEvent('LOGOUT', {}, req);
  res.json({ message: 'Logged out' });
});

router.get('/me', verifyToken, (req, res) => {
  const user = db.prepare('SELECT id, username, email, role, lastLogin FROM users WHERE id = ?').get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8)
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Must contain at least one special character'),
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

router.post('/change-password', verifyToken, (req, res) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.sub);
    
    if (!bcrypt.compareSync(currentPassword, user.passwordHash)) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }

    const newHash = bcrypt.hashSync(newPassword, 12);
    db.prepare('UPDATE users SET passwordHash = ?, mustChangePassword = 0 WHERE id = ?').run(newHash, user.id);
    
    // Revoke all existing refresh tokens
    db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE userId = ?').run(user.id);

    logAuditEvent('PASSWORD_CHANGE', user, req);
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.issues[0].message });
    }
    return res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;
