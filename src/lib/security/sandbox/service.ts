import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { 
  SandboxStatus, 
  SandboxLevel, 
  SandboxTrigger,
  SandboxPolicy,
  SandboxedServer,
  SandboxViolation,
  SandboxMetrics
} from './types';

// Default sandbox policies
const DEFAULT_POLICIES: SandboxPolicy[] = [
  {
    id: 'default-monitoring',
    name: 'Default Monitoring',
    description: 'Basic monitoring for all servers',
    conditions: {
      minReputationScore: 300,
      maxErrorRate: 10, // 10% error rate
    },
    sandboxLevel: 'light',
    actions: {
      notifyAdmins: true,
      logEvent: true,
      alertOn: ['enter', 'violation'],
    },
    restrictions: {
      networkAccess: true,
      fileSystemAccess: true,
      processCreation: true,
      memoryUsage: 1024, // 1GB
      cpuUsage: 50, // 50%
      executionTime: 30000, // 30 seconds
    },
    autoRelease: {
      enabled: true,
      afterSeconds: 3600, // 1 hour
      conditions: {
        minReputationScore: 500,
        noThreatsForSeconds: 1800, // 30 minutes
      },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    isActive: true,
  },
  {
    id: 'high-risk-isolation',
    name: 'High Risk Isolation',
    description: 'Strict isolation for high-risk servers',
    conditions: {
      minReputationScore: 100,
      threatIntelMatches: ['malware', 'exploit', 'c2'],
      anomalyScoreThreshold: 0.8,
    },
    sandboxLevel: 'strict',
    actions: {
      notifyAdmins: true,
      notifyUsers: true,
      logEvent: true,
      alertOn: ['enter', 'exit', 'violation'],
    },
    restrictions: {
      networkAccess: false,
      fileSystemAccess: false,
      processCreation: false,
      memoryUsage: 256, // 256MB
      cpuUsage: 20, // 20%
      executionTime: 10000, // 10 seconds
    },
    autoRelease: {
      enabled: false, // Manual release required
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    isActive: true,
  },
];

// Map of sandbox levels to restrictions
const SANDBOX_LEVEL_RESTRICTIONS: Record<SandboxLevel, SandboxPolicy['restrictions']> = {
  none: {
    networkAccess: true,
    fileSystemAccess: true,
    processCreation: true,
    memoryUsage: 4096, // 4GB
    cpuUsage: 100, // 100%
    executionTime: 0, // No limit
  },
  light: {
    networkAccess: true,
    fileSystemAccess: true,
    processCreation: true,
    memoryUsage: 2048, // 2GB
    cpuUsage: 80, // 80%
    executionTime: 60000, // 1 minute
  },
  moderate: {
    networkAccess: true,
    fileSystemAccess: false,
    processCreation: false,
    memoryUsage: 1024, // 1GB
    cpuUsage: 50, // 50%
    executionTime: 30000, // 30 seconds
  },
  strict: {
    networkAccess: false,
    fileSystemAccess: false,
    processCreation: false,
    memoryUsage: 512, // 512MB
    cpuUsage: 30, // 30%
    executionTime: 10000, // 10 seconds
  },
};

export class SandboxManager extends EventEmitter {
  private sandboxedServers: Map<string, SandboxedServer> = new Map();
  private policies: Map<string, SandboxPolicy> = new Map();
  private violations: Map<string, SandboxViolation> = new Map();
  private metrics: SandboxMetrics = this.getInitialMetrics();
  
  constructor() {
    super();
    this.initializeDefaultPolicies();
  }
  
  private initializeDefaultPolicies() {
    DEFAULT_POLICIES.forEach(policy => {
      this.policies.set(policy.id, policy);
    });
  }
  
  private getInitialMetrics(): SandboxMetrics {
    return {
      totalSandboxed: 0,
      byStatus: {
        active: 0,
        quarantined: 0,
        monitoring: 0,
        released: 0,
        error: 0,
        disabled: 0,
      },
      byLevel: {
        none: 0,
        light: 0,
        moderate: 0,
        strict: 0,
      },
      violationsByType: {},
      violationsBySeverity: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      },
      avgTimeInSandbox: 0,
      autoReleasedCount: 0,
      manuallyReleasedCount: 0,
      threatPreventedCount: 0,
    };
  }
  
  // Server Management
  
  async sandboxServer(
    serverId: string, 
    serverName: string, 
    level: SandboxLevel,
    trigger: SandboxTrigger,
    metadata: Record<string, any> = {},
    userId?: string
  ): Promise<SandboxedServer> {
    // Check if server is already sandboxed
    const existing = this.sandboxedServers.get(serverId);
    if (existing && existing.status !== 'released') {
      return this.updateSandboxLevel(serverId, level, trigger, metadata, userId);
    }
    
    // Apply restrictions based on level
    const restrictions = this.getRestrictionsForLevel(level);
    
    const now = new Date();
    const sandboxedServer: SandboxedServer = {
      id: `sbx_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      serverId,
      serverName,
      status: 'active',
      level,
      currentRestrictions: restrictions,
      stats: {
        violations: 0,
        threatsBlocked: 0,
        startTime: now,
      },
      history: [{
        timestamp: now,
        event: 'created',
        details: `Server placed in ${level} sandbox`,
        triggeredBy: trigger,
        metadata,
      }],
      policyIds: [],
      createdAt: now,
      updatedAt: now,
      createdBy: userId || 'system',
    };
    
    // Apply matching policies
    const matchingPolicies = this.getMatchingPolicies(serverId, metadata);
    matchingPolicies.forEach(policy => {
      sandboxedServer.policyIds.push(policy.id);
      this.applyPolicy(sandboxedServer, policy, trigger, userId);
    });
    
    // Save the sandboxed server
    this.sandboxedServers.set(serverId, sandboxedServer);
    
    // Update metrics
    this.updateMetrics('sandboxed', sandboxedServer);
    
    // Emit event
    this.emit('sandbox:created', sandboxedServer);
    
    return sandboxedServer;
  }
  
  async updateSandboxLevel(
    serverId: string,
    newLevel: SandboxLevel,
    trigger: SandboxTrigger,
    metadata: Record<string, any> = {},
    userId?: string
  ): Promise<SandboxedServer> {
    const server = this.sandboxedServers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} is not sandboxed`);
    }
    
    if (server.level === newLevel) {
      return server; // No change needed
    }
    
    const oldLevel = server.level;
    const now = new Date();
    
    // Update server with new level and restrictions
    server.level = newLevel;
    server.currentRestrictions = this.getRestrictionsForLevel(newLevel);
    server.updatedAt = now;
    server.history.push({
      timestamp: now,
      event: 'level_changed',
      details: `Sandbox level changed from ${oldLevel} to ${newLevel}`,
      triggeredBy: trigger,
      metadata,
    });
    
    // Update metrics
    this.updateMetrics('level_changed', server, { oldLevel });
    
    // Emit event
    this.emit('sandbox:updated', server, { oldLevel });
    
    return server;
  }
  
  async releaseServer(
    serverId: string, 
    reason: string, 
    userId?: string
  ): Promise<SandboxedServer> {
    const server = this.sandboxedServers.get(serverId);
    if (!server || server.status === 'released') {
      throw new Error(`Server ${serverId} is not currently sandboxed`);
    }
    
    const now = new Date();
    
    // Update server status
    server.status = 'released';
    server.updatedAt = now;
    server.releasedAt = now;
    server.releasedBy = userId || 'system';
    server.history.push({
      timestamp: now,
      event: 'released',
      details: `Server released from sandbox: ${reason}`,
      triggeredBy: 'manual',
      metadata: { reason, releasedBy: userId },
    });
    
    // Update metrics
    this.updateMetrics('released', server);
    
    // Emit event
    this.emit('sandbox:released', server, { reason });
    
    return server;
  }
  
  // Policy Management
  
  addPolicy(policy: Omit<SandboxPolicy, 'id' | 'createdAt' | 'updatedAt'>): string {
    const id = `pol_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date();
    
    const newPolicy: SandboxPolicy = {
      ...policy,
      id,
      createdAt: now,
      updatedAt: now,
    };
    
    this.policies.set(id, newPolicy);
    this.emit('policy:added', newPolicy);
    
    return id;
  }
  
  updatePolicy(id: string, updates: Partial<Omit<SandboxPolicy, 'id' | 'createdAt'>>): boolean {
    const policy = this.policies.get(id);
    if (!policy) return false;
    
    const updatedPolicy = {
      ...policy,
      ...updates,
      updatedAt: new Date(),
    };
    
    this.policies.set(id, updatedPolicy);
    this.emit('policy:updated', updatedPolicy);
    
    return true;
  }
  
  removePolicy(id: string): boolean {
    const policy = this.policies.get(id);
    if (!policy) return false;
    
    // Don't allow removing active policies that are in use
    const inUse = Array.from(this.sandboxedServers.values()).some(
      server => server.policyIds.includes(id)
    );
    
    if (inUse) {
      throw new Error('Cannot remove policy that is in use by sandboxed servers');
    }
    
    this.policies.delete(id);
    this.emit('policy:removed', id);
    
    return true;
  }
  
  getPolicy(id: string): SandboxPolicy | undefined {
    return this.policies.get(id);
  }
  
  listPolicies(activeOnly: boolean = true): SandboxPolicy[] {
    const policies = Array.from(this.policies.values());
    return activeOnly ? policies.filter(p => p.isActive) : policies;
  }
  
  // Violation Handling
  
  async recordViolation(
    serverId: string,
    violationType: SandboxViolation['violationType'],
    severity: SandboxViolation['severity'],
    description: string,
    details: any = {},
    actionTaken: string = 'Blocked',
    policyIds: string[] = []
  ): Promise<SandboxViolation> {
    const server = this.sandboxedServers.get(serverId);
    if (!server || server.status === 'released') {
      throw new Error(`Server ${serverId} is not currently sandboxed`);
    }
    
    const now = new Date();
    const violation: SandboxViolation = {
      id: `viol_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      serverId,
      timestamp: now,
      violationType,
      severity,
      description,
      details,
      actionTaken,
      policyIds,
      isResolved: false,
    };
    
    // Save violation
    this.violations.set(violation.id, violation);
    
    // Update server stats
    server.stats.violations++;
    if (severity === 'critical' || severity === 'high') {
      server.stats.threatsBlocked++;
    }
    server.stats.lastViolationTime = now;
    server.updatedAt = now;
    
    // Add to history
    server.history.push({
      timestamp: now,
      event: 'violation',
      details: `Security violation: ${description}`,
      triggeredBy: 'policy',
      metadata: { violationId: violation.id, severity },
    });
    
    // Update metrics
    this.metrics.violationsByType[violationType] = (this.metrics.violationsByType[violationType] || 0) + 1;
    this.metrics.violationsBySeverity[severity]++;
    
    // Emit event
    this.emit('violation:recorded', violation, server);
    
    // Check if we need to escalate sandbox level
    await this.checkForEscalation(server, violation);
    
    return violation;
  }
  
  async resolveViolation(violationId: string, resolvedBy: string, notes: string = ''): Promise<void> {
    const violation = this.violations.get(violationId);
    if (!violation) {
      throw new Error(`Violation ${violationId} not found`);
    }
    
    if (violation.isResolved) {
      return; // Already resolved
    }
    
    violation.isResolved = true;
    violation.resolvedAt = new Date();
    violation.resolvedBy = resolvedBy;
    violation.resolutionNotes = notes;
    
    // Emit event
    this.emit('violation:resolved', violation);
  }
  
  // Helper Methods
  
  private getRestrictionsForLevel(level: SandboxLevel): SandboxedServer['currentRestrictions'] {
    return { ...SANDBOX_LEVEL_RESTRICTIONS[level] };
  }
  
  private getMatchingPolicies(serverId: string, metadata: Record<string, any> = {}): SandboxPolicy[] {
    // In a real implementation, this would evaluate conditions against server metrics, reputation, etc.
    return Array.from(this.policies.values()).filter(policy => policy.isActive);
  }
  
  private applyPolicy(
    server: SandboxedServer, 
    policy: SandboxPolicy, 
    trigger: SandboxTrigger,
    userId?: string
  ): void {
    // Apply the most restrictive settings between current and policy
    const current = server.currentRestrictions;
    const policyRestrictions = this.getRestrictionsForLevel(policy.sandboxLevel);
    
    // Merge restrictions (take the most restrictive option)
    server.currentRestrictions = {
      networkAccess: current.networkAccess && policyRestrictions.networkAccess,
      fileSystemAccess: current.fileSystemAccess && policyRestrictions.fileSystemAccess,
      processCreation: current.processCreation && policyRestrictions.processCreation,
      memoryLimitMB: Math.min(current.memoryLimitMB, policyRestrictions.memoryUsage),
      cpuLimitPercent: Math.min(current.cpuLimitPercent, policyRestrictions.cpuUsage),
      executionTimeLimitMs: Math.min(
        current.executionTimeLimitMs || Infinity, 
        policyRestrictions.executionTime || Infinity
      ) || current.executionTimeLimitMs,
    };
    
    // Update server level if policy is more restrictive
    const policyLevelValue = Object.keys(SANDBOX_LEVEL_RESTRICTIONS).indexOf(policy.sandboxLevel);
    const currentLevelValue = Object.keys(SANDBOX_LEVEL_RESTRICTIONS).indexOf(server.level);
    
    if (policyLevelValue > currentLevelValue) {
      server.level = policy.sandboxLevel;
    }
    
    // Log policy application
    server.history.push({
      timestamp: new Date(),
      event: 'policy_applied',
      details: `Applied policy: ${policy.name}`,
      triggeredBy: trigger,
      metadata: { policyId: policy.id },
    });
    
    // Apply auto-release settings if configured
    if (policy.autoRelease?.enabled && policy.autoRelease.afterSeconds) {
      const releaseTime = new Date(Date.now() + policy.autoRelease.afterSeconds * 1000);
      server.autoRelease = {
        scheduledAt: releaseTime,
        conditions: policy.autoRelease.conditions || {},
      };
      
      // Schedule auto-release
      setTimeout(async () => {
        try {
          await this.checkAutoRelease(server, policy);
        } catch (error) {
          console.error('Error during auto-release check:', error);
        }
      }, policy.autoRelease.afterSeconds * 1000);
    }
  }
  
  private async checkAutoRelease(server: SandboxedServer, policy: SandboxPolicy): Promise<void> {
    if (server.status === 'released' || !server.autoRelease) {
      return; // Already released or auto-release not configured
    }
    
    const conditions = server.autoRelease.conditions;
    let canRelease = true;
    
    // Check conditions
    if (conditions.minReputationScore) {
      // In a real implementation, we would check the server's current reputation score
      // const currentScore = await this.getServerReputationScore(server.serverId);
      // canRelease = canRelease && (currentScore >= conditions.minReputationScore);
    }
    
    if (conditions.noThreatsForSeconds) {
      // Check if there have been any recent violations
      const timeThreshold = new Date(Date.now() - conditions.noThreatsForSeconds * 1000);
      const recentViolations = Array.from(this.violations.values()).filter(
        v => v.serverId === server.serverId && v.timestamp > timeThreshold
      );
      
      canRelease = canRelease && recentViolations.length === 0;
    }
    
    if (canRelease) {
      await this.releaseServer(
        server.serverId, 
        'Auto-released based on policy conditions',
        'system'
      );
      
      // Update metrics
      this.metrics.autoReleasedCount++;
    } else {
      // Reschedule check
      server.autoRelease.scheduledAt = new Date(Date.now() + 300000); // Check again in 5 minutes
      
      setTimeout(() => {
        this.checkAutoRelease(server, policy);
      }, 300000);
    }
  }
  
  private async checkForEscalation(server: SandboxedServer, violation: SandboxViolation): Promise<void> {
    // In a real implementation, this would evaluate the violation and potentially escalate the sandbox level
    // For example, multiple high-severity violations might trigger a stricter sandbox level
    
    if (violation.severity === 'critical' && server.level !== 'strict') {
      await this.updateSandboxLevel(
        server.serverId, 
        'strict', 
        'policy', 
        { 
          reason: 'Critical security violation detected',
          violationId: violation.id 
        },
        'system'
      );
    }
  }
  
  private updateMetrics(
    action: 'sandboxed' | 'released' | 'level_changed' | 'violation',
    server: SandboxedServer,
    metadata: any = {}
  ): void {
    // Update status counts
    if (action === 'sandboxed') {
      this.metrics.byStatus[server.status]++;
      this.metrics.byLevel[server.level]++;
      this.metrics.totalSandboxed++;
    } 
    else if (action === 'released') {
      this.metrics.byStatus[server.status]--;
      this.metrics.byStatus.released++;
      
      // Update average time in sandbox
      const timeInSandbox = (new Date().getTime() - server.stats.startTime.getTime()) / 3600000; // hours
      const totalSandboxed = this.metrics.totalSandboxed;
      this.metrics.avgTimeInSandbox = 
        (this.metrics.avgTimeInSandbox * (totalSandboxed - 1) + timeInSandbox) / totalSandboxed;
      
      // Update release count
      if (metadata.triggeredBy === 'manual') {
        this.metrics.manuallyReleasedCount++;
      }
    }
    else if (action === 'level_changed') {
      // Update level counts
      this.metrics.byLevel[metadata.oldLevel]--;
      this.metrics.byLevel[server.level]++;
    }
    else if (action === 'violation' && server.stats.threatsBlocked > 0) {
      this.metrics.threatPreventedCount = Array.from(this.sandboxedServers.values())
        .reduce((sum, s) => sum + s.stats.threatsBlocked, 0);
    }
  }
  
  // Public API
  
  getSandboxedServer(serverId: string): SandboxedServer | undefined {
    return this.sandboxedServers.get(serverId);
  }
  
  listSandboxedServers(status?: SandboxStatus): SandboxedServer[] {
    const servers = Array.from(this.sandboxedServers.values());
    return status ? servers.filter(s => s.status === status) : servers;
  }
  
  getViolations(serverId?: string, resolved: boolean = false): SandboxViolation[] {
    const violations = Array.from(this.violations.values());
    
    let filtered = violations;
    if (serverId) {
      filtered = filtered.filter(v => v.serverId === serverId);
    }
    
    return filtered.filter(v => v.isResolved === resolved);
  }
  
  getMetrics(): SandboxMetrics {
    return { ...this.metrics };
  }
  
  // Integration with other systems
  
  async checkServerForSandboxing(
    serverId: string, 
    serverName: string, 
    metrics: {
      reputationScore?: number;
      errorRate?: number;
      threatMatches?: string[];
      anomalyScore?: number;
    }
  ): Promise<{ shouldSandbox: boolean; level?: SandboxLevel; reason: string }> {
    // Check all active policies to see if any conditions are met
    for (const policy of this.listPolicies(true)) {
      const { conditions } = policy;
      let conditionsMet = 0;
      let totalConditions = 0;
      
      if (conditions.minReputationScore !== undefined) {
        totalConditions++;
        if (metrics.reputationScore !== undefined && metrics.reputationScore < conditions.minReputationScore) {
          conditionsMet++;
        }
      }
      
      if (conditions.maxErrorRate !== undefined) {
        totalConditions++;
        if (metrics.errorRate !== undefined && metrics.errorRate > conditions.maxErrorRate) {
          conditionsMet++;
        }
      }
      
      if (conditions.threatIntelMatches?.length) {
        totalConditions++;
        if (metrics.threatMatches?.some(match => 
          conditions.threatIntelMatches!.includes(match)
        )) {
          conditionsMet++;
        }
      }
      
      if (conditions.anomalyScoreThreshold !== undefined) {
        totalConditions++;
        if (metrics.anomalyScore !== undefined && metrics.anomalyScore > conditions.anomalyScoreThreshold) {
          conditionsMet++;
        }
      }
      
      // If any conditions are met, sandbox the server
      if (conditionsMet > 0) {
        return {
          shouldSandbox: true,
          level: policy.sandboxLevel,
          reason: `Matched ${conditionsMet} condition(s) in policy: ${policy.name}`,
        };
      }
    }
    
    return { shouldSandbox: false, reason: 'No matching policies' };
  }
  
  // Cleanup
  cleanup() {
    this.removeAllListeners();
  }
}

// Singleton instance
export const sandboxManager = new SandboxManager();
