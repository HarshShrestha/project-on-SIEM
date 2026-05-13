// src/pages/Rules.jsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { X } from 'lucide-react';
import { fetchRules } from '../services/api';
import { generateMockRules, generateMockAlerts } from '../services/mockData';
import SeverityBadge from '../components/SeverityBadge';
import { shouldUseHostedDemoMode } from '../services/api';

export default function Rules() {
  const [selectedRule, setSelectedRule] = useState(null);

  const { data: rulesData } = useQuery({
    queryKey: ['rules'],
    queryFn: async () => {
      if (shouldUseHostedDemoMode()) {
        return generateMockRules();
      }

      try {
        const res = await fetchRules();
        // Add sparkline trend data
        return (res.rules || []).map((r) => ({
          ...r,
          trend: r.trend || Array.from({ length: 7 }, () => Math.floor(Math.random() * 30)),
        }));
      } catch {
        return generateMockRules();
      }
    },
    refetchInterval: 60000,
  });

  const rules = rulesData || [];

  // Mock matching alerts for the selected rule
  const matchingAlerts = selectedRule
    ? generateMockAlerts(10, 168).map((a) => ({
        ...a,
        rule: { ...a.rule, id: selectedRule.rule_id, description: selectedRule.description, level: selectedRule.level },
      }))
    : [];

  return (
    <div className="animate-fade-in">
      <div className="data-table-container">
        <div className="data-table-header">
          <h3>Triggered Rules</h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Sorted by frequency — {rules.length} rules
          </span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Rule ID</th>
                <th>Description</th>
                <th>Level</th>
                <th>Count</th>
                <th>MITRE</th>
                <th style={{ width: 120 }}>7-Day Trend</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule, i) => (
                <tr key={rule.rule_id || i} onClick={() => setSelectedRule(rule)}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{rule.rule_id}</td>
                  <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {rule.description}
                  </td>
                  <td><SeverityBadge level={rule.level} /></td>
                  <td>
                    <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{rule.count}</span>
                  </td>
                  <td>
                    {rule.mitre_id && <span className="mitre-tag">{rule.mitre_id}</span>}
                  </td>
                  <td className="sparkline-cell">
                    <ResponsiveContainer width={100} height={30}>
                      <LineChart data={(rule.trend || []).map((v, j) => ({ v, d: j }))}>
                        <Line type="monotone" dataKey="v" stroke="var(--accent)" strokeWidth={1.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </td>
                  <td>
                    <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rule detail modal */}
      {selectedRule && (
        <div className="modal-overlay" onClick={() => setSelectedRule(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.1rem' }}>Rule {selectedRule.rule_id}</h2>
              <button className="drawer-close" onClick={() => setSelectedRule(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 16 }}>
                <SeverityBadge level={selectedRule.level} />
                {selectedRule.mitre_id && <span className="mitre-tag" style={{ marginLeft: 8 }}>MITRE: {selectedRule.mitre_id}</span>}
              </div>

              <div style={{ marginBottom: 16 }}>
                <div className="form-label">Description</div>
                <div>{selectedRule.description}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div>
                  <div className="form-label">Level</div>
                  <div>{selectedRule.level}</div>
                </div>
                <div>
                  <div className="form-label">Trigger Count</div>
                  <div style={{ fontWeight: 700, color: 'var(--accent)' }}>{selectedRule.count}</div>
                </div>
              </div>

              {/* 7-day trend */}
              <div style={{ marginBottom: 20 }}>
                <div className="form-label">7-Day Trend</div>
                <ResponsiveContainer width="100%" height={80}>
                  <LineChart data={(selectedRule.trend || []).map((v, j) => ({ v, d: `Day ${j + 1}` }))}>
                    <Line type="monotone" dataKey="v" stroke="var(--accent)" strokeWidth={2} dot />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Recent matching alerts */}
              <div>
                <div className="form-label">Recent Matching Alerts</div>
                <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                  {matchingAlerts.map((a, i) => (
                    <div key={i} style={{
                      padding: '8px 12px',
                      borderBottom: '1px solid var(--border-muted)',
                      fontSize: '0.8rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {new Date(a.timestamp).toLocaleString()}
                      </span>
                      <span style={{ color: 'var(--accent)' }}>{a.agent?.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
