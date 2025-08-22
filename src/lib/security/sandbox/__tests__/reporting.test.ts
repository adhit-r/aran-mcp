import { generateSecurityReport, formatSecurityReport } from '../reporting';
import { SandboxedServer, SandboxViolation } from '../types';
import { subDays } from 'date-fns';

describe('Security Reporting', () => {
  // Sample data for testing
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twoDaysAgo = subDays(now, 2);
  const oneWeekAgo = subDays(now, 7);

  const sampleServers: SandboxedServer[] = [
    {
      id: '1',
      serverId: 'server-1',
      serverName: 'Production API',
      status: 'active',
      level: 'moderate',
      currentRestrictions: {
        networkAccess: true,
        fileSystemAccess: false,
        processCreation: false,
        memoryLimitMB: 1024,
        cpuLimitPercent: 50,
        executionTimeLimitMs: 10000,
      },
      stats: {
        violations: 2,
        threatsBlocked: 1,
        startTime: oneWeekAgo.toISOString(),
      },
      history: [],
      createdAt: oneWeekAgo.toISOString(),
      updatedAt: now.toISOString(),
      createdBy: 'system',
    },
    {
      id: '2',
      serverId: 'server-2',
      serverName: 'Staging Service',
      status: 'quarantined',
      level: 'strict',
      currentRestrictions: {
        networkAccess: false,
        fileSystemAccess: false,
        processCreation: false,
        memoryLimitMB: 512,
        cpuLimitPercent: 25,
        executionTimeLimitMs: 5000,
      },
      stats: {
        violations: 5,
        threatsBlocked: 3,
        startTime: twoDaysAgo.toISOString(),
      },
      history: [],
      createdAt: twoDaysAgo.toISOString(),
      updatedAt: oneHourAgo.toISOString(),
      createdBy: 'admin@example.com',
    },
  ];

  const sampleViolations: SandboxViolation[] = [
    {
      id: 'v1',
      serverId: 'server-1',
      timestamp: oneHourAgo.toISOString(),
      violationType: 'unauthorized_network',
      severity: 'high',
      description: 'Attempted to connect to unauthorized external service',
      details: { target: 'https://malicious-site.com' },
      actionTaken: 'Blocked connection',
      policyIds: ['network-1'],
      isResolved: false,
    },
    {
      id: 'v2',
      serverId: 'server-2',
      timestamp: twoDaysAgo.toISOString(),
      violationType: 'memory_limit',
      severity: 'critical',
      description: 'Exceeded memory limit',
      details: { limit: 512, used: 768 },
      actionTaken: 'Restricted memory allocation',
      policyIds: ['resource-1'],
      isResolved: true,
      resolvedAt: oneHourAgo.toISOString(),
      resolvedBy: 'system',
    },
  ];

  describe('generateSecurityReport', () => {
    it('should generate a report with correct summary data', () => {
      const report = generateSecurityReport(sampleServers, sampleViolations);
      
      expect(report.summary.totalServers).toBe(2);
      expect(report.summary.activeServers).toBe(1);
      expect(report.summary.quarantinedServers).toBe(1);
      expect(report.summary.violationsLast24h).toBe(1); // Only v1 is within 24h
      expect(report.summary.threatsBlocked).toBe(4); // 1 + 3 from the two servers
    });

    it('should calculate correct risk assessment', () => {
      const report = generateSecurityReport(sampleServers, sampleViolations);
      
      // server-1: moderate level (50) + 2 violations (10) = 60
      // server-2: strict level (80) + 5 violations (20 capped) = 100
      // Average should be (60 + 100) / 2 = 80
      expect(report.riskAssessment.riskScore).toBe(80);
      expect(report.riskAssessment.highRiskServers).toBe(1); // server-2
      expect(report.riskAssessment.mediumRiskServers).toBe(1); // server-1
    });

    it('should include recent violations in the report', () => {
      const report = generateSecurityReport(sampleServers, sampleViolations);
      
      expect(report.recentViolations.length).toBe(2);
      expect(report.recentViolations[0].id).toBe('v1'); // Most recent first
      expect(report.recentViolations[1].id).toBe('v2');
    });

    it('should generate recommendations based on the data', () => {
      const report = generateSecurityReport(sampleServers, sampleViolations);
      
      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.recommendations[0]).toContain('quarantined servers');
    });

    it('should respect the time range parameter', () => {
      const report = generateSecurityReport(sampleServers, sampleViolations, {
        timeRangeDays: 1, // Only include last 24h
      });
      
      // Only v1 is within the last 24h
      expect(report.recentViolations.length).toBe(1);
      expect(report.recentViolations[0].id).toBe('v1');
    });
  });

  describe('formatSecurityReport', () => {
    it('should format the report as a human-readable string', () => {
      const report = generateSecurityReport(sampleServers, sampleViolations);
      const formatted = formatSecurityReport(report);
      
      // Check header
      expect(formatted).toContain('SECURITY REPORT');
      
      // Check summary section
      expect(formatted).toContain('SUMMARY');
      expect(formatted).toContain('Total Servers: 2');
      
      // Check risk assessment
      expect(formatted).toContain('RISK ASSESSMENT');
      expect(formatted).toContain('Overall Risk Score:');
      
      // Check violations
      expect(formatted).toContain('RECENT VIOLATIONS');
      expect(formatted).toContain('unauthorized_network');
      
      // Check recommendations
      expect(formatted).toContain('RECOMMENDATIONS');
    });
  });

  describe('exportSecurityReport', () => {
    it('should export the report as JSON', () => {
      const report = generateSecurityReport(sampleServers, sampleViolations);
      const json = JSON.parse(exportSecurityReport(report));
      
      // Check if the exported JSON has the same structure
      expect(json.summary).toBeDefined();
      expect(json.riskAssessment).toBeDefined();
      expect(json.recentViolations).toBeDefined();
      expect(json.recommendations).toBeDefined();
      
      // Check some values
      expect(json.summary.totalServers).toBe(2);
      expect(json.riskAssessment.riskScore).toBe(80);
    });
  });
});
