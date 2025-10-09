'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  Server, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  Bell,
  Settings,
  Menu,
  Search,
  Filter,
  Plus,
  Wifi,
  WifiOff,
  Battery,
  Signal
} from 'lucide-react';

interface MobileMetrics {
  totalServers: number;
  onlineServers: number;
  offlineServers: number;
  criticalAlerts: number;
  averageResponseTime: number;
  uptimePercentage: number;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  action: () => void;
}

const MobileDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<MobileMetrics>({
    totalServers: 0,
    onlineServers: 0,
    offlineServers: 0,
    criticalAlerts: 0,
    averageResponseTime: 0,
    uptimePercentage: 0
  });

  const [isOnline, setIsOnline] = useState(true);
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [lastSync, setLastSync] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mock data
  useEffect(() => {
    const generateMockData = () => {
      setMetrics({
        totalServers: 12,
        onlineServers: 10,
        offlineServers: 2,
        criticalAlerts: 3,
        averageResponseTime: 145,
        uptimePercentage: 94.2
      });
    };

    generateMockData();

    // Simulate battery level
    const batteryInterval = setInterval(() => {
      setBatteryLevel(prev => Math.max(prev - 0.1, 0));
    }, 30000);

    // Simulate network status
    const networkInterval = setInterval(() => {
      setIsOnline(Math.random() > 0.1);
    }, 10000);

    return () => {
      clearInterval(batteryInterval);
      clearInterval(networkInterval);
    };
  }, []);

  const quickActions: QuickAction[] = [
    {
      id: '1',
      title: 'Add Server',
      description: 'Register new MCP server',
      icon: <Plus className="h-6 w-6" />,
      color: 'bg-blue-500',
      action: () => console.log('Add server')
    },
    {
      id: '2',
      title: 'Health Check',
      description: 'Run system health check',
      icon: <Activity className="h-6 w-6" />,
      color: 'bg-green-500',
      action: () => console.log('Health check')
    },
    {
      id: '3',
      title: 'View Alerts',
      description: 'Check system alerts',
      icon: <AlertTriangle className="h-6 w-6" />,
      color: 'bg-red-500',
      action: () => console.log('View alerts')
    },
    {
      id: '4',
      title: 'Search',
      description: 'Find servers',
      icon: <Search className="h-6 w-6" />,
      color: 'bg-purple-500',
      action: () => console.log('Search')
    }
  ];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLastSync(new Date());
    setIsRefreshing(false);
  };

  const getBatteryColor = (level: number) => {
    if (level > 50) return 'text-green-500';
    if (level > 20) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Server className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">MCP Sentinel</h1>
              <p className="text-xs text-gray-600">Mobile Dashboard</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="sm">
              <Bell className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="px-4 pb-2">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                {isOnline ? (
                  <Wifi className="h-3 w-3 text-green-500" />
                ) : (
                  <WifiOff className="h-3 w-3 text-red-500" />
                )}
                <span>{isOnline ? 'Online' : 'Offline'}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Battery className={`h-3 w-3 ${getBatteryColor(batteryLevel)}`} />
                <span>{Math.round(batteryLevel)}%</span>
              </div>
            </div>
            <div className="text-gray-500">
              Last sync: {lastSync.toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-900">Online</p>
                  <p className="text-2xl font-bold text-green-900">{metrics.onlineServers}</p>
                </div>
                <Activity className="h-6 w-6 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-900">Offline</p>
                  <p className="text-2xl font-bold text-red-900">{metrics.offlineServers}</p>
                </div>
                <Server className="h-6 w-6 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-900">Uptime</p>
                  <p className="text-2xl font-bold text-blue-900">{metrics.uptimePercentage}%</p>
                </div>
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-900">Alerts</p>
                  <p className="text-2xl font-bold text-orange-900">{metrics.criticalAlerts}</p>
                </div>
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <Button
                  key={action.id}
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center space-y-2 hover:bg-gray-50"
                  onClick={action.action}
                >
                  <div className={`w-8 h-8 rounded-full ${action.color} flex items-center justify-center text-white`}>
                    {action.icon}
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">{action.title}</p>
                    <p className="text-xs text-gray-600">{action.description}</p>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Server Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Server Status</CardTitle>
            <CardDescription>Real-time server monitoring</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: 'Production API', status: 'online', health: 95, responseTime: 120 },
                { name: 'Database Server', status: 'online', health: 98, responseTime: 85 },
                { name: 'Cache Server', status: 'warning', health: 75, responseTime: 250 },
                { name: 'File Server', status: 'offline', health: 0, responseTime: 0 }
              ].map((server, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      server.status === 'online' ? 'bg-green-500' :
                      server.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}></div>
                    <div>
                      <p className="font-medium text-sm">{server.name}</p>
                      <p className="text-xs text-gray-600">{server.responseTime}ms</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={
                      server.status === 'online' ? 'default' :
                      server.status === 'warning' ? 'secondary' : 'destructive'
                    }>
                      {server.status}
                    </Badge>
                    <p className="text-xs text-gray-600 mt-1">{server.health}% health</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Alerts</CardTitle>
            <CardDescription>Latest system notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { type: 'critical', message: 'High response time detected', time: '2 min ago' },
                { type: 'warning', message: 'Memory usage high', time: '5 min ago' },
                { type: 'info', message: 'Scheduled maintenance completed', time: '1 hour ago' }
              ].map((alert, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    alert.type === 'critical' ? 'bg-red-500' :
                    alert.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{alert.message}</p>
                    <p className="text-xs text-gray-600">{alert.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Performance</CardTitle>
            <CardDescription>Response time over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-32 bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <TrendingUp className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Chart visualization</p>
                <p className="text-xs text-gray-500">Tap to expand</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="flex items-center justify-around py-2">
          <Button variant="ghost" size="sm" className="flex flex-col items-center space-y-1">
            <Activity className="h-5 w-5" />
            <span className="text-xs">Dashboard</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex flex-col items-center space-y-1">
            <Server className="h-5 w-5" />
            <span className="text-xs">Servers</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex flex-col items-center space-y-1">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-xs">Alerts</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex flex-col items-center space-y-1">
            <Settings className="h-5 w-5" />
            <span className="text-xs">Settings</span>
          </Button>
        </div>
      </div>

      {/* Pull to Refresh Indicator */}
      {isRefreshing && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white px-4 py-2 rounded-full text-sm">
          <RefreshCw className="h-4 w-4 animate-spin inline mr-2" />
          Refreshing...
        </div>
      )}
    </div>
  );
};

export default MobileDashboard;

