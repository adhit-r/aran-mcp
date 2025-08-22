import { z } from 'zod';
import { 
  DiscoveredMcp, 
  McpThreatAnalysis, 
  McpSecurityTest,
  McpThreatType,
  DiscoveredMcpSchema,
  McpThreatAnalysisSchema,
  McpSecurityTestSchema
} from './types/mcp';

/**
 * Discovers MCP servers in the provided traffic data
 */
export async function discoverMcps(trafficData: string): Promise<DiscoveredMcp[]> {
  // Enhanced MCP discovery with security focus
  const mcpPatterns = [
    /mcp:\/\/[^\s]+/gi,
    /mcp\.[a-z0-9]+\.[a-z]+/gi,
    /mcp-server/gi,
    /mcp-client/gi,
    /model-context-protocol/gi,
    /model-context/gi
  ];

  const discoveredMcps: DiscoveredMcp[] = [];
  const lines = trafficData.split('\n');

  for (const line of lines) {
    for (const pattern of mcpPatterns) {
      if (pattern.test(line)) {
        // Extract MCP server information
        const mcpServer: DiscoveredMcp = {
          id: `mcp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: "Discovered MCP Server",
          description: "MCP server discovered through traffic analysis",
          endpoints: extractEndpoints(line),
          dataSources: extractDataSources(line),
          actions: extractActions(line),
          securityLevel: determineSecurityLevel(line),
          status: "active",
          tools: extractTools(line)
        };
        discoveredMcps.push(mcpServer);
        break;
      }
    }
  }

  return discoveredMcps;
}

/**
 * Detects threats in MCP interactions
 */
export async function detectMcpThreats(params: {
  mcpEndpoint: string;
  requestData: string;
  responseData: string;
  userRole: string;
  trafficVolume: string;
}): Promise<McpThreatAnalysis> {
  const { mcpEndpoint, requestData, responseData, userRole, trafficVolume } = params;
  
  // Enhanced threat detection based on real-world MCP attacks
  const threats: string[] = [];
  const riskFactors: Array<{
    factor: string;
    severity: "low" | "medium" | "high";
    description: string;
    threatType: McpThreatType;
  }> = [];

  // Check for various threat types
  if (detectToolPoisoning(requestData, responseData)) {
    threats.push("Tool poisoning detected - MCP tool may be compromised");
    riskFactors.push({
      factor: "Tool Integrity",
      severity: "high",
      description: "MCP tool appears to be manipulated or compromised",
      threatType: "tool-poisoning"
    });
  }

  if (detectLineJumping(requestData)) {
    threats.push("Line jumping attack detected in MCP request");
    riskFactors.push({
      factor: "Input Validation",
      severity: "high",
      description: "Potential line jumping attack in progress",
      threatType: "line-jumping"
    });
  }

  if (detectToolShadowing(requestData)) {
    threats.push("Tool shadowing detected - possible malicious tool usage");
    riskFactors.push({
      factor: "Tool Authentication",
      severity: "high",
      description: "Malicious tool impersonating legitimate MCP tool",
      threatType: "tool-shadowing"
    });
  }

  if (detectPromptInjection(responseData)) {
    threats.push("Prompt injection detected in MCP response");
    riskFactors.push({
      factor: "Output Validation",
      severity: "medium",
      description: "Potential prompt injection in MCP response",
      threatType: "prompt-injection"
    });
  }

  if (detectBrokenAuthorization(requestData, userRole)) {
    threats.push("Broken authorization detected in MCP request");
    riskFactors.push({
      factor: "Authorization",
      severity: "high",
      description: "Potential privilege escalation or unauthorized access",
      threatType: "broken-authorization"
    });
  }

  if (detectDataExfiltration(responseData)) {
    threats.push("Potential data exfiltration detected in MCP response");
    riskFactors.push({
      factor: "Data Protection",
      severity: "critical",
      description: "Sensitive data exposed in MCP tool response",
      threatType: "data-exfiltration"
    });
  }

  if (detectContextInjection(requestData)) {
    threats.push("Context injection detected in MCP request");
    riskFactors.push({
      factor: "Input Validation",
      severity: "medium",
      description: "Potential context injection in MCP request",
      threatType: "context-injection"
    });
  }

  // Calculate overall threat level
  const threatLevel = calculateThreatLevel(threats, riskFactors);
  const anomalyScore = calculateAnomalyScore(requestData, responseData, trafficVolume);
  const recommendations = generateRecommendations(threats, riskFactors);

  // Build the attack matrix
  const attackMatrix = {
    inputLayer: [
      "Input Validation",
      "Request Parsing",
      "Authentication"
    ],
    executionLayer: [
      "Tool Execution",
      "Context Management",
      "Authorization Checks"
    ],
    outputLayer: [
      "Output Encoding",
      "Response Sanitization",
      "Data Masking"
    ]
  };

  return {
    threatLevel,
    anomalyScore,
    detectedThreats: threats,
    recommendations,
    riskFactors,
    attackMatrix
  };
}

// Helper functions for threat detection
function detectToolPoisoning(requestData: string, responseData: string): boolean {
  const poisoningPatterns = [
    /(malicious|backdoor|exploit)/i,
    /eval\(|Function\(|setTimeout\(|setInterval\(/i,
    /<script[^>]*>.*<\/script>/is,
    /(fromCharCode|String\.fromCharCode)\(/i
  ];

  return poisoningPatterns.some(pattern => 
    pattern.test(requestData) || pattern.test(responseData)
  );
}

function detectLineJumping(requestData: string): boolean {
  const lineJumpingPatterns = [
    /\r\n\s*\r\n\s*[A-Z]+/,
    /%0D%0A%0D%0A[A-Z]+/i,
    /\n\s*\n\s*[A-Z]+/
  ];

  return lineJumpingPatterns.some(pattern => pattern.test(requestData));
}

function detectToolShadowing(requestData: string): boolean {
  const shadowingPatterns = [
    /__proto__/,
    /constructor\.prototype/,
    /Object\.prototype/,
    /\[\s*\'__proto__\'\s*\]/i
  ];

  return shadowingPatterns.some(pattern => pattern.test(requestData));
}

function detectPromptInjection(responseData: string): boolean {
  const injectionPatterns = [
    /<script[^>]*>.*<\/script>/is,
    /javascript:/i,
    /data:/i,
    /on\w+\s*=/i
  ];

  return injectionPatterns.some(pattern => pattern.test(responseData));
}

function detectBrokenAuthorization(requestData: string, userRole: string): boolean {
  // Check for admin endpoints being accessed by non-admin roles
  if (userRole !== 'admin' && /\/admin\//i.test(requestData)) {
    return true;
  }

  // Check for privilege escalation attempts
  const escalationPatterns = [
    /role=(admin|root|superuser)/i,
    /isAdmin=(true|1)/i,
    /permission=.?(write|delete|admin)/i
  ];

  return escalationPatterns.some(pattern => pattern.test(requestData));
}

function detectDataExfiltration(responseData: string): boolean {
  const sensitiveDataPatterns = [
    /\b(?:\d{4}[- ]?){3,4}\d{4}\b/, // Credit card numbers
    /\b\d{3}[- ]?\d{2}[- ]?\d{4}\b/, // SSN
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
    /\b(?:[A-Fa-f0-9]{2}:){5}[A-Fa-f0-9]{2}\b/ // MAC address
  ];

  return sensitiveDataPatterns.some(pattern => pattern.test(responseData));
}

function detectContextInjection(requestData: string): boolean {
  const contextInjectionPatterns = [
    /\{\{.*\}\}/s,
    /\$\{.*\}/s,
    /<%.*%>/s
  ];

  return contextInjectionPatterns.some(pattern => pattern.test(requestData));
}

function calculateThreatLevel(threats: string[], riskFactors: any[]): "low" | "medium" | "high" {
  if (threats.length === 0) return "low";
  
  const highSeverityCount = riskFactors.filter(factor => 
    factor.severity === "high" || factor.severity === "critical"
  ).length;

  if (highSeverityCount > 0) return "high";
  if (threats.length > 2) return "medium";
  return "low";
}

function calculateAnomalyScore(
  requestData: string, 
  responseData: string, 
  trafficVolume: string
): number {
  let score = 0;
  
  // Base score based on traffic volume
  const volumeScores: Record<string, number> = {
    low: 10,
    medium: 30,
    high: 50,
    veryHigh: 70
  };
  
  score += volumeScores[trafficVolume.toLowerCase()] || 20;
  
  // Increase score for large request/response sizes
  const requestSize = requestData.length;
  const responseSize = responseData.length;
  
  if (requestSize > 10000) score += 20;
  else if (requestSize > 5000) score += 10;
  
  if (responseSize > 50000) score += 30;
  else if (responseSize > 20000) score += 15;
  
  // Cap the score at 100
  return Math.min(100, Math.max(0, score));
}

function generateRecommendations(threats: string[], riskFactors: any[]): string[] {
  const recommendations: string[] = [];
  
  if (threats.some(t => t.includes('tool-poisoning'))) {
    recommendations.push(
      "Implement tool signature verification to prevent tool poisoning attacks.",
      "Regularly update and patch MCP tools to the latest secure versions."
    );
  }
  
  if (threats.some(t => t.includes('line-jumping'))) {
    recommendations.push(
      "Implement strict input validation and sanitization for all MCP requests.",
      "Use a secure parsing library that handles line endings consistently."
    );
  }
  
  if (threats.some(t => t.includes('tool-shadowing'))) {
    recommendations.push(
      "Implement proper tool authentication and authorization checks.",
      "Use a secure tool registry with cryptographic signatures."
    );
  }
  
  if (threats.some(t => t.includes('prompt-injection'))) {
    recommendations.push(
      "Implement output encoding for all dynamic content in MCP responses.",
      "Use a Content Security Policy (CSP) to mitigate XSS attacks."
    );
  }
  
  if (threats.some(t => t.includes('broken-authorization'))) {
    recommendations.push(
      "Implement proper role-based access control (RBAC) for MCP endpoints.",
      "Regularly audit and review access control policies."
    );
  }
  
  if (threats.some(t => t.includes('data-exfiltration'))) {
    recommendations.push(
      "Implement data loss prevention (DLP) controls for sensitive data.",
      "Mask or redact sensitive information in MCP responses."
    );
  }
  
  if (threats.some(t => t.includes('context-injection'))) {
    recommendations.push(
      "Use context-aware encoding for all dynamic content.",
      "Implement strict content security policies."
    );
  }
  
  // Add general recommendations if no specific threats were found
  if (recommendations.length === 0 && threats.length > 0) {
    recommendations.push(
      "Review MCP server logs for suspicious activities.",
      "Update MCP server and tools to the latest secure versions.",
      "Implement rate limiting and request validation."
    );
  }
  
  return recommendations;
}

// Helper functions for MCP discovery
function extractEndpoints(line: string): string[] {
  const endpointRegex = /(https?:\/\/[^\s'"]+|mcp:\/\/[^\s'"]+)/gi;
  return line.match(endpointRegex) || [];
}

function extractDataSources(line: string): string[] {
  const dataSourcePatterns = [
    /(?:from|source|dataSource)=([^&\s]+)/gi,
    /(?:database|db|table|collection)=([^&\s]+)/gi,
    /(?:file|path|dir)=([^&\s]+)/gi
  ];
  
  const dataSources = new Set<string>();
  
  for (const pattern of dataSourcePatterns) {
    const matches = line.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        dataSources.add(match[1]);
      }
    }
  }
  
  return Array.from(dataSources);
}

function extractActions(line: string): string[] {
  const actionPatterns = [
    /(?:action|method|operation)=([^&\s]+)/gi,
    /(?:get|post|put|delete|patch)\s+([^{\s]+)/gi,
    /(?:query|mutation)\s+([\w_]+)/gi
  ];
  
  const actions = new Set<string>();
  
  for (const pattern of actionPatterns) {
    const matches = line.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        actions.add(match[1]);
      }
    }
  }
  
  return Array.from(actions);
}

function determineSecurityLevel(line: string): "low" | "medium" | "high" | "critical" {
  const securityTerms = {
    critical: [/password|secret|key|token|auth/i, 5],
    high: [/admin|root|superuser|privilege|escalate/i, 3],
    medium: [/user|profile|account|settings/i, 2],
    low: [/(?:^|\W)public|readonly|info(?:$|\W)/i, 1]
  };
  
  let maxScore = 0;
  let maxLevel: keyof typeof securityTerms = "low";
  
  for (const [level, [pattern, score]] of Object.entries(securityTerms) as [
    keyof typeof securityTerms, 
    [RegExp, number]
  ][]) {
    if (pattern.test(line)) {
      if (score > maxScore) {
        maxScore = score;
        maxLevel = level;
      }
    }
  }
  
  return maxLevel;
}

function extractTools(line: string): Array<{
  name: string;
  type: string;
  permissions: string[];
  riskLevel: "low" | "medium" | "high" | "critical";
}> {
  const toolPatterns: Array<{
    name: string;
    type: string;
    permissions: string[];
    riskLevel: "low" | "medium" | "high" | "critical";
    pattern: RegExp;
  }> = [
    {
      name: "Code Execution",
      type: "execution",
      permissions: ["execute_code", "access_filesystem"],
      riskLevel: "high",
      pattern: /(?:eval|exec|Function\(|new Function\()/i
    },
    {
      name: "File Operations",
      type: "filesystem",
      permissions: ["read_files", "write_files"],
      riskLevel: "medium",
      pattern: /(?:readFile|writeFile|unlink|rmdir|mkdir)/i
    },
    {
      name: "Network Operations",
      type: "network",
      permissions: ["network_access"],
      riskLevel: "high",
      pattern: /(?:fetch|axios|http\.|https?\:)/i
    },
    {
      name: "Process Control",
      type: "system",
      permissions: ["execute_process", "kill_process"],
      riskLevel: "critical",
      pattern: /(?:spawn|exec|fork|kill)/i
    }
  ];
  
  return toolPatterns
    .filter(tool => tool.pattern.test(line))
    .map(({ name, type, permissions, riskLevel }) => ({
      name,
      type,
      permissions,
      riskLevel
    }));
}

// Export all utility functions
export const McpUtils = {
  discoverMcps,
  detectMcpThreats,
  detectToolPoisoning,
  detectLineJumping,
  detectToolShadowing,
  detectPromptInjection,
  detectBrokenAuthorization,
  detectDataExfiltration,
  detectContextInjection,
  calculateThreatLevel,
  calculateAnomalyScore,
  generateRecommendations
};

export default McpUtils;
