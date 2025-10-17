'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { mcpApi, MCPServer, MCPTool } from '@/lib/mcp-api';
import { Activity, Server, Tool, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export function RealMCPDashboard() {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [monitoringStatus, setMonitoringStatus] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [serversData, toolsData, statusData, alertsData] = await Promise.all([
        mcpApi.listServers(),
        mcpApi.listTools(),
        mcpApi.getMonitoringStatus(),
        mcpApi.getAlerts(10),
      ]);

      setServers(serversData || []);
      setTools(toolsData || []);
      setMonitoringStatus(statusData || []);
      setAlerts(alertsData || []);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDiscoverServers = async () => {
    try {
      setDiscovering(true);
      const result = await mcpApi.discoverServers({
        known_ports: [3000, 3001, 3002, 8000, 8080],
        timeout_seconds: 10,
        max_concurrent: 20,
      });

      console.log(`Discovered ${result.servers_found} servers`);
      
      // Reload dashboard data
      await loadDashboardData();
    } catch (error) {
      console.error('Discovery failed:', error);
    } finally {
      setDiscovering(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'offline':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">MCP Dashboard</h1>
          <p className="text-gray-600">Monitor and manage your MCP servers</p>
        </div>
        <Button 
          onClick={handleDiscoverServers} 
          disabled={discovering}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {discovering ? 'Discovering...' : 'Discover Servers'}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Servers</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{servers.length}</div>
            <p className="text-xs text-muted-foreground">
              {servers.filter(s => s.status === 'online').length} online
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Tools</CardTitle>
            <Tool className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tools.length}</div>
            <p className="text-xs text-muted-foreground">
              {tools.filter(t => t.risk_level === 'high').length} high-risk
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monitoring</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monitoringStatus.length}</div>
            <p className="text-xs text-muted-foreground">
              Active monitors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alerts.length}</div>
            <p className="text-xs text-muted-foreground">
              Recent alerts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Servers List */}
      <Card>
        <CardHeader>
          <CardTitle>MCP Servers</CardTitle>
        </CardHeader>
        <CardContent>
          {servers.length === 0 ? (
            <div className="text-center py-8">
              <Server className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No MCP servers found</p>
              <p className="text-sm text-gray-400">Click "Discover Servers" to find MCP servers on your network</p>
            </div>
          ) : (
            <div className="space-y-4">
              {servers.map((server) => (
                <div key={server.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(server.status)}
                    <div>
                      <h3 className="font-medium">{server.name}</h3>
                      <p className="text-sm text-gray-500">{server.url}</p>
                      <p className="text-xs text-gray-400">{server.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{server.type}</Badge>
                    <Badge variant={server.status === 'online' ? 'default' : 'destructive'}>
                      {server.status}
                    </Badge>
                    {server.response_time && (
                      <span className="text-xs text-gray-500">
                        {server.response_time}ms
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tools Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Available Tools</CardTitle>
        </CardHeader>
        <CardContent>
          {tools.length === 0 ? (
            <div className="text-center py-8">
              <Tool className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No tools discovered</p>
              <p className="text-sm text-gray-400">Add MCP servers to discover their tools</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tools.slice(0, 6).map((tool) => (
                <div key={tool.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{tool.name}</h4>
                    <Badge className={getRiskLevelColor(tool.risk_level)}>
                      {tool.risk_level}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{tool.description}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{tool.category}</span>
                    <span>{tool.usage_count} uses</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{alert.message}</p>
                    <p className="text-xs text-gray-500">{alert.details}</p>
                  </div>
                  <Badge variant="outline">{alert.level}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}