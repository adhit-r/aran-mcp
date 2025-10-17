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
  capabilities?: any;
  tools?: MCPTool[];
  resources?: MCPResource[];
  last_checked?: string;
  response_time?: number;
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

  async executeTool(id: string, arguments: Record<string, any>): Promise<ToolExecution> {
    const response = await this.client.post(`/mcp/tools/${id}/execute`, { arguments });
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
}

export const mcpApi = new MCPApiClient();