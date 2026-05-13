// src/pages/Agents.jsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Monitor, Globe, Cpu, Clock, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { fetchAgents, fetchAgentLogs } from '../services/api';
import { generateMockAgents, generateMockAgentLogs, generateMockStats } from '../services/mockData';
import { StatusBadge } from '../components/SeverityBadge';
import { shouldUseHostedDemoMode } from '../services/api';

export default function Agents() {
  const [selectedAgent, setSelectedAgent] = useState(null);

  // Fetch all agents
  const { data: agentsData } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      if (shouldUseHostedDemoMode()) {
        return generateMockAgents();
      }

      try {
        const res = await fetchAgents();
        return res.agents;
      } catch {
        return generateMockAgents();
      }
    },
    refetchInterval: 30000,
  });

  const agents = agentsData || [];

  // Fetch logs for selected agent
  const { data: agentLogs } = useQuery({
    queryKey: ['agent-logs', selectedAgent?.id],
    queryFn: async () => {
      if (!selectedAgent) return [];

      if (shouldUseHostedDemoMode()) {
        return generateMockAgentLogs(selectedAgent.id, 50);
      }

      try {
        const res = await fetchAgentLogs(selectedAgent.id, 50);
        return res.logs;
      } catch {
        return generateMockAgentLogs(selectedAgent.id, 50);
      }
    },
    enabled: !!selectedAgent,
  });

  // Mock per-agent chart data
  const agentChartData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${String(i).padStart(2, '0')}:00`,
    alerts: Math.floor(Math.random() * 20) + 1,
  }));

  if (selectedAgent) {
    return (
      <div className="animate-fade-in">
        {/* Back button */}
        <button
          className="btn btn-ghost"
          onClick={() => setSelectedAgent(null)}
          style={{ marginBottom: 16 }}
        >
          <ArrowLeft size={16} /> Back to Agents
        </button>

        {/* Agent header */}
        <div className="chart-container" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 56, height: 56, borderRadius: 12, background: 'linear-gradient(135deg, var(--accent), #0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Monitor size={28} color="#0d1117" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.3rem', marginBottom: 4 }}>{selectedAgent.name}</h2>
              <div style={{ display: 'flex', gap: 16, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <span><Globe size={14} style={{ display: 'inline', marginRight: 4 }} />{selectedAgent.ip}</span>
                <span><Cpu size={14} style={{ display: 'inline', marginRight: 4 }} />{selectedAgent.os}</span>
                <span><Clock size={14} style={{ display: 'inline', marginRight: 4 }} />Last: {format(new Date(selectedAgent.last_seen), 'MMM d, HH:mm')}</span>
                <StatusBadge status={selectedAgent.status} />
              </div>
            </div>
          </div>
        </div>

        {/* Alert chart for agent */}
        <div className="chart-container">
          <div className="chart-header">
            <h3>Alert Activity (24h)</h3>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={agentChartData}>
              <XAxis dataKey="hour" stroke="var(--text-muted)" fontSize={10} tickLine={false} interval={3} />
              <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: '0.8rem' }}
              />
              <Bar dataKey="alerts" fill="var(--accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Agent logs */}
        <div className="data-table-container" style={{ marginTop: 24 }}>
          <div className="data-table-header">
            <h3>Recent Logs</h3>
          </div>
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Tag</th>
                  <th>Level</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {(agentLogs || []).map((log, i) => (
                  <tr key={i}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {format(new Date(log.timestamp), 'MMM d, HH:mm:ss')}
                    </td>
                    <td><span style={{ fontFamily: 'monospace', color: 'var(--medium)' }}>{log.tag}</span></td>
                    <td>
                      <span style={{
                        color: log.level === 'error' ? 'var(--critical)' : log.level === 'warning' ? 'var(--high)' : 'var(--text-secondary)',
                        fontWeight: 500,
                        fontSize: '0.8rem',
                      }}>
                        {log.level}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{log.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Agent grid view
  return (
    <div className="animate-fade-in">
      <div className="agent-grid">
        {agents.map((agent) => (
          <div key={agent.id} className="agent-card" onClick={() => setSelectedAgent(agent)}>
            <div className="agent-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: agent.status === 'active' ? 'var(--accent-muted)' : 'rgba(248,81,73,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Monitor size={18} color={agent.status === 'active' ? 'var(--accent)' : 'var(--critical)'} />
                </div>
                <div>
                  <div className="agent-card-name">{agent.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ID: {agent.id}</div>
                </div>
              </div>
              <StatusBadge status={agent.status} />
            </div>
            <div className="agent-card-meta">
              <span><Globe size={13} /> {agent.ip}</span>
              <span><Cpu size={13} /> {agent.os}</span>
              <span><Clock size={13} /> {format(new Date(agent.last_seen), 'MMM d, HH:mm')}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
