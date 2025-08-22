'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { 
  RefreshCw, 
  Server, 
  Shield, 
  Network, 
  HardDrive, 
  Cpu, 
  Memory, 
  Zap,
  Search,
  AlertTriangle
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

type SandboxedServer = {
  id: string;
  serverId: string;
  serverName: string;
  status: string;
  level: string;
  currentRestrictions: {
    networkAccess: boolean;
    fileSystemAccess: boolean;
    processCreation: boolean;
    memoryLimitMB: number;
    cpuLimitPercent: number;
    executionTimeLimitMs: number;
  };
  stats: {
    violations: number;
    threatsBlocked: number;
    startTime: string;
  };
};

export default function SandboxDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  
  const [servers, setServers] = useState<SandboxedServer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Fetch sandboxed servers
  const fetchServers = async () => {
    try {
      const response = await fetch('/api/sandbox');
      if (!response.ok) throw new Error('Failed to fetch servers');
      const data = await response.json();
      setServers(data.data || []);
    } catch (error) {
      console.error('Error fetching servers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load sandboxed servers',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Initial data load
  useEffect(() => {
    if (status === 'authenticated') {
      fetchServers();
    } else if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);
  
  // Filter servers based on search
  const filteredServers = servers.filter(server => 
    server.serverId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    server.serverName.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  if (status === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold">Server Sandbox</h1>
          <p className="text-muted-foreground">Monitor and manage sandboxed servers</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchServers}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search servers..."
          className="pl-8"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sandboxed</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{servers.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Threats</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {servers.reduce((sum, server) => sum + server.stats.threatsBlocked, 0)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Violations</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {servers.reduce((sum, server) => sum + server.stats.violations, 0)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Uptime</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {servers.length > 0 
                ? formatDistanceToNow(new Date(Math.min(...servers.map(s => new Date(s.stats.startTime).getTime()))), { addSuffix: true })
                : 'N/A'}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Servers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sandboxed Servers</CardTitle>
          <CardDescription>
            {filteredServers.length} server{filteredServers.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Server</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Restrictions</TableHead>
                  <TableHead>Violations</TableHead>
                  <TableHead>Uptime</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServers.length > 0 ? (
                  filteredServers.map((server) => (
                    <TableRow key={server.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <Server className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div>{server.serverName}</div>
                            <div className="text-xs text-muted-foreground">{server.serverId}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={server.status === 'active' ? 'default' : 'secondary'}
                          className={server.status === 'quarantined' ? 'bg-red-100 text-red-800' : ''}
                        >
                          {server.status.charAt(0).toUpperCase() + server.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className={
                            server.level === 'strict' ? 'bg-red-100 text-red-800' :
                            server.level === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }
                        >
                          {server.level.charAt(0).toUpperCase() + server.level.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className={`p-1 rounded ${server.currentRestrictions.networkAccess ? 'text-green-500' : 'text-red-500'}`}>
                            <Network className="h-4 w-4" />
                          </div>
                          <div className={`p-1 rounded ${server.currentRestrictions.fileSystemAccess ? 'text-green-500' : 'text-red-500'}`}>
                            <HardDrive className="h-4 w-4" />
                          </div>
                          <div className={`p-1 rounded ${server.currentRestrictions.processCreation ? 'text-green-500' : 'text-red-500'}`}>
                            <Cpu className="h-4 w-4" />
                          </div>
                          <div className="p-1 rounded text-blue-500">
                            <Memory className="h-4 w-4" />
                          </div>
                          <div className="p-1 rounded text-purple-500">
                            <Zap className="h-4 w-4" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {server.stats.violations > 0 ? (
                            <>
                              <span className="font-medium">{server.stats.violations}</span>
                              {server.stats.threatsBlocked > 0 && (
                                <span className="ml-1 text-xs text-muted-foreground">
                                  ({server.stats.threatsBlocked} blocked)
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground">None</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(server.stats.startTime), { addSuffix: true })}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      {servers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <Server className="h-8 w-8 text-muted-foreground" />
                          <p className="text-muted-foreground">No servers are currently sandboxed</p>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No servers match your search</p>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
