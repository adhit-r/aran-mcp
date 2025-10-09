'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { fetchServers, fetchProductionServers, MCPServer, ProductionMCPServer } from '@/lib/api';
import { Logo } from '@/components/logo';

export default function DemoPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [productionServers, setProductionServers] = useState<ProductionMCPServer[]>([]);
  const [showAddServer, setShowAddServer] = useState(false);
  const [activeTab, setActiveTab] = useState<'servers' | 'production'>('servers');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('Demo Dashboard useEffect triggered');
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadServers(), loadProductionServers()]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadServers = async () => {
    try {
      console.log('Demo Dashboard: Loading servers...');
      const serversData = await fetchServers();
      console.log('Demo Dashboard: Servers loaded:', serversData);
      setServers(serversData);
    } catch (error) {
      console.error('Demo Dashboard: Error loading servers:', error);
    }
  };

  const loadProductionServers = async () => {
    try {
      console.log('Demo Dashboard: Loading production servers...');
      const productionData = await fetchProductionServers();
      console.log('Demo Dashboard: Production servers loaded:', productionData);
      setProductionServers(productionData);
    } catch (error) {
      console.error('Demo Dashboard: Error loading production servers:', error);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-aran-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-aran-primary mx-auto mb-4"></div>
          <p className="text-aran-gray-600">Loading MCP Sentinel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-aran-white">
      {/* Header */}
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 bg-aran-white border-b-2 border-aran-black px-4 md:px-6">
        <div className="flex items-center gap-2 md:gap-4">
          <Logo size="md" variant="full" />
        </div>
        <div className="flex flex-1 items-center justify-end gap-4">
          <span className="text-sm text-aran-gray-600">Demo Mode</span>
          <button
            onClick={loadData}
            className="aran-btn-secondary"
          >
            <Icons.refresh className="mr-2 h-4 w-4" />
            Refresh
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="space-y-6">
            {/* Status Banner */}
            <div className="aran-alert aran-alert-info">
              <strong>Demo Dashboard:</strong> This is a demonstration of MCP Sentinel's capabilities. 
              Servers: {servers.length}, Production Servers: {productionServers.length}
            </div>

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight font-display">MCP Sentinel Demo</h1>
                <p className="text-aran-gray-600">
                  Advanced MCP server monitoring and management platform
                </p>
              </div>
              <button onClick={loadData} className="aran-btn-secondary">
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

            {/* Features Showcase */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="aran-card">
                <div className="aran-card-content">
                  <div className="flex items-center gap-3 mb-4">
                    <Icons.shield className="h-6 w-6 text-aran-primary" />
                    <h3 className="font-semibold">Security Framework</h3>
                  </div>
                  <p className="text-sm text-aran-gray-600 mb-4">
                    OWASP MCP Top 10 security testing with advanced threat detection.
                  </p>
                  <div className="flex gap-2">
                    <span className="aran-badge-outline text-xs">OWASP</span>
                    <span className="aran-badge-outline text-xs">AI Detection</span>
                    <span className="aran-badge-outline text-xs">Credential Scan</span>
                  </div>
                </div>
              </div>

              <div className="aran-card">
                <div className="aran-card-content">
                  <div className="flex items-center gap-3 mb-4">
                    <Icons.activity className="h-6 w-6 text-aran-success" />
                    <h3 className="font-semibold">Health Monitoring</h3>
                  </div>
                  <p className="text-sm text-aran-gray-600 mb-4">
                    Real-time health checks with comprehensive metrics and alerting.
                  </p>
                  <div className="flex gap-2">
                    <span className="aran-badge-outline text-xs">Real-time</span>
                    <span className="aran-badge-outline text-xs">Metrics</span>
                    <span className="aran-badge-outline text-xs">Alerts</span>
                  </div>
                </div>
              </div>

              <div className="aran-card">
                <div className="aran-card-content">
                  <div className="flex items-center gap-3 mb-4">
                    <Icons.search className="h-6 w-6 text-aran-info" />
                    <h3 className="font-semibold">Auto Discovery</h3>
                  </div>
                  <p className="text-sm text-aran-gray-600 mb-4">
                    Automatic MCP server discovery with network scanning capabilities.
                  </p>
                  <div className="flex gap-2">
                    <span className="aran-badge-outline text-xs">Auto-scan</span>
                    <span className="aran-badge-outline text-xs">Network</span>
                    <span className="aran-badge-outline text-xs">Registry</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

