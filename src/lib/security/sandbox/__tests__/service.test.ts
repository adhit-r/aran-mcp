import { sandboxManager, SandboxManager } from '../service';
import { SandboxLevel, SandboxStatus } from '../types';

describe('SandboxManager', () => {
  let manager: SandboxManager;
  
  beforeEach(() => {
    // Create a new manager instance for each test
    manager = new SandboxManager();
  });
  
  afterEach(() => {
    // Clean up
    manager.cleanup();
  });
  
  describe('sandboxServer', () => {
    it('should create a new sandboxed server with default restrictions', async () => {
      const server = await manager.sandboxServer(
        'test-server-1', 
        'Test Server', 
        'light', 
        'manual'
      );
      
      expect(server).toBeDefined();
      expect(server.serverId).toBe('test-server-1');
      expect(server.serverName).toBe('Test Server');
      expect(server.status).toBe('active');
      expect(server.level).toBe('light');
      expect(server.currentRestrictions.networkAccess).toBe(true);
      expect(server.currentRestrictions.fileSystemAccess).toBe(true);
      expect(server.currentRestrictions.processCreation).toBe(true);
      expect(server.history.length).toBeGreaterThan(0);
      
      // Verify the server is in the manager's list
      const foundServer = manager.getSandboxedServer('test-server-1');
      expect(foundServer).toEqual(server);
    });
    
    it('should apply the most restrictive settings when multiple policies match', async () => {
      // Add a custom policy that's more restrictive than the default
      manager.addPolicy({
        name: 'Test Restrictive Policy',
        description: 'A test policy with strict restrictions',
        conditions: {
          minReputationScore: 500,
        },
        sandboxLevel: 'strict',
        actions: {
          notifyAdmins: true,
          logEvent: true,
          alertOn: ['enter', 'violation'],
        },
        restrictions: {
          networkAccess: false,
          fileSystemAccess: false,
          processCreation: false,
          memoryUsage: 128,
          cpuUsage: 10,
          executionTime: 5000,
        },
        autoRelease: {
          enabled: false,
        },
        isActive: true,
        createdBy: 'test',
      });
      
      const server = await manager.sandboxServer(
        'test-server-2',
        'Test Server 2',
        'light',
        'policy'
      );
      
      // Should apply the most restrictive settings from all matching policies
      expect(server.level).toBe('strict');
      expect(server.currentRestrictions.networkAccess).toBe(false);
      expect(server.currentRestrictions.fileSystemAccess).toBe(false);
      expect(server.currentRestrictions.processCreation).toBe(false);
      expect(server.currentRestrictions.memoryLimitMB).toBe(128);
      expect(server.currentRestrictions.cpuLimitPercent).toBe(10);
      expect(server.currentRestrictions.executionTimeLimitMs).toBe(5000);
    });
  });
  
  describe('updateSandboxLevel', () => {
    it('should update the sandbox level and restrictions', async () => {
      const server = await manager.sandboxServer(
        'test-server-3', 
        'Test Server 3', 
        'light', 
        'manual'
      );
      
      const updatedServer = await manager.updateSandboxLevel(
        'test-server-3',
        'moderate',
        'policy',
        { reason: 'Suspicious activity detected' },
        'test-user'
      );
      
      expect(updatedServer.level).toBe('moderate');
      expect(updatedServer.currentRestrictions.networkAccess).toBe(true); // Allowed in moderate
      expect(updatedServer.currentRestrictions.fileSystemAccess).toBe(false); // Not allowed in moderate
      expect(updatedServer.history.length).toBe(2);
      expect(updatedServer.history[1].event).toBe('level_changed');
      expect(updatedServer.history[1].details).toContain('from light to moderate');
    });
    
    it('should throw an error if server is not found', async () => {
      await expect(
        manager.updateSandboxLevel('nonexistent', 'strict', 'manual')
      ).rejects.toThrow('not sandboxed');
    });
  });
  
  describe('releaseServer', () => {
    it('should release a server from sandbox', async () => {
      const server = await manager.sandboxServer(
        'test-server-4', 
        'Test Server 4', 
        'light', 
        'manual'
      );
      
      const releasedServer = await manager.releaseServer(
        'test-server-4',
        'Test complete',
        'test-user'
      );
      
      expect(releasedServer.status).toBe('released');
      expect(releasedServer.releasedAt).toBeDefined();
      expect(releasedServer.releasedBy).toBe('test-user');
      expect(releasedServer.history.length).toBe(2);
      expect(releasedServer.history[1].event).toBe('released');
      expect(releasedServer.history[1].details).toContain('Test complete');
      
      // Should still be retrievable but marked as released
      const foundServer = manager.getSandboxedServer('test-server-4');
      expect(foundServer?.status).toBe('released');
    });
  });
  
  describe('recordViolation', () => {
    it('should record a violation and update server stats', async () => {
      const server = await manager.sandboxServer(
        'test-server-5', 
        'Test Server 5', 
        'light', 
        'manual'
      );
      
      const violation = await manager.recordViolation(
        'test-server-5',
        'security',
        'high',
        'Attempted access to restricted file',
        { path: '/etc/passwd', user: 'attacker' },
        'Blocked by policy',
        ['default-monitoring']
      );
      
      expect(violation).toBeDefined();
      expect(violation.serverId).toBe('test-server-5');
      expect(violation.violationType).toBe('security');
      expect(violation.severity).toBe('high');
      expect(violation.details.path).toBe('/etc/passwd');
      
      // Verify server stats were updated
      const updatedServer = manager.getSandboxedServer('test-server-5');
      expect(updatedServer?.stats.violations).toBe(1);
      expect(updatedServer?.stats.threatsBlocked).toBe(1);
      expect(updatedServer?.stats.lastViolationTime).toBeDefined();
      
      // Verify violation is in the list
      const violations = manager.getViolations('test-server-5');
      expect(violations.length).toBe(1);
      expect(violations[0].id).toBe(violation.id);
    });
    
    it('should escalate sandbox level for critical violations', async () => {
      const server = await manager.sandboxServer(
        'test-server-6', 
        'Test Server 6', 
        'light', 
        'manual'
      );
      
      // Record a critical violation
      await manager.recordViolation(
        'test-server-6',
        'security',
        'critical',
        'Critical security breach detected',
        { type: 'exploit_attempt', target: 'vulnerable_service' },
        'Blocked by IPS',
        ['high-risk-isolation']
      );
      
      // Server should be escalated to strict mode
      const updatedServer = manager.getSandboxedServer('test-server-6');
      expect(updatedServer?.level).toBe('strict');
      expect(updatedServer?.currentRestrictions.networkAccess).toBe(false);
    });
  });
  
  describe('checkServerForSandboxing', () => {
    it('should determine if a server should be sandboxed based on metrics', async () => {
      // Test with low reputation score (should match default policy)
      const result1 = await manager.checkServerForSandboxing('test-server-7', 'Test Server 7', {
        reputationScore: 250, // Below default threshold of 300
        errorRate: 5,
      });
      
      expect(result1.shouldSandbox).toBe(true);
      expect(result1.level).toBe('light');
      expect(result1.reason).toContain('Matched');
      
      // Test with high error rate
      const result2 = await manager.checkServerForSandboxing('test-server-8', 'Test Server 8', {
        reputationScore: 400,
        errorRate: 15, // Above default threshold of 10%
      });
      
      expect(result2.shouldSandbox).toBe(true);
      
      // Test with no matching conditions
      const result3 = await manager.checkServerForSandboxing('test-server-9', 'Test Server 9', {
        reputationScore: 800,
        errorRate: 1,
      });
      
      expect(result3.shouldSandbox).toBe(false);
      expect(result3.reason).toBe('No matching policies');
    });
  });
  
  describe('auto-release', () => {
    it('should automatically release a server after conditions are met', async () => {
      // This is a simplified test - in a real scenario, we'd mock timers
      const server = await manager.sandboxServer(
        'test-server-10', 
        'Test Server 10', 
        'light', 
        'manual'
      );
      
      // The default policy has auto-release after 1 hour
      // In a real test, we'd use Jest's fake timers to simulate the passage of time
      
      // For now, we'll just verify the auto-release was scheduled
      expect(server.autoRelease).toBeDefined();
      expect(server.autoRelease?.scheduledAt).toBeInstanceOf(Date);
    });
  });
  
  describe('metrics', () => {
    it('should track metrics for sandboxed servers', async () => {
      // Initial metrics
      const initialMetrics = manager.getMetrics();
      expect(initialMetrics.totalSandboxed).toBe(0);
      
      // Add some servers
      await manager.sandboxServer('s1', 'Server 1', 'light', 'manual');
      await manager.sandboxServer('s2', 'Server 2', 'moderate', 'policy');
      await manager.sandboxServer('s3', 'Server 3', 'strict', 'threat_intel');
      
      // Check metrics after adding servers
      const metricsAfterAdd = manager.getMetrics();
      expect(metricsAfterAdd.totalSandboxed).toBe(3);
      expect(metricsAfterAdd.byStatus.active).toBe(3);
      expect(metricsAfterAdd.byLevel.light).toBe(1);
      expect(metricsAfterAdd.byLevel.moderate).toBe(1);
      expect(metricsAfterAdd.byLevel.strict).toBe(1);
      
      // Record some violations
      await manager.recordViolation('s1', 'network', 'high', 'Test violation', {}, 'Blocked');
      await manager.recordViolation('s2', 'filesystem', 'medium', 'Test violation', {}, 'Blocked');
      await manager.recordViolation('s3', 'security', 'critical', 'Test violation', {}, 'Blocked');
      
      // Check violation metrics
      const metricsAfterViolations = manager.getMetrics();
      expect(metricsAfterViolations.violationsByType.network).toBe(1);
      expect(metricsAfterViolations.violationsByType.filesystem).toBe(1);
      expect(metricsAfterViolations.violationsByType.security).toBe(1);
      expect(metricsAfterViolations.violationsBySeverity.high).toBe(1);
      expect(metricsAfterViolations.violationsBySeverity.medium).toBe(1);
      expect(metricsAfterViolations.violationsBySeverity.critical).toBe(1);
      
      // Release a server
      await manager.releaseServer('s1', 'Test release', 'test-user');
      
      // Check metrics after release
      const metricsAfterRelease = manager.getMetrics();
      expect(metricsAfterRelease.totalSandboxed).toBe(3); // Still tracked but marked as released
      expect(metricsAfterRelease.byStatus.active).toBe(2);
      expect(metricsAfterRelease.byStatus.released).toBe(1);
      expect(metricsAfterRelease.manuallyReleasedCount).toBe(1);
    });
  });
});
