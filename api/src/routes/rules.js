// src/routes/rules.js
const express = require('express');
const wazuh = require('../services/wazuh');

const router = express.Router();

/**
 * GET /api/rules
 * Returns aggregated rules sorted by trigger frequency
 */
router.get('/', async (req, res, next) => {
  try {
    const rules = await wazuh.getRules();
    res.json({ rules });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
