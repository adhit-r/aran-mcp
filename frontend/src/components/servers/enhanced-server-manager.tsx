'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { mcpApi, MCPServer, MCPTool } from '@/lib/mcp-api';
import { 
  Server, 
  Wrench as Tool, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Plus,
  Search,
  RotateCw as Refresh,
  Settings,
  Play,
  Pause,
  Eye,
  Trash2,
  Edit
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EnhancedServerForm } from './enhanced-server-form';

interface ServerWithTools extends MCPServer {
  tools?: MCPTool[];
  monitoring?: boolean;
  healthScore?: number;
  uptimePercentage?: number;
  lastChecked?: string;
}

interface ServerStatus {
  serverId: string;
  status: string;
  responseTime: number;
  lastChecked: string;
  healthScore?: number;
  uptimePercentage?: number;
}

export function EnhancedServerManager() {
  const [servers, setServers] = useState<ServerWithTools[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [serverToEdit, setServerToEdit] = useState<MCPServer | null>(null);
  const [serverToDelete, setServerToDelete] = useState<MCPServer | null>(null);
  const [serverStatuses, setServerStatuses] = useState<Map<string, ServerStatus>>(new Map());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds

  useEffect(() => {
    loadServers();
    loadServerStatuses();
  }, []);

  // Auto-refresh server statuses
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadServerStatuses();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  const loadServers = async () => {
    try {
      setLoading(true);
      const serversData = await mcpApi.listServers();
      
      // Enhance servers with tool information
      const enhancedServers = await Promise.all(
        serversData.map(async (server: MCPServer) => {
          try {
            const tools = await mcpApi.listTools({ server_id: server.id });
            return { ...server, tools };
          } catch (error) {
            return { ...server, tools: [] };
          }
        })
      );

      setServers(enhancedServers);
    } catch (error) {
      console.error('Failed to load servers:', error);
      toast.error('Failed to load servers');
    } finally {
      setLoading(false);
    }
  };

  const loadServerStatuses = async () => {
    try {
      const statuses = await mcpApi.getMonitoringStatus();
      const statusMap = new Map<string, ServerStatus>();
      
      statuses.forEach((status: any) => {
        statusMap.set(status.server_id || status.ServerID, {
          serverId: status.server_id || status.ServerID,
          status: status.status || status.Status,
          responseTime: status.response_time || status.ResponseTime || 0,
          lastChecked: status.last_checked || status.LastCheck,
          healthScore: status.health_score || status.HealthScore,
          uptimePercentage: status.uptime_percentage || status.UptimePercentage,
        });
      });

      // Update statuses first
      setServerStatuses(prevStatuses => {
        // Detect status changes and show notifications
        prevStatuses.forEach((oldStatus, serverId) => {
          const newStatus = statusMap.get(serverId);
          if (newStatus && oldStatus.status !== newStatus.status) {
            // Find server for notification
            setServers(currentServers => {
              const server = currentServers.find(s => s.id === serverId);
              if (server) {
                if (newStatus.status === 'online' && oldStatus.status !== 'online') {
                  toast.success(`${server.name} is now online`, {
                    description: `Server recovered`,
                  });
                } else if ((newStatus.status === 'offline' || newStatus.status === 'error') && oldStatus.status === 'online') {
                  toast.error(`${server.name} went offline`, {
                    description: `Server status: ${newStatus.status}`,
                  });
                }
              }
              return currentServers;
            });
          }
        });
        return statusMap;
      });

      // Update servers with latest status information
      setServers(prev => prev.map(server => {
        const status = statusMap.get(server.id);
        if (status) {
          return {
            ...server,
            status: status.status,
            response_time: status.responseTime,
            healthScore: status.healthScore,
            uptimePercentage: status.uptimePercentage,
            lastChecked: status.lastChecked,
          };
        }
        return server;
      }));
    } catch (error) {
      console.error('Failed to load server statuses:', error);
      // Don't show error toast for status updates to avoid spam
    }
  };

  const handleDiscoverTools = async (serverId: string) => {
    try {
      toast.info('Discovering tools...');
      const result = await mcpApi.discoverTools(serverId);
      toast.success(`Discovered ${result.tools_discovered} tools`);
      await loadServers(); // Refresh the list
    } catch (error) {
      console.error('Failed to discover tools:', error);
      toast.error('Failed to discover tools');
    }
  };

  const handleStartMonitoring = async (serverId: string) => {
    try {
      await mcpApi.startMonitoring(serverId, 30);
      toast.success('Monitoring started');
      
      // Update server monitoring status
      setServers(prev => prev.map(server => 
        server.id === serverId ? { ...server, monitoring: true } : server
      ));
    } catch (error) {
      console.error('Failed to start monitoring:', error);
      toast.error('Failed to start monitoring');
    }
  };

  const handleStopMonitoring = async (serverId: string) => {
    try {
      await mcpApi.stopMonitoring(serverId);
      toast.success('Monitoring stopped');
      
      // Update server monitoring status
      setServers(prev => prev.map(server => 
        server.id === serverId ? { ...server, monitoring: false } : server
      ));
    } catch (error) {
      console.error('Failed to stop monitoring:', error);
      toast.error('Failed to stop monitoring');
    }
  };

  const handlePingServer = async (server: MCPServer) => {
    try {
      const result = await mcpApi.pingServer(server.url);
      if (result.status === 'online') {
        toast.success(`${server.name} is online (${result.response_time}ms)`);
      } else {
        toast.error(`${server.name} is offline`);
      }
    } catch (error) {
      toast.error(`Failed to ping ${server.name}`);
    }
  };

  const handleDeleteServer = async (server: MCPServer) => {
    try {
      await mcpApi.deleteServer(server.id);
      toast.success(`Server "${server.name}" deleted successfully`);
      await loadServers(); // Refresh the list
      setServerToDelete(null);
    } catch (error: any) {
      console.error('Failed to delete server:', error);
      toast.error(error?.response?.data?.error || `Failed to delete server "${server.name}"`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'online':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'offline':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getHealthScoreColor = (score?: number) => {
    if (!score) return 'text-gray-500';
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const formatLastChecked = (timestamp?: string) => {
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

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'warning';
      case 'low':
        return 'success';
      default:
        return 'secondary';
    }
  };

  const filteredServers = servers.filter(server =>
    server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    server.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
    server.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <h2 className="text-2xl font-bold">MCP Servers</h2>
          <p className="text-gray-600">Manage and monitor your MCP servers</p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex items-center gap-2 mr-2">
            <input
              type="checkbox"
              id="auto-refresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="auto-refresh" className="text-sm text-gray-600">
              Auto-refresh
            </label>
          </div>
          <Button onClick={loadServers} variant="outline" size="sm">
            <Refresh className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={loadServerStatuses} variant="outline" size="sm">
            <Activity className="h-4 w-4 mr-2" />
            Check Status
          </Button>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Server
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search servers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Servers Grid */}
      {filteredServers.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Server className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No MCP servers found</h3>
            <p className="text-gray-600 mb-4">
              {searchQuery ? 'No servers match your search.' : 'Add your first MCP server to get started.'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Server
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServers.map((server) => (
            <Card key={server.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(server.status)}
                    <CardTitle className="text-lg">{server.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    {server.healthScore !== undefined && (
                      <Badge variant="outline" className={getHealthScoreColor(server.healthScore)}>
                        Health: {server.healthScore}%
                      </Badge>
                    )}
                    <Badge variant={server.status === 'online' ? 'default' : 'destructive'}>
                      {server.status || 'unknown'}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-gray-600">{server.url}</p>
                {server.description && (
                  <p className="text-sm text-gray-500">{server.description}</p>
                )}
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  {server.lastChecked && (
                    <span>Last checked: {formatLastChecked(server.lastChecked)}</span>
                  )}
                  {server.uptimePercentage !== undefined && (
                    <span>Uptime: {server.uptimePercentage.toFixed(1)}%</span>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Server Info */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Type:</span>
                  <Badge variant="outline">{server.type}</Badge>
                </div>

                {server.response_time && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Response Time:</span>
                    <span className="font-mono">{server.response_time}ms</span>
                  </div>
                )}

                {/* Tools Summary */}
                {server.tools && server.tools.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Tools:</span>
                      <span className="font-semibold">{server.tools.length}</span>
                    </div>
                    
                    {/* Risk Level Distribution */}
                    <div className="flex space-x-1">
                      {['high', 'medium', 'low'].map(risk => {
                        const count = server.tools?.filter(t => t.risk_level === risk).length || 0;
                        return count > 0 ? (
                          <Badge 
                            key={risk} 
                            variant={getRiskLevelColor(risk)}
                            className="text-xs px-1 py-0"
                          >
                            {count} {risk}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePingServer(server)}
                  >
                    <Activity className="h-3 w-3 mr-1" />
                    Ping
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDiscoverTools(server.id)}
                  >
                    <Tool className="h-3 w-3 mr-1" />
                    Discover
                  </Button>

                  {server.monitoring ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStopMonitoring(server.id)}
                    >
                      <Pause className="h-3 w-3 mr-1" />
                      Stop
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStartMonitoring(server.id)}
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Monitor
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedServer(server.id)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Details
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setServerToEdit(server)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setServerToDelete(server)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Server Form Modal */}
      <EnhancedServerForm
        server={serverToEdit || undefined}
        open={showAddForm || !!serverToEdit}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddForm(false);
            setServerToEdit(null);
          }
        }}
        onSuccess={() => {
          setShowAddForm(false);
          setServerToEdit(null);
          loadServers();
        }}
        onCancel={() => {
          setShowAddForm(false);
          setServerToEdit(null);
        }}
      />

      {/* Server Details Dialog */}
      {selectedServer && (
        <ServerDetailsModal
          serverId={selectedServer}
          onClose={() => setSelectedServer(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {serverToDelete && (
        <AlertDialog open={!!serverToDelete} onOpenChange={(open) => !open && setServerToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Server</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <strong>{serverToDelete.name}</strong>?
                <br />
                <span className="text-sm text-gray-500 mt-2 block">
                  URL: {serverToDelete.url}
                </span>
                <br />
                This action cannot be undone. The server will be removed from the system.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleDeleteServer(serverToDelete)}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}


// Server Details Modal Component
function ServerDetailsModal({ serverId, onClose }: { serverId: string; onClose: () => void }) {
  const [server, setServer] = useState<MCPServer | null>(null);
  const [capabilities, setCapabilities] = useState<any>(null);
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadServerDetails();
  }, [serverId]);

  const loadServerDetails = async () => {
    try {
      setLoading(true);
      const [serverData, capabilitiesData] = await Promise.all([
        mcpApi.getServer(serverId),
        mcpApi.getServerCapabilities(serverId).catch(() => null)
      ]);
      
      setServer(serverData);
      setCapabilities(capabilitiesData);

      // Load tools and resources
      try {
        const toolsData = await mcpApi.listTools({ server_id: serverId });
        setTools(toolsData || []);
      } catch (error) {
        console.error('Failed to load tools:', error);
      }

      try {
        const resourcesData = await mcpApi.listResources(serverId);
        setResources(resourcesData || []);
      } catch (error) {
        console.error('Failed to load resources:', error);
      }
    } catch (error) {
      console.error('Failed to load server details:', error);
      toast.error('Failed to load server details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'online':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'offline':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return 'Never';
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return 'Unknown';
    }
  };

  const formatResponseTime = (ms?: number) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <Dialog open={!!serverId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {server && getStatusIcon(server.status)}
            {server ? server.name : 'Server Details'}
          </DialogTitle>
          <DialogDescription>
            {server?.url}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : server ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
              <TabsTrigger value="tools">Tools ({tools.length})</TabsTrigger>
              <TabsTrigger value="resources">Resources ({resources.length})</TabsTrigger>
              <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Name</Label>
                      <p className="font-medium">{server.name}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Status</Label>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(server.status)}
                        <Badge variant={server.status === 'online' ? 'default' : 'destructive'}>
                          {server.status || 'unknown'}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">URL</Label>
                      <p className="font-mono text-sm break-all">{server.url}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Type</Label>
                      <Badge variant="outline">{server.type}</Badge>
                    </div>
                    {server.version && (
                      <div>
                        <Label className="text-muted-foreground">Version</Label>
                        <p className="font-medium">{server.version}</p>
                      </div>
                    )}
                    {server.description && (
                      <div className="col-span-2">
                        <Label className="text-muted-foreground">Description</Label>
                        <p className="text-sm">{server.description}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Status & Health */}
              <Card>
                <CardHeader>
                  <CardTitle>Status & Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <Label className="text-muted-foreground text-xs">Response Time</Label>
                      <p className="text-2xl font-bold mt-1">
                        {formatResponseTime(server.response_time)}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <Label className="text-muted-foreground text-xs">Last Checked</Label>
                      <p className="text-sm font-medium mt-1">
                        {formatTimestamp(server.last_checked)}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <Label className="text-muted-foreground text-xs">Created</Label>
                      <p className="text-sm font-medium mt-1">
                        {formatTimestamp(server.created_at)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => {
                      mcpApi.pingServer(server.url).then(result => {
                        toast.success(`Server is ${result.status} (${result.response_time}ms)`);
                      }).catch(() => toast.error('Ping failed'));
                    }}>
                      <Activity className="h-4 w-4 mr-2" />
                      Ping Server
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => {
                      mcpApi.discoverTools(serverId).then(result => {
                        toast.success(`Discovered ${result.tools_discovered} tools`);
                        loadServerDetails();
                      }).catch(() => toast.error('Discovery failed'));
                    }}>
                      <Tool className="h-4 w-4 mr-2" />
                      Discover Tools
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => {
                      mcpApi.startMonitoring(serverId, 30).then(() => {
                        toast.success('Monitoring started');
                      }).catch(() => toast.error('Failed to start monitoring'));
                    }}>
                      <Play className="h-4 w-4 mr-2" />
                      Start Monitoring
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="capabilities" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Capabilities</CardTitle>
                </CardHeader>
                <CardContent>
                  {capabilities ? (
                    <div className="space-y-4">
                      {capabilities.tools && (
                        <div>
                          <Label className="text-muted-foreground">Tools</Label>
                          <Badge variant="secondary" className="ml-2">
                            {capabilities.tools ? 'Available' : 'Not Available'}
                          </Badge>
                        </div>
                      )}
                      {capabilities.resources && (
                        <div>
                          <Label className="text-muted-foreground">Resources</Label>
                          <Badge variant="secondary" className="ml-2">
                            {capabilities.resources ? 'Available' : 'Not Available'}
                          </Badge>
                        </div>
                      )}
                      {capabilities.prompts && (
                        <div>
                          <Label className="text-muted-foreground">Prompts</Label>
                          <Badge variant="secondary" className="ml-2">
                            {capabilities.prompts ? 'Available' : 'Not Available'}
                          </Badge>
                        </div>
                      )}
                      <div className="mt-4">
                        <Label className="text-muted-foreground">Full Capabilities</Label>
                        <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto mt-2">
                          {JSON.stringify(capabilities, null, 2)}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No capabilities information available</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tools" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Tools ({tools.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {tools.length > 0 ? (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {tools.map((tool, idx) => (
                        <div key={idx} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold">{tool.name}</h4>
                            {tool.risk_level && (
                              <Badge variant={tool.risk_level === 'high' ? 'destructive' : 'secondary'}>
                                {tool.risk_level}
                              </Badge>
                            )}
                          </div>
                          {tool.description && (
                            <p className="text-sm text-muted-foreground mb-2">{tool.description}</p>
                          )}
                          {tool.category && (
                            <Badge variant="outline" className="text-xs">{tool.category}</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No tools available</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="resources" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Resources ({resources.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {resources.length > 0 ? (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {resources.map((resource, idx) => (
                        <div key={idx} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold">{resource.name || resource.uri}</h4>
                            {resource.mime_type && (
                              <Badge variant="outline" className="text-xs">{resource.mime_type}</Badge>
                            )}
                          </div>
                          {resource.description && (
                            <p className="text-sm text-muted-foreground mb-2">{resource.description}</p>
                          )}
                          <p className="font-mono text-xs text-muted-foreground">{resource.uri}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No resources available</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="monitoring" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Monitoring Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <Label className="text-muted-foreground text-xs">Status</Label>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusIcon(server.status)}
                        <p className="font-semibold">{server.status || 'unknown'}</p>
                      </div>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <Label className="text-muted-foreground text-xs">Response Time</Label>
                      <p className="text-lg font-semibold mt-1">
                        {formatResponseTime(server.response_time)}
                      </p>
                    </div>
                    {server.last_checked && (
                      <div className="p-4 bg-muted rounded-lg">
                        <Label className="text-muted-foreground text-xs">Last Checked</Label>
                        <p className="text-sm font-medium mt-1">
                          {formatTimestamp(server.last_checked)}
                        </p>
                      </div>
                    )}
                    <div className="p-4 bg-muted rounded-lg">
                      <Label className="text-muted-foreground text-xs">Created</Label>
                      <p className="text-sm font-medium mt-1">
                        {formatTimestamp(server.created_at)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {server.metadata && Object.keys(server.metadata).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Metadata</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                      {JSON.stringify(server.metadata, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-semibold">Failed to load server details</p>
            <Button onClick={loadServerDetails} variant="outline" className="mt-4">
              <Refresh className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}