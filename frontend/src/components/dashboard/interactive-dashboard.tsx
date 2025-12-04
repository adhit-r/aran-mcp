'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  Server, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  Filter,
  Search,
  Settings,
  BarChart3,
  LineChart,
  PieChart,
  Zap
} from 'lucide-react';

// Real-time chart components
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Cell } from 'recharts';

interface DashboardMetrics {
  totalServers: number;
  onlineServers: number;
  offlineServers: number;
  criticalAlerts: number;
  averageResponseTime: number;
  uptimePercentage: number;
  healthScore: number;
}

interface ChartData {
  timestamp: string;
  responseTime: number;
  uptime: number;
  healthScore: number;
  alerts: number;
}

interface ServerStatus {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'warning';
  responseTime: number;
  uptime: number;
  lastChecked: string;
  healthScore: number;
}

const InteractiveDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalServers: 0,
    onlineServers: 0,
    offlineServers: 0,
    criticalAlerts: 0,
    averageResponseTime: 0,
    uptimePercentage: 0,
    healthScore: 0
  });

  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [servers, setServers] = useState<ServerStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');

  // Load real data from backend
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch dashboard data from API
        const response = await fetch('/api/dashboard');
        if (!response.ok) {
          throw new Error(`Failed to fetch dashboard data: ${response.statusText}`);
        }

        const dashboardData = await response.json();

        // Update metrics from real data
        setMetrics({
          totalServers: dashboardData.stats?.totalServers || 0,
          onlineServers: dashboardData.stats?.onlineServers || 0,
          offlineServers: dashboardData.stats?.offlineServers || 0,
          criticalAlerts: dashboardData.stats?.criticalAlerts || 0,
          averageResponseTime: dashboardData.stats?.averageResponseTime || 0,
          uptimePercentage: parseFloat(dashboardData.stats?.uptime?.replace('%', '') || '0'),
          healthScore: dashboardData.stats?.healthScore || 0
        });

        // Transform server data
        const serverList: ServerStatus[] = (dashboardData.servers || []).map((server: any) => ({
          id: server.id,
          name: server.name,
          status: server.status === 'online' ? 'online' : server.status === 'offline' ? 'offline' : 'warning',
          responseTime: server.responseTime || 0,
          uptime: server.uptime || 0,
          lastChecked: formatLastChecked(server.lastChecked || server.last_checked),
          healthScore: calculateHealthScore(server)
        }));

        setServers(serverList);

        // Generate chart data from monitoring data
        if (dashboardData.monitoring && dashboardData.monitoring.length > 0) {
          const chartDataPoints: ChartData[] = dashboardData.monitoring
            .slice(-24) // Last 24 data points
            .map((monitor: any) => ({
              timestamp: monitor.LastCheck || monitor.last_checked || new Date().toISOString(),
              responseTime: monitor.ResponseTime || monitor.response_time || 0,
              uptime: monitor.Metrics?.UptimePercentage || monitor.uptime_percentage || 0,
              healthScore: calculateHealthScore(monitor),
              alerts: 0 // Can be enhanced to count alerts per timestamp
            }));
          setChartData(chartDataPoints);
        } else {
          // Empty chart data if no monitoring data
          setChartData([]);
        }

        setIsLoading(false);
      } catch (err: any) {
        console.error('Failed to load dashboard data:', err);
        setError(err.message || 'Failed to load dashboard data');
        setIsLoading(false);
      }
    };

    loadDashboardData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      if (autoRefresh) {
        loadDashboardData();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Helper function to format last checked time
  const formatLastChecked = (timestamp: string): string => {
    if (!timestamp) return 'Never';
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      
      if (diffSecs < 60) return `${diffSecs}s ago`;
      if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
      if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
      return `${Math.floor(diffSecs / 86400)}d ago`;
    } catch {
      return 'Unknown';
    }
  };

  // Helper function to calculate health score
  const calculateHealthScore = (server: any): number => {
    let score = 100;
    
    // Deduct points for offline status
    if (server.status === 'offline' || server.Status === 'offline') {
      return 0;
    }
    
    // Deduct points for high response time (>500ms)
    const responseTime = server.responseTime || server.ResponseTime || 0;
    if (responseTime > 500) {
      score -= 20;
    } else if (responseTime > 200) {
      score -= 10;
    }
    
    // Deduct points for low uptime
    const uptime = server.uptime || server.Metrics?.UptimePercentage || 100;
    if (uptime < 95) {
      score -= 15;
    } else if (uptime < 99) {
      score -= 5;
    }
    
    return Math.max(0, score);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'offline': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const pieData = [
    { name: 'Online', value: metrics.onlineServers, color: '#10b981' },
    { name: 'Offline', value: metrics.offlineServers, color: '#ef4444' },
    { name: 'Warning', value: metrics.totalServers - metrics.onlineServers - metrics.offlineServers, color: '#f59e0b' }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <AlertTriangle className="h-12 w-12 text-red-500" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">Failed to load dashboard</h3>
          <p className="text-sm text-gray-600 mt-2">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Interactive Dashboard</h1>
          <p className="text-gray-600">Real-time monitoring and analytics</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-900">Total Servers</CardTitle>
            <Server className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{metrics.totalServers}</div>
            <p className="text-xs text-blue-700">
              <span className="text-green-600">{metrics.onlineServers} online</span>
              <span className="text-red-600 ml-2">{metrics.offlineServers} offline</span>
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-900">Uptime</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">{metrics.uptimePercentage}%</div>
            <p className="text-xs text-green-700">
              Average across all servers
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-900">Response Time</CardTitle>
            <Zap className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">{metrics.averageResponseTime}ms</div>
            <p className="text-xs text-purple-700">
              <TrendingDown className="h-3 w-3 inline mr-1" />
              -12% from yesterday
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-900">Health Score</CardTitle>
            <BarChart3 className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">{metrics.healthScore}</div>
            <p className="text-xs text-orange-700">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              +5% from last week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analytics */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="servers">Servers</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Response Time Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <LineChart className="h-5 w-5 mr-2" />
                  Response Time Trend
                </CardTitle>
                <CardDescription>Last 24 hours</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsLineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleString()}
                      formatter={(value) => [`${value}ms`, 'Response Time']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="responseTime" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Server Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="h-5 w-5 mr-2" />
                  Server Status
                </CardTitle>
                <CardDescription>Current distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <RechartsPieChart
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </RechartsPieChart>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
                <div className="flex justify-center space-x-4 mt-4">
                  {pieData.map((item, index) => (
                    <div key={index} className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm text-gray-600">{item.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Health Score Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Health Score Trend
              </CardTitle>
              <CardDescription>System health over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsLineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                  />
                  <YAxis domain={[0, 100]} />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleString()}
                    formatter={(value) => [`${value}%`, 'Health Score']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="healthScore" 
                    stroke="#f59e0b" 
                    strokeWidth={3}
                    dot={{ fill: '#f59e0b', strokeWidth: 2, r: 5 }}
                  />
                </RechartsLineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>Key performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Average Response Time</span>
                    <Badge variant="outline">{metrics.averageResponseTime}ms</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Uptime Percentage</span>
                    <Badge variant="outline" className="bg-green-100 text-green-800">
                      {metrics.uptimePercentage}%
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Health Score</span>
                    <Badge variant="outline" className="bg-blue-100 text-blue-800">
                      {metrics.healthScore}/100
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Uptime Trend</CardTitle>
                <CardDescription>System availability over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsLineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                    />
                    <YAxis domain={[80, 100]} />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleString()}
                      formatter={(value) => [`${value}%`, 'Uptime']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="uptime" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
                Active Alerts
              </CardTitle>
              <CardDescription>Current system alerts and notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                    <div>
                      <p className="font-medium text-red-900">High Response Time</p>
                      <p className="text-sm text-red-700">Production API server responding slowly</p>
                    </div>
                  </div>
                  <Badge variant="destructive">Critical</Badge>
                </div>
                
                <div className="flex items-center justify-between p-4 border border-yellow-200 rounded-lg bg-yellow-50">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                    <div>
                      <p className="font-medium text-yellow-900">Memory Usage High</p>
                      <p className="text-sm text-yellow-700">Cache server using 85% memory</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Warning</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="servers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Server Status</CardTitle>
              <CardDescription>Real-time server monitoring</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {servers.map((server) => (
                  <div key={server.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(server.status)}`}></div>
                      <div>
                        <p className="font-medium">{server.name}</p>
                        <p className="text-sm text-gray-600">Last checked: {server.lastChecked}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Response Time</p>
                        <p className="font-medium">{server.responseTime}ms</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Uptime</p>
                        <p className="font-medium">{server.uptime}%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Health</p>
                        <p className={`font-medium ${getHealthScoreColor(server.healthScore)}`}>
                          {server.healthScore}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InteractiveDashboard;

