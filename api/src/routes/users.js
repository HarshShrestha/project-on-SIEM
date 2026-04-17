// api/src/routes/users.js
const express = require('express');
const { verifyToken, requireRole } = require('../middleware/auth');
const db = require('../services/db');
const { logAuditEvent } = require('../services/audit');
const bcrypt = require('bcrypt');

const router = express.Router();

// All user routes require admin role
router.use(verifyToken, requireRole('admin'));

router.get('/', (req, res) => {
  const users = db.prepare('SELECT id, username, email, role, createdAt, lastLogin, isActive, failedLoginAttempts, lockedUntil, mustChangePassword FROM users').all();
  res.json(users);
});

router.patch('/:id/role', (req, res) => {
  const { role } = req.body;
  if (!['viewer', 'analyst', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  
  if (req.user.sub === req.params.id) {
    return res.status(403).json({ error: 'Cannot change your own role' });
  }

  const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!targetUser) return res.status(404).json({ error: 'User not found' });

  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
  
  // Revoke their sessions so permissions update immediately
  db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE userId = ?').run(req.params.id);

  logAuditEvent('ROLE_CHANGE', req.user, req, { targetUsername: targetUser.username, newRole: role });
  res.json({ message: 'Role updated successfully' });
});

router.patch('/:id/active', (req, res) => {
  const { isActive } = req.body;
  
  if (req.user.sub === req.params.id) {
    return res.status(403).json({ error: 'Cannot deactivate yourself' });
  }

  const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!targetUser) return res.status(404).json({ error: 'User not found' });

  const activeVal = isActive ? 1 : 0;
  db.prepare('UPDATE users SET isActive = ? WHERE id = ?').run(activeVal, req.params.id);

  if (!activeVal) {
    db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE userId = ?').run(req.params.id);
  }

  logAuditEvent('STATUS_CHANGE', req.user, req, { targetUsername: targetUser.username, isActive });
  res.json({ message: `Account ${isActive ? 'activated' : 'deactivated'}` });
});

module.exports = router;
