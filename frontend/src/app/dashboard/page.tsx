'use client';

import { useState, useCallback } from 'react';
import { useServers, useAllServerStatuses } from '@/hooks/use-servers';
import { useServerActions } from '@/hooks/use-server-actions';
import { BarChart } from '@/components/charts/bar-chart';
import { LineChartComponent as LineChart } from '@/components/charts/line-chart';
import { Icons } from '@/components/icons';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { ServerStatus, MCPServer } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ServerForm } from '@/components/servers/server-form';
import { ServerTable } from '@/components/servers/server-table';
import { RecentAlerts } from '@/components/alerts/recent-alerts';

function DashboardContent() {
  const { data: servers = [], isLoading: isLoadingServers, refetch: refetchServers } = useServers();
  const { data: statuses = [], isLoading: isLoadingStatuses, refetch: refetchStatuses } = useAllServerStatuses();
  const { removeServer } = useServerActions();
  const [activeTab, setActiveTab] = useState<'overview' | 'servers' | 'alerts'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddServerOpen, setIsAddServerOpen] = useState(false);
  
  // Filter servers based on search query
  const filteredServers = servers.filter((server) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      server.name?.toLowerCase().includes(searchLower) ||
      (server.url ? server.url.toLowerCase().includes(searchLower) : false)
    );
  });

  // Prepare data for charts
  const serverStatusData = [
    { 
      name: 'Status', 
      Online: statuses.filter((s: ServerStatus) => s.status === 'online').length, 
      Offline: statuses.filter((s: ServerStatus) => s.status === 'offline').length, 
      Error: statuses.filter((s: ServerStatus) => s.status === 'error').length 
    },
  ];

  const responseTimeData = statuses.map((status: ServerStatus) => ({
    name: status.serverId.substring(0, 8),
    'Response Time (ms)': status.responseTime || 0,
  }));

  const lineChartData = {
    data: responseTimeData,
    lines: [
      { dataKey: 'Response Time (ms)', stroke: '#3b82f6', name: 'Response Time' },
    ],
  };

  const barChartData = {
    data: serverStatusData,
    bars: [
      { dataKey: 'Online', fill: '#10b981', name: 'Online' },
      { dataKey: 'Offline', fill: '#ef4444', name: 'Offline' },
      { dataKey: 'Error', fill: '#f59e0b', name: 'Error' },
    ]
  };
  
  // Cast the servers to the expected type
  const typedServers = servers as unknown as Array<MCPServer & { host: string; port: number; createdAt?: string; updatedAt?: string }>;

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      refetchServers(),
      refetchStatuses()
    ]);
  }, [refetchServers, refetchStatuses]);
  
  const handleServerAdded = useCallback(() => {
    setIsAddServerOpen(false);
    refetchServers();
  }, [refetchServers]);
  
  const handleServerRemoved = useCallback(async (id: string) => {
    await removeServer(id);
    refetchServers();
  }, [removeServer, refetchServers]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Icons.search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search servers..."
              className="pl-8 sm:w-[300px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" onClick={handleRefresh}>
            <Icons.refreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setIsAddServerOpen(true)}>
            <Icons.plus className="mr-2 h-4 w-4" />
            Add Server
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="servers">Servers</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Servers</CardTitle>
                <Icons.server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{servers.length}</div>
                <p className="text-xs text-muted-foreground">
                  {statuses.filter(s => s.status === 'online').length} online
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Alerts</CardTitle>
                <Icons.alertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12</div>
                <p className="text-xs text-muted-foreground">
                  3 unread alerts
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Response Time</CardTitle>
                <Icons.clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statuses.length > 0 
                    ? (statuses.reduce((acc, curr) => acc + (curr.responseTime || 0), 0) / statuses.length).toFixed(2) 
                    : '0'} ms
                </div>
                <p className="text-xs text-muted-foreground">
                  Last updated: Just now
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Uptime (24h)</CardTitle>
                <Icons.activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">99.95%</div>
                <p className="text-xs text-muted-foreground">
                  +0.1% from yesterday
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Server Status</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <BarChart 
                  data={barChartData.data}
                  bars={barChartData.bars}
                />
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Response Times</CardTitle>
                <CardDescription>Average response time by server</CardDescription>
              </CardHeader>
              <CardContent>
                <LineChart 
                  data={lineChartData.data}
                  lines={lineChartData.lines}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="servers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>MCP Servers</CardTitle>
              <CardDescription>
                Manage your MCP servers and monitor their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ServerTable 
                servers={typedServers.filter(s => 
                  s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (s.host ? s.host.toLowerCase().includes(searchQuery.toLowerCase()) : false)
                )} 
                statuses={statuses}
                onRemove={handleServerRemoved}
                isLoading={isLoadingServers || isLoadingStatuses}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Alerts</CardTitle>
                  <CardDescription>
                    View and manage your server alerts
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={handleRefresh}>
                    <Icons.refreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                  <Button variant="outline" size="sm">
                    <Icons.filter className="mr-2 h-4 w-4" />
                    Filter
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <RecentAlerts />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="fixed bottom-6 right-6">
        <ServerForm onSuccess={handleServerAdded}>
          <Button 
            className="rounded-full w-12 h-12 p-0 flex items-center justify-center"
            onClick={() => setIsAddServerOpen(true)}
          >
            <Icons.plus className="h-6 w-6" />
            <span className="sr-only">Add Server</span>
          </Button>
        </ServerForm>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
