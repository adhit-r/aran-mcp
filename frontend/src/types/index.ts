export interface MCPServer {
  id: string;
  name: string;
  host?: string;
  port?: number;
  tags?: string[];
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Server extends MCPServer {
  host: string;
  port: number;
}

export interface ServerStatus {
  serverId: string;
  status: 'online' | 'offline' | 'error' | 'unknown';
  responseTime?: number;
  lastChecked: string;
  lastError?: string;
}

export interface Alert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  serverId?: string;
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  lastUsed?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}
