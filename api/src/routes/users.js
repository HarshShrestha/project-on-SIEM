// api/src/routes/users.js
const express = require('express');
const { verifyToken, requireRole } = require('../middleware/auth');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { logAuditEvent } = require('../services/audit');
const bcrypt = require('bcrypt');

const router = express.Router();

// All user routes require admin role
router.use(verifyToken, requireRole('admin'));

router.get('/', async (req, res) => {
  try {
    const users = await User.find({}, 'id username email role createdAt lastLogin isActive failedLoginAttempts lockedUntil mustChangePassword');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!['viewer', 'analyst', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    if (req.user.sub === req.params.id) {
      return res.status(403).json({ error: 'Cannot change your own role' });
    }

    const targetUser = await User.findOne({ id: req.params.id });
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    targetUser.role = role;
    await targetUser.save();
    
    // Revoke their sessions so permissions update immediately
    await RefreshToken.updateMany({ userId: req.params.id }, { revoked: true });

    logAuditEvent('ROLE_CHANGE', req.user, req, { targetUsername: targetUser.username, newRole: role });
    res.json({ message: 'Role updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id/active', async (req, res) => {
  try {
    const { isActive } = req.body;
    
    if (req.user.sub === req.params.id) {
      return res.status(403).json({ error: 'Cannot deactivate yourself' });
    }

    const targetUser = await User.findOne({ id: req.params.id });
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    targetUser.isActive = isActive;
    await targetUser.save();

    if (!isActive) {
      await RefreshToken.updateMany({ userId: req.params.id }, { revoked: true });
    }

    logAuditEvent('STATUS_CHANGE', req.user, req, { targetUsername: targetUser.username, isActive });
    res.json({ message: `Account ${isActive ? 'activated' : 'deactivated'}` });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
