import { InjectionDetectionResult, InjectionPattern, InjectionDetectorConfig, InjectionType } from './types';
import * as natural from 'natural';

export class InjectionDetector {
  private tokenizer: natural.WordTokenizer;
  private config: InjectionDetectorConfig;
  private nlpModel: any; // Placeholder for NLP model
  private patterns: InjectionPattern[];

  constructor(config: Partial<InjectionDetectorConfig> = {}) {
    this.config = this.getDefaultConfig();
    Object.assign(this.config, config);
    this.tokenizer = new natural.WordTokenizer();
    this.patterns = this.config.patterns || [];
  }

  private getDefaultConfig(): InjectionDetectorConfig {
    return {
      patterns: [
        {
          name: 'Instruction Override',
          description: 'Attempts to override previous instructions',
          patterns: [
            /ignore (all )?(previous|prior) (instructions?|prompts?)/i,
            /disregard (all )?(previous|prior) (instructions?|prompts?)/i,
          ],
          severity: 'high',
          type: 'direct_prompt_injection',
          mitigation: 'Reject or sanitize input',
        },
        // Additional patterns would be added here
      ],
      threshold: 0.7,
      maxContextLength: 4000,
      enableHeuristics: true,
      enableNLPDetection: false,
    };
  }

  async detectInjection(input: string): Promise<InjectionDetectionResult> {
    const result: InjectionDetectionResult = {
      isMalicious: false,
      confidence: 0,
      detectedInjections: [],
      riskScore: 0,
    };

    // Check input length
    if (input.length > this.config.maxContextLength) {
      input = input.substring(0, this.config.maxContextLength);
    }

    // Check for known injection patterns
    const patternMatches = this.checkPatterns(input);
    result.detectedInjections.push(...patternMatches);

    // Apply heuristics if enabled
    if (this.config.enableHeuristics) {
      const heuristicMatches = this.applyHeuristics(input);
      result.detectedInjections.push(...heuristicMatches);
    }

    // Calculate overall risk score
    result.riskScore = this.calculateRiskScore(result.detectedInjections);
    result.isMalicious = result.riskScore >= this.config.threshold;
    result.confidence = this.calculateConfidence(result.detectedInjections);

    return result;
  }

  private checkPatterns(input: string) {
    const matches = [];
    
    for (const pattern of this.patterns) {
      for (const regex of pattern.patterns) {
        const regexObj = typeof regex === 'string' ? new RegExp(regex, 'i') : regex;
        const match = input.match(regexObj);
        
        if (match) {
          matches.push({
            type: pattern.type,
            confidence: this.getSeverityConfidence(pattern.severity),
            description: `Detected ${pattern.name}: ${pattern.description}`,
            position: {
              start: match.index || 0,
              end: (match.index || 0) + match[0].length,
            },
            metadata: {
              pattern: pattern.name,
              matchedText: match[0],
              severity: pattern.severity,
            },
          });
        }
      }
    }
    
    return matches;
  }

  private applyHeuristics(input: string) {
    const tokens = this.tokenizer.tokenize(input.toLowerCase()) || [];
    const heuristicMatches = [];
    const termWeights = {
      'ignore': 0.8, 'disregard': 0.8, 'previous': 0.6,
      'instructions': 0.7, 'pretend': 0.7, 'role': 0.5,
      'act as': 0.8, 'from now on': 0.7, 'forget': 0.8,
    };

    let heuristicScore = 0;
    const matchedTerms = [];

    for (const [term, weight] of Object.entries(termWeights)) {
      if (input.toLowerCase().includes(term)) {
        heuristicScore += weight;
        matchedTerms.push(term);
      }
    }

    if (heuristicScore > 1.0) {
      heuristicMatches.push({
        type: 'heuristic_match' as InjectionType,
        confidence: Math.min(0.9, heuristicScore / 2), // Cap confidence
        description: `Suspicious terms detected: ${matchedTerms.join(', ')}`,
        metadata: {
          score: heuristicScore,
          terms: matchedTerms,
        },
      });
    }

    return heuristicMatches;
  }

  private calculateRiskScore(injections: any[]): number {
    if (injections.length === 0) return 0;

    const severityWeights = {
      low: 0.3,
      medium: 0.6,
      high: 0.9,
      critical: 1.0,
    };

    let totalScore = 0;
    let maxScore = 0;

    for (const injection of injections) {
      const severity = injection.metadata?.severity || 'medium';
      const weight = severityWeights[severity] || 0.5;
      const score = injection.confidence * weight;
      totalScore += score;
      maxScore = Math.max(maxScore, score);
    }

    // Weighted average with emphasis on the highest severity finding
    return Math.min(1, (totalScore * 0.7) + (maxScore * 0.3));
  }

  private calculateConfidence(injections: any[]): number {
    if (injections.length === 0) return 0;
    
    const totalConfidence = injections.reduce(
      (sum, inj) => sum + (inj.confidence || 0), 0
    );
    
    return Math.min(1, totalConfidence / injections.length);
  }

  private getSeverityConfidence(severity: string): number {
    switch (severity) {
      case 'critical': return 0.95;
      case 'high': return 0.85;
      case 'medium': return 0.65;
      case 'low': return 0.4;
      default: return 0.5;
    }
  }

  // Utility methods
  addPattern(pattern: InjectionPattern) {
    this.patterns.push(pattern);
  }

  removePattern(patternName: string) {
    this.patterns = this.patterns.filter(p => p.name !== patternName);
  }

  updateConfig(updates: Partial<InjectionDetectorConfig>) {
    Object.assign(this.config, updates);
  }
}

// Singleton instance
export const injectionDetector = new InjectionDetector();
