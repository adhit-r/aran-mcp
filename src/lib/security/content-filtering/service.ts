import { 
  ContentFilterConfig, 
  FilterMatch, 
  FilterResult, 
  ContentAnalysisResult,
  FilterRule
} from './types';
import { URL } from 'url';

// Default sensitive patterns (e.g., API keys, tokens, etc.)
const DEFAULT_SENSITIVE_PATTERNS = [
  {
    name: 'API Key',
    pattern: /(?:key|api[_-]?key|token|secret)[=:][\s"']*([a-z0-9_-]{16,})/gi,
    description: 'Potential API key or token exposure',
  },
  {
    name: 'JWT Token',
    pattern: /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]*/g,
    description: 'Potential JWT token exposure',
  },
  {
    name: 'AWS Access Key',
    pattern: /(AKIA|ASIA)[A-Z0-9]{16,}/g,
    description: 'Potential AWS access key',
  },
];

// Default content filtering rules
const DEFAULT_RULES: FilterRule[] = [
  // JavaScript code blocks
  {
    id: 'js-code-block',
    name: 'JavaScript Code Block',
    description: 'Detects JavaScript code blocks in content',
    type: 'regex',
    pattern: /<script\b[^>]*>([\s\S]*?)<\/script>/gi,
    severity: 'high',
    action: 'block',
    enabled: true,
    tags: ['xss', 'code-injection'],
    created: new Date(),
    updated: new Date(),
  },
  // Suspicious URLs
  {
    id: 'suspicious-url',
    name: 'Suspicious URL',
    description: 'Detects potentially malicious URLs',
    type: 'heuristic',
    pattern: (input: string): FilterMatch[] => {
      const urlRegex = /(https?:\/\/)?([\w-]+\.)+[a-z]{2,}([\w-._~:/?#\[\]@!$&'()*+,;=]*)/gi;
      const matches: FilterMatch[] = [];
      let match;
      
      while ((match = urlRegex.exec(input)) !== null) {
        try {
          const url = new URL(match[0].startsWith('http') ? match[0] : `https://${match[0]}`);
          const domain = url.hostname;
          
          // Check for suspicious patterns in domain
          if (/(?:\d{1,3}\.){3}\d{1,3}/.test(domain) || // IP address
              /([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}/.test(domain) && 
              !domain.endsWith('.com') && !domain.endsWith('.org') && !domain.endsWith('.net')) {
            matches.push({
              type: 'suspicious_url',
              description: 'Suspicious domain detected',
              severity: 'high',
              position: getPosition(input, match.index, match[0].length),
              matchedText: match[0],
              metadata: { domain },
            });
          }
        } catch (e) {
          // Invalid URL, skip
        }
      }
      
      return matches;
    },
    severity: 'high',
    action: 'block',
    enabled: true,
    tags: ['phishing', 'malware'],
    created: new Date(),
    updated: new Date(),
  },
  // Data exfiltration patterns
  {
    id: 'data-exfiltration',
    name: 'Data Exfiltration Pattern',
    description: 'Detects potential data exfiltration attempts',
    type: 'regex',
    pattern: /(?:send|post|upload|exfiltrate|exfil|leak|steal)[\s\w\[\]\(\)\{\}:;=+]*\([\s\w\[\]\{\}:;=+]*['"]http[^)]+['"][\s\w\[\]\(\)\{\}:;=+]*\)/gi,
    severity: 'critical',
    action: 'block',
    enabled: true,
    tags: ['exfiltration', 'data-leak'],
    created: new Date(),
    updated: new Date(),
  },
];

// Helper function to get line and column from index
function getPosition(content: string, index: number, length: number) {
  const lines = content.substring(0, index).split('\n');
  const line = lines.length;
  const column = lines[lines.length - 1].length + 1;
  
  return {
    start: index,
    end: index + length,
    line,
    column,
  };
}

export class ContentFilter {
  private config: ContentFilterConfig;
  private rules: Map<string, FilterRule>;
  private sensitivePatterns: Array<{
    name: string;
    pattern: RegExp;
    description: string;
  }>;

  constructor(config: Partial<ContentFilterConfig> = {}) {
    this.config = this.getDefaultConfig();
    Object.assign(this.config, config);
    
    // Initialize rules
    this.rules = new Map();
    this.config.rules.forEach(rule => this.rules.set(rule.id, rule));
    
    // Initialize sensitive patterns
    this.sensitivePatterns = [...DEFAULT_SENSITIVE_PATTERNS, ...(this.config.sensitivePatterns || [])];
  }

  private getDefaultConfig(): ContentFilterConfig {
    return {
      maxContentLength: 10 * 1024 * 1024, // 10MB
      defaultAction: 'block',
      enableHeuristics: true,
      enableAIAnalysis: false,
      enableCustomRules: true,
      rules: [...DEFAULT_RULES],
      allowedDomains: [],
      blockedDomains: [],
      sensitivePatterns: [],
    };
  }

  async filterContent(content: string): Promise<FilterResult> {
    const startTime = Date.now();
    const result: FilterResult = {
      isFiltered: false,
      filteredContent: content,
      matches: [],
      stats: {
        totalMatches: 0,
        severityCounts: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
        },
        ruleMatches: {},
      },
      metadata: {
        processingTime: 0,
        contentLength: content.length,
        filteredLength: content.length,
      },
    };

    try {
      // Check content length
      if (content.length > this.config.maxContentLength) {
        throw new Error(`Content length (${content.length}) exceeds maximum allowed (${this.config.maxContentLength})`);
      }

      // Apply all enabled rules
      for (const rule of this.rules.values()) {
        if (!rule.enabled) continue;

        const matches = await this.applyRule(rule, content);
        if (matches.length > 0) {
          result.matches.push(...matches);
          
          // Update stats
          result.stats.totalMatches += matches.length;
          matches.forEach(match => {
            result.stats.severityCounts[match.severity]++;
            result.stats.ruleMatches[rule.id] = (result.stats.ruleMatches[rule.id] || 0) + 1;
          });
        }
      }

      // Apply sensitive data detection
      if (this.config.enableHeuristics) {
        const sensitiveMatches = this.detectSensitiveData(content);
        if (sensitiveMatches.length > 0) {
          result.matches.push(...sensitiveMatches);
          result.stats.totalMatches += sensitiveMatches.length;
          sensitiveMatches.forEach(match => {
            result.stats.severityCounts[match.severity]++;
          });
        }
      }

      // Apply filtering based on matches
      if (result.matches.length > 0) {
        result.isFiltered = true;
        
        // Sort matches by start position (descending) to avoid position shifts during replacement
        const sortedMatches = [...result.matches].sort((a, b) => b.position.start - a.position.start);
        
        // Apply filtering based on rule actions
        let filteredContent = content;
        for (const match of sortedMatches) {
          const rule = this.rules.get(match.metadata?.ruleId as string);
          const action = rule?.action || this.config.defaultAction;
          
          if (action === 'block' || action === 'quarantine') {
            // Replace with placeholder or remove the content
            filteredContent = 
              filteredContent.substring(0, match.position.start) + 
              `[CONTENT ${action.toUpperCase()}ED: ${match.type.toUpperCase()}]` +
              filteredContent.substring(match.position.end);
          }
          // For 'alert' and 'log', we just keep the match in the result
        }
        
        result.filteredContent = filteredContent;
        result.metadata.filteredLength = filteredContent.length;
      }

      return result;
    } finally {
      result.metadata.processingTime = Date.now() - startTime;
    }
  }

  async analyzeContent(content: string): Promise<ContentAnalysisResult> {
    const filterResult = await this.filterContent(content);
    
    const details = {
      codeInjection: filterResult.matches.some(m => m.type === 'malicious_code'),
      suspiciousUrls: filterResult.matches.some(m => m.type === 'suspicious_url'),
      dataExfiltration: filterResult.matches.some(m => m.type === 'data_exfiltration'),
      sensitiveData: filterResult.matches.some(m => m.type === 'sensitive_data'),
    };
    
    // Calculate risk score based on matches (simplified)
    const severityWeights = {
      critical: 1.0,
      high: 0.7,
      medium: 0.4,
      low: 0.1,
    };
    
    let riskScore = 0;
    for (const [severity, count] of Object.entries(filterResult.stats.severityCounts)) {
      riskScore += count * (severityWeights[severity as keyof typeof severityWeights] || 0);
    }
    
    // Normalize to 0-1 range
    riskScore = Math.min(1, riskScore / 5);
    
    return {
      isMalicious: filterResult.isFiltered,
      riskScore,
      categories: Array.from(new Set(filterResult.matches.map(m => m.type))),
      details,
      matches: filterResult.matches,
      metadata: {
        analysisTime: filterResult.metadata.processingTime,
        contentLength: filterResult.metadata.contentLength,
      },
    };
  }

  private async applyRule(rule: FilterRule, content: string): Promise<FilterMatch[]> {
    const matches: FilterMatch[] = [];
    
    try {
      if (typeof rule.pattern === 'function') {
        // Custom function pattern
        const customMatches = await rule.pattern(content);
        return customMatches.map(match => ({
          ...match,
          metadata: {
            ...match.metadata,
            ruleId: rule.id,
            ruleName: rule.name,
          },
        }));
      } 
      
      // Handle regex patterns
      const regex = rule.pattern instanceof RegExp 
        ? rule.pattern 
        : new RegExp(rule.pattern, 'gi');
      
      let match;
      while ((match = regex.exec(content)) !== null) {
        const matchedText = match[0];
        const position = getPosition(content, match.index, matchedText.length);
        
        matches.push({
          type: 'custom',
          description: rule.description,
          severity: rule.severity,
          position,
          matchedText,
          metadata: {
            ruleId: rule.id,
            ruleName: rule.name,
            matchIndex: match.index,
            groups: match.groups || {},
          },
        });
        
        // Prevent infinite loops for regexes with zero-width matches
        if (match.index === regex.lastIndex) {
          regex.lastIndex++;
        }
      }
      
      return matches;
    } catch (error) {
      console.error(`Error applying rule ${rule.id}:`, error);
      return [];
    }
  }

  private detectSensitiveData(content: string): FilterMatch[] {
    const matches: FilterMatch[] = [];
    
    for (const pattern of this.sensitivePatterns) {
      const regex = pattern.pattern;
      let match;
      
      while ((match = regex.exec(content)) !== null) {
        const matchedText = match[0];
        const position = getPosition(content, match.index, matchedText.length);
        
        matches.push({
          type: 'sensitive_data',
          description: pattern.description,
          severity: 'high',
          position,
          matchedText,
          context: content.substring(
            Math.max(0, position.start - 20), 
            Math.min(content.length, position.end + 20)
          ),
          metadata: {
            patternName: pattern.name,
            matchIndex: match.index,
          },
        });
      }
      
      // Reset regex lastIndex for next use
      regex.lastIndex = 0;
    }
    
    return matches;
  }

  // Rule management
  addRule(rule: Omit<FilterRule, 'id' | 'created' | 'updated'>): string {
    const id = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    
    const newRule: FilterRule = {
      ...rule,
      id,
      created: now,
      updated: now,
    };
    
    this.rules.set(id, newRule);
    return id;
  }

  updateRule(id: string, updates: Partial<Omit<FilterRule, 'id' | 'created'>>): boolean {
    const rule = this.rules.get(id);
    if (!rule) return false;
    
    this.rules.set(id, {
      ...rule,
      ...updates,
      updated: new Date(),
    });
    
    return true;
  }

  removeRule(id: string): boolean {
    return this.rules.delete(id);
  }

  getRule(id: string): FilterRule | undefined {
    return this.rules.get(id);
  }

  listRules(): FilterRule[] {
    return Array.from(this.rules.values());
  }
}

// Singleton instance
export const contentFilter = new ContentFilter();
