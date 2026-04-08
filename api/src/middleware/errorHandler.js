// src/middleware/errorHandler.js
const logger = require('../config/logger');

/**
 * Express error handling middleware — structured JSON error responses
 */
function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'An unexpected error occurred';

  logger.error(`${req.method} ${req.path} → ${status}`, {
    error: message,
    code,
    stack: err.stack,
    ip: req.ip,
  });

  res.status(status).json({
    error: message,
    code,
    status,
  });
}

/**
 * 404 handler
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    error: `Route ${req.method} ${req.path} not found`,
    code: 'NOT_FOUND',
    status: 404,
  });
}

module.exports = { errorHandler, notFoundHandler };
