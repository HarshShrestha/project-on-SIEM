// src/components/SeverityBadge.jsx

export function getSeverityFromLevel(level) {
  if (level >= 12) return 'critical';
  if (level >= 8) return 'high';
  if (level >= 5) return 'medium';
  if (level >= 3) return 'low';
  return 'info';
}

export default function SeverityBadge({ level, severity }) {
  const sev = severity || getSeverityFromLevel(level || 0);
  return (
    <span className={`severity-badge ${sev}`}>
      <span className="severity-dot" />
      {sev}
    </span>
  );
}

export function StatusBadge({ status }) {
  return (
    <span className={`status-badge ${status === 'active' ? 'active' : 'disconnected'}`}>
      <span className="connection-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: status === 'active' ? 'var(--accent)' : 'var(--critical)' }} />
      {status}
    </span>
  );
}
