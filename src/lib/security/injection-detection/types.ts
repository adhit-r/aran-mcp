export type InjectionType = 
  | 'direct_prompt_injection'
  | 'indirect_prompt_injection'
  | 'context_poisoning'
  | 'role_impersonation'
  | 'token_smuggling'
  | 'encoding_evasion';

export interface InjectionDetectionResult {
  isMalicious: boolean;
  confidence: number; // 0-1
  detectedInjections: Array<{
    type: InjectionType;
    confidence: number;
    description: string;
    position?: {
      start: number;
      end: number;
    };
    metadata?: Record<string, any>;
  }>;
  riskScore: number; // 0-1
  explanation?: string;
}

export interface InjectionPattern {
  name: string;
  description: string;
  patterns: (string | RegExp)[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: InjectionType;
  mitigation: string;
}

export interface InjectionDetectorConfig {
  patterns: InjectionPattern[];
  threshold: number; // 0-1 confidence threshold to flag as malicious
  maxContextLength: number; // Maximum characters to analyze for performance
  enableHeuristics: boolean;
  enableNLPDetection: boolean;
  nlpModelPath?: string;
}
