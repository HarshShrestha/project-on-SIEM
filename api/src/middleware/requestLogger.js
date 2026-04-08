// src/middleware/requestLogger.js
const logger = require('../config/logger');

/**
 * Logs every incoming HTTP request with method, path, status, and duration
 */
function requestLogger(req, res, next) {
  const start = Date.now();
  const { method, path, ip } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    const level = statusCode >= 400 ? 'warn' : 'info';

    logger[level](`${method} ${path} ${statusCode} ${duration}ms`, {
      ip,
      method,
      path,
      statusCode,
      duration,
    });
  });

  next();
}

module.exports = requestLogger;
