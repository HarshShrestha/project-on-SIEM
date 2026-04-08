// src/services/mockData.js
// Realistic mock data for demo mode (no Wazuh required)

const AGENT_NAMES = ['web-server-01', 'db-server-01', 'app-server-01', 'file-server-01', 'mail-server-01', 'proxy-01', 'dev-workstation', 'monitoring-01'];
const AGENT_IPS = ['10.0.1.10', '10.0.1.20', '10.0.1.30', '10.0.1.40', '10.0.2.10', '10.0.2.20', '10.0.3.5', '10.0.3.10'];
const OS_LIST = ['Ubuntu 22.04.3 LTS', 'CentOS 8.5', 'Debian 12.2', 'Ubuntu 20.04.6 LTS', 'Rocky Linux 9.2', 'RHEL 8.8', 'Windows Server 2022', 'Ubuntu 22.04.3 LTS'];

const RULES = [
  { id: '5710', description: 'sshd: Attempt to login using a denied user.', level: 5, mitre: 'T1110' },
  { id: '5503', description: 'PAM: User login failed.', level: 5, mitre: 'T1110.001' },
  { id: '5712', description: 'sshd: Reverse DNS lookup error (possible attack).', level: 6, mitre: null },
  { id: '5716', description: 'sshd: Authentication failed for user.', level: 5, mitre: 'T1110' },
  { id: '5720', description: 'sshd: Multiple authentication failures.', level: 10, mitre: 'T1110.001' },
  { id: '5763', description: 'sshd: Possible breakin attempt (high number of reverse DNS failures).', level: 10, mitre: 'T1595' },
  { id: '100001', description: 'Custom: 5+ failed SSH logins from same IP in 60s.', level: 12, mitre: 'T1110.001' },
  { id: '100002', description: 'Custom: New user account created.', level: 8, mitre: 'T1136.001' },
  { id: '100003', description: 'Custom: Sudo privilege escalation attempt.', level: 10, mitre: 'T1548.003' },
  { id: '550', description: 'Integrity checksum changed.', level: 7, mitre: 'T1565' },
  { id: '554', description: 'File added to the system.', level: 5, mitre: null },
  { id: '592', description: 'Log file rotated.', level: 3, mitre: null },
  { id: '1002', description: 'Unknown problem somewhere in the system.', level: 2, mitre: null },
  { id: '2502', description: 'syscheck: Integrity checksum changed (2nd time).', level: 7, mitre: 'T1565.001' },
  { id: '31101', description: 'Web server 404 error.', level: 5, mitre: null },
  { id: '31104', description: 'Web server access attempt (possible scan).', level: 6, mitre: 'T1595.002' },
  { id: '31151', description: 'Multiple web server errors from same IP.', level: 10, mitre: 'T1190' },
  { id: '5402', description: 'Successful sudo to ROOT executed.', level: 3, mitre: 'T1548.003' },
  { id: '60103', description: 'Docker: Container started.', level: 3, mitre: null },
  { id: '60104', description: 'Docker: Container stopped.', level: 5, mitre: null },
];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateTimestamp(hoursAgo = 24) {
  const now = Date.now();
  const offset = Math.random() * hoursAgo * 3600 * 1000;
  return new Date(now - offset).toISOString();
}

function getSeverityLabel(level) {
  if (level >= 12) return 'critical';
  if (level >= 8) return 'high';
  if (level >= 5) return 'medium';
  if (level >= 3) return 'low';
  return 'info';
}

// Generate a batch of mock alerts
export function generateMockAlerts(count = 200, hoursAgo = 24) {
  const alerts = [];
  for (let i = 0; i < count; i++) {
    const rule = randomItem(RULES);
    const agentIdx = randomInt(0, AGENT_NAMES.length - 1);
    alerts.push({
      id: `alert-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: generateTimestamp(hoursAgo),
      agent: {
        id: String(agentIdx + 1).padStart(3, '0'),
        name: AGENT_NAMES[agentIdx],
        ip: AGENT_IPS[agentIdx],
      },
      rule: {
        id: rule.id,
        description: rule.description,
        level: rule.level,
        mitre: rule.mitre ? { id: [rule.mitre], tactic: ['Credential Access'] } : undefined,
      },
      severity: getSeverityLabel(rule.level),
      full_log: `${generateTimestamp(hoursAgo)} ${AGENT_NAMES[agentIdx]} sshd[${randomInt(1000, 9999)}]: ${rule.description}`,
      raw: JSON.stringify({ decoder: { name: 'sshd' }, srcip: `192.168.${randomInt(1, 254)}.${randomInt(1, 254)}`, dstuser: randomItem(['root', 'admin', 'ubuntu', 'deploy']) }),
    });
  }
  return alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// Generate mock agents
export function generateMockAgents() {
  return AGENT_NAMES.map((name, i) => ({
    id: String(i + 1).padStart(3, '0'),
    name,
    ip: AGENT_IPS[i],
    os: OS_LIST[i],
    status: Math.random() > 0.15 ? 'active' : 'disconnected',
    last_seen: generateTimestamp(2),
    version: 'Wazuh v4.7.2',
  }));
}

// Generate stats
export function generateMockStats(range = '24h') {
  const rangeHours = { '1h': 1, '6h': 6, '24h': 24, '7d': 168 }[range] || 24;
  const bucketCount = range === '1h' ? 12 : range === '6h' ? 12 : range === '24h' ? 24 : 7;
  const startMs = Date.now() - rangeHours * 3600000;
  const bucketSize = (rangeHours * 3600000) / bucketCount;

  const histogram = Array.from({ length: bucketCount }, (_, i) => ({
    time: new Date(startMs + i * bucketSize).toISOString(),
    count: randomInt(5, 80),
  }));

  return {
    severity: {
      critical: randomInt(2, 15),
      high: randomInt(10, 45),
      medium: randomInt(30, 120),
      low: randomInt(20, 60),
      info: randomInt(10, 40),
    },
    histogram,
    total: randomInt(100, 500),
  };
}

// Generate mock rules
export function generateMockRules() {
  return RULES.map((r) => ({
    rule_id: r.id,
    description: r.description,
    level: r.level,
    count: randomInt(1, 150),
    mitre_id: r.mitre || null,
    trend: Array.from({ length: 7 }, () => randomInt(0, 30)),
  })).sort((a, b) => b.count - a.count);
}

// Generate mock agent logs
export function generateMockAgentLogs(agentId, limit = 50) {
  const agent = AGENT_NAMES[parseInt(agentId) - 1] || 'unknown-agent';
  return Array.from({ length: limit }, (_, i) => ({
    timestamp: generateTimestamp(48),
    tag: randomItem(['sshd', 'systemd', 'kernel', 'syslog', 'ossec']),
    level: randomItem(['info', 'warning', 'error', 'debug']),
    description: randomItem([
      `Session opened for user root`,
      `Failed password for invalid user admin from 192.168.${randomInt(1, 254)}.${randomInt(1, 254)}`,
      `Accepted publickey for deploy from 10.0.1.5`,
      `firewalld: WARNING: COMMAND_FAILED`,
      `systemd: Started Daily apt download activities`,
      `kernel: [UFW BLOCK] IN=eth0 OUT= SRC=203.0.113.${randomInt(1, 254)}`,
      `ossec: Agent started`,
      `syscheck: File '/etc/passwd' modified`,
    ]),
  })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

export default {
  generateMockAlerts,
  generateMockAgents,
  generateMockStats,
  generateMockRules,
  generateMockAgentLogs,
  getSeverityLabel,
};
