'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { mcpApi, MCPServer, MCPTool } from '@/lib/mcp-api';
import { 
  Server, 
  Tool, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Plus,
  Search,
  Refresh,
  Settings,
  Play,
  Pause,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';

interface ServerWithTools extends MCPServer {
  tools?: MCPTool[];
  monitoring?: boolean;
}

export function EnhancedServerManager() {
  const [servers, setServers] = useState<ServerWithTools[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadServers();
  }, []);

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
        <div className="flex gap-2">
          <Button onClick={loadServers} variant="outline">
            <Refresh className="h-4 w-4 mr-2" />
            Refresh
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
                  <Badge variant={server.status === 'online' ? 'success' : 'destructive'}>
                    {server.status}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">{server.url}</p>
                {server.description && (
                  <p className="text-sm text-gray-500">{server.description}</p>
                )}
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Server Form Modal */}
      {showAddForm && (
        <AddServerModal 
          onClose={() => setShowAddForm(false)}
          onSuccess={() => {
            setShowAddForm(false);
            loadServers();
          }}
        />
      )}

      {/* Server Details Modal */}
      {selectedServer && (
        <ServerDetailsModal
          serverId={selectedServer}
          onClose={() => setSelectedServer(null)}
        />
      )}
    </div>
  );
}

// Add Server Modal Component
function AddServerModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    description: '',
    type: 'custom'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await mcpApi.createServer(formData);
      toast.success('Server added successfully');
      onSuccess();
    } catch (error) {
      console.error('Failed to create server:', error);
      toast.error('Failed to create server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle>Add MCP Server</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="My MCP Server"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">URL</label>
              <Input
                value={formData.url}
                onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                placeholder="http://localhost:3001"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="custom">Custom</option>
                <option value="filesystem">Filesystem</option>
                <option value="database">Database</option>
                <option value="api">API</option>
              </select>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Adding...' : 'Add Server'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// Server Details Modal Component
function ServerDetailsModal({ serverId, onClose }: { serverId: string; onClose: () => void }) {
  const [server, setServer] = useState<MCPServer | null>(null);
  const [capabilities, setCapabilities] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
    } catch (error) {
      console.error('Failed to load server details:', error);
      toast.error('Failed to load server details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Server Details</CardTitle>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : server ? (
            <div className="space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="font-semibold mb-2">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Name:</span>
                    <p className="font-medium">{server.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(server.status)}
                      <span>{server.status}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">URL:</span>
                    <p className="font-mono text-xs">{server.url}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Type:</span>
                    <Badge variant="outline">{server.type}</Badge>
                  </div>
                </div>
              </div>

              {/* Capabilities */}
              {capabilities && (
                <div>
                  <h3 className="font-semibold mb-2">Capabilities</h3>
                  <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
                    {JSON.stringify(capabilities, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <p>Failed to load server details</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}