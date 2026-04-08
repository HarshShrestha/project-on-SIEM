// src/routes/alerts.js
const express = require('express');
const wazuh = require('../services/wazuh');

const router = express.Router();

/**
 * GET /api/alerts
 * Fetches paginated, filterable alerts from Wazuh
 */
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, level, agent_id, search, from, to } = req.query;
    const result = await wazuh.getAlerts({
      page: Number(page) || 1,
      limit: Number(limit) || 50,
      level: level ? Number(level) : undefined,
      agent_id,
      search,
      from,
      to,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
