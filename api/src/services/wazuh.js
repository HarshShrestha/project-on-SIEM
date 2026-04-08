// src/services/wazuh.js
const axios = require('axios');
const https = require('https');
const logger = require('../config/logger');

// Wazuh API client — bypasses self-signed certs for lab use
const wazuhClient = axios.create({
  baseURL: `${process.env.WAZUH_HOST}:${process.env.WAZUH_PORT}`,
  timeout: 10000,
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  headers: { 'Content-Type': 'application/json' },
});

let cachedToken = null;
let tokenExpiry = 0;

/**
 * Authenticate with Wazuh API and cache the JWT token
 */
async function getWazuhToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) return cachedToken;

  try {
    const response = await wazuhClient.post(
      '/security/user/authenticate',
      {},
      {
        auth: {
          username: process.env.WAZUH_USER,
          password: process.env.WAZUH_PASS,
        },
      }
    );
    cachedToken = response.data.data.token;
    tokenExpiry = now + 850 * 1000; // Wazuh tokens last ~900s, refresh early
    logger.info('Wazuh API token acquired');
    return cachedToken;
  } catch (err) {
    logger.error('Wazuh authentication failed', { error: err.message });
    throw err;
  }
}

/**
 * Make an authenticated request to the Wazuh API with automatic retry on 503
 */
async function wazuhRequest(method, path, params = {}, data = null) {
  const token = await getWazuhToken();
  const config = {
    method,
    url: path,
    headers: { Authorization: `Bearer ${token}` },
    params,
  };
  if (data) config.data = data;

  try {
    const response = await wazuhClient(config);
    return response.data;
  } catch (err) {
    // Retry once on 503
    if (err.response && err.response.status === 503) {
      logger.warn(`Wazuh 503 on ${path}, retrying once...`);
      await new Promise((r) => setTimeout(r, 2000));
      const retryResponse = await wazuhClient(config);
      return retryResponse.data;
    }
    // Token expired — re-authenticate
    if (err.response && err.response.status === 401) {
      logger.warn('Wazuh token expired, re-authenticating...');
      cachedToken = null;
      tokenExpiry = 0;
      const newToken = await getWazuhToken();
      config.headers.Authorization = `Bearer ${newToken}`;
      const retryResponse = await wazuhClient(config);
      return retryResponse.data;
    }
    throw err;
  }
}

/**
 * Check Wazuh API connectivity
 */
async function checkHealth() {
  try {
    await wazuhRequest('GET', '/manager/status');
    return 'connected';
  } catch {
    return 'error';
  }
}

/**
 * Fetch alerts from Wazuh (via /alerts endpoint or Elasticsearch/OpenSearch)
 */
async function getAlerts({ page = 1, limit = 50, level, agent_id, search, from, to } = {}) {
  const offset = (page - 1) * limit;
  const params = { offset, limit: Math.min(limit, 500) };

  if (level) params.level = level;
  if (agent_id) params['agent.id'] = agent_id;
  if (search) params.search = search;

  // Build q filter for date range
  const filters = [];
  if (from) filters.push(`timestamp>${from}`);
  if (to) filters.push(`timestamp<${to}`);
  if (filters.length) params.q = filters.join(';');

  try {
    const data = await wazuhRequest('GET', '/alerts', params);
    const items = data.data?.affected_items || [];
    const total = data.data?.total_affected_items || 0;
    return {
      alerts: items,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
    };
  } catch (err) {
    logger.error('Failed to fetch alerts from Wazuh', { error: err.message });
    throw err;
  }
}

/**
 * Fetch all Wazuh agents with cleaned fields
 */
async function getAgents() {
  try {
    const data = await wazuhRequest('GET', '/agents', { limit: 500, select: 'id,name,ip,os,status,lastKeepAlive,version' });
    const items = data.data?.affected_items || [];
    return items.map((a) => ({
      id: a.id,
      name: a.name,
      ip: a.ip,
      os: a.os?.name ? `${a.os.name} ${a.os.version || ''}`.trim() : 'Unknown',
      status: a.status,
      last_seen: a.lastKeepAlive || a.dateAdd,
      version: a.version || 'N/A',
    }));
  } catch (err) {
    logger.error('Failed to fetch agents', { error: err.message });
    throw err;
  }
}

/**
 * Build alert statistics — severity counts + time-bucketed histogram
 */
async function getStats(range = '24h') {
  const rangeMap = { '1h': 3600, '6h': 21600, '24h': 86400, '7d': 604800 };
  const seconds = rangeMap[range] || 86400;
  const fromDate = new Date(Date.now() - seconds * 1000).toISOString();

  try {
    // Fetch recent alerts
    const data = await wazuhRequest('GET', '/alerts', {
      limit: 10000,
      q: `timestamp>${fromDate}`,
      select: 'rule.level,timestamp',
    });

    const items = data.data?.affected_items || [];

    // Classify severity
    const severity = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    items.forEach((alert) => {
      const lvl = alert.rule?.level || 0;
      if (lvl >= 12) severity.critical++;
      else if (lvl >= 8) severity.high++;
      else if (lvl >= 5) severity.medium++;
      else if (lvl >= 3) severity.low++;
      else severity.info++;
    });

    // Time buckets (8–12 buckets depending on range)
    const bucketCount = range === '1h' ? 12 : range === '6h' ? 12 : range === '24h' ? 24 : 7;
    const bucketSize = (seconds * 1000) / bucketCount;
    const startMs = Date.now() - seconds * 1000;
    const histogram = Array.from({ length: bucketCount }, (_, i) => ({
      time: new Date(startMs + i * bucketSize).toISOString(),
      count: 0,
    }));

    items.forEach((alert) => {
      const ts = new Date(alert.timestamp).getTime();
      const idx = Math.floor((ts - startMs) / bucketSize);
      if (idx >= 0 && idx < bucketCount) histogram[idx].count++;
    });

    return { severity, histogram, total: items.length };
  } catch (err) {
    logger.error('Failed to compute stats', { error: err.message });
    throw err;
  }
}

/**
 * Aggregate top triggered rules from recent alerts
 */
async function getRules() {
  try {
    const data = await wazuhRequest('GET', '/alerts', {
      limit: 5000,
      select: 'rule.id,rule.description,rule.level,rule.mitre',
    });

    const items = data.data?.affected_items || [];
    const ruleMap = {};

    items.forEach((alert) => {
      const rid = alert.rule?.id;
      if (!rid) return;
      if (!ruleMap[rid]) {
        ruleMap[rid] = {
          rule_id: rid,
          description: alert.rule.description || '',
          level: alert.rule.level || 0,
          count: 0,
          mitre_id: alert.rule?.mitre?.id?.[0] || null,
        };
      }
      ruleMap[rid].count++;
    });

    return Object.values(ruleMap).sort((a, b) => b.count - a.count);
  } catch (err) {
    logger.error('Failed to fetch rules', { error: err.message });
    throw err;
  }
}

/**
 * Fetch last N logs for a specific agent
 */
async function getAgentLogs(agentId, limit = 100) {
  try {
    const data = await wazuhRequest('GET', `/agents/${agentId}/logs`, { limit });
    return data.data?.affected_items || [];
  } catch (err) {
    logger.error(`Failed to fetch logs for agent ${agentId}`, { error: err.message });
    throw err;
  }
}

/**
 * Get latest alert ID for WebSocket polling
 */
async function getLatestAlerts(since) {
  const params = { limit: 50, sort: '-timestamp' };
  if (since) params.q = `timestamp>${since}`;

  try {
    const data = await wazuhRequest('GET', '/alerts', params);
    return data.data?.affected_items || [];
  } catch (err) {
    logger.debug('WebSocket poll failed', { error: err.message });
    return [];
  }
}

module.exports = {
  checkHealth,
  getAlerts,
  getAgents,
  getStats,
  getRules,
  getAgentLogs,
  getLatestAlerts,
};
