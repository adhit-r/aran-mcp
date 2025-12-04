// Real MCP API client
import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

export interface MCPServer {
  id: string;
  name: string;
  url: string;
  description?: string;
  type: string;
  status: string;
  version?: string;
  capabilities?: any;
  tools?: MCPTool[];
  resources?: MCPResource[];
  last_checked?: string;
  response_time?: number;
  created_at?: string;
  updated_at?: string;
  metadata?: Record<string, any>;
}

export interface MCPTool {
  id: string;
  name: string;
  description?: string;
  category: string;
  risk_level: string;
  usage_count: number;
  input_schema: any;
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mime_type?: string;
}

export interface DiscoveryConfig {
  port_ranges?: Array<{ start: number; end: number }>;
  network_ranges?: string[];
  known_ports?: number[];
  timeout_seconds?: number;
  max_concurrent?: number;
}

export interface ToolExecution {
  id: string;
  tool_id: string;
  arguments: Record<string, any>;
  result?: any;
  error?: string;
  status: string;
  duration: number;
  executed_at: string;
}

// Endpoint Scanning Types
export interface ScanResult {
  url: string;
  reachable: boolean;
  is_mcp_server: boolean;
  response_time: number; // milliseconds
  http_status?: number;
  version?: string;
  capabilities?: {
    tools?: boolean;
    resources?: boolean;
    prompts?: boolean;
    logging?: boolean;
    sampling?: boolean;
  };
  server_info?: {
    name: string;
    version: string;
    description?: string;
    capabilities: any;
  };
  tools?: Array<{
    name: string;
    description?: string;
    inputSchema: any;
  }>;
  resources?: Array<{
    uri: string;
    name: string;
    description?: string;
    mimeType?: string;
  }>;
  prompts?: Array<{
    name: string;
    description?: string;
    arguments?: Array<{
      name: string;
      description?: string;
      required?: boolean;
    }>;
  }>;
  health_status?: string;
  detected_protocol?: string;
  headers?: Record<string, string>;
  metadata?: Record<string, any>;
  error?: string;
  scan_timestamp: string;
}

export interface ScanEndpointRequest {
  url: string;
}

export interface ScanMultipleEndpointsRequest {
  urls: string[];
  max_concurrent?: number;
}

export interface ScanPortRangeRequest {
  host: string;
  start_port: number;
  end_port: number;
  max_concurrent?: number;
}

class MCPApiClient {
  private client = axios.create({
    baseURL: API_BASE,
    timeout: 30000,
  });

  // Discovery APIs
  async discoverServers(config: DiscoveryConfig) {
    const response = await this.client.post('/mcp/discovery/scan', config);
    return response.data;
  }

  async getDiscoveredServers() {
    const response = await this.client.get('/mcp/discovery/servers');
    return response.data.servers;
  }

  async refreshServer(url: string) {
    const response = await this.client.post(`/mcp/discovery/servers/${encodeURIComponent(url)}/refresh`);
    return response.data;
  }

  // Protocol APIs
  async initializeServer(url: string) {
    const response = await this.client.post('/mcp/protocol/initialize', { url });
    return response.data;
  }

  async pingServer(url: string) {
    const response = await this.client.post('/mcp/protocol/ping', { url });
    return response.data;
  }

  async getServerCapabilities(serverId: string) {
    const response = await this.client.get(`/mcp/protocol/servers/${serverId}/capabilities`);
    return response.data;
  }

  // Server Management APIs
  async listServers() {
    const response = await this.client.get('/mcp/servers');
    return response.data.servers;
  }

  async createServer(server: Partial<MCPServer>) {
    const response = await this.client.post('/mcp/servers', server);
    return response.data;
  }

  async getServer(id: string) {
    const response = await this.client.get(`/mcp/servers/${id}`);
    return response.data;
  }

  async updateServer(id: string, updates: Partial<MCPServer>) {
    const response = await this.client.put(`/mcp/servers/${id}`, updates);
    return response.data;
  }

  async deleteServer(id: string) {
    const response = await this.client.delete(`/mcp/servers/${id}`);
    return response.data;
  }

  // Tool Management APIs
  async listTools(filters?: {
    server_id?: string;
    category?: string;
    risk_level?: string;
    enabled?: boolean;
  }) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, String(value));
        }
      });
    }
    const response = await this.client.get(`/mcp/tools?${params}`);
    return response.data.tools;
  }

  async getTool(id: string) {
    const response = await this.client.get(`/mcp/tools/${id}`);
    return response.data;
  }

  async executeTool(id: string, args: Record<string, any>): Promise<ToolExecution> {
    const response = await this.client.post(`/mcp/tools/${id}/execute`, { arguments: args });
    return response.data;
  }

  async getToolStats(id: string) {
    const response = await this.client.get(`/mcp/tools/${id}/stats`);
    return response.data;
  }

  async discoverTools(serverId: string) {
    const response = await this.client.post(`/mcp/tools/discover/${serverId}`);
    return response.data;
  }

  // Resource APIs
  async listResources(serverId: string) {
    const response = await this.client.get(`/mcp/resources/servers/${serverId}`);
    return response.data.resources;
  }

  async readResource(serverId: string, resourceUri: string) {
    const response = await this.client.post('/mcp/resources/read', {
      server_id: serverId,
      resource_uri: resourceUri,
    });
    return response.data.resource;
  }

  // Monitoring APIs
  async startMonitoring(serverId: string, intervalSeconds = 30) {
    const response = await this.client.post(`/mcp/monitoring/start/${serverId}`, {
      interval_seconds: intervalSeconds,
    });
    return response.data;
  }

  async stopMonitoring(serverId: string) {
    const response = await this.client.post(`/mcp/monitoring/stop/${serverId}`);
    return response.data;
  }

  async getMonitoringStatus() {
    const response = await this.client.get('/mcp/monitoring/status');
    return response.data.statuses;
  }

  async getAlerts(limit = 50) {
    const response = await this.client.get(`/mcp/monitoring/alerts?limit=${limit}`);
    return response.data.alerts;
  }

  // Endpoint Scanning APIs
  async scanEndpoint(url: string): Promise<{ result: ScanResult }> {
    const response = await this.client.post('/discovery/endpoint/scan', { url });
    return response.data;
  }

  async scanMultipleEndpoints(urls: string[], maxConcurrent?: number): Promise<{
    results: ScanResult[];
    total_scanned: number;
    total_found: number;
  }> {
    const response = await this.client.post('/discovery/endpoint/scan-multiple', {
      urls,
      max_concurrent: maxConcurrent || 10,
    });
    return response.data;
  }

  async scanPortRange(
    host: string,
    startPort: number,
    endPort: number,
    maxConcurrent?: number
  ): Promise<{
    results: ScanResult[];
    mcp_servers: ScanResult[];
    total_ports: number;
    reachable: number;
    mcp_servers_count: number;
  }> {
    const response = await this.client.post('/discovery/endpoint/scan-ports', {
      host,
      start_port: startPort,
      end_port: endPort,
      max_concurrent: maxConcurrent || 20,
    });
    return response.data;
  }

  // Preset APIs
  async listPresets() {
    const response = await this.client.get('/mcp/presets');
    return response.data.data;
  }

  async getPreset(id: string) {
    const response = await this.client.get(`/mcp/presets/${id}`);
    return response.data.data;
  }

  async getPresetsByCategory(category: string) {
    const response = await this.client.get(`/mcp/presets/category/${category}`);
    return response.data.data;
  }
}

export interface MCPServerPreset {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  default_url: string;
  config_template: Record<string, any>;
  setup_instructions: string;
  security_notes: string;
  required_tools: string[];
}

export const mcpApi = new MCPApiClient();