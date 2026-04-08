// src/routes/stats.js
const express = require('express');
const wazuh = require('../services/wazuh');

const router = express.Router();

/**
 * GET /api/stats?range=1h|6h|24h|7d
 * Returns severity counts and time-bucketed histogram
 */
router.get('/', async (req, res, next) => {
  try {
    const range = req.query.range || '24h';
    const validRanges = ['1h', '6h', '24h', '7d'];
    if (!validRanges.includes(range)) {
      return res.status(400).json({
        error: `Invalid range. Must be one of: ${validRanges.join(', ')}`,
        code: 'INVALID_RANGE',
        status: 400,
      });
    }
    const stats = await wazuh.getStats(range);
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
