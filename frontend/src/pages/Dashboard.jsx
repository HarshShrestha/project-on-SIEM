// src/pages/Dashboard.jsx
import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { AlertTriangle, Shield, Server, BookOpen, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { fetchStats, fetchAlerts, fetchAgents } from '../services/api';
import { generateMockStats, generateMockAlerts, generateMockAgents } from '../services/mockData';
import SeverityBadge from '../components/SeverityBadge';
import useStore from '../store/useStore';

const SEVERITY_COLORS = {
  critical: '#f85149',
  high: '#e3b341',
  medium: '#58a6ff',
  low: '#8b949e',
  info: '#6e7681',
};

const RANGES = ['1h', '6h', '24h', '7d'];

// Custom tooltip for area chart
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem' }}>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{format(new Date(label), 'MMM d, HH:mm')}</p>
      <p style={{ color: 'var(--accent)', fontWeight: 600 }}>{payload[0].value} alerts</p>
    </div>
  );
}

export default function Dashboard() {
  const [range, setRange] = useState('24h');
  const { liveAlerts, addLiveAlerts } = useStore();

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['stats', range],
    queryFn: async () => {
      try {
        return await fetchStats(range);
      } catch {
        return generateMockStats(range);
      }
    },
    refetchInterval: 30000,
  });

  // Fetch recent alerts for the feed
  const { data: alertsData } = useQuery({
    queryKey: ['dashboard-alerts'],
    queryFn: async () => {
      try {
        const res = await fetchAlerts({ limit: 20 });
        return res.alerts;
      } catch {
        return generateMockAlerts(20, 24);
      }
    },
    refetchInterval: 30000,
  });

  // Fetch agents count
  const { data: agentsData } = useQuery({
    queryKey: ['dashboard-agents'],
    queryFn: async () => {
      try {
        const res = await fetchAgents();
        return res.agents;
      } catch {
        return generateMockAgents();
      }
    },
    refetchInterval: 60000,
  });

  // Seed live alerts on first load
  useEffect(() => {
    if (alertsData && liveAlerts.length === 0) {
      addLiveAlerts(alertsData);
    }
  }, [alertsData]);

  // Simulate live alerts in demo mode
  useEffect(() => {
    const interval = setInterval(() => {
      const newAlerts = generateMockAlerts(1, 0.05);
      addLiveAlerts(newAlerts);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const severityData = useMemo(() => {
    if (!stats?.severity) return [];
    return Object.entries(stats.severity).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: SEVERITY_COLORS[name],
    }));
  }, [stats]);

  const activeAgents = agentsData?.filter((a) => a.status === 'active').length || 0;

  // Find top triggered rule from live alerts
  const topRule = useMemo(() => {
    const count = {};
    const displayAlerts = liveAlerts.length > 0 ? liveAlerts : (alertsData || []);
    displayAlerts.forEach((a) => {
      const rid = a.rule?.id;
      if (rid) count[rid] = (count[rid] || 0) + 1;
    });
    const sorted = Object.entries(count).sort((a, b) => b[1] - a[1]);
    return sorted[0] ? `Rule ${sorted[0][0]}` : 'N/A';
  }, [liveAlerts, alertsData]);

  const displayFeed = liveAlerts.length > 0 ? liveAlerts : (alertsData || []);

  return (
    <div className="animate-fade-in">
      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card accent">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="kpi-label">Total Alerts (24h)</div>
              <div className="kpi-value animate-count">{stats?.total || 0}</div>
              <div className="kpi-sub"><TrendingUp size={12} style={{ display: 'inline', marginRight: 4 }} />vs. previous period</div>
            </div>
            <AlertTriangle size={32} color="var(--accent)" style={{ opacity: 0.3 }} />
          </div>
        </div>

        <div className="kpi-card critical">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="kpi-label">Critical Alerts</div>
              <div className="kpi-value" style={{ color: 'var(--critical)' }}>{stats?.severity?.critical || 0}</div>
              <div className="kpi-sub">Requires immediate action</div>
            </div>
            <Shield size={32} color="var(--critical)" style={{ opacity: 0.3 }} />
          </div>
        </div>

        <div className="kpi-card success">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="kpi-label">Active Agents</div>
              <div className="kpi-value" style={{ color: 'var(--success)' }}>{activeAgents}</div>
              <div className="kpi-sub">{agentsData?.length || 0} total registered</div>
            </div>
            <Server size={32} color="var(--success)" style={{ opacity: 0.3 }} />
          </div>
        </div>

        <div className="kpi-card warning">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="kpi-label">Top Triggered Rule</div>
              <div className="kpi-value" style={{ fontSize: '1.3rem', color: 'var(--warning)' }}>{topRule}</div>
              <div className="kpi-sub">Most frequent detection</div>
            </div>
            <BookOpen size={32} color="var(--warning)" style={{ opacity: 0.3 }} />
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="charts-row">
        {/* Area Chart — Alert volume */}
        <div className="chart-container">
          <div className="chart-header">
            <h3>Alert Volume Over Time</h3>
            <div className="chart-controls">
              {RANGES.map((r) => (
                <button key={r} className={r === range ? 'active' : ''} onClick={() => setRange(r)}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={stats?.histogram || []}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00d4aa" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#00d4aa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                tickFormatter={(t) => format(new Date(t), range === '7d' ? 'MMM d' : 'HH:mm')}
                stroke="var(--text-muted)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="count" stroke="#00d4aa" strokeWidth={2} fill="url(#areaGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Donut Chart — Severity distribution */}
        <div className="chart-container">
          <div className="chart-header">
            <h3>Severity Distribution</h3>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={severityData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
              >
                {severityData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 8,
                  fontSize: '0.8rem',
                }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Live Alerts Feed */}
      <div className="data-table-container">
        <div className="data-table-header">
          <h3>
            Live Alert Feed
            <span style={{ marginLeft: 8, width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', display: 'inline-block', boxShadow: '0 0 6px var(--success)' }} />
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Auto-refreshes every 30s</span>
        </div>
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Agent</th>
                <th>Rule ID</th>
                <th>Description</th>
                <th>Severity</th>
              </tr>
            </thead>
            <tbody>
              {displayFeed.slice(0, 30).map((alert, i) => (
                <tr key={alert.id || i} className={i === 0 ? 'new-row' : ''}>
                  <td style={{ whiteSpace: 'nowrap', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    {format(new Date(alert.timestamp), 'HH:mm:ss')}
                  </td>
                  <td>
                    <span style={{ color: 'var(--accent)' }}>{alert.agent?.name || 'N/A'}</span>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{alert.rule?.id}</td>
                  <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {alert.rule?.description}
                  </td>
                  <td>
                    <SeverityBadge level={alert.rule?.level} severity={alert.severity} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
