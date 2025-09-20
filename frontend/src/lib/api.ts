import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

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

export const fetchServers = async (): Promise<MCPServer[]> => {
  try {
    const response = await api.get('/mcp/servers');
    return response.data;
  } catch (error) {
    console.error('Error fetching servers:', error);
    // Return mock data when backend is not available
    return [
      {
        id: '1',
        name: 'Mock Server 1',
        url: 'http://localhost:8081',
        status: 'online',
        lastChecked: new Date().toISOString(),
        responseTime: 120,
        uptime: 99.9,
        errorRate: 0.1,
        version: '1.0.0'
      },
      {
        id: '2',
        name: 'Mock Server 2',
        url: 'http://localhost:8082',
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

export async function login(credentials: LoginRequest): Promise<AuthResponse> {
  const response = await axios.post(`${API_BASE_URL}/auth/login`, credentials);
  return response.data;
}

export async function logout(): Promise<void> {
  await axios.post(`${API_BASE_URL}/auth/logout`);
}

export async function getCurrentUser(): Promise<AuthResponse['user']> {
  const response = await axios.get(`${API_BASE_URL}/auth/me`);
  return response.data;
}
