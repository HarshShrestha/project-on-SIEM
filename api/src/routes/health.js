// src/routes/health.js
const express = require('express');
const defaultWazuh = require('../services/wazuh');

const startTime = Date.now();

function createHealthRouter(wazuhService = defaultWazuh) {
  const router = express.Router();

  /**
   * GET /health — public health check endpoint (no auth)
   */
  router.get('/', async (_req, res) => {
    const wazuhStatus = await wazuhService.checkHealth();
    res.json({
      status: 'ok',
      wazuh: wazuhStatus,
      uptime: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}

module.exports = createHealthRouter;
