'use client';

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Server, BarChart3, PieChart, RefreshCw, Search, Plus, Trash2, AlertTriangle, Bell } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ServerForm } from '@/components/servers/server-form';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from '@/components/ui/use-toast';
import { BarChart } from '@/components/charts/bar-chart';
import { LineChartComponent as LineChart } from '@/components/charts/line-chart';
import { useServers, useAllServerStatuses } from '@/hooks/use-servers';
import { useServerActions } from '@/hooks/use-server-actions';
import { RecentAlerts } from '@/components/alerts/recent-alerts';

type ServerWithStatus = {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'error';
  responseTime: number;
  lastChecked: string;
  version?: string;
};

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof ServerWithStatus; direction: 'asc' | 'desc' }>({
    key: 'name',
    direction: 'asc',
  });

  const { 
    data: servers = [], 
    isLoading: isLoadingServers, 
    refetch: refetchServers 
  } = useServers();
  
  const { 
    data: statuses = [], 
    isLoading: isLoadingStatuses, 
    refetch: refetchStatuses 
  } = useAllServerStatuses();

  const { removeServer } = useServerActions();
  const [activeTab, setActiveTab] = useState<'servers' | 'alerts'>('servers');

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      refetchServers(),
      refetchStatuses()
    ]);
  }, [refetchServers, refetchStatuses]);

  const handleServerAdded = useCallback(() => {
    handleRefresh();
    toast({
      title: 'Success',
      description: 'Server added successfully',
    });
  }, [handleRefresh]);

  const handleRemoveServer = useCallback(async (serverId: string) => {
    try {
      await removeServer(serverId);
      handleRefresh();
      toast({
        title: 'Success',
        description: 'Server removed successfully',
      });
    } catch (error) {
      console.error('Failed to remove server:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove server. Please try again.',
        variant: 'destructive',
      });
    }
  }, [handleRefresh, removeServer]);

  // Combine and sort server data with their statuses
  const serversWithStatus = useMemo(() => {
    let result = servers.map(server => {
      const status = statuses.find(s => s.serverId === server.id);
      return {
        id: server.id,
        name: server.name,
        status: status?.status || 'error',
        responseTime: status?.responseTime || 0,
        lastChecked: status?.lastChecked || new Date().toISOString(),
        version: status?.version
      };
    });

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(server => 
        server.name.toLowerCase().includes(query) || 
        server.status.includes(query) ||
        server.version?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return result;
  }, [servers, statuses, searchQuery, sortConfig]);

  const requestSort = (key: keyof ServerWithStatus) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const getSortIndicator = (key: string) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const totalServers = serversWithStatus.length;
  const onlineServers = serversWithStatus.filter(s => s.status === 'online').length;
  const offlineServers = serversWithStatus.filter(s => s.status === 'offline').length;

  return (
    <div className="space-y-6">
      {/* Header with title and refresh button */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">MCP Sentinel</h1>
          <p className="text-muted-foreground">Monitor and manage your MCP infrastructure</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={isLoadingServers || isLoadingStatuses}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${(isLoadingServers || isLoadingStatuses) ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Overview Section */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Servers</CardTitle>
              <Server className="h-5 w-5 text-amber-500" />
            </CardHeader>
            <CardContent>
              {isLoadingServers ? (
                <Skeleton className="h-8 w-1/4" />
              ) : (
                <div className="text-2xl font-bold">{totalServers}</div>
              )}
              <div className="text-xs text-muted-foreground">All registered servers</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Online</CardTitle>
              <Server className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              {isLoadingStatuses ? (
                <Skeleton className="h-8 w-1/4" />
              ) : (
                <div className="text-2xl font-bold text-green-500">{onlineServers}</div>
              )}
              <div className="text-xs text-muted-foreground">Currently online</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Offline</CardTitle>
              <Server className="h-5 w-5 text-red-500" />
            </CardHeader>
            <CardContent>
              {isLoadingStatuses ? (
                <Skeleton className="h-8 w-1/4" />
              ) : (
                <div className="text-2xl font-bold text-red-500">{offlineServers}</div>
              )}
              <div className="text-xs text-muted-foreground">Currently offline</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
              <AlertCircle className="h-5 w-5 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <div className="text-xs text-muted-foreground">Unresolved incidents</div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Visualizations Section */}
      <section>
        <h2 className="text-xl font-bold mb-4">Visualizations</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center">
                <BarChart3 className="h-4 w-4 mr-2" /> Server Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingStatuses ? (
                <div className="h-[300px] flex items-center justify-center">
                  <Skeleton className="h-full w-full" />
                </div>
              ) : (
                <div className="h-[300px]">
                  <BarChart
                    data={[
                      { name: 'Online', count: onlineServers, fill: '#10B981' },
                      { name: 'Offline', count: offlineServers, fill: '#EF4444' },
                    ]}
                    bars={[
                      { dataKey: 'count', fill: '#10B981', name: 'Servers' },
                    ]}
                    xAxisLabel="Status"
                    yAxisLabel="Servers"
                  />
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center">
                <PieChart className="h-4 w-4 mr-2" /> Response Time Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingStatuses ? (
                <div className="h-[300px] flex items-center justify-center">
                  <Skeleton className="h-full w-full" />
                </div>
              ) : (
                <div className="h-[300px]">
                  <LineChart
                    data={serversWithStatus.map(server => ({
                      name: server.name,
                      'Response Time (ms)': server.responseTime,
                    }))}
                    lines={[
                      { dataKey: 'Response Time (ms)', stroke: '#F59E0B', name: 'Response Time' },
                    ]}
                    xAxisLabel="Server"
                    yAxisLabel="ms"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Servers Table Section */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">Servers & Alerts</h2>
            <div className="flex items-center rounded-md bg-muted p-1 text-muted-foreground">
              <button
                type="button"
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                  activeTab === 'servers' ? 'bg-background text-foreground shadow-sm' : ''
                }`}
                onClick={() => setActiveTab('servers')}
              >
                <Server className="mr-2 h-4 w-4" />
                Servers
                <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                  {serversWithStatus.length}
                </span>
              </button>
              <button
                type="button"
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                  activeTab === 'alerts' ? 'bg-background text-foreground shadow-sm' : ''
                }`}
                onClick={() => setActiveTab('alerts')}
              >
                <Bell className="mr-2 h-4 w-4" />
                Alerts
                <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800 dark:bg-red-900/30 dark:text-red-400">
                  {serversWithStatus.filter(s => s.status !== 'online').length}
                </span>
              </button>
            </div>
          </div>
          
          {activeTab === 'servers' && (
            <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search servers..."
                  className="pl-8 w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <ServerForm onSuccess={handleServerAdded}>
                <Button className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Server
                </Button>
              </ServerForm>
            </div>
          )}
        </div>
        <Card>
          <CardContent className="p-0">
            {activeTab === 'alerts' ? (
              <div className="p-6">
                <RecentAlerts />
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-medium">Server List</CardTitle>
                <div className="text-xs text-muted-foreground">
                  Showing {serversWithStatus.length} of {servers.length} servers
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 items-center p-4 border-b bg-muted/50">
                <div 
                  className="col-span-4 font-medium flex items-center cursor-pointer hover:text-primary"
                  onClick={() => requestSort('name')}
                >
                  Name {getSortIndicator('name')}
                </div>
                <div 
                  className="col-span-2 font-medium flex items-center cursor-pointer hover:text-primary"
                  onClick={() => requestSort('status')}
                >
                  Status {getSortIndicator('status')}
                </div>
                <div 
                  className="col-span-2 font-medium text-right flex items-center justify-end cursor-pointer hover:text-primary"
                  onClick={() => requestSort('responseTime')}
                >
                  Response Time {getSortIndicator('responseTime')}
                </div>
                <div 
                  className="col-span-2 font-medium flex items-center cursor-pointer hover:text-primary"
                  onClick={() => requestSort('version')}
                >
                  Version {getSortIndicator('version')}
                </div>
                <div 
                  className="col-span-2 font-medium text-right flex items-center justify-end cursor-pointer hover:text-primary"
                  onClick={() => requestSort('lastChecked')}
                >
                  Last Checked {getSortIndicator('lastChecked')}
                </div>
              </div>

              {isLoadingServers ? (
                // Loading skeleton
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="grid grid-cols-12 gap-4 items-center p-4 border-b">
                    <div className="col-span-4"><Skeleton className="h-4 w-3/4" /></div>
                    <div className="col-span-2"><Skeleton className="h-4 w-16" /></div>
                    <div className="col-span-2 text-right"><Skeleton className="h-4 w-16 ml-auto" /></div>
                    <div className="col-span-2"><Skeleton className="h-4 w-12" /></div>
                    <div className="col-span-2 text-right"><Skeleton className="h-4 w-24 ml-auto" /></div>
                  </div>
                ))
              ) : serversWithStatus.length > 0 ? (
                // Server list
                serversWithStatus.map((server) => (
                  <div key={server.id} className="grid grid-cols-12 gap-4 items-center p-4 border-b hover:bg-muted/50 transition-colors">
                    <div className="col-span-4 font-medium truncate flex items-center gap-2">
                      <span title={server.name}>{server.name}</span>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="sr-only">Remove server</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove the server "{server.name}" and all its monitoring data.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveServer(server.id);
                              }}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Remove Server
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <div className="col-span-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        server.status === 'online' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                          : server.status === 'offline' 
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' 
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}>
                        {server.status === 'online' ? (
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500 mr-1.5"></span>
                        ) : server.status === 'offline' ? (
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500 mr-1.5"></span>
                        ) : (
                          <AlertTriangle className="h-3 w-3 mr-1" />
                        )}
                        {server.status.charAt(0).toUpperCase() + server.status.slice(1)}
                      </span>
                    </div>
                    <div className="col-span-2 text-right font-mono">
                      {server.responseTime > 0 ? `${server.responseTime} ms` : '--'}
                    </div>
                    <div className="col-span-2 text-sm text-muted-foreground truncate" title={server.version}>
                      {server.version || '--'}
                    </div>
                    <div className="col-span-2 text-right text-sm text-muted-foreground">
                      {new Date(server.lastChecked).toLocaleString()}
                    </div>
                  </div>
                ))
              ) : (
                // No servers found
                <div className="p-8 text-center text-muted-foreground">
                  No servers found. Add your first server to get started.
                </div>
              )}
            </div>
          )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
