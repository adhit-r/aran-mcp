'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { RealServerForm } from '@/components/servers/real-server-form';

interface MCPServer {
  id: string;
  name: string;
  url: string;
  description: string;
  type: string;
  status: 'online' | 'offline' | 'error';
  lastChecked: string;
  responseTime: number;
  version: string;
  capabilities: string[];
}

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [showAddServer, setShowAddServer] = useState(false);

  useEffect(() => {
    // Load servers from localStorage
    const savedServers = JSON.parse(localStorage.getItem('mcp-servers') || '[]');
    setServers(savedServers);
  }, []);

  const handleServerAdded = () => {
    // Reload servers from localStorage
    const savedServers = JSON.parse(localStorage.getItem('mcp-servers') || '[]');
    setServers(savedServers);
    setShowAddServer(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <h2 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white/90">Dashboard</h2>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Icons.search className="absolute left-3 top-3 h-4 w-4 text-gray-500 dark:text-white/60" />
            <Input
              type="search"
              placeholder="Search servers..."
              className="pl-10 sm:w-[300px] glass-input text-gray-900 dark:text-white/90 placeholder:text-gray-500 dark:placeholder:text-white/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button 
            variant="outline" 
            size="icon" 
            className="glass-button border-gray-200 dark:border-white/20 text-gray-900 dark:text-white/90 hover:bg-gray-100 dark:hover:bg-white/20"
          >
            <Icons.refreshCw className="h-4 w-4" />
          </Button>
          <Button 
            onClick={() => setShowAddServer(true)}
            className="glass-button bg-gray-100 dark:bg-white/20 text-gray-900 dark:text-white/90 hover:bg-gray-200 dark:hover:bg-white/30"
          >
            <Icons.plus className="mr-2 h-4 w-4" />
            Add Server
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card border-gray-200 dark:border-white/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-white/80">Total Servers</CardTitle>
            <Icons.server className="h-4 w-4 text-gray-500 dark:text-white/60" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white/90">{servers.length}</div>
            <p className="text-xs text-gray-500 dark:text-white/60">
              {servers.filter(s => s.status === 'online').length} online
            </p>
          </CardContent>
        </Card>
        
        <Card className="glass-card border-gray-200 dark:border-white/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-white/80">Alerts</CardTitle>
            <Icons.alertCircle className="h-4 w-4 text-gray-500 dark:text-white/60" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white/90">0</div>
            <p className="text-xs text-gray-500 dark:text-white/60">
              0 unread alerts
            </p>
          </CardContent>
        </Card>
        
        <Card className="glass-card border-gray-200 dark:border-white/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-white/80">Avg. Response Time</CardTitle>
            <Icons.clock className="h-4 w-4 text-gray-500 dark:text-white/60" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white/90">0 ms</div>
            <p className="text-xs text-gray-500 dark:text-white/60">
              Last updated: Just now
            </p>
          </CardContent>
        </Card>
        
        <Card className="glass-card border-gray-200 dark:border-white/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-white/80">Uptime (24h)</CardTitle>
            <Icons.activity className="h-4 w-4 text-gray-500 dark:text-white/60" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white/90">100%</div>
            <p className="text-xs text-gray-500 dark:text-white/60">
              +0% from yesterday
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Welcome Message */}
      <Card className="glass-card border-gray-200 dark:border-white/20">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white/90">Welcome to MCP Sentinel</CardTitle>
          <CardDescription className="text-gray-600 dark:text-white/60">
            Your organization has been set up successfully. Start by adding your first MCP server.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Icons.server className="h-16 w-16 text-gray-400 dark:text-white/40 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white/90 mb-2">
              No servers configured yet
            </h3>
            <p className="text-gray-600 dark:text-white/60 mb-4">
              Add your first MCP server to start monitoring and managing your infrastructure.
            </p>
            <Button 
              className="glass-button bg-gray-100 dark:bg-white/20 text-gray-900 dark:text-white/90 hover:bg-gray-200 dark:hover:bg-white/30"
            >
              <Icons.plus className="mr-2 h-4 w-4" />
              Add Your First Server
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Server List */}
      {servers.length > 0 && (
        <Card className="glass-card border-gray-200 dark:border-white/20">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white/90">MCP Servers</CardTitle>
            <CardDescription className="text-gray-600 dark:text-white/60">
              Your connected MCP servers and their status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {servers.map((server) => (
                <div key={server.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-white/20 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className={`h-3 w-3 rounded-full ${
                      server.status === 'online' ? 'bg-green-500' : 
                      server.status === 'offline' ? 'bg-red-500' : 'bg-yellow-500'
                    }`} />
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white/90">{server.name}</h4>
                      <p className="text-sm text-gray-600 dark:text-white/60">{server.url}</p>
                      <p className="text-xs text-gray-500 dark:text-white/50">
                        {server.capabilities.length} capabilities • {server.responseTime}ms response time
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900 dark:text-white/90 capitalize">
                      {server.status}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-white/50">
                      v{server.version}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Server Modal */}
      {showAddServer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl">
            <RealServerForm 
              onSuccess={handleServerAdded}
              onCancel={() => setShowAddServer(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}