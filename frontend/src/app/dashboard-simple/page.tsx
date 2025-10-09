'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { Logo } from '@/components/logo';

export default function SimpleDashboardPage() {
  const [servers, setServers] = useState([
    {
      id: '1',
      name: 'Test Server 1',
      url: 'http://localhost:3001',
      status: 'online',
      lastChecked: new Date().toISOString(),
      responseTime: 120,
      uptime: 99.9,
      errorRate: 0.1,
      version: '1.0.0'
    }
  ]);

  const [loading, setLoading] = useState(false);

  const handleRefresh = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-aran-white">
      {/* Header */}
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 bg-aran-white border-b-2 border-aran-black px-4 md:px-6">
        <div className="flex items-center gap-2 md:gap-4">
          <Logo size="md" variant="full" />
        </div>
        <div className="flex flex-1 items-center justify-end gap-4">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="aran-btn-secondary"
          >
            {loading ? (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Icons.refresh className="mr-2 h-4 w-4" />
            )}
            Refresh Data
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight font-display">Simple Dashboard</h1>
              <p className="text-aran-gray-600">
                Monitor and manage your MCP servers
              </p>
            </div>
          </div>

          {/* Overview Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="aran-card">
              <CardHeader className="aran-card-header">
                <CardTitle className="text-sm font-medium">Total Servers</CardTitle>
              </CardHeader>
              <CardContent className="aran-card-content">
                <div className="text-2xl font-bold">{servers.length}</div>
              </CardContent>
            </Card>

            <Card className="aran-card">
              <CardHeader className="aran-card-header">
                <CardTitle className="text-sm font-medium">Online</CardTitle>
              </CardHeader>
              <CardContent className="aran-card-content">
                <div className="text-2xl font-bold text-aran-success">
                  {servers.filter(s => s.status === 'online').length}
                </div>
              </CardContent>
            </Card>

            <Card className="aran-card">
              <CardHeader className="aran-card-header">
                <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              </CardHeader>
              <CardContent className="aran-card-content">
                <div className="text-2xl font-bold">
                  {Math.round(servers.reduce((acc, s) => acc + s.responseTime, 0) / servers.length)} ms
                </div>
              </CardContent>
            </Card>

            <Card className="aran-card">
              <CardHeader className="aran-card-header">
                <CardTitle className="text-sm font-medium">Uptime</CardTitle>
              </CardHeader>
              <CardContent className="aran-card-content">
                <div className="text-2xl font-bold text-aran-success">
                  {Math.round(servers.reduce((acc, s) => acc + s.uptime, 0) / servers.length)}%
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Servers List */}
          <div className="aran-card">
            <div className="aran-card-header">
              <h2 className="text-lg font-semibold">Your Servers</h2>
            </div>
            <div className="aran-card-content">
              <div className="space-y-4">
                {servers.map((server) => (
                  <div key={server.id} className="flex items-center justify-between p-4 border-2 border-aran-gray-200 rounded">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        server.status === 'online' ? 'bg-aran-success' : 'bg-aran-error'
                      }`} />
                      <div>
                        <h3 className="font-semibold">{server.name}</h3>
                        <p className="text-sm text-aran-gray-600">{server.url}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{server.responseTime}ms</div>
                      <div className="text-xs text-aran-gray-500">{server.uptime}% uptime</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
