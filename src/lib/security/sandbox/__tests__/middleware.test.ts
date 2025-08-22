import { SandboxMiddleware } from '../middleware';
import { sandboxManager } from '../service';
import { NextRequest, NextResponse } from 'next/server';

describe('SandboxMiddleware', () => {
  // Mock NextRequest and NextResponse
  const createMockRequest = (method: string = 'GET', url: string = 'http://example.com/api/test') => {
    return new NextRequest(url, { method });
  };

  const createMockResponse = (status: number = 200, body: any = {}) => {
    return new NextResponse(JSON.stringify(body), { status });
  };

  beforeEach(() => {
    // Reset the sandbox manager before each test
    sandboxManager.cleanup();
  });

  describe('processSecurityEvent', () => {
    it('should sandbox a server on high severity threat', async () => {
      const event = {
        type: 'threat_detected',
        serverId: 'server-1',
        serverName: 'Test Server',
        severity: 'high',
        details: {
          description: 'Malware detected',
          threatType: 'malware',
          threatScore: 0.9,
        },
      };

      const result = await SandboxMiddleware.processSecurityEvent(event);

      expect(result.action).toBe('sandboxed');
      expect(result.level).toBe('moderate'); // Based on high severity
      expect(result.serverId).toBe('server-1');
      
      // Verify the server was actually sandboxed
      const server = sandboxManager.getSandboxedServer('server-1');
      expect(server).toBeDefined();
      expect(server?.level).toBe('moderate');
      expect(server?.status).toBe('active');
    });

    it('should escalate sandbox level for critical events', async () => {
      // First sandbox with moderate level
      await sandboxManager.sandboxServer(
        'server-2',
        'Test Server 2',
        'moderate',
        'manual',
        { reason: 'Initial sandbox' },
        'test'
      );

      const event = {
        type: 'threat_detected',
        serverId: 'server-2',
        severity: 'critical',
        details: {
          description: 'Critical security vulnerability detected',
          threatType: 'exploit',
          threatScore: 1.0,
        },
      };

      const result = await SandboxMiddleware.processSecurityEvent(event);

      expect(result.action).toBe('escalated');
      expect(result.level).toBe('strict');
      
      // Verify the server was escalated to strict
      const server = sandboxManager.getSandboxedServer('server-2');
      expect(server?.level).toBe('strict');
    });

    it('should not escalate if current level is already sufficient', async () => {
      // Sandbox with strict level
      await sandboxManager.sandboxServer(
        'server-3',
        'Test Server 3',
        'strict',
        'manual',
        { reason: 'Initial strict sandbox' },
        'test'
      );

      const event = {
        type: 'threat_detected',
        serverId: 'server-3',
        severity: 'high', // High severity would normally be 'moderate' level
        details: {
          description: 'Some threat',
          threatType: 'malware',
          threatScore: 0.8,
        },
      };

      const result = await SandboxMiddleware.processSecurityEvent(event);

      // Should not escalate since current level is already stricter
      expect(result.action).toBe('no_action');
      
      // Verify the server level remains the same
      const server = sandboxManager.getSandboxedServer('server-3');
      expect(server?.level).toBe('strict');
    });
  });

  describe('inspectRequest', () => {
    it('should allow requests for non-sandboxed servers', async () => {
      const request = createMockRequest();
      const response = createMockResponse();
      
      const result = await SandboxMiddleware.inspectRequest(
        request,
        response,
        'server-4',
        'Test Server 4'
      );
      
      expect(result.shouldBlock).toBe(false);
    });

    it('should block network access when restricted', async () => {
      // Sandbox a server with network access disabled
      await sandboxManager.sandboxServer(
        'server-5',
        'Test Server 5',
        'strict', // Strict level has networkAccess: false
        'manual',
        { reason: 'Test sandbox' },
        'test'
      );

      const request = createMockRequest('POST', 'http://external-api.com/data');
      const response = createMockResponse();
      
      const result = await SandboxMiddleware.inspectRequest(
        request,
        response,
        'server-5',
        'Test Server 5'
      );
      
      expect(result.shouldBlock).toBe(true);
      expect(result.reason).toContain('Network access is restricted');
      
      // Verify a violation was recorded
      const server = sandboxManager.getSandboxedServer('server-5');
      expect(server?.stats.violations).toBe(1);
    });
  });

  describe('inspectResponse', () => {
    it('should allow normal responses for non-sandboxed servers', async () => {
      const request = createMockRequest();
      const response = createMockResponse(200, { data: 'test' });
      
      const result = await SandboxMiddleware.inspectResponse(
        request,
        response,
        'server-6'
      );
      
      // Should return the original response
      expect(await result.json()).toEqual({ data: 'test' });
    });

    it('should truncate large responses based on memory limits', async () => {
      // Sandbox a server with a small memory limit
      await sandboxManager.sandboxServer(
        'server-7',
        'Test Server 7',
        'strict',
        'manual',
        { reason: 'Test memory limits' },
        'test'
      );

      // Create a large response (2MB)
      const largeData = 'x'.repeat(2 * 1024 * 1024);
      const request = createMockRequest('GET', 'http://example.com/large-data');
      const response = create MockResponse(200, { data: largeData });
      
      // Set content-length header
      response.headers.set('content-length', (2 * 1024 * 1024).toString());
      
      const result = await SandboxMiddleware.inspectResponse(
        request,
        response,
        'server-7'
      );
      
      // Should return a 413 error
      expect(result.status).toBe(413);
      const responseBody = await result.json();
      expect(responseBody.error).toBe('Response too large');
      
      // Verify a violation was recorded
      const server = sandboxManager.getSandboxedServer('server-7');
      expect(server?.stats.violations).toBe(1);
    });
  });

  describe('utility methods', () => {
    it('should correctly report sandbox status', async () => {
      // Initially not sandboxed
      expect(SandboxMiddleware.isServerSandboxed('server-8')).toBe(false);
      
      // Sandbox the server
      await sandboxManager.sandboxServer(
        'server-8',
        'Test Server 8',
        'light',
        'manual',
        { reason: 'Test' },
        'test'
      );
      
      // Now should be sandboxed
      expect(SandboxMiddleware.isServerSandboxed('server-8')).toBe(true);
      
      // Check sandbox level
      expect(SandboxMiddleware.getSandboxLevel('server-8')).toBe('light');
      
      // Check restrictions
      const restrictions = SandboxMiddleware.getServerRestrictions('server-8');
      expect(restrictions).toBeDefined();
      expect(restrictions?.networkAccess).toBe(true); // Light allows network access
    });
  });
});
