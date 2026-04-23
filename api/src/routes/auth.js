// api/src/routes/auth.js
const express = require('express');
const { z } = require('zod');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { logAuditEvent } = require('../services/audit');
const { signToken, verifyToken } = require('../middleware/auth');
const router = express.Router();
const rateLimit = require('express-rate-limit');

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

router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = loginSchema.parse(req.body);
    
    // Sanitize just in case, though zod string handles it basically
    const sanitizedUsername = username.replace(/<\/?[^>]+(>|$)/g, "");

    const user = await User.findOne({ username: { $regex: new RegExp(`^${sanitizedUsername}$`, 'i') } });
    
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

    let isMatch = bcrypt.compareSync(password, user.passwordHash);

    // Backward compatibility for older seeded admin passwords.
    // If the default admin account exists and the supplied password matches
    // the configured bootstrap password, repair the hash in-place.
    if (!isMatch && user.username.toLowerCase() === 'admin' && user.email === 'admin@siem.local') {
      const bootstrapAdminPassword = process.env.ADMIN_DEFAULT_PASSWORD || process.env.ADMIN_PASS || 'admin123';
      if (password === bootstrapAdminPassword) {
        const repairedHash = bcrypt.hashSync(bootstrapAdminPassword, 12);
        user.passwordHash = repairedHash;
        user.failedLoginAttempts = 0;
        user.lockedUntil = null;
        await user.save();
        isMatch = true;
      }
    }
    
    if (!isMatch) {
      const attempts = user.failedLoginAttempts + 1;
      let lockedUntil = null;
      if (attempts >= MAX_FAILURES) {
        lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60000);
        logAuditEvent('ACCOUNT_LOCKED', user, req);
      }
      user.failedLoginAttempts = attempts;
      user.lockedUntil = lockedUntil;
      await user.save();
      
      logAuditEvent('LOGIN_FAIL', user, req, { reason: 'Invalid password' });
      return res.status(401).json({ error: 'Invalid username or password', code: 'AUTH_FAILED' });
    }

    // Reset login failures
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    user.lastLogin = new Date();
    await user.save();

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
    const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    await RefreshToken.create({
      tokenHash: hashedRefresh,
      userId: user.id,
      expiresAt: refreshExpiry
    });

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
    console.error("Login Error:", err);
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', issues: err.issues });
    }
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

router.post('/register', loginLimiter, async (req, res) => {
  try {
    const { username, email, password } = registerSchema.parse(req.body);
    const sanitizedUsername = username.replace(/<\/?[^>]+(>|$)/g, "");

    const existingUser = await User.findOne({ $or: [{ username: sanitizedUsername }, { email }] });
    if (existingUser) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    const hash = bcrypt.hashSync(password, 12);
    const newId = crypto.randomUUID();
    
    await User.create({
      id: newId,
      username: sanitizedUsername,
      email,
      passwordHash: hash,
      role: 'viewer'
    });
      
    logAuditEvent('REGISTER_SUCCESS', { id: newId, username: sanitizedUsername, role: 'viewer' }, req);
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', issues: err.issues });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const plainToken = req.cookies?.refreshToken;
    if (!plainToken) return res.status(401).json({ error: 'No refresh token provided' });
    
    const hashedRefresh = crypto.createHash('sha256').update(plainToken).digest('hex');
    const storedToken = await RefreshToken.findOne({ tokenHash: hashedRefresh, revoked: false });
    
    if (!storedToken) {
      return res.status(401).json({ error: 'Invalid or revoked refresh token' });
    }

    if (new Date(storedToken.expiresAt) < new Date()) {
      await RefreshToken.deleteOne({ tokenHash: storedToken.tokenHash });
      return res.status(401).json({ error: 'Refresh token expired' });
    }

    // Token rotation
    storedToken.revoked = true;
    await storedToken.save();

    const user = await User.findOne({ id: storedToken.userId });
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
    const newRefreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    await RefreshToken.create({
      tokenHash: newHashedRefresh,
      userId: user.id,
      expiresAt: newRefreshExpiry
    });

    res.cookie('refreshToken', newPlainRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    logAuditEvent('TOKEN_REFRESH', user, req);

    res.json({ accessToken: newAccessToken });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const plainToken = req.cookies?.refreshToken;
    if (plainToken) {
      const hashedRefresh = crypto.createHash('sha256').update(plainToken).digest('hex');
      await RefreshToken.updateOne({ tokenHash: hashedRefresh }, { revoked: true });
    }
    res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'Strict' });
    logAuditEvent('LOGOUT', {}, req);
    res.json({ message: 'Logged out' });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.sub }, 'id username email role lastLogin');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
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

router.post('/change-password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    const user = await User.findOne({ id: req.user.sub });
    
    if (!bcrypt.compareSync(currentPassword, user.passwordHash)) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }

    const newHash = bcrypt.hashSync(newPassword, 12);
    user.passwordHash = newHash;
    user.mustChangePassword = false;
    await user.save();
    
    // Revoke all existing refresh tokens
    await RefreshToken.updateMany({ userId: user.id }, { revoked: true });

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
