'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle, Clock, BarChart2, Activity, Shield, Server } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrafficStats, TrafficEvent } from '@/lib/security/monitoring/types';
import { format } from 'date-fns';

type TimeRange = '5m' | '15m' | '1h' | '24h' | '7d';

interface DashboardData {
  stats: TrafficStats;
  recentEvents: TrafficEvent[];
  timeSeries: {
    requests: Array<{ timestamp: string; value: number }>;
    errors: Array<{ timestamp: string; value: number }>;
    responseTimes: Array<{ timestamp: string; value: number }>;
  };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('15m');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/dashboard?timeRange=${timeRange}`);
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      const result = await response.json();
      setData(result.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [timeRange]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchData();
    }, 5000); // Refresh every 5 seconds
    
    return () => clearInterval(interval);
  }, [autoRefresh, timeRange]);

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-2xl font-bold">Failed to load dashboard data</h2>
        <Button onClick={fetchData}>Retry</Button>
      </div>
    );
  }

  const { stats, recentEvents, timeSeries } = data;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold">MCP Traffic Analysis</h1>
          <p className="text-muted-foreground">
            Real-time monitoring and analytics for MCP traffic
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Button
              variant={autoRefresh ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
              Auto-refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={isLoading}
            >
              {isLoading ? 'Refreshing...' : 'Refresh Now'}
            </Button>
          </div>
          <div className="flex items-center space-x-1 bg-muted p-1 rounded-md">
            {(['5m', '15m', '1h', '24h', '7d'] as TimeRange[]).map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setTimeRange(range)}
                className="h-8 px-2 text-xs"
              >
                {range}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Requests"
          value={stats.totalRequests.toLocaleString()}
          icon={<Activity className="h-4 w-4 text-muted-foreground" />}
          description={`${stats.requestRate?.toFixed(1) || 0}/sec`}
          trend="up"
        />
        <StatCard
          title="Error Rate"
          value={`${((stats.totalErrors / Math.max(stats.totalRequests, 1)) * 100).toFixed(1)}%`}
          icon={<AlertCircle className="h-4 w-4 text-muted-foreground" />}
          description={`${stats.errorRate?.toFixed(1) || 0} errors/min`}
          trend={stats.errorRate > 1 ? 'up' : 'down'}
          variant={stats.errorRate > 5 ? 'destructive' : 'default'}
        />
        <StatCard
          title="Avg. Response Time"
          value={`${stats.avgResponseTime?.toFixed(1) || 0}ms`}
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
          description="Last 15 min"
          trend="down"
        />
        <StatCard
          title="Security Alerts"
          value={stats.totalAlerts?.toLocaleString() || '0'}
          icon={<Shield className="h-4 w-4 text-muted-foreground" />}
          description="Active threats"
          variant={stats.totalAlerts > 0 ? 'destructive' : 'default'}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Request Rate Chart */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Request Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <LineChart
                data={timeSeries.requests}
                color="hsl(221.2 83.2% 53.3%)"
                label="Requests"
              />
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <PieChart
                data={Object.entries(stats.statusCodes || {}).map(([status, count]) => ({
                  name: status,
                  value: count,
                }))}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Response Time Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <LineChart
                data={timeSeries.responseTimes}
                color="hsl(142.1 76.2% 36.3%)"
                label="ms"
                yAxisLabel="Response Time (ms)"
              />
            </div>
          </CardContent>
        </Card>

        {/* Error Rate Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Error Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <LineChart
                data={timeSeries.errors}
                color="hsl(0 84.2% 60.2%)"
                label="Errors"
                yAxisLabel="Errors per minute"
              />
            </div>
          </CardContent>
        </Card>

        {/* Top Endpoints */}
        <Card>
          <CardHeader>
            <CardTitle>Top Endpoints</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(stats.endpoints || {})
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([endpoint, count]) => (
                  <div key={endpoint} className="flex items-center justify-between">
                    <div className="text-sm font-medium truncate max-w-[200px]">
                      {endpoint}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {count.toLocaleString()}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Events */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Endpoint
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    IP
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentEvents.map((event) => (
                  <tr key={event.id}>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-muted-foreground">
                      {format(new Date(event.timestamp), 'HH:mm:ss')}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {event.target.method}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-muted-foreground truncate max-w-xs">
                      {event.target.endpoint}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span 
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          event.target.statusCode >= 400 
                            ? 'bg-red-100 text-red-800' 
                            : event.target.statusCode >= 300 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {event.target.statusCode || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-muted-foreground">
                      {event.metrics.duration}ms
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-muted-foreground">
                      {event.source.ip}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  variant?: 'default' | 'destructive' | 'success';
}

function StatCard({ title, value, description, icon, trend = 'neutral', variant = 'default' }: StatCardProps) {
  const variantClasses = {
    default: 'bg-background',
    destructive: 'bg-destructive/10 text-destructive',
    success: 'bg-green-50 text-green-800',
  };

  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-500',
  };

  return (
    <Card className={variantClasses[variant]}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="h-4 w-4 text-muted-foreground">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground flex items-center">
          {trend !== 'neutral' && (
            <span className={`mr-1 ${trendColors[trend]}`}>
              {trend === 'up' ? '↑' : '↓'} 
            </span>
          )}
          {description}
        </p>
      </CardContent>
    </Card>
  );
}

// Simple line chart component (in a real app, you'd use a charting library like Recharts or Chart.js)
function LineChart({
  data,
  color,
  label,
  yAxisLabel,
}: {
  data: Array<{ timestamp: string; value: number }>;
  color: string;
  label: string;
  yAxisLabel?: string;
}) {
  // In a real app, implement a proper chart with a library like Recharts or Chart.js
  return (
    <div className="h-full w-full flex items-center justify-center text-muted-foreground">
      <div className="text-center">
        <BarChart2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>Chart: {label}</p>
        <p className="text-xs">(Interactive chart would appear here)</p>
      </div>
    </div>
  );
}

// Simple pie chart component
function PieChart({
  data,
}: {
  data: Array<{ name: string; value: number }>;
}) {
  // In a real app, implement a proper pie chart with a library like Recharts or Chart.js
  return (
    <div className="h-full w-full flex items-center justify-center text-muted-foreground">
      <div className="text-center">
        <PieChartIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>Pie Chart</p>
        <p className="text-xs">(Interactive pie chart would appear here)</p>
      </div>
    </div>
  );
}

// Simple pie chart icon
function PieChartIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 12a2.5 2.5 0 0 0 0-5v5z" />
      <path d="M12 7v10a5 5 0 0 0 0-10z" />
    </svg>
  );
}
