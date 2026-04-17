// api/src/services/audit.js
const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');

const auditLogPath = path.join(__dirname, '../../logs/audit.log');

const logsDir = path.dirname(auditLogPath);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

function logAuditEvent(event, user = {}, req = {}, meta = {}) {
  const entry = {
    ts: new Date().toISOString(),
    event,
    userId: user.id || null,
    username: user.username || null,
    ip: req.ip || null,
    userAgent: req.get ? req.get('User-Agent') : null,
    meta
  };

  const line = JSON.stringify(entry) + '\n';
  
  fs.appendFile(auditLogPath, line, (err) => {
    if (err) logger.error('Failed to write to audit log', { error: err.message });
  });
}

function getAuditLogs(limit = 200) {
  try {
    if (!fs.existsSync(auditLogPath)) return [];
    const data = fs.readFileSync(auditLogPath, 'utf8');
    const lines = data.trim().split('\n').filter(Boolean);
    return lines.slice(-limit).map(l => JSON.parse(l)).reverse();
  } catch (err) {
    logger.error('Failed to read audit log', { error: err.message });
    return [];
  }
}

module.exports = {
  logAuditEvent,
  getAuditLogs
};
