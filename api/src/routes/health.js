// src/routes/health.js
const express = require('express');
const wazuh = require('../services/wazuh');

const router = express.Router();
const startTime = Date.now();

/**
 * GET /health — public health check endpoint (no auth)
 */
router.get('/', async (_req, res) => {
  const wazuhStatus = await wazuh.checkHealth();
  res.json({
    status: 'ok',
    wazuh: wazuhStatus,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
