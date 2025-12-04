'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { RealServerForm } from '@/components/servers/real-server-form';
import { fetchServers, fetchProductionServers, deleteMCPServer, MCPServer, ProductionMCPServer } from '@/lib/api';
import { ClerkProtectedRoute } from '@/components/auth/clerk-protected-route';
import { AuthenticatedLayout } from '@/components/authenticated-layout';
import { ErrorBoundary } from '@/components/error-boundary';
import { Logo } from '@/components/logo';

export default function DashboardPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [productionServers, setProductionServers] = useState<ProductionMCPServer[]>([]);
  const [showAddServer, setShowAddServer] = useState(false);
  const [activeTab, setActiveTab] = useState<'servers' | 'production'>('servers');
  const [alerts, setAlerts] = useState<any[]>([]);
  const [deletingServerId, setDeletingServerId] = useState<string | null>(null);

  useEffect(() => {
    console.log('Dashboard useEffect triggered');
    loadServers();
    loadProductionServers();
    loadAlerts();
  }, []);

  // Force refresh button
  const handleRefresh = () => {
    console.log('Manual refresh triggered');
    setServers([]);
    setProductionServers([]);
    setAlerts([]);
    loadServers();
    loadProductionServers();
    loadAlerts();
  };

  const handleDeleteServer = async (serverId: string, serverName: string) => {
    if (!confirm(`Are you sure you want to delete "${serverName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingServerId(serverId);
      await deleteMCPServer(serverId);
      // Remove from local state
      setServers(servers.filter(s => s.id !== serverId));
      // Refresh to get updated list
      await loadServers();
    } catch (error: any) {
      console.error('Error deleting server:', error);
      alert(`Failed to delete server: ${error.message || 'Unknown error'}`);
    } finally {
      setDeletingServerId(null);
    }
  };

  const loadServers = async () => {
    try {
      console.log('Dashboard: Loading servers...');
      const serversData = await fetchServers();
      console.log('Dashboard: Servers loaded:', serversData);
      setServers(serversData);
      console.log('Dashboard: Servers state set to:', serversData.length, 'servers');
    } catch (error: any) {
      console.error('Dashboard: Error loading servers:', error);
      // Error is handled - servers will remain empty array
      // User will see "No servers configured yet" message
    }
  };

  const loadProductionServers = async () => {
    try {
      console.log('Dashboard: Loading production servers...');
      const productionData = await fetchProductionServers();
      console.log('Dashboard: Production servers loaded:', productionData);
      setProductionServers(productionData);
      console.log('Dashboard: Production servers state set to:', productionData.length, 'servers');
    } catch (error: any) {
      console.error('Dashboard: Error loading production servers:', error);
      // Error is handled - productionServers will remain empty array
      // User will see "No production servers available" message
    }
  };

  const loadAlerts = async () => {
    try {
      console.log('Dashboard: Loading alerts...');
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api/v1';
      const response = await fetch(`${API_BASE}/mcp/monitoring/alerts?limit=10`);
      if (response.ok) {
        const alertsData = await response.json();
        console.log('Dashboard: Alerts loaded:', alertsData);
        // Handle different response formats
        if (Array.isArray(alertsData)) {
          setAlerts(alertsData);
        } else {
          setAlerts(alertsData.alerts || alertsData.data || []);
        }
      } else {
        console.error('Dashboard: Failed to load alerts');
        setAlerts([]); // Set empty array on error
      }
    } catch (error: any) {
      console.error('Dashboard: Error loading alerts:', error);
      setAlerts([]); // Set empty array on error
    }
  };

  const filteredServers = servers.filter(server =>
    server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    server.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProductionServers = productionServers.filter(server =>
    server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    server.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ClerkProtectedRoute>
      <ErrorBoundary>
        <div className="min-h-screen bg-aran-white">
        {/* Simple Header */}
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 bg-aran-white border-b-2 border-aran-black px-4 md:px-6">
          <div className="flex items-center gap-2 md:gap-4">
            <Logo size="md" variant="full" />
          </div>
          <div className="flex flex-1 items-center justify-end gap-4">
            <button
              onClick={() => router.push('/threats')}
              className="aran-btn-secondary relative"
              title="View Real-Time Threats"
            >
              <Icons.alertTriangle className="mr-2 h-4 w-4" />
              Threats
              {alerts.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {alerts.length}
                </span>
              )}
            </button>
            <button
              onClick={handleRefresh}
              className="aran-btn-secondary"
            >
              <Icons.refresh className="mr-2 h-4 w-4" />
              Refresh Data
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight font-display">Dashboard</h1>
              <p className="text-aran-gray-600">
                Monitor and manage your MCP servers
              </p>
            </div>
            <button onClick={handleRefresh} className="aran-btn-secondary">
              <Icons.refresh className="mr-2 h-4 w-4" />
              Refresh Data
            </button>
          </div>

          {/* Search and Add Server */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="flex items-center space-x-3">
          <div className="relative">
                <Icons.search className="absolute left-3 top-3 h-4 w-4 text-aran-gray-500" />
                <input
              type="search"
                  placeholder="Search servers by name or URL..."
                  className="aran-input pl-10 sm:w-[300px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
              <button 
            onClick={() => setShowAddServer(true)}
                className="aran-btn-accent"
          >
            <Icons.plus className="mr-2 h-4 w-4" />
            Add Server
              </button>
        </div>
      </div>

          {/* Tabs */}
          <div className="flex space-x-1 border-2 border-aran-black rounded-lg p-1">
            <button
              onClick={() => setActiveTab('servers')}
              className={`flex-1 rounded px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === 'servers'
                  ? 'bg-aran-black text-aran-white'
                  : 'text-aran-gray-700 hover:text-aran-black hover:bg-aran-gray-100'
              }`}
            >
              Your Servers ({servers.length})
            </button>
            <button
              onClick={() => setActiveTab('production')}
              className={`flex-1 rounded px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === 'production'
                  ? 'bg-aran-black text-aran-white'
                  : 'text-aran-gray-700 hover:text-aran-black hover:bg-aran-gray-100'
              }`}
            >
              Production MCP Servers ({productionServers.length})
            </button>
          </div>

      {/* Overview Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="aran-card">
              <div className="aran-card-content">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-aran-gray-600">
                      {activeTab === 'servers' ? 'Your Servers' : 'Production Servers'}
                    </p>
                    <p className="text-2xl font-bold">
                      {activeTab === 'servers' ? servers.length : productionServers.length}
                    </p>
                  </div>
                  <Icons.server className="h-8 w-8 text-aran-orange" />
                </div>
              </div>
            </div>

            <div className="aran-card">
              <div className="aran-card-content">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-aran-gray-600">Total Servers</p>
                    <p className="text-2xl font-bold">{servers.length + productionServers.length}</p>
                  </div>
                  <Icons.activity className="h-8 w-8 text-aran-success" />
                </div>
              </div>
            </div>

            <div className="aran-card">
              <div className="aran-card-content">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-aran-gray-600">Online</p>
                    <p className="text-2xl font-bold">
                      {activeTab === 'servers' ? servers.length : productionServers.length}
                    </p>
                  </div>
                  <Icons.checkCircle className="h-8 w-8 text-aran-success" />
                </div>
              </div>
      </div>

            <div className="aran-card">
              <div className="aran-card-content">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-aran-gray-600">Alerts</p>
                    <p className="text-2xl font-bold">{alerts.length}</p>
                  </div>
                  <Icons.alertTriangle className="h-8 w-8 text-aran-warning" />
                </div>
              </div>
            </div>
          </div>

          {/* Alerts Section */}
          {alerts.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold font-display">Security Alerts</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {alerts.map((alert) => (
                  <div key={alert.id} className="aran-card aran-transition border-l-4 border-l-aran-warning">
                    <div className="aran-card-content">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{alert.alert_type}</h3>
                        <span className={`aran-badge aran-badge-${alert.severity === 'critical' ? 'destructive' : alert.severity === 'high' ? 'warning' : 'info'}`}>
                          {alert.severity}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-aran-gray-600">{alert.message}</p>
                      <div className="mt-4 text-xs text-aran-gray-500">
                        {new Date(alert.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Server Lists */}
          {activeTab === 'servers' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold font-display">Your Servers</h2>
              {filteredServers.length === 0 ? (
                <div className="aran-card">
                  <div className="aran-card-content text-center py-12">
                    <Icons.server className="mx-auto h-12 w-12 text-aran-gray-400" />
                    <h3 className="mt-4 text-lg font-semibold">No servers configured yet</h3>
                    <p className="mt-2 text-aran-gray-600">
                      Add your first MCP server to start monitoring and managing your infrastructure.
                    </p>
                    <button
                      onClick={() => setShowAddServer(true)}
                      className="mt-4 aran-btn-primary"
                    >
                      Add Your First Server
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredServers.map((server) => (
                    <div 
                      key={server.id} 
                      className="aran-card aran-transition hover:shadow-brutalLg cursor-pointer"
                      onClick={() => router.push(`/servers/${server.id}`)}
                    >
                      <div className="aran-card-content">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-lg">{server.name}</h3>
                          <span className={`aran-badge ${
                            server.status === 'online' ? 'aran-badge-success' :
                            server.status === 'offline' ? 'aran-badge-destructive' :
                            'aran-badge-warning'
                          }`}>
                            {server.status === 'online' ? 'Online' :
                             server.status === 'offline' ? 'Offline' : 'Error'}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-aran-gray-600 line-clamp-2">
                          {server.description || server.url || 'No description available'}
                        </p>
                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-aran-gray-500">
                              {server.type || 'Unknown type'}
                            </span>
                            {server.responseTime && (
                              <span className="text-xs text-aran-gray-400">
                                {server.responseTime}ms
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteServer(server.id, server.name);
                              }}
                              disabled={deletingServerId === server.id}
                              className="p-1 text-aran-gray-400 hover:text-aran-warning transition-colors disabled:opacity-50"
                              title="Delete server"
                            >
                              {deletingServerId === server.id ? (
                                <Icons.spinner className="h-4 w-4 animate-spin" />
                              ) : (
                                <Icons.trash className="h-4 w-4" />
                              )}
                            </button>
                            <Icons.arrowRight className="h-4 w-4 text-aran-gray-400" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'production' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold font-display">Production MCP Servers</h2>
              {filteredProductionServers.length === 0 ? (
                <div className="aran-card">
                  <div className="aran-card-content text-center py-12">
                    <Icons.server className="mx-auto h-12 w-12 text-aran-gray-400" />
                    <h3 className="mt-4 text-lg font-semibold">No production servers available</h3>
                    <p className="mt-2 text-aran-gray-600">
                      Production MCP servers will appear here when available.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredProductionServers.map((server) => (
                    <div key={server.id} className="aran-card aran-transition">
                      <div className="aran-card-content">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">{server.name}</h3>
                          <span className="aran-badge aran-badge-info">Production</span>
                        </div>
                        <p className="mt-2 text-sm text-aran-gray-600">
                          {server.description || 'No description available'}
                        </p>
                        <div className="mt-4 flex items-center justify-between">
                          <span className="text-xs text-aran-gray-500">
                            {server.type || 'Unknown type'}
                          </span>
                          <Icons.arrowRight className="h-4 w-4 text-aran-gray-400" />
                    </div>
                  </div>
                </div>
              ))}
                </div>
              )}
            </div>
      )}

      {/* Add Server Modal */}
      {showAddServer && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="aran-card max-w-2xl w-full mx-4">
                <div className="aran-card-header">
                  <h2 className="text-xl font-semibold">Add New Server</h2>
                </div>
                <div className="aran-card-content">
                  <RealServerForm onClose={() => setShowAddServer(false)} />
                </div>
          </div>
        </div>
      )}
        </div>
          </div>
        </main>
      </div>
      </ErrorBoundary>
    </ClerkProtectedRoute>
  );
}