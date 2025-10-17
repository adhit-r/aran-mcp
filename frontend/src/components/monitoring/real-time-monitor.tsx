'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { mcpApi } from '@/lib/mcp-api';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock,
  TrendingUp,
  TrendingDown,
  Zap,
  Server,
  Pause,
  Play
} from 'lucide-react';
import { toast } from 'sonner';

interface MonitoringData {
  ServerID: string;
  URL: string;
  Name: string;
  Status: string;
  LastCheck: string;
  ResponseTime: number;
  ErrorCount: number;
  UptimeStart: string;
  Metrics: {
    TotalRequests: number;
    SuccessfulReqs: number;
    FailedRequests: number;
    AverageResponse: number;
    UptimePercentage: number;
    LastError?: string;
    ToolsCount: number;
    ResourcesCount: number;
    PromptsCount: number;
  };
}

interface Alert {
  ID: string;
  ServerID: string;
  Level: 'info' | 'warning' | 'critical';
  Message: string;
  Details: string;
  Timestamp: string;
  Resolved: boolean;
}

export function RealTimeMonitor() {
  const [monitoringData, setMonitoringData] = useState<MonitoringData[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadMonitoringData();
    
    if (autoRefresh) {
      intervalRef.current = setInterval(loadMonitoringData, 5000); // Refresh every 5 seconds
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh]);

  const loadMonitoringData = async () => {
    try {
      const [statusData, alertsData] = await Promise.all([
        mcpApi.getMonitoringStatus(),
        mcpApi.getAlerts(20)
      ]);

      setMonitoringData(statusData || []);
      setAlerts(alertsData || []);
      
      if (loading) {
        setLoading(false);
      }
    } catch (error) {
      console.error('Failed to load monitoring data:', error);
      if (loading) {
        toast.error('Failed to load monitoring data');
        setLoading(false);
      }
    }
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
    if (!autoRefresh) {
      toast.success('Auto-refresh enabled');
    } else {
      toast.info('Auto-refresh disabled');
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

  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getAlertBadgeVariant = (level: string) => {
    switch (level) {
      case 'critical':
        return 'destructive';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return 'secondary';
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const totalServers = monitoringData.length;
  const onlineServers = monitoringData.filter(s => s.Status === 'online').length;
  const criticalAlerts = alerts.filter(a => a.Level === 'critical' && !a.Resolved).length;
  const avgResponseTime = monitoringData.length > 0 
    ? monitoringData.reduce((sum, s) => sum + s.ResponseTime, 0) / monitoringData.length 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Real-time Monitoring</h2>
          <p className="text-gray-600">Live monitoring of your MCP servers</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            onClick={toggleAutoRefresh}
          >
            {autoRefresh ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Auto-refresh ON
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Auto-refresh OFF
              </>
            )}
          </Button>
          <Button onClick={loadMonitoringData} variant="outline">
            <Activity className="h-4 w-4 mr-2" />
            Refresh Now
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Servers</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalServers}</div>
            <p className="text-xs text-muted-foreground">
              {onlineServers} online, {totalServers - onlineServers} offline
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalServers > 0 ? ((onlineServers / totalServers) * 100).toFixed(1) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              System availability
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
            <Zap className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(avgResponseTime)}</div>
            <p className="text-xs text-muted-foreground">
              Average response time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{criticalAlerts}</div>
            <p className="text-xs text-muted-foreground">
              Require immediate attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Server Status */}
      <Card>
        <CardHeader>
          <CardTitle>Server Status</CardTitle>
        </CardHeader>
        <CardContent>
          {monitoringData.length === 0 ? (
            <div className="text-center py-8">
              <Server className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No servers being monitored</p>
              <p className="text-sm text-gray-400">Start monitoring servers to see their status here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {monitoringData.map((server) => (
                <div key={server.ServerID} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(server.Status)}
                    <div>
                      <h3 className="font-medium">{server.Name}</h3>
                      <p className="text-sm text-gray-500">{server.URL}</p>
                      <p className="text-xs text-gray-400">
                        Last checked: {formatTimestamp(server.LastCheck)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="text-center">
                      <p className="font-medium">{formatDuration(server.ResponseTime)}</p>
                      <p className="text-xs text-gray-500">Response</p>
                    </div>
                    
                    <div className="text-center">
                      <p className="font-medium">{server.Metrics.UptimePercentage.toFixed(1)}%</p>
                      <p className="text-xs text-gray-500">Uptime</p>
                    </div>
                    
                    <div className="text-center">
                      <p className="font-medium">{server.Metrics.TotalRequests}</p>
                      <p className="text-xs text-gray-500">Requests</p>
                    </div>
                    
                    <div className="text-center">
                      <p className="font-medium">{server.Metrics.ToolsCount}</p>
                      <p className="text-xs text-gray-500">Tools</p>
                    </div>
                    
                    <Badge variant={server.Status === 'online' ? 'success' : 'destructive'}>
                      {server.Status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
              <p className="text-gray-500">No recent alerts</p>
              <p className="text-sm text-gray-400">All systems are running smoothly</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.slice(0, 10).map((alert) => (
                <div 
                  key={alert.ID} 
                  className={`flex items-start space-x-3 p-3 rounded-lg ${
                    alert.Level === 'critical' ? 'bg-red-50' :
                    alert.Level === 'warning' ? 'bg-yellow-50' :
                    'bg-blue-50'
                  }`}
                >
                  {getAlertIcon(alert.Level)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{alert.Message}</p>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getAlertBadgeVariant(alert.Level)}>
                          {alert.Level}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(alert.Timestamp)}
                        </span>
                      </div>
                    </div>
                    {alert.Details && (
                      <p className="text-xs text-gray-600 mt-1">{alert.Details}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}