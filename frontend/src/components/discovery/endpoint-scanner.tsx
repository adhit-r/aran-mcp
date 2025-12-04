'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { mcpApi, ScanResult } from '@/lib/mcp-api';
import { toast } from 'sonner';
import {
  Search,
  Server,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Activity,
  Loader2,
  Copy,
  ExternalLink,
  Zap,
  Layers,
  FileText,
} from 'lucide-react';

type ScanMode = 'single' | 'multiple' | 'port-range';

export function EndpointScanner() {
  const [scanMode, setScanMode] = useState<ScanMode>('single');
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [singleUrl, setSingleUrl] = useState('');
  const [multipleUrls, setMultipleUrls] = useState('');
  const [portRange, setPortRange] = useState({
    host: 'localhost',
    startPort: 3000,
    endPort: 3010,
    maxConcurrent: 10,
  });

  const handleSingleScan = async () => {
    if (!singleUrl.trim()) {
      toast.error('Please enter a URL');
      return;
    }

    try {
      setScanning(true);
      const response = await mcpApi.scanEndpoint(singleUrl.trim());
      setResults([response.result]);
      toast.success('Endpoint scan completed');
    } catch (error: any) {
      console.error('Scan error:', error);
      toast.error(error?.response?.data?.error || 'Failed to scan endpoint');
    } finally {
      setScanning(false);
    }
  };

  const handleMultipleScan = async () => {
    const urls = multipleUrls
      .split('\n')
      .map((url) => url.trim())
      .filter((url) => url.length > 0);

    if (urls.length === 0) {
      toast.error('Please enter at least one URL');
      return;
    }

    try {
      setScanning(true);
      const response = await mcpApi.scanMultipleEndpoints(urls, 10);
      setResults(response.results);
      toast.success(`Scanned ${response.total_scanned} endpoints, found ${response.total_found} reachable`);
    } catch (error: any) {
      console.error('Scan error:', error);
      toast.error(error?.response?.data?.error || 'Failed to scan endpoints');
    } finally {
      setScanning(false);
    }
  };

  const handlePortRangeScan = async () => {
    if (!portRange.host.trim()) {
      toast.error('Please enter a host');
      return;
    }

    if (portRange.startPort > portRange.endPort) {
      toast.error('Start port must be less than or equal to end port');
      return;
    }

    if (portRange.endPort - portRange.startPort > 1000) {
      toast.error('Port range too large (max 1000 ports)');
      return;
    }

    try {
      setScanning(true);
      const response = await mcpApi.scanPortRange(
        portRange.host,
        portRange.startPort,
        portRange.endPort,
        portRange.maxConcurrent
      );
      setResults(response.results);
      toast.success(
        `Scanned ${response.total_ports} ports, found ${response.mcp_servers_count} MCP servers`
      );
    } catch (error: any) {
      console.error('Scan error:', error);
      toast.error(error?.response?.data?.error || 'Failed to scan port range');
    } finally {
      setScanning(false);
    }
  };

  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Endpoint Scanner</h1>
        <p className="text-muted-foreground mt-2">
          Discover and analyze MCP servers by scanning endpoints, ports, or networks
        </p>
      </div>

      <Tabs value={scanMode} onValueChange={(v) => setScanMode(v as ScanMode)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="single">Single Endpoint</TabsTrigger>
          <TabsTrigger value="multiple">Multiple Endpoints</TabsTrigger>
          <TabsTrigger value="port-range">Port Range</TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scan Single Endpoint</CardTitle>
              <CardDescription>
                Enter a URL to scan for MCP server information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="single-url">Endpoint URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="single-url"
                    placeholder="http://localhost:3000"
                    value={singleUrl}
                    onChange={(e) => setSingleUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !scanning && handleSingleScan()}
                  />
                  <Button onClick={handleSingleScan} disabled={scanning}>
                    {scanning ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        Scan
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="multiple" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scan Multiple Endpoints</CardTitle>
              <CardDescription>
                Enter multiple URLs (one per line) to scan concurrently
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="multiple-urls">Endpoint URLs (one per line)</Label>
                <textarea
                  id="multiple-urls"
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="http://localhost:3000&#10;http://localhost:8080&#10;http://localhost:9000"
                  value={multipleUrls}
                  onChange={(e) => setMultipleUrls(e.target.value)}
                />
              </div>
              <Button onClick={handleMultipleScan} disabled={scanning} className="w-full">
                {scanning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Scan All Endpoints
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="port-range" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scan Port Range</CardTitle>
              <CardDescription>
                Scan a range of ports on a host to discover MCP servers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="host">Host</Label>
                  <Input
                    id="host"
                    placeholder="localhost"
                    value={portRange.host}
                    onChange={(e) => setPortRange({ ...portRange, host: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-concurrent">Max Concurrent</Label>
                  <Input
                    id="max-concurrent"
                    type="number"
                    min="1"
                    max="50"
                    value={portRange.maxConcurrent}
                    onChange={(e) =>
                      setPortRange({ ...portRange, maxConcurrent: parseInt(e.target.value) || 10 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start-port">Start Port</Label>
                  <Input
                    id="start-port"
                    type="number"
                    min="1"
                    max="65535"
                    value={portRange.startPort}
                    onChange={(e) =>
                      setPortRange({ ...portRange, startPort: parseInt(e.target.value) || 3000 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-port">End Port</Label>
                  <Input
                    id="end-port"
                    type="number"
                    min="1"
                    max="65535"
                    value={portRange.endPort}
                    onChange={(e) =>
                      setPortRange({ ...portRange, endPort: parseInt(e.target.value) || 3010 })
                    }
                  />
                </div>
              </div>
              <Button onClick={handlePortRangeScan} disabled={scanning} className="w-full">
                {scanning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Scan Port Range
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Scan Results</h2>
            <Badge variant="secondary">{results.length} endpoint{results.length !== 1 ? 's' : ''}</Badge>
          </div>

          <div className="space-y-4">
            {results.map((result, index) => (
              <ScanResultCard key={index} result={result} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ScanResultCard({ result }: { result: ScanResult }) {
  const [expanded, setExpanded] = useState(false);

  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-lg">{result.url}</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(result.url);
                  toast.success('Copied to clipboard');
                }}
                className="h-6 w-6 p-0"
              >
                <Copy className="h-3 w-3" />
              </Button>
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
            <div className="flex flex-wrap gap-2">
              {result.reachable ? (
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle className="mr-1 h-3 w-3" />
                  Reachable
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <XCircle className="mr-1 h-3 w-3" />
                  Unreachable
                </Badge>
              )}
              {result.is_mcp_server && (
                <Badge variant="default" className="bg-blue-500">
                  <Server className="mr-1 h-3 w-3" />
                  MCP Server
                </Badge>
              )}
              {result.version && (
                <Badge variant="secondary">
                  <Layers className="mr-1 h-3 w-3" />
                  v{result.version}
                </Badge>
              )}
              {result.health_status && (
                <Badge variant="outline">
                  <Activity className="mr-1 h-3 w-3" />
                  {result.health_status}
                </Badge>
              )}
              {result.detected_protocol && (
                <Badge variant="outline">{result.detected_protocol}</Badge>
              )}
              {result.response_time && (
                <Badge variant="outline">
                  <Clock className="mr-1 h-3 w-3" />
                  {formatResponseTime(result.response_time)}
                </Badge>
              )}
              {result.http_status && (
                <Badge variant="outline">HTTP {result.http_status}</Badge>
              )}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
            {expanded ? 'Collapse' : 'Expand'}
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          {/* Server Info */}
          {result.server_info && (
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Server className="h-4 w-4" />
                Server Information
              </h3>
              <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                <div>
                  <span className="font-medium">Name:</span> {result.server_info.name}
                </div>
                {result.server_info.description && (
                  <div>
                    <span className="font-medium">Description:</span>{' '}
                    {result.server_info.description}
                  </div>
                )}
                <div>
                  <span className="font-medium">Version:</span> {result.server_info.version}
                </div>
              </div>
            </div>
          )}

          {/* Capabilities */}
          {result.capabilities && (
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Capabilities
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.capabilities.tools && (
                  <Badge variant="secondary">
                    <FileText className="mr-1 h-3 w-3" />
                    Tools ({result.tools?.length || 0})
                  </Badge>
                )}
                {result.capabilities.resources && (
                  <Badge variant="secondary">
                    <Layers className="mr-1 h-3 w-3" />
                    Resources ({result.resources?.length || 0})
                  </Badge>
                )}
                {result.capabilities.prompts && (
                  <Badge variant="secondary">
                    <FileText className="mr-1 h-3 w-3" />
                    Prompts ({result.prompts?.length || 0})
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Tools */}
          {result.tools && result.tools.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">Tools ({result.tools.length})</h3>
              <div className="bg-muted p-4 rounded-lg space-y-2 max-h-48 overflow-y-auto">
                {result.tools.map((tool, idx) => (
                  <div key={idx} className="text-sm">
                    <div className="font-medium">{tool.name}</div>
                    {tool.description && (
                      <div className="text-muted-foreground">{tool.description}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resources */}
          {result.resources && result.resources.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">Resources ({result.resources.length})</h3>
              <div className="bg-muted p-4 rounded-lg space-y-2 max-h-48 overflow-y-auto">
                {result.resources.map((resource, idx) => (
                  <div key={idx} className="text-sm">
                    <div className="font-medium">{resource.name || resource.uri}</div>
                    {resource.description && (
                      <div className="text-muted-foreground">{resource.description}</div>
                    )}
                    <div className="text-xs text-muted-foreground">{resource.uri}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {result.error && (
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                Error
              </h3>
              <div className="bg-destructive/10 text-destructive p-4 rounded-lg text-sm">
                {result.error}
              </div>
            </div>
          )}

          {/* Metadata */}
          {result.metadata && Object.keys(result.metadata).length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">Metadata</h3>
              <div className="bg-muted p-4 rounded-lg">
                <pre className="text-xs overflow-x-auto">
                  {JSON.stringify(result.metadata, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

