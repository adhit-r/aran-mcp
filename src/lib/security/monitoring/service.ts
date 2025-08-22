import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { TrafficEvent, TrafficStats, TrafficTimeSeries, TrafficFilterOptions, TrafficAnalysisResult, AlertRule } from './types';
import { ServerReputationScore } from '../../reputation/types';

export class TrafficMonitor extends EventEmitter {
  private events: TrafficEvent[] = [];
  private alertRules: Map<string, AlertRule> = new Map();
  private stats: TrafficStats = this.getInitialStats();
  private timeSeries: TrafficTimeSeries = {
    requests: [],
    errors: [],
    responseTimes: [],
    securityAlerts: [],
    dataTransferred: [],
  };
  private isProcessing = false;
  private processingQueue: TrafficEvent[] = [];
  private statsInterval: NodeJS.Timeout;
  private maxEvents = 10000; // Keep last 10k events in memory
  private timeWindowMs = 5 * 60 * 1000; // 5 minutes for time series data

  constructor() {
    super();
    // Update stats every second
    this.statsInterval = setInterval(() => this.updateTimeSeries(), 1000);
  }

  private getInitialStats(): TrafficStats {
    return {
      totalRequests: 0,
      totalErrors: 0,
      totalAlerts: 0,
      avgResponseTime: 0,
      requestRate: 0,
      errorRate: 0,
      statusCodes: {},
      endpoints: {},
      methods: {},
      users: {},
      ipAddresses: {},
      userAgents: {},
      errorTypes: {},
      securityAlerts: {},
    };
  }

  async recordEvent(event: Omit<TrafficEvent, 'id' | 'timestamp'>): Promise<string> {
    const eventWithId: TrafficEvent = {
      ...event,
      id: uuidv4(),
      timestamp: new Date(),
    };

    // Add to processing queue
    this.processingQueue.push(eventWithId);
    
    // Process events in batches
    if (!this.isProcessing && this.processingQueue.length > 0) {
      await this.processQueue();
    }

    return eventWithId.id;
  }

  private async processQueue() {
    if (this.isProcessing || this.processingQueue.length === 0) return;
    
    this.isProcessing = true;
    
    try {
      // Process up to 100 events at a time
      const batch = this.processingQueue.splice(0, 100);
      
      for (const event of batch) {
        // Add to events array
        this.events.unshift(event);
        
        // Update stats
        this.updateStats(event);
        
        // Check alert rules
        await this.checkAlertRules(event);
        
        // Emit event
        this.emit('event', event);
      }
      
      // Trim old events
      if (this.events.length > this.maxEvents) {
        this.events = this.events.slice(0, this.maxEvents);
      }
      
      // Process next batch if available
      if (this.processingQueue.length > 0) {
        setImmediate(() => this.processQueue());
      }
    } catch (error) {
      console.error('Error processing traffic events:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private updateStats(event: TrafficEvent) {
    const { type, source, target, metrics } = event;
    
    // Update basic counters
    this.stats.totalRequests++;
    
    if (type === 'error') {
      this.stats.totalErrors++;
      const errorType = event.metadata.error?.code?.toString() || 'unknown';
      this.stats.errorTypes[errorType] = (this.stats.errorTypes[errorType] || 0) + 1;
    }
    
    if (type === 'security_alert') {
      this.stats.totalAlerts++;
      const alertType = event.metadata.alertType || 'unknown';
      this.stats.securityAlerts[alertType] = (this.stats.securityAlerts[alertType] || 0) + 1;
    }
    
    // Update status codes
    if (target.statusCode) {
      this.stats.statusCodes[target.statusCode] = (this.stats.statusCodes[target.statusCode] || 0) + 1;
    }
    
    // Update endpoints
    this.stats.endpoints[target.endpoint] = (this.stats.endpoints[target.endpoint] || 0) + 1;
    
    // Update methods
    this.stats.methods[target.method] = (this.stats.methods[target.method] || 0) + 1;
    
    // Update users
    if (source.userId) {
      this.stats.users[source.userId] = (this.stats.users[source.userId] || 0) + 1;
    }
    
    // Update IPs
    this.stats.ipAddresses[source.ip] = (this.stats.ipAddresses[source.ip] || 0) + 1;
    
    // Update user agents
    if (source.userAgent) {
      this.stats.userAgents[source.userAgent] = (this.stats.userAgents[source.userAgent] || 0) + 1;
    }
    
    // Update average response time (exponential moving average)
    const alpha = 0.1; // Smoothing factor
    this.stats.avgResponseTime = alpha * metrics.duration + (1 - alpha) * (this.stats.avgResponseTime || 0);
    
    // Update request rate (calculated in updateTimeSeries)
  }

  private updateTimeSeries() {
    const now = new Date();
    const oneSecondAgo = new Date(now.getTime() - 1000);
    
    // Calculate request rate (requests per second)
    const recentRequests = this.events.filter(
      e => e.timestamp >= oneSecondAgo && e.type === 'request'
    ).length;
    
    this.stats.requestRate = recentRequests;
    
    // Calculate error rate (errors per second)
    const recentErrors = this.events.filter(
      e => e.timestamp >= oneSecondAgo && e.type === 'error'
    ).length;
    
    this.stats.errorRate = recentErrors;
    
    // Add data points to time series
    this.timeSeries.requests.push({
      timestamp: now,
      value: recentRequests,
    });
    
    this.timeSeries.errors.push({
      timestamp: now,
      value: recentErrors,
    });
    
    this.timeSeries.responseTimes.push({
      timestamp: now,
      value: this.stats.avgResponseTime,
    });
    
    // Trim old data points (keep last hour)
    const oneHourAgo = new Date(now.getTime() - 3600000);
    
    const filterOld = (data: Array<{ timestamp: Date }>) => 
      data.filter(item => item.timestamp >= oneHourAgo);
    
    this.timeSeries.requests = filterOld(this.timeSeries.requests);
    this.timeSeries.errors = filterOld(this.timeSeries.errors);
    this.timeSeries.responseTimes = filterOld(this.timeSeries.responseTimes);
    this.timeSeries.securityAlerts = filterOld(this.timeSeries.securityAlerts);
    this.timeSeries.dataTransferred = filterOld(this.timeSeries.dataTransferred);
    
    // Emit stats update
    this.emit('stats', this.stats);
  }

  private async checkAlertRules(event: TrafficEvent) {
    for (const rule of this.alertRules.values()) {
      if (!rule.enabled) continue;
      
      try {
        if (await rule.condition(event, { stats: this.stats })) {
          await rule.action(event, { stats: this.stats });
          
          // Record security alert
          this.recordEvent({
            type: 'security_alert',
            source: event.source,
            target: event.target,
            metrics: event.metrics,
            metadata: {
              ...event.metadata,
              alertType: rule.name,
              alertSeverity: rule.severity,
              alertDescription: rule.description,
            },
          });
        }
      } catch (error) {
        console.error(`Error executing alert rule ${rule.id}:`, error);
      }
    }
  }

  // Public API
  
  async getEvents(filter?: TrafficFilterOptions): Promise<TrafficAnalysisResult> {
    let events = [...this.events];
    
    // Apply filters
    if (filter) {
      const { 
        startTime, 
        endTime, 
        types, 
        statusCodes, 
        methods, 
        endpoints, 
        userIds, 
        ipAddresses,
        minDuration,
        maxDuration,
        searchQuery,
        limit = 100,
        offset = 0,
      } = filter;
      
      events = events.filter(event => {
        // Time filter
        if (startTime && event.timestamp < startTime) return false;
        if (endTime && event.timestamp > endTime) return false;
        
        // Type filter
        if (types && types.length > 0 && !types.includes(event.type)) return false;
        
        // Status code filter
        if (statusCodes && statusCodes.length > 0 && 
            (!event.target.statusCode || !statusCodes.includes(event.target.statusCode))) {
          return false;
        }
        
        // Method filter
        if (methods && methods.length > 0 && !methods.includes(event.target.method)) {
          return false;
        }
        
        // Endpoint filter
        if (endpoints && endpoints.length > 0 && !endpoints.includes(event.target.endpoint)) {
          return false;
        }
        
        // User filter
        if (userIds && userIds.length > 0 && 
            (!event.source.userId || !userIds.includes(event.source.userId))) {
          return false;
        }
        
        // IP filter
        if (ipAddresses && ipAddresses.length > 0 && !ipAddresses.includes(event.source.ip)) {
          return false;
        }
        
        // Duration filter
        if (minDuration !== undefined && event.metrics.duration < minDuration) return false;
        if (maxDuration !== undefined && event.metrics.duration > maxDuration) return false;
        
        // Search query
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const searchableFields = [
            event.source.ip,
            event.source.userAgent,
            event.source.userId,
            event.target.method,
            event.target.path,
            event.target.endpoint,
            event.target.statusCode?.toString(),
            event.metadata.error?.message,
            event.metadata.error?.code?.toString(),
            JSON.stringify(event.metadata.query),
            JSON.stringify(event.metadata.params),
          ].filter(Boolean).join(' ').toLowerCase();
          
          if (!searchableFields.includes(query)) {
            return false;
          }
        }
        
        return true;
      });
    }
    
    // Apply pagination
    const total = events.length;
    const paginatedEvents = events.slice(offset, offset + limit);
    
    return {
      events: paginatedEvents,
      stats: this.stats,
      timeSeries: this.timeSeries,
      pagination: {
        total,
        limit,
        offset,
      },
    };
  }

  getStats(): TrafficStats {
    return { ...this.stats };
  }

  getTimeSeries(): TrafficTimeSeries {
    return JSON.parse(JSON.stringify(this.timeSeries)); // Deep clone
  }

  // Alert rule management
  addAlertRule(rule: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>): string {
    const id = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    
    const newRule: AlertRule = {
      ...rule,
      id,
      createdAt: now,
      updatedAt: now,
    };
    
    this.alertRules.set(id, newRule);
    return id;
  }

  updateAlertRule(id: string, updates: Partial<Omit<AlertRule, 'id' | 'createdAt'>>): boolean {
    const rule = this.alertRules.get(id);
    if (!rule) return false;
    
    this.alertRules.set(id, {
      ...rule,
      ...updates,
      updatedAt: new Date(),
    });
    
    return true;
  }

  removeAlertRule(id: string): boolean {
    return this.alertRules.delete(id);
  }

  getAlertRule(id: string): AlertRule | undefined {
    return this.alertRules.get(id);
  }

  listAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  // Cleanup
  cleanup() {
    clearInterval(this.statsInterval);
    this.removeAllListeners();
  }
}

// Singleton instance
export const trafficMonitor = new TrafficMonitor();
