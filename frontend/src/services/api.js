// src/services/api.js

const API_BASE = '/api';

function getHeaders() {
  const token = localStorage.getItem('siem_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: getHeaders(),
    ...options,
  });

  if (res.status === 401) {
    localStorage.removeItem('siem_token');
    localStorage.removeItem('siem_user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// Auth
export async function login(username, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

// Alerts
export async function fetchAlerts(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '' && v !== null) qs.set(k, v);
  });
  return request(`/alerts?${qs.toString()}`);
}

// Agents
export async function fetchAgents() {
  return request('/agents');
}

// Agent logs
export async function fetchAgentLogs(id, limit = 100) {
  return request(`/agent/${id}/logs?limit=${limit}`);
}

// Stats
export async function fetchStats(range = '24h') {
  return request(`/stats?range=${range}`);
}

// Rules
export async function fetchRules() {
  return request('/rules');
}

export default { login, fetchAlerts, fetchAgents, fetchAgentLogs, fetchStats, fetchRules };
