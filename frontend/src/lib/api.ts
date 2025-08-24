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
    throw error;
  }
};

export const fetchServerStatus = async (serverId: string): Promise<ServerStatus> => {
  try {
    const response = await api.get(`/mcp/servers/${serverId}/status`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching status for server ${serverId}:`, error);
    throw error;
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
  const response = await axios.get(`${API_BASE_URL}/mcp/alerts?limit=${limit}`);
  return response.data;
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
