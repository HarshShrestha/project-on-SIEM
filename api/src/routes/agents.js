// src/routes/agents.js
const express = require('express');
const wazuh = require('../services/wazuh');

const router = express.Router();

/**
 * GET /api/agents
 * Returns cleaned list of all Wazuh agents
 */
router.get('/', async (req, res, next) => {
  try {
    const agents = await wazuh.getAgents();
    res.json({ agents });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/agent/:id/logs
 * Returns last N logs for a specific agent
 */
router.get('/:id/logs', async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 100;
    const logs = await wazuh.getAgentLogs(req.params.id, limit);
    res.json({ logs });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
