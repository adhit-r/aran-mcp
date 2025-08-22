export type FilterMatch = {
  type: 'malicious_code' | 'suspicious_url' | 'data_exfiltration' | 'sensitive_data' | 'custom';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  position: {
    start: number;
    end: number;
    line: number;
    column: number;
  };
  matchedText: string;
  context?: string;
  metadata?: Record<string, any>;
};

export type FilterRule = {
  id: string;
  name: string;
  description: string;
  type: 'regex' | 'keyword' | 'heuristic' | 'ai' | 'custom';
  pattern: string | RegExp | ((input: string) => FilterMatch[]);
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'block' | 'alert' | 'quarantine' | 'log';
  enabled: boolean;
  tags?: string[];
  created: Date;
  updated: Date;
};

export type FilterResult = {
  isFiltered: boolean;
  filteredContent: string;
  matches: FilterMatch[];
  stats: {
    totalMatches: number;
    severityCounts: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    ruleMatches: Record<string, number>;
  };
  metadata: {
    processingTime: number;
    contentLength: number;
    filteredLength: number;
  };
};

export type ContentFilterConfig = {
  maxContentLength: number;
  defaultAction: 'block' | 'alert' | 'quarantine' | 'log';
  enableHeuristics: boolean;
  enableAIAnalysis: boolean;
  enableCustomRules: boolean;
  rules: FilterRule[];
  allowedDomains: string[];
  blockedDomains: string[];
  sensitivePatterns: Array<{
    name: string;
    pattern: RegExp;
    description: string;
  }>;
};

export type ContentAnalysisResult = {
  isMalicious: boolean;
  riskScore: number; // 0-1
  categories: string[];
  details: {
    codeInjection: boolean;
    suspiciousUrls: boolean;
    dataExfiltration: boolean;
    sensitiveData: boolean;
  };
  matches: FilterMatch[];
  metadata: {
    analysisTime: number;
    contentLength: number;
  };
};
