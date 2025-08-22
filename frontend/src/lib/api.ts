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

// Add more API calls as needed
