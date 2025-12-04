'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Icons } from '@/components/icons';
import { ClerkProtectedRoute } from '@/components/auth/clerk-protected-route';
import { ErrorBoundary } from '@/components/error-boundary';
import { Logo } from '@/components/logo';

interface Threat {
  id: string;
  server_id?: string;
  alert_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  message: string;
  details?: string;
  created_at: string;
  resolved_at?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api/v1';

export default function ThreatsPage() {
  const router = useRouter();
  const [threats, setThreats] = useState<Threat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low' | 'unresolved'>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    unresolved: 0,
  });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchThreats = async () => {
    try {
      const response = await fetch(`${API_BASE}/mcp/monitoring/alerts?limit=100`);
      if (!response.ok) {
        throw new Error('Failed to fetch threats');
      }
      const data = await response.json();
      const alerts = Array.isArray(data) ? data : (data.alerts || data.data || []);
      
      setThreats(alerts);
      
      // Calculate statistics
      const stats = {
        total: alerts.length,
        critical: alerts.filter((t: Threat) => t.severity === 'critical' && !t.resolved_at).length,
        high: alerts.filter((t: Threat) => t.severity === 'high' && !t.resolved_at).length,
        medium: alerts.filter((t: Threat) => t.severity === 'medium' && !t.resolved_at).length,
        low: alerts.filter((t: Threat) => t.severity === 'low' && !t.resolved_at).length,
        unresolved: alerts.filter((t: Threat) => !t.resolved_at).length,
      };
      setStats(stats);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching threats:', err);
      setError(err.message || 'Failed to load threats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThreats();
    
    // Set up auto-refresh if enabled
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchThreats, 5000); // Refresh every 5 seconds
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh]);

  const handleResolve = async (threatId: string) => {
    try {
      const response = await fetch(`${API_BASE}/mcp/monitoring/alerts/${threatId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        throw new Error('Failed to resolve threat');
      }
      
      // Refresh threats after resolving
      await fetchThreats();
    } catch (err: any) {
      console.error('Error resolving threat:', err);
      alert(`Failed to resolve threat: ${err.message}`);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-600 text-white border-red-700';
      case 'high':
        return 'bg-orange-600 text-white border-orange-700';
      case 'medium':
        return 'bg-yellow-500 text-white border-yellow-600';
      case 'low':
        return 'bg-blue-500 text-white border-blue-600';
      case 'info':
        return 'bg-gray-500 text-white border-gray-600';
      default:
        return 'bg-gray-400 text-white border-gray-500';
    }
  };

  const getThreatTypeIcon = (type: string) => {
    if (type.includes('injection') || type.includes('prompt')) {
      return <Icons.alertTriangle className="h-5 w-5" />;
    }
    if (type.includes('credential') || type.includes('exposure')) {
      return <Icons.shield className="h-5 w-5" />;
    }
    if (type.includes('behavior') || type.includes('anomaly')) {
      return <Icons.activity className="h-5 w-5" />;
    }
    if (type.includes('performance') || type.includes('health')) {
      return <Icons.server className="h-5 w-5" />;
    }
    return <Icons.alertCircle className="h-5 w-5" />;
  };

  const filteredThreats = threats.filter((threat) => {
    if (filter === 'unresolved') {
      return !threat.resolved_at;
    }
    if (filter === 'all') {
      return true;
    }
    return threat.severity === filter && !threat.resolved_at;
  });

  const sortedThreats = [...filteredThreats].sort((a, b) => {
    // Sort by severity first (critical > high > medium > low > info)
    const severityOrder = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };
    const aOrder = severityOrder[a.severity as keyof typeof severityOrder] || 0;
    const bOrder = severityOrder[b.severity as keyof typeof severityOrder] || 0;
    if (bOrder !== aOrder) {
      return bOrder - aOrder;
    }
    // Then by date (newest first)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <ClerkProtectedRoute>
      <ErrorBoundary>
        <div className="min-h-screen bg-aran-white">
          {/* Header */}
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 bg-aran-white border-b-2 border-aran-black px-4 md:px-6">
            <div className="flex items-center gap-2 md:gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 hover:bg-aran-gray-100 rounded transition-colors"
                title="Back to Dashboard"
              >
                <Icons.arrowLeft className="h-5 w-5" />
              </button>
              <Logo size="md" variant="full" />
            </div>
            <div className="flex flex-1 items-center justify-end gap-4">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`aran-btn-secondary ${autoRefresh ? 'bg-aran-success text-white' : ''}`}
                title={autoRefresh ? 'Auto-refresh enabled' : 'Auto-refresh disabled'}
              >
                <Icons.refresh className={`mr-2 h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                {autoRefresh ? 'Auto-Refresh ON' : 'Auto-Refresh OFF'}
              </button>
              <button
                onClick={fetchThreats}
                className="aran-btn-secondary"
                title="Refresh Now"
              >
                <Icons.refresh className="mr-2 h-4 w-4" />
                Refresh
              </button>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Header */}
              <div>
                <h1 className="text-3xl font-bold tracking-tight font-display">Real-Time Threat Detection</h1>
                <p className="text-aran-gray-600 mt-1">
                  Monitor and respond to security threats across all MCP servers
                </p>
              </div>

              {/* Statistics Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
                <div className="aran-card">
                  <div className="aran-card-content">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-aran-gray-600">Total Threats</p>
                        <p className="text-2xl font-bold">{stats.total}</p>
                      </div>
                      <Icons.alertTriangle className="h-8 w-8 text-aran-gray-400" />
                    </div>
                  </div>
                </div>

                <div className="aran-card border-l-4 border-l-red-600">
                  <div className="aran-card-content">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-aran-gray-600">Critical</p>
                        <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
                      </div>
                      <Icons.alertTriangle className="h-8 w-8 text-red-600" />
                    </div>
                  </div>
                </div>

                <div className="aran-card border-l-4 border-l-orange-600">
                  <div className="aran-card-content">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-aran-gray-600">High</p>
                        <p className="text-2xl font-bold text-orange-600">{stats.high}</p>
                      </div>
                      <Icons.alertCircle className="h-8 w-8 text-orange-600" />
                    </div>
                  </div>
                </div>

                <div className="aran-card border-l-4 border-l-yellow-500">
                  <div className="aran-card-content">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-aran-gray-600">Medium</p>
                        <p className="text-2xl font-bold text-yellow-600">{stats.medium}</p>
                      </div>
                      <Icons.info className="h-8 w-8 text-yellow-600" />
                    </div>
                  </div>
                </div>

                <div className="aran-card border-l-4 border-l-blue-500">
                  <div className="aran-card-content">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-aran-gray-600">Low</p>
                        <p className="text-2xl font-bold text-blue-600">{stats.low}</p>
                      </div>
                      <Icons.info className="h-8 w-8 text-blue-600" />
                    </div>
                  </div>
                </div>

                <div className="aran-card border-l-4 border-l-aran-warning">
                  <div className="aran-card-content">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-aran-gray-600">Unresolved</p>
                        <p className="text-2xl font-bold text-aran-warning">{stats.unresolved}</p>
                      </div>
                      <Icons.bell className="h-8 w-8 text-aran-warning" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-aran-gray-700">Filter:</span>
                {(['all', 'unresolved', 'critical', 'high', 'medium', 'low'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      filter === f
                        ? 'bg-aran-black text-aran-white'
                        : 'bg-aran-gray-100 text-aran-gray-700 hover:bg-aran-gray-200'
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>

              {/* Threats List */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Icons.spinner className="h-8 w-8 animate-spin text-aran-orange" />
                  <p className="ml-3 text-aran-gray-600">Loading threats...</p>
                </div>
              ) : error ? (
                <div className="aran-card">
                  <div className="aran-card-content text-center py-12">
                    <Icons.alertTriangle className="mx-auto h-12 w-12 text-aran-warning" />
                    <h3 className="mt-4 text-lg font-semibold">Error Loading Threats</h3>
                    <p className="mt-2 text-aran-gray-600">{error}</p>
                    <button onClick={fetchThreats} className="mt-4 aran-btn-primary">
                      Retry
                    </button>
                  </div>
                </div>
              ) : sortedThreats.length === 0 ? (
                <div className="aran-card">
                  <div className="aran-card-content text-center py-12">
                    <Icons.checkCircle className="mx-auto h-12 w-12 text-aran-success" />
                    <h3 className="mt-4 text-lg font-semibold">No Threats Found</h3>
                    <p className="mt-2 text-aran-gray-600">
                      {filter === 'all' 
                        ? 'No threats detected. All systems are secure.'
                        : `No ${filter} threats found.`}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedThreats.map((threat) => (
                    <div
                      key={threat.id}
                      className={`aran-card aran-transition ${
                        threat.resolved_at ? 'opacity-60' : ''
                      } ${threat.severity === 'critical' ? 'border-l-4 border-l-red-600' : ''}`}
                    >
                      <div className="aran-card-content">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className={`p-2 rounded ${getSeverityColor(threat.severity)}`}>
                                {getThreatTypeIcon(threat.alert_type)}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-lg">{threat.message}</h3>
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(threat.severity)}`}>
                                    {threat.severity.toUpperCase()}
                                  </span>
                                  {threat.resolved_at && (
                                    <span className="px-2 py-1 rounded text-xs font-medium bg-aran-success text-white">
                                      RESOLVED
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 mt-1 text-sm text-aran-gray-600">
                                  <span className="flex items-center gap-1">
                                    <Icons.clock className="h-4 w-4" />
                                    {new Date(threat.created_at).toLocaleString()}
                                  </span>
                                  {threat.alert_type && (
                                    <span className="flex items-center gap-1">
                                      <Icons.info className="h-4 w-4" />
                                      {threat.alert_type.replace(/_/g, ' ')}
                                    </span>
                                  )}
                                  {threat.server_id && (
                                    <button
                                      onClick={() => router.push(`/servers/${threat.server_id}`)}
                                      className="text-aran-orange hover:underline flex items-center gap-1"
                                    >
                                      <Icons.server className="h-4 w-4" />
                                      View Server
                                    </button>
                                  )}
                                </div>
                                {threat.details && (
                                  <p className="mt-2 text-sm text-aran-gray-600 bg-aran-gray-50 p-2 rounded">
                                    {threat.details}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          {!threat.resolved_at && (
                            <button
                              onClick={() => handleResolve(threat.id)}
                              className="ml-4 aran-btn-secondary text-sm"
                              title="Mark as resolved"
                            >
                              <Icons.check className="mr-1 h-4 w-4" />
                              Resolve
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
      </ErrorBoundary>
    </ClerkProtectedRoute>
  );
}




