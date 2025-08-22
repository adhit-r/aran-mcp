import { NextRequest, NextResponse } from 'next/server';
import { sandboxManager } from './service';
import { SandboxLevel, SandboxTrigger } from './types';

// Types for security events that can trigger sandboxing
type SecurityEvent = {
  type: 'threat_detected' | 'anomaly_detected' | 'reputation_change' | 'manual';
  serverId: string;
  serverName?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: {
    // Common fields
    source?: string;
    description: string;
    timestamp?: Date;
    
    // Threat detection specific
    threatType?: string;
    threatScore?: number;
    
    // Anomaly detection specific
    anomalyType?: string;
    anomalyScore?: number;
    
    // Reputation change specific
    reputationScore?: number;
    previousScore?: number;
    
    // Any additional context
    [key: string]: any;
  };
};

// Default sandbox levels based on event severity
const DEFAULT_SANDBOX_LEVELS: Record<string, SandboxLevel> = {
  low: 'light',
  medium: 'light',
  high: 'moderate',
  critical: 'strict'
};

// Default reasons for sandboxing based on event type
const DEFAULT_REASONS: Record<string, string> = {
  threat_detected: 'Potential security threat detected',
  anomaly_detected: 'Anomalous behavior detected',
  reputation_change: 'Server reputation score dropped significantly',
  manual: 'Manually triggered by administrator'
};

/**
 * Middleware to automatically sandbox servers based on security events
 */
export class SandboxMiddleware {
  /**
   * Process a security event and determine if sandboxing is needed
   */
  static async processSecurityEvent(event: SecurityEvent): Promise<{
    action: 'sandboxed' | 'escalated' | 'no_action' | 'error';
    level?: SandboxLevel;
    serverId: string;
    message: string;
    details: any;
  }> {
    try {
      const { type, serverId, serverName = `Server ${serverId}`, severity, details } = event;
      
      // Determine the appropriate sandbox level based on severity
      const targetLevel = DEFAULT_SANDBOX_LEVELS[severity] || 'light';
      const reason = details.description || DEFAULT_REASONS[type] || 'Security event detected';
      
      // Check if server is already sandboxed
      const existing = sandboxManager.getSandboxedServer(serverId);
      
      if (existing) {
        // Server is already sandboxed, check if we need to escalate
        const currentLevelValue = Object.keys(DEFAULT_SANDBOX_LEVELS).indexOf(existing.level);
        const targetLevelValue = Object.keys(DEFAULT_SANDBOX_LEVELS).indexOf(targetLevel);
        
        if (targetLevelValue > currentLevelValue) {
          // Escalate sandbox level
          await sandboxManager.updateSandboxLevel(
            serverId,
            targetLevel,
            type as SandboxTrigger,
            {
              reason,
              severity,
              eventType: type,
              ...details
            },
            'system'
          );
          
          return {
            action: 'escalated',
            level: targetLevel,
            serverId,
            message: `Sandbox level escalated to ${targetLevel} due to ${severity} ${type}`,
            details: {
              previousLevel: existing.level,
              newLevel: targetLevel,
              event: event
            }
          };
        }
        
        // No escalation needed, but record the event
        await sandboxManager.recordViolation(
          serverId,
          'security',
          severity,
          reason,
          { eventType: type, ...details },
          'Logged',
          []
        );
        
        return {
          action: 'no_action',
          level: existing.level,
          serverId,
          message: `Event logged, no sandbox escalation needed (current level: ${existing.level})`,
          details: {
            currentLevel: existing.level,
            event: event
          }
        };
      } else {
        // Server is not sandboxed, apply initial sandboxing
        const sandboxedServer = await sandboxManager.sandboxServer(
          serverId,
          serverName,
          targetLevel,
          type as SandboxTrigger,
          {
            reason,
            severity,
            eventType: type,
            ...details
          },
          'system'
        );
        
        // Record the initial violation
        await sandboxManager.recordViolation(
          serverId,
          'security',
          severity,
          reason,
          { eventType: type, ...details },
          'Server sandboxed',
          []
        );
        
        return {
          action: 'sandboxed',
          level: targetLevel,
          serverId,
          message: `Server sandboxed at ${targetLevel} level due to ${severity} ${type}`,
          details: {
            server: sandboxedServer,
            event: event
          }
        };
      }
    } catch (error) {
      console.error('Error in sandbox middleware:', error);
      return {
        action: 'error',
        serverId: event.serverId,
        message: `Failed to process security event: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          event: event
        }
      };
    }
  }
  
  /**
   * Middleware function to inspect and potentially sandbox API requests
   */
  static async inspectRequest(
    request: NextRequest,
    response: NextResponse,
    serverId: string,
    serverName: string = 'Unknown Server'
  ): Promise<{
    shouldBlock: boolean;
    reason?: string;
    actionTaken?: string;
    violationId?: string;
  }> {
    try {
      // Get the sandboxed server (if any)
      const server = sandboxManager.getSandboxedServer(serverId);
      
      // If server is not sandboxed or is in monitoring mode, allow the request
      if (!server || server.status === 'monitoring' || server.status === 'released') {
        return { shouldBlock: false };
      }
      
      const { method } = request;
      const url = new URL(request.url);
      const path = url.pathname;
      
      // Check if the request should be blocked based on sandbox restrictions
      const { currentRestrictions } = server;
      
      // Check network access restrictions
      // In a real implementation, this would inspect the request destination
      // For now, we'll just check if network access is disabled
      if (!currentRestrictions.networkAccess) {
        const violation = await sandboxManager.recordViolation(
          serverId,
          'network',
          'high',
          'Attempted network access while in sandbox',
          {
            method,
            path,
            destination: request.headers.get('host'),
            url: request.url
          },
          'Blocked by sandbox policy',
          []
        );
        
        return {
          shouldBlock: true,
          reason: 'Network access is restricted for this server',
          actionTaken: 'Blocked',
          violationId: violation.id
        };
      }
      
      // Check for other restrictions based on request properties
      // This is a simplified example - in a real implementation, you would:
      // 1. Inspect request body for sensitive data exfiltration
      // 2. Check for file system access patterns
      // 3. Validate request size and complexity against limits
      // 4. Check for suspicious patterns in headers/body
      
      return { shouldBlock: false };
    } catch (error) {
      console.error('Error in request inspection middleware:', error);
      // In case of error, allow the request but log it
      return { 
        shouldBlock: false,
        reason: 'Error during request inspection',
        actionTaken: 'Allowed (error)'
      };
    }
  }
  
  /**
   * Middleware function to inspect and potentially filter API responses
   */
  static async inspectResponse(
    request: NextRequest,
    response: NextResponse,
    serverId: string
  ): Promise<NextResponse> {
    try {
      // Get the sandboxed server (if any)
      const server = sandboxManager.getSandboxedServer(serverId);
      
      // If server is not sandboxed or is in monitoring mode, return the response as-is
      if (!server || server.status === 'monitoring' || server.status === 'released') {
        return response;
      }
      
      const { currentRestrictions } = server;
      
      // Clone the response so we can read the body
      const newResponse = new NextResponse(response.body, response);
      
      // Check if we need to filter the response content
      // In a real implementation, this would:
      // 1. Check for sensitive data in the response
      // 2. Apply content filtering based on policies
      // 3. Redact or modify sensitive information
      
      // Example: Check response size against memory limits
      const contentLength = Number(newResponse.headers.get('content-length') || '0');
      if (contentLength > currentRestrictions.memoryLimitMB * 1024 * 1024) {
        await sandboxManager.recordViolation(
          serverId,
          'resource',
          'high',
          'Response size exceeds memory limit',
          {
            contentLength,
            limit: currentRestrictions.memoryLimitMB * 1024 * 1024,
            url: request.url,
            method: request.method
          },
          'Response body truncated',
          []
        );
        
        // Truncate large responses
        return new NextResponse(
          JSON.stringify({
            error: 'Response too large',
            message: `Response exceeds the maximum allowed size of ${currentRestrictions.memoryLimitMB}MB`
          }),
          {
            status: 413,
            headers: {
              'content-type': 'application/json',
              'x-sandbox-violation': 'response_too_large'
            }
          }
        );
      }
      
      return newResponse;
    } catch (error) {
      console.error('Error in response inspection middleware:', error);
      // In case of error, return the original response
      return response;
    }
  }
  
  /**
   * Check if a server is sandboxed and should have requests blocked
   */
  static isServerSandboxed(serverId: string): boolean {
    const server = sandboxManager.getSandboxedServer(serverId);
    return !!server && server.status !== 'released' && server.status !== 'monitoring';
  }
  
  /**
   * Get the current sandbox level for a server
   */
  static getSandboxLevel(serverId: string): SandboxLevel | null {
    const server = sandboxManager.getSandboxedServer(serverId);
    return server?.level || null;
  }
  
  /**
   * Get the current restrictions for a server
   */
  static getServerRestrictions(serverId: string) {
    const server = sandboxManager.getSandboxedServer(serverId);
    return server?.currentRestrictions || null;
  }
}
