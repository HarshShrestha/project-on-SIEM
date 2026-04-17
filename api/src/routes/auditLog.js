// api/src/routes/auditLog.js
const express = require('express');
const { verifyToken, requireRole } = require('../middleware/auth');
const { getAuditLogs } = require('../services/audit');

const router = express.Router();

router.get('/', verifyToken, requireRole('admin'), (req, res) => {
  const logs = getAuditLogs(200);
  const { event, username } = req.query;
  
  let filteredLogs = logs;
  
  if (event) {
    filteredLogs = filteredLogs.filter(l => l.event === event);
  }
  if (username) {
    filteredLogs = filteredLogs.filter(l => l.username === username || (l.meta && l.meta.targetUsername === username));
  }
  
  res.json(filteredLogs);
});

module.exports = router;
