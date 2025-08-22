import { z } from 'zod';

// MCP Security Threat Types
export type McpThreatType = 
  | 'tool-poisoning' 
  | 'line-jumping' 
  | 'tool-shadowing' 
  | 'prompt-injection' 
  | 'broken-authorization' 
  | 'rug-pull' 
  | 'data-exfiltration' 
  | 'context-injection';

// MCP Server Discovery Schema
export const DiscoveredMcpSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  endpoints: z.array(z.string()),
  dataSources: z.array(z.string()),
  actions: z.array(z.string()),
  securityLevel: z.enum(["low", "medium", "high", "critical"]),
  status: z.enum(["active", "monitoring", "inactive"]),
  tools: z.array(z.object({
    name: z.string(),
    type: z.string(),
    permissions: z.array(z.string()),
    riskLevel: z.enum(["low", "medium", "high", "critical"])
  }))
});

export type DiscoveredMcp = z.infer<typeof DiscoveredMcpSchema>;

// MCP Threat Analysis Schema
export const McpThreatAnalysisSchema = z.object({
  threatLevel: z.enum(["low", "medium", "high"]),
  anomalyScore: z.number(),
  detectedThreats: z.array(z.string()),
  recommendations: z.array(z.string()),
  riskFactors: z.array(z.object({
    factor: z.string(),
    severity: z.enum(["low", "medium", "high"]),
    description: z.string(),
    threatType: z.enum([
      "tool-poisoning", 
      "line-jumping", 
      "tool-shadowing", 
      "prompt-injection", 
      "broken-authorization", 
      "rug-pull", 
      "data-exfiltration", 
      "context-injection"
    ])
  })),
  attackMatrix: z.object({
    inputLayer: z.array(z.string()),
    executionLayer: z.array(z.string()),
    outputLayer: z.array(z.string())
  })
});

export type McpThreatAnalysis = z.infer<typeof McpThreatAnalysisSchema>;

// MCP Security Test Schema
export const McpSecurityTestSchema = z.object({
  testType: z.enum(["tool-poisoning", "authorization", "injection", "data-exposure"]),
  target: z.string(),
  parameters: z.record(z.any()),
  expectedResult: z.string(),
  actualResult: z.string(),
  passed: z.boolean(),
  timestamp: z.date().default(() => new Date())
});

export type McpSecurityTest = z.infer<typeof McpSecurityTestSchema>;
