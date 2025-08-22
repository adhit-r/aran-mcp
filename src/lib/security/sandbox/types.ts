export type SandboxStatus = 
  | 'active'          // Sandbox is active and monitoring
  | 'quarantined'     // Server is fully isolated
  | 'monitoring'      // Server is being monitored but not yet sandboxed
  | 'released'        // Server has been released from sandbox
  | 'error'           // Error occurred during sandboxing
  | 'disabled';       // Sandbox feature is disabled for this server

export type SandboxLevel = 
  | 'none'            // No sandboxing
  | 'light'           // Minimal restrictions, monitoring only
  | 'moderate'        // Some restrictions, limited access
  | 'strict';         // Full isolation, maximum restrictions

export type SandboxTrigger = 
  | 'manual'          // Manually triggered by admin
  | 'reputation'      // Triggered by low reputation score
  | 'threat_intel'    // Triggered by threat intelligence
  | 'anomaly'         // Triggered by anomalous behavior
  | 'policy'          // Triggered by security policy
  | 'rate_limit';     // Triggered by rate limiting

export interface SandboxPolicy {
  id: string;
  name: string;
  description: string;
  
  // Conditions for auto-sandboxing
  conditions: {
    minReputationScore?: number;  // Sandbox if score is below this
    maxErrorRate?: number;        // Sandbox if error rate is above this
    threatIntelMatches?: string[]; // Sandbox if any of these threat intel matches
    anomalyScoreThreshold?: number; // Sandbox if anomaly score is above this
  };
  
  // Sandbox level to apply when conditions are met
  sandboxLevel: SandboxLevel;
  
  // Actions to take when sandboxing
  actions: {
    notifyAdmins: boolean;
    notifyUsers?: boolean;
    logEvent: boolean;
    alertOn: ('enter' | 'exit' | 'violation')[];
  };
  
  // Restrictions to apply in sandbox
  restrictions: {
    networkAccess: boolean;       // Allow outbound network access
    fileSystemAccess: boolean;    // Allow filesystem access
    processCreation: boolean;     // Allow new processes
    memoryUsage: number;          // Max memory in MB
    cpuUsage: number;            // Max CPU percentage
    executionTime: number;       // Max execution time in ms
  };
  
  // Auto-release settings
  autoRelease: {
    enabled: boolean;
    afterSeconds?: number;        // Auto-release after this many seconds
    conditions?: {
      minReputationScore?: number; // Only auto-release if score is above this
      noThreatsForSeconds?: number; // No threats detected for this many seconds
    };
  };
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  isActive: boolean;
}

export interface SandboxedServer {
  id: string;
  serverId: string;
  serverName: string;
  status: SandboxStatus;
  level: SandboxLevel;
  
  // Current restrictions
  currentRestrictions: {
    networkAccess: boolean;
    fileSystemAccess: boolean;
    processCreation: boolean;
    memoryLimitMB: number;
    cpuLimitPercent: number;
    executionTimeLimitMs: number;
  };
  
  // Statistics
  stats: {
    violations: number;
    threatsBlocked: number;
    startTime: Date;
    lastViolationTime?: Date;
  };
  
  // History of sandbox events
  history: Array<{
    timestamp: Date;
    event: 'created' | 'level_changed' | 'violation' | 'released' | 'error';
    details: string;
    triggeredBy: SandboxTrigger;
    metadata?: Record<string, any>;
  }>;
  
  // Associated policies
  policyIds: string[];
  
  // Auto-release information
  autoRelease?: {
    scheduledAt: Date;
    conditions: Record<string, any>;
  };
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  releasedAt?: Date;
  releasedBy?: string;
}

export interface SandboxViolation {
  id: string;
  serverId: string;
  timestamp: Date;
  violationType: 'network' | 'filesystem' | 'process' | 'resource' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  details: any;
  actionTaken: string;
  policyIds: string[];
  isResolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolutionNotes?: string;
}

export interface SandboxMetrics {
  totalSandboxed: number;
  byStatus: Record<SandboxStatus, number>;
  byLevel: Record<SandboxLevel, number>;
  violationsByType: Record<string, number>;
  violationsBySeverity: Record<string, number>;
  avgTimeInSandbox: number; // in hours
  autoReleasedCount: number;
  manuallyReleasedCount: number;
  threatPreventedCount: number;
}
