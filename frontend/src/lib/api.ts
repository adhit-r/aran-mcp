import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api/v1';

export interface MCPServer {
  id: string;
  name: string;
  url: string;
  status: 'online' | 'offline' | 'error';
  lastChecked: string;
  responseTime?: number;
  uptime?: number;
  errorRate?: number;
  version?: string;
}

export interface ServerStatus {
  serverId: string;
  status: 'online' | 'offline' | 'error';
  responseTime: number;
  uptime: number;
  errorRate: number;
  version: string;
  lastChecked: string;
  metrics: {
    timestamp: string;
    responseTime: number;
    errorRate: number;
  }[];
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Authelia handles authentication via cookies, no need for token interceptor
// The Nginx proxy will forward authentication headers from Authelia

export const fetchServers = async (): Promise<MCPServer[]> => {
  try {
    console.log('Fetching servers from API...');
    const response = await api.get('/mcp/servers');
    console.log('Servers response:', response.data);
    return response.data.servers || [];
  } catch (error) {
    console.error('Error fetching servers:', error);
    // Return mock data when backend is not available
    return [
      {
        id: '1',
        name: 'Filesystem Server',
        url: 'http://localhost:3001',
        status: 'online',
        lastChecked: new Date().toISOString(),
        responseTime: 120,
        uptime: 99.9,
        errorRate: 0.1,
        version: '1.0.0'
      },
      {
        id: '2',
        name: 'Database Server',
        url: 'http://localhost:3002',
        status: 'offline',
        lastChecked: new Date().toISOString(),
        responseTime: 0,
        uptime: 95.5,
        errorRate: 2.3,
        version: '1.2.0'
      }
    ];
  }
};

export const fetchServerStatus = async (serverId: string): Promise<ServerStatus> => {
  try {
    const response = await api.get(`/mcp/servers/${serverId}/status`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching status for server ${serverId}:`, error);
    // Return mock data when backend is not available
    return {
      serverId,
      status: serverId === '1' ? 'online' : 'offline',
      responseTime: serverId === '1' ? 120 : 0,
      uptime: serverId === '1' ? 99.9 : 95.5,
      errorRate: serverId === '1' ? 0.1 : 2.3,
      version: serverId === '1' ? '1.0.0' : '1.2.0',
      lastChecked: new Date().toISOString(),
      metrics: []
    };
  }
};

export const fetchServerMetrics = async (serverId: string, period: '24h' | '7d' | '30d' = '24h') => {
  try {
    // This is a placeholder - implement actual metrics endpoint
    const response = await api.get(`/mcp/servers/${serverId}/metrics?period=${period}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching metrics for server ${serverId}:`, error);
    throw error;
  }
};

// Server Management
export interface AddServerRequest {
  name: string;
  host: string;
  port: number;
}

export interface ServerResponse {
  id: string;
  name: string;
  host: string;
  port: number;
  status: 'online' | 'offline' | 'error';
  createdAt: string;
  updatedAt: string;
}

export async function addServer(server: AddServerRequest): Promise<ServerResponse> {
  const response = await axios.post(`${API_BASE_URL}/mcp/servers`, server);
  return response.data;
}

export async function removeServer(serverId: string): Promise<void> {
  await axios.delete(`${API_BASE_URL}/mcp/servers/${serverId}`);
}

export async function updateServer(serverId: string, updates: Partial<AddServerRequest>): Promise<ServerResponse> {
  const response = await axios.patch(`${API_BASE_URL}/mcp/servers/${serverId}`, updates);
  return response.data;
}

// Server Status
export async function checkServerStatus(serverId: string): Promise<ServerStatus> {
  const response = await axios.get(`${API_BASE_URL}/mcp/servers/${serverId}/status`);
  return response.data;
}

// Alerts
export interface Alert {
  id: string;
  serverId: string;
  type: 'status_change' | 'performance' | 'error';
  message: string;
  severity: 'info' | 'warning' | 'critical';
  read: boolean;
  createdAt: string;
}

export async function getAlerts(limit: number = 10): Promise<Alert[]> {
  try {
    const response = await axios.get(`${API_BASE_URL}/mcp/alerts?limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching alerts:', error);
    // Return mock data when backend is not available
    return [
      {
        id: '1',
        serverId: '2',
        type: 'status_change',
        message: 'Server went offline',
        severity: 'critical',
        read: false,
        createdAt: new Date(Date.now() - 300000).toISOString() // 5 minutes ago
      },
      {
        id: '2',
        serverId: '1',
        type: 'performance',
        message: 'High response time detected',
        severity: 'warning',
        read: false,
        createdAt: new Date(Date.now() - 600000).toISOString() // 10 minutes ago
      },
      {
        id: '3',
        serverId: '1',
        type: 'error',
        message: 'Connection timeout',
        severity: 'info',
        read: true,
        createdAt: new Date(Date.now() - 900000).toISOString() // 15 minutes ago
      }
    ];
  }
}

export async function markAlertAsRead(alertId: string): Promise<void> {
  await axios.patch(`${API_BASE_URL}/mcp/alerts/${alertId}/read`);
}

// Authentication
export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

// JWT authentication functions removed - using Authelia
// Authentication is now handled by Authelia via Nginx proxy

// Production MCP Servers
export interface ProductionMCPServer {
  id: string;
  name: string;
  description: string;
  type: string;
  category: string;
  url: string;
  capabilities: string[];
  status: string;
  version: string;
  provider: string;
  documentation: string;
  github: string;
  created_at: string;
}

export async function fetchProductionServers(): Promise<ProductionMCPServer[]> {
  try {
    console.log('Fetching production servers from API...');
    const response = await api.get('/mcp/presets');
    console.log('Production servers response:', response.data);
    return response.data.presets || [];
  } catch (error) {
    console.error('Error fetching production servers:', error);
    // Return mock production servers when backend is not available
    return [
      {
        id: 'preset-1',
        name: 'PostgreSQL Database',
        description: 'Production PostgreSQL database server with high availability',
        category: 'Database',
        version: '15.3',
        status: 'active',
        features: ['High Availability', 'Backup & Recovery', 'Monitoring'],
        endpoints: ['postgresql://prod-db:5432/mydb'],
        documentation: 'https://docs.example.com/postgresql',
        tags: ['database', 'postgresql', 'production']
      },
      {
        id: 'preset-2',
        name: 'Redis Cache',
        description: 'High-performance Redis cache for session management',
        category: 'Cache',
        version: '7.0',
        status: 'active',
        features: ['Clustering', 'Persistence', 'Pub/Sub'],
        endpoints: ['redis://cache-cluster:6379'],
        documentation: 'https://docs.example.com/redis',
        tags: ['cache', 'redis', 'session']
      },
      {
        id: 'preset-3',
        name: 'Elasticsearch Cluster',
        description: 'Distributed search and analytics engine',
        category: 'Search',
        version: '8.8.0',
        status: 'active',
        features: ['Full-text Search', 'Analytics', 'Real-time'],
        endpoints: ['http://es-cluster:9200'],
        documentation: 'https://docs.example.com/elasticsearch',
        tags: ['search', 'elasticsearch', 'analytics']
      }
    ];
  }
}

export async function fetchServerCategories(): Promise<Record<string, ProductionMCPServer[]>> {
  try {
    const response = await api.get('/mcp/presets/categories');
    return response.data.data || {};
  } catch (error) {
    console.error('Error fetching server categories:', error);
    return {};
  }
}

export async function fetchProductionServer(id: string): Promise<ProductionMCPServer | null> {
  try {
    const response = await api.get(`/mcp/presets/${id}`);
    return response.data.data || null;
  } catch (error) {
    console.error(`Error fetching production server ${id}:`, error);
    return null;
  }
}

// Update an MCP server
export const updateMCPServer = async (id: string, serverData: Partial<MCPServer>): Promise<MCPServer> => {
  try {
    console.log('Updating server:', id, serverData);
    const response = await api.put(`/mcp/servers/${id}`, serverData);
    console.log('Update server response:', response.data);
    return response.data.server;
  } catch (error) {
    console.error('Error updating server:', error);
    throw error;
  }
};

// Delete an MCP server
export const deleteMCPServer = async (id: string): Promise<void> => {
  try {
    console.log('Deleting server:', id);
    const response = await api.delete(`/mcp/servers/${id}`);
    console.log('Delete server response:', response.data);
  } catch (error) {
    console.error('Error deleting server:', error);
    throw error;
  }
};

// Discovery API functions
export const scanForServers = async (organizationId: string): Promise<{ message: string; status: string }> => {
  try {
    console.log('Starting server discovery scan...');
    const response = await api.post('/discovery/scan', { organization_id: organizationId });
    console.log('Discovery scan response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error starting discovery scan:', error);
    throw error;
  }
};

export const getDiscoveryStatus = async (): Promise<{ status: string; last_scan: string; message: string }> => {
  try {
    const response = await api.get('/discovery/status');
    return response.data;
  } catch (error) {
    console.error('Error getting discovery status:', error);
    throw error;
  }
};

export const startPeriodicDiscovery = async (organizationId: string, intervalMinutes: number = 30): Promise<{ message: string; interval_minutes: number; status: string }> => {
  try {
    console.log('Starting periodic discovery...');
    const response = await api.post('/discovery/start-periodic', { 
      organization_id: organizationId,
      interval_minutes: intervalMinutes 
    });
    console.log('Periodic discovery response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error starting periodic discovery:', error);
    throw error;
  }
};

export const stopPeriodicDiscovery = async (): Promise<{ message: string; status: string }> => {
  try {
    console.log('Stopping periodic discovery...');
    const response = await api.post('/discovery/stop-periodic');
    console.log('Stop discovery response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error stopping periodic discovery:', error);
    throw error;
  }
};

// Comprehensive Health Monitoring API functions
export const getComprehensiveHealth = async (serverId: string): Promise<any> => {
  try {
    console.log('Getting comprehensive health for server:', serverId);
    const response = await api.get(`/health/comprehensive/${serverId}`);
    console.log('Comprehensive health response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error getting comprehensive health:', error);
    throw error;
  }
};

export const performComprehensiveCheck = async (serverId: string): Promise<any> => {
  try {
    console.log('Performing comprehensive health check for server:', serverId);
    const response = await api.post(`/health/comprehensive/${serverId}`);
    console.log('Comprehensive check response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error performing comprehensive check:', error);
    throw error;
  }
};

export const getHealthMetrics = async (serverId: string): Promise<any> => {
  try {
    console.log('Getting health metrics for server:', serverId);
    const response = await api.get(`/health/metrics/${serverId}`);
    console.log('Health metrics response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error getting health metrics:', error);
    throw error;
  }
};

export const getHealthAlerts = async (severity?: string, resolved?: boolean): Promise<any> => {
  try {
    console.log('Getting health alerts...');
    const params = new URLSearchParams();
    if (severity) params.append('severity', severity);
    if (resolved !== undefined) params.append('resolved', resolved.toString());
    
    const response = await api.get(`/health/alerts?${params.toString()}`);
    console.log('Health alerts response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error getting health alerts:', error);
    throw error;
  }
};

export const resolveHealthAlert = async (alertId: string): Promise<any> => {
  try {
    console.log('Resolving health alert:', alertId);
    const response = await api.post(`/health/alerts/${alertId}/resolve`);
    console.log('Resolve alert response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error resolving health alert:', error);
    throw error;
  }
};

export const getHealthDashboard = async (): Promise<any> => {
  try {
    console.log('Getting health dashboard...');
    const response = await api.get('/health/dashboard');
    console.log('Health dashboard response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error getting health dashboard:', error);
    throw error;
  }
};

export const getHealthTrends = async (serverId: string, days: number = 7): Promise<any> => {
  try {
    console.log('Getting health trends for server:', serverId, 'days:', days);
    const response = await api.get(`/health/trends/${serverId}?days=${days}`);
    console.log('Health trends response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error getting health trends:', error);
    throw error;
  }
};

// Registry API functions
export const registerServer = async (serverData: any): Promise<any> => {
  try {
    console.log('Registering server:', serverData);
    const response = await api.post('/registry/servers', serverData);
    console.log('Register server response:', response.data);
  return response.data;
  } catch (error) {
    console.error('Error registering server:', error);
    throw error;
  }
};

export const searchServers = async (options: any = {}): Promise<any> => {
  try {
    console.log('Searching servers with options:', options);
    const params = new URLSearchParams();
    Object.keys(options).forEach(key => {
      if (options[key] !== undefined && options[key] !== null) {
        params.append(key, options[key]);
      }
    });
    
    const response = await api.get(`/registry/servers?${params.toString()}`);
    console.log('Search servers response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error searching servers:', error);
    throw error;
  }
};

export const getRegistryServer = async (serverId: string): Promise<any> => {
  try {
    console.log('Getting registry server:', serverId);
    const response = await api.get(`/registry/servers/${serverId}`);
    console.log('Get registry server response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error getting registry server:', error);
    throw error;
  }
};

export const updateRegistryServer = async (serverId: string, serverData: any): Promise<any> => {
  try {
    console.log('Updating registry server:', serverId, serverData);
    const response = await api.put(`/registry/servers/${serverId}`, serverData);
    console.log('Update registry server response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error updating registry server:', error);
    throw error;
  }
};

export const unregisterServer = async (serverId: string): Promise<any> => {
  try {
    console.log('Unregistering server:', serverId);
    const response = await api.delete(`/registry/servers/${serverId}`);
    console.log('Unregister server response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error unregistering server:', error);
    throw error;
  }
};

export const getRegistryStats = async (): Promise<any> => {
  try {
    console.log('Getting registry stats...');
    const response = await api.get('/registry/stats');
    console.log('Registry stats response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error getting registry stats:', error);
    throw error;
  }
};

export const getRegistryCapabilities = async (): Promise<any> => {
  try {
    console.log('Getting registry capabilities...');
    const response = await api.get('/registry/capabilities');
    console.log('Registry capabilities response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error getting registry capabilities:', error);
    throw error;
  }
};

export const getRegistryServerTypes = async (): Promise<any> => {
  try {
    console.log('Getting registry server types...');
    const response = await api.get('/registry/types');
    console.log('Registry server types response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error getting registry server types:', error);
    throw error;
  }
};

export const getServersByType = async (serverType: string): Promise<any> => {
  try {
    console.log('Getting servers by type:', serverType);
    const response = await api.get(`/registry/servers/type/${serverType}`);
    console.log('Servers by type response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error getting servers by type:', error);
    throw error;
  }
};

export const getServersByOrganization = async (organizationId: string): Promise<any> => {
  try {
    console.log('Getting servers by organization:', organizationId);
    const response = await api.get(`/registry/servers/organization/${organizationId}`);
    console.log('Servers by organization response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error getting servers by organization:', error);
    throw error;
  }
};

export const getServersByCapability = async (capability: string): Promise<any> => {
  try {
    console.log('Getting servers by capability:', capability);
    const response = await api.get(`/registry/servers/capability/${capability}`);
    console.log('Servers by capability response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error getting servers by capability:', error);
    throw error;
  }
};

export const updateServerHealth = async (serverId: string, healthData: any): Promise<any> => {
  try {
    console.log('Updating server health:', serverId, healthData);
    const response = await api.put(`/registry/servers/${serverId}/health`, healthData);
    console.log('Update server health response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error updating server health:', error);
    throw error;
  }
};
