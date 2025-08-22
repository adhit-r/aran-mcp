import { ServerReputationScore } from '../../reputation/types';

export type TrafficEventType = 
  | 'request'
  | 'response'
  | 'error'
  | 'security_alert'
  | 'rate_limit'
  | 'authentication'
  | 'authorization';

export interface TrafficEvent {
  id: string;
  timestamp: Date;
  type: TrafficEventType;
  source: {
    ip: string;
    userAgent?: string;
    userId?: string;
    sessionId?: string;
  };
  target: {
    method: string;
    path: string;
    endpoint: string;
    statusCode?: number;
  };
  metrics: {
    duration: number; // ms
    requestSize: number; // bytes
    responseSize: number; // bytes
  };
  metadata: {
    correlationId?: string;
    requestId?: string;
    protocol?: string;
    headers?: Record<string, string>;
    query?: Record<string, any>;
    params?: Record<string, any>;
    body?: any;
    response?: any;
    error?: {
      message: string;
      stack?: string;
      code?: string | number;
    };
    securityContext?: {
      isAuthenticated: boolean;
      scopes?: string[];
      roles?: string[];
      reputation?: ServerReputationScore;
    };
    threatIntelligence?: {
      isMalicious: boolean;
      riskScore: number;
      matchedRules: Array<{
        id: string;
        name: string;
        description: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
      }>;
    };
  };
}

export interface TrafficStats {
  totalRequests: number;
  totalErrors: number;
  totalAlerts: number;
  avgResponseTime: number;
  requestRate: number; // requests per second
  errorRate: number; // errors per second
  statusCodes: Record<number, number>;
  endpoints: Record<string, number>;
  methods: Record<string, number>;
  users: Record<string, number>;
  ipAddresses: Record<string, number>;
  userAgents: Record<string, number>;
  errorTypes: Record<string, number>;
  securityAlerts: Record<string, number>;
}

export interface TimeSeriesData {
  timestamp: Date;
  value: number;
}

export interface TrafficTimeSeries {
  requests: TimeSeriesData[];
  errors: TimeSeriesData[];
  responseTimes: TimeSeriesData[];
  securityAlerts: TimeSeriesData[];
  dataTransferred: TimeSeriesData[];
}

export interface TrafficFilterOptions {
  startTime?: Date;
  endTime?: Date;
  types?: TrafficEventType[];
  statusCodes?: number[];
  methods?: string[];
  endpoints?: string[];
  userIds?: string[];
  ipAddresses?: string[];
  minDuration?: number;
  maxDuration?: number;
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

export interface TrafficAnalysisResult {
  events: TrafficEvent[];
  stats: TrafficStats;
  timeSeries: TrafficTimeSeries;
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  condition: (event: TrafficEvent, context?: any) => boolean;
  action: (event: TrafficEvent, context?: any) => Promise<void>;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardConfig {
  refreshInterval: number; // ms
  maxDataPoints: number;
  timeRange: {
    value: number;
    unit: 'minutes' | 'hours' | 'days';
  };
  widgets: DashboardWidget[];
}

export type WidgetType = 
  | 'line_chart'
  | 'bar_chart'
  | 'pie_chart'
  | 'metric'
  | 'table'
  | 'heatmap';

export interface DashboardWidget {
  id: string;
  title: string;
  type: WidgetType;
  description?: string;
  dataSource: 'traffic' | 'security' | 'performance' | 'custom';
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  config: any;
  refreshRate?: number;
}
