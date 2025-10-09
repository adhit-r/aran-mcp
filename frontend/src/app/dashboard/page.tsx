'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { RealServerForm } from '@/components/servers/real-server-form';
import { fetchServers, fetchProductionServers, MCPServer, ProductionMCPServer } from '@/lib/api';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { AuthenticatedLayout } from '@/components/authenticated-layout';
import { ErrorBoundary } from '@/components/error-boundary';
import { Logo } from '@/components/logo';

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [productionServers, setProductionServers] = useState<ProductionMCPServer[]>([]);
  const [showAddServer, setShowAddServer] = useState(false);
  const [activeTab, setActiveTab] = useState<'servers' | 'production'>('servers');

  useEffect(() => {
    console.log('Dashboard useEffect triggered');
    loadServers();
    loadProductionServers();
  }, []);

  // Force refresh button
  const handleRefresh = () => {
    console.log('Manual refresh triggered');
    setServers([]);
    setProductionServers([]);
    loadServers();
    loadProductionServers();
  };

  const loadServers = async () => {
    try {
      console.log('Dashboard: Loading servers...');
      const serversData = await fetchServers();
      console.log('Dashboard: Servers loaded:', serversData);
      setServers(serversData);
      console.log('Dashboard: Servers state set to:', serversData.length, 'servers');
    } catch (error) {
      console.error('Dashboard: Error loading servers:', error);
    }
  };

  const loadProductionServers = async () => {
    try {
      console.log('Dashboard: Loading production servers...');
      const productionData = await fetchProductionServers();
      console.log('Dashboard: Production servers loaded:', productionData);
      setProductionServers(productionData);
      console.log('Dashboard: Production servers state set to:', productionData.length, 'servers');
    } catch (error) {
      console.error('Dashboard: Error loading production servers:', error);
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
    <ProtectedRoute>
      <ErrorBoundary>
        <div className="min-h-screen bg-aran-white">
        {/* Simple Header */}
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 bg-aran-white border-b-2 border-aran-black px-4 md:px-6">
          <div className="flex items-center gap-2 md:gap-4">
            <Logo size="md" variant="full" />
          </div>
          <div className="flex flex-1 items-center justify-end gap-4">
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
          {/* Debug Box */}
          <div className="aran-alert aran-alert-warning">
            <strong>Debug Info:</strong> Servers: {servers.length}, Production Servers: {productionServers.length}
          </div>

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
                    <p className="text-2xl font-bold">0</p>
                  </div>
                  <Icons.alertTriangle className="h-8 w-8 text-aran-warning" />
                </div>
              </div>
            </div>
          </div>

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
                    <div key={server.id} className="aran-card aran-transition">
                      <div className="aran-card-content">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">{server.name}</h3>
                          <span className="aran-badge aran-badge-success">Online</span>
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
    </ProtectedRoute>
  );
}