// src/pages/Alerts.jsx
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Download, X, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { fetchAlerts } from '../services/api';
import { generateMockAlerts } from '../services/mockData';
import SeverityBadge, { getSeverityFromLevel } from '../components/SeverityBadge';
import useStore from '../store/useStore';
import { shouldUseHostedDemoMode } from '../services/api';

export default function Alerts() {
  const { alertFilters, setAlertFilters } = useStore();
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [sortField, setSortField] = useState('timestamp');
  const [sortDir, setSortDir] = useState('desc');

  // Fetch alerts
  const { data, isLoading } = useQuery({
    queryKey: ['alerts', alertFilters],
    queryFn: async () => {
      if (shouldUseHostedDemoMode()) {
        const all = generateMockAlerts(500, 168);
        let filtered = all;
        if (alertFilters.search) {
          const s = alertFilters.search.toLowerCase();
          filtered = filtered.filter(
            (a) =>
              a.rule?.description?.toLowerCase().includes(s) ||
              a.agent?.name?.toLowerCase().includes(s)
          );
        }
        if (alertFilters.level) {
          filtered = filtered.filter((a) => a.rule?.level >= Number(alertFilters.level));
        }
        if (alertFilters.agent_id) {
          filtered = filtered.filter((a) => a.agent?.id === alertFilters.agent_id);
        }
        const page = alertFilters.page || 1;
        const limit = alertFilters.limit || 50;
        const start = (page - 1) * limit;
        return {
          alerts: filtered.slice(start, start + limit),
          total: filtered.length,
          page,
          pages: Math.ceil(filtered.length / limit),
        };
      }

      try {
        return await fetchAlerts(alertFilters);
      } catch {
        const all = generateMockAlerts(500, 168);
        // Apply client-side filters for demo
        let filtered = all;
        if (alertFilters.search) {
          const s = alertFilters.search.toLowerCase();
          filtered = filtered.filter(
            (a) =>
              a.rule?.description?.toLowerCase().includes(s) ||
              a.agent?.name?.toLowerCase().includes(s)
          );
        }
        if (alertFilters.level) {
          filtered = filtered.filter((a) => a.rule?.level >= Number(alertFilters.level));
        }
        if (alertFilters.agent_id) {
          filtered = filtered.filter((a) => a.agent?.id === alertFilters.agent_id);
        }
        const page = alertFilters.page || 1;
        const limit = alertFilters.limit || 50;
        const start = (page - 1) * limit;
        return {
          alerts: filtered.slice(start, start + limit),
          total: filtered.length,
          page,
          pages: Math.ceil(filtered.length / limit),
        };
      }
    },
    refetchInterval: 30000,
  });

  const alerts = data?.alerts || [];
  const totalPages = data?.pages || 1;

  // Sort
  const sortedAlerts = useMemo(() => {
    return [...alerts].sort((a, b) => {
      let aVal, bVal;
      if (sortField === 'timestamp') {
        aVal = new Date(a.timestamp);
        bVal = new Date(b.timestamp);
      } else if (sortField === 'level') {
        aVal = a.rule?.level || 0;
        bVal = b.rule?.level || 0;
      } else if (sortField === 'agent') {
        aVal = a.agent?.name || '';
        bVal = b.agent?.name || '';
      } else {
        aVal = a.rule?.id || '';
        bVal = b.rule?.id || '';
      }
      if (sortDir === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });
  }, [alerts, sortField, sortDir]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  // CSV export
  const exportCSV = () => {
    const headers = ['Timestamp', 'Agent', 'Agent IP', 'Rule ID', 'Description', 'Level', 'Severity'];
    const rows = sortedAlerts.map((a) => [
      a.timestamp,
      a.agent?.name,
      a.agent?.ip,
      a.rule?.id,
      `"${a.rule?.description || ''}"`,
      a.rule?.level,
      getSeverityFromLevel(a.rule?.level),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `siem-alerts-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-fade-in">
      <div className="data-table-container">
        {/* Filters */}
        <div className="filters-bar">
          <div className="search-input">
            <Search size={14} style={{ position: 'absolute', left: 12, top: 10, color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search alerts..."
              value={alertFilters.search}
              onChange={(e) => setAlertFilters({ search: e.target.value, page: 1 })}
            />
          </div>

          <select
            className="form-select"
            style={{ width: 140 }}
            value={alertFilters.level}
            onChange={(e) => setAlertFilters({ level: e.target.value, page: 1 })}
          >
            <option value="">All Levels</option>
            <option value="12">Critical (12+)</option>
            <option value="8">High (8+)</option>
            <option value="5">Medium (5+)</option>
            <option value="3">Low (3+)</option>
          </select>

          <input
            type="date"
            className="form-input"
            style={{ width: 150 }}
            value={alertFilters.from}
            onChange={(e) => setAlertFilters({ from: e.target.value, page: 1 })}
            placeholder="From"
          />

          <input
            type="date"
            className="form-input"
            style={{ width: 150 }}
            value={alertFilters.to}
            onChange={(e) => setAlertFilters({ to: e.target.value, page: 1 })}
            placeholder="To"
          />

          <button className="btn btn-secondary" onClick={exportCSV}>
            <Download size={14} /> CSV
          </button>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="loading-page"><div className="loading-spinner" /></div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ cursor: 'pointer' }} onClick={() => handleSort('timestamp')}>
                      Time {sortField === 'timestamp' && (sortDir === 'asc' ? '↑' : '↓')}
                    </th>
                    <th style={{ cursor: 'pointer' }} onClick={() => handleSort('agent')}>
                      Agent {sortField === 'agent' && (sortDir === 'asc' ? '↑' : '↓')}
                    </th>
                    <th style={{ cursor: 'pointer' }} onClick={() => handleSort('rule')}>
                      Rule ID {sortField === 'rule' && (sortDir === 'asc' ? '↑' : '↓')}
                    </th>
                    <th>Description</th>
                    <th style={{ cursor: 'pointer' }} onClick={() => handleSort('level')}>
                      Severity {sortField === 'level' && (sortDir === 'asc' ? '↑' : '↓')}
                    </th>
                    <th>MITRE</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAlerts.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 1rem' }}>
                        No alerts found for the selected filters.
                      </td>
                    </tr>
                  ) : (
                    sortedAlerts.map((alert, i) => (
                      <tr key={alert.id || i} onClick={() => setSelectedAlert(alert)}>
                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {format(new Date(alert.timestamp), 'MMM d, HH:mm:ss')}
                        </td>
                        <td><span style={{ color: 'var(--accent)' }}>{alert.agent?.name}</span></td>
                        <td style={{ fontFamily: 'monospace' }}>{alert.rule?.id}</td>
                        <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {alert.rule?.description}
                        </td>
                        <td><SeverityBadge level={alert.rule?.level} severity={alert.severity} /></td>
                        <td>
                          {alert.rule?.mitre?.id?.[0] && <span className="mitre-tag">{alert.rule.mitre.id[0]}</span>}
                        </td>
                        <td>
                          <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="pagination">
              <button
                disabled={alertFilters.page <= 1}
                onClick={() => setAlertFilters({ page: alertFilters.page - 1 })}
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = i + 1;
                return (
                  <button key={p} className={alertFilters.page === p ? 'active' : ''} onClick={() => setAlertFilters({ page: p })}>
                    {p}
                  </button>
                );
              })}
              {totalPages > 5 && <span style={{ color: 'var(--text-muted)' }}>...</span>}
              <button
                disabled={alertFilters.page >= totalPages}
                onClick={() => setAlertFilters({ page: alertFilters.page + 1 })}
              >
                <ChevronRight size={14} />
              </button>
              <span style={{ marginLeft: 12, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Page {alertFilters.page} of {totalPages} — {data?.total || 0} total
              </span>
            </div>
          </>
        )}
      </div>

      {/* Alert Detail Drawer */}
      {selectedAlert && (
        <>
          <div className="drawer-overlay" onClick={() => setSelectedAlert(null)} />
          <div className="drawer">
            <div className="drawer-header">
              <h2>Alert Details</h2>
              <button className="drawer-close" onClick={() => setSelectedAlert(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="drawer-body">
              <div style={{ marginBottom: 16 }}>
                <SeverityBadge level={selectedAlert.rule?.level} severity={selectedAlert.severity} />
                {selectedAlert.rule?.mitre?.id?.[0] && (
                  <span className="mitre-tag" style={{ marginLeft: 8 }}>
                    MITRE: {selectedAlert.rule.mitre.id[0]}
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div>
                  <div className="form-label">Timestamp</div>
                  <div>{format(new Date(selectedAlert.timestamp), 'yyyy-MM-dd HH:mm:ss')}</div>
                </div>
                <div>
                  <div className="form-label">Agent</div>
                  <div style={{ color: 'var(--accent)' }}>{selectedAlert.agent?.name} ({selectedAlert.agent?.ip})</div>
                </div>
                <div>
                  <div className="form-label">Rule ID</div>
                  <div style={{ fontFamily: 'monospace' }}>{selectedAlert.rule?.id}</div>
                </div>
                <div>
                  <div className="form-label">Level</div>
                  <div>{selectedAlert.rule?.level}</div>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div className="form-label">Description</div>
                <div>{selectedAlert.rule?.description}</div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div className="form-label">Raw Log</div>
                <div className="json-viewer">{selectedAlert.full_log || 'N/A'}</div>
              </div>

              <div>
                <div className="form-label">Full Alert JSON</div>
                <div className="json-viewer">{JSON.stringify(selectedAlert, null, 2)}</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
