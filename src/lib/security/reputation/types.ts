export interface ServerReputationScore {
  serverId: string;
  score: number; // 0-1000, where 1000 is most trusted
  confidence: number; // 0-1, confidence in the score
  lastUpdated: Date;
  metrics: {
    responseTime: number; // ms, lower is better
    errorRate: number; // 0-1, lower is better
    securityIncidents: number; // count of security incidents
    uptime: number; // 0-1, higher is better
    communityRating?: number; // 0-5, from user feedback
    complianceScore: number; // 0-1, based on security policies
    threatIntelligenceMatches: number; // count of threat intel matches
  };
  historicalScores: Array<{
    timestamp: Date;
    score: number;
    reason?: string;
  }>;
  riskFactors: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    firstSeen: Date;
    lastSeen: Date;
    isMitigated: boolean;
  }>;
}

export interface ReputationUpdateEvent {
  serverId: string;
  timestamp: Date;
  eventType: 'security_incident' | 'performance_issue' | 'positive_behavior' | 'manual_review';
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  description: string;
  metadata?: Record<string, any>;
  scoreImpact: number; // -100 to +100
}

export interface ReputationEvaluationCriteria {
  weights: {
    responseTime: number;
    errorRate: number;
    securityIncidents: number;
    uptime: number;
    communityRating: number;
    complianceScore: number;
    threatIntelligence: number;
  };
  thresholds: {
    critical: number; // Score below which server is considered high risk
    warning: number;  // Score below which warnings are generated
  };
}
