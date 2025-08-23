'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Server, BarChart3, PieChart } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="space-y-10">
      {/* Overview Section */}
      <section>
        <h2 className="text-xl font-bold mb-4">Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Servers</CardTitle>
              <Server className="h-5 w-5 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <div className="text-xs text-muted-foreground">All registered servers</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Online</CardTitle>
              <Server className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <div className="text-xs text-muted-foreground">Currently online</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Offline</CardTitle>
              <Server className="h-5 w-5 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <BarChart3 className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-sm font-medium">Uptime / Response Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56 flex items-center justify-center text-muted-foreground">
                [Time-series chart placeholder]
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <PieChart className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-sm font-medium">Server Type Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56 flex items-center justify-center text-muted-foreground">
                [Pie/Donut chart placeholder]
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Recent Alerts/Events Section */}
      <section>
        <h2 className="text-xl font-bold mb-4">Recent Alerts & Events</h2>
        <Card>
          <CardContent>
            <div className="h-32 flex items-center justify-center text-muted-foreground">
              [Recent alerts/events table placeholder]
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Server Table Section */}
      <section>
        <h2 className="text-xl font-bold mb-4">Servers</h2>
        <Card>
          <CardContent>
            <div className="h-40 flex items-center justify-center text-muted-foreground">
              [Server table placeholder]
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

import { Skeleton } from '@/components/ui/skeleton';
import { Server } from 'lucide-react';

export default function DashboardPage() {
  const { data: servers, isLoading: isLoadingServers } = useServers();
  const { data: statuses, isLoading: isLoadingStatuses } = useAllServerStatuses();

  const onlineServers = statuses?.filter(s => s.status === 'online').length || 0;
  const offlineServers = statuses?.filter(s => s.status === 'offline').length || 0;

  const serverTypes = servers?.reduce((acc, server) => {
    const type = server.name.split('-')[0] || 'Unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = serverTypes ? Object.entries(serverTypes).map(([name, value]) => ({ name, value })) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-extrabold leading-tight tracking-tighter md:text-4xl">
          MCP Sentinel Dashboard
        </h1>
        <p className="max-w-[700px] text-lg text-muted-foreground">
          Real-time monitoring of your MCP infrastructure.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Servers</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingServers ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{servers?.length || 0}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingStatuses ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold text-green-500">{onlineServers}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Offline</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingStatuses ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold text-red-500">{offlineServers}</div>}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Servers by Type</CardTitle>
          <CardDescription>A breakdown of MCP servers by their type.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingServers ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <BarChart data={chartData} bars={[{ dataKey: 'value', name: 'Servers', fill: 'hsl(var(--primary))' }]} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
