import { ServerReputationScore, ReputationUpdateEvent, ReputationEvaluationCriteria } from './types';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_CRITERIA: ReputationEvaluationCriteria = {
  weights: {
    responseTime: 0.15,
    errorRate: 0.2,
    securityIncidents: 0.3,
    uptime: 0.15,
    communityRating: 0.1,
    complianceScore: 0.15,
    threatIntelligence: 0.2,
  },
  thresholds: {
    critical: 300,
    warning: 600,
  },
};

export class ReputationService {
  private scores: Map<string, ServerReputationScore> = new Map();
  private criteria: ReputationEvaluationCriteria;
  private eventHistory: ReputationUpdateEvent[] = [];

  constructor(criteria: Partial<ReputationEvaluationCriteria> = {}) {
    this.criteria = { ...DEFAULT_CRITERIA, ...criteria };
  }

  async initialize() {
    // Load existing reputation data from storage
    await this.loadScores();
  }

  private async loadScores() {
    // TODO: Implement loading from persistent storage
  }

  private async saveScores() {
    // TODO: Implement saving to persistent storage
  }

  private calculateScore(metrics: ServerReputationScore['metrics']): number {
    const { weights } = this.criteria;
    
    // Normalize metrics to 0-1 scale (higher is better)
    const normalized = {
      responseTime: 1 - Math.min(1, metrics.responseTime / 1000), // Cap at 1000ms
      errorRate: 1 - metrics.errorRate, // Already 0-1
      securityIncidents: 1 - Math.min(1, metrics.securityIncidents / 10), // Cap at 10 incidents
      uptime: metrics.uptime, // Already 0-1
      communityRating: (metrics.communityRating || 3) / 5, // Normalize 0-5 to 0-1
      complianceScore: metrics.complianceScore, // Already 0-1
      threatIntelligence: 1 - Math.min(1, metrics.threatIntelligenceMatches / 5), // Cap at 5 matches
    };

    // Calculate weighted score (0-1000)
    let score = 0;
    const entries = Object.entries(normalized) as [keyof typeof normalized, number][];
    
    for (const [key, value] of entries) {
      score += value * weights[key] * 1000;
    }

    return Math.max(0, Math.min(1000, Math.round(score)));
  }

  async updateReputation(event: Omit<ReputationUpdateEvent, 'timestamp' | 'id'>): Promise<ServerReputationScore> {
    const timestamp = new Date();
    const eventWithId: ReputationUpdateEvent = {
      ...event,
      timestamp,
      id: uuidv4(),
    };

    this.eventHistory.push(eventWithId);
    
    // Get or create server score
    let score = this.scores.get(event.serverId) || {
      serverId: event.serverId,
      score: 700, // Default starting score
      confidence: 0.7, // Medium confidence
      lastUpdated: timestamp,
      metrics: {
        responseTime: 200,
        errorRate: 0.05,
        securityIncidents: 0,
        uptime: 0.99,
        communityRating: 4,
        complianceScore: 0.8,
        threatIntelligenceMatches: 0,
      },
      historicalScores: [],
      riskFactors: [],
    };

    // Update metrics based on event
    switch (event.eventType) {
      case 'security_incident':
        score.metrics.securityIncidents++;
        if (event.metadata?.threatIntelligenceMatch) {
          score.metrics.threatIntelligenceMatches++;
        }
        break;
      case 'performance_issue':
        if (event.metadata?.responseTime) {
          // Moving average for response time
          score.metrics.responseTime = 
            (score.metrics.responseTime * 0.7) + (event.metadata.responseTime * 0.3);
        }
        if (event.metadata?.errorRate) {
          score.metrics.errorRate = 
            (score.metrics.errorRate * 0.7) + (event.metadata.errorRate * 0.3);
        }
        break;
      case 'positive_behavior':
        // Positive behaviors can improve reputation
        if (event.metadata?.uptime) {
          score.metrics.uptime = 
            (score.metrics.uptime * 0.7) + (event.metadata.uptime * 0.3);
        }
        if (event.metadata?.complianceScore) {
          score.metrics.complianceScore = Math.min(1, 
            score.metrics.complianceScore + (event.metadata.complianceScore * 0.1)
          );
        }
        break;
    }

    // Add risk factor if severity is high enough
    if (['high', 'critical'].includes(event.severity)) {
      const existingRiskIndex = score.riskFactors.findIndex(
        rf => rf.type === event.eventType && !rf.isMitigated
      );
      
      if (existingRiskIndex === -1) {
        score.riskFactors.push({
          type: event.eventType,
          severity: event.severity as 'high' | 'critical',
          description: event.description,
          firstSeen: timestamp,
          lastSeen: timestamp,
          isMitigated: false,
        });
      } else {
        // Update existing risk factor
        const riskFactor = score.riskFactors[existingRiskIndex];
        riskFactor.lastSeen = timestamp;
        riskFactor.severity = event.severity as 'high' | 'critical';
      }
    }

    // Recalculate overall score
    const previousScore = score.score;
    score.score = this.calculateScore(score.metrics);
    score.lastUpdated = timestamp;
    
    // Add to historical scores if significant change (> 10 points)
    if (Math.abs(score.score - previousScore) > 10) {
      score.historicalScores.push({
        timestamp,
        score: score.score,
        reason: `Updated due to: ${event.eventType} (${event.severity})`
      });
      
      // Keep only last 100 historical scores
      if (score.historicalScores.length > 100) {
        score.historicalScores.shift();
      }
    }

    // Update confidence based on data points
    const dataPoints = score.historicalScores.length + 1;
    score.confidence = Math.min(0.99, 0.7 + (dataPoints * 0.005));

    this.scores.set(event.serverId, score);
    await this.saveScores();
    
    return score;
  }

  async getReputation(serverId: string): Promise<ServerReputationScore | undefined> {
    return this.scores.get(serverId);
  }

  async evaluateRisk(serverId: string): Promise<{
    riskLevel: 'critical' | 'high' | 'medium' | 'low' | 'unknown';
    score: number;
    confidence: number;
    activeRisks: Array<{type: string; severity: string; description: string;}>;
  }> {
    const score = await this.getReputation(serverId);
    
    if (!score) {
      return {
        riskLevel: 'unknown',
        score: 0,
        confidence: 0,
        activeRisks: [],
      };
    }

    const activeRisks = score.riskFactors
      .filter(rf => !rf.isMitigated)
      .map(({ type, severity, description }) => ({ type, severity, description }));

    let riskLevel: 'critical' | 'high' | 'medium' | 'low';
    
    if (score.score < this.criteria.thresholds.critical) {
      riskLevel = 'critical';
    } else if (score.score < this.criteria.thresholds.warning) {
      riskLevel = 'high';
    } else if (score.score < 800) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }

    return {
      riskLevel,
      score: score.score,
      confidence: score.confidence,
      activeRisks,
    };
  }

  async mitigateRisk(serverId: string, riskType: string, notes: string): Promise<boolean> {
    const score = this.scores.get(serverId);
    if (!score) return false;

    const riskIndex = score.riskFactors.findIndex(
      rf => rf.type === riskType && !rf.isMitigated
    );

    if (riskIndex === -1) return false;

    score.riskFactors[riskIndex] = {
      ...score.riskFactors[riskIndex],
      isMitigated: true,
      description: `${score.riskFactors[riskIndex].description} \n\nMitigated at ${new Date().toISOString()}: ${notes}`
    };

    // Add positive event for successful mitigation
    await this.updateReputation({
      serverId,
      eventType: 'positive_behavior',
      severity: 'info',
      description: `Risk mitigated: ${riskType}`,
      scoreImpact: 20, // Small positive impact for addressing risks
    });

    await this.saveScores();
    return true;
  }

  // Additional methods for batch operations, reporting, etc.
  async getReputationSummary() {
    const servers = Array.from(this.scores.values());
    
    return {
      totalServers: servers.length,
      averageScore: servers.reduce((sum, s) => sum + s.score, 0) / servers.length,
      riskDistribution: {
        critical: servers.filter(s => s.score < this.criteria.thresholds.critical).length,
        high: servers.filter(s => 
          s.score >= this.criteria.thresholds.critical && 
          s.score < this.criteria.thresholds.warning
        ).length,
        medium: servers.filter(s => 
          s.score >= this.criteria.thresholds.warning && 
          s.score < 800
        ).length,
        low: servers.filter(s => s.score >= 800).length,
      },
      recentEvents: this.eventHistory
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 10),
    };
  }
}
