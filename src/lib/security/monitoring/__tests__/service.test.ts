import { trafficMonitor, TrafficMonitor } from '../service';

describe('TrafficMonitor', () => {
  let monitor: TrafficMonitor;

  beforeEach(() => {
    // Create a new instance for each test
    monitor = new TrafficMonitor();
  });

  afterEach(() => {
    // Clean up
    monitor.cleanup();
  });

  describe('recordEvent', () => {
    it('should record and process events', async () => {
      const event = {
        type: 'request' as const,
        source: {
          ip: '192.168.1.1',
          userAgent: 'TestAgent/1.0',
          userId: 'user123',
          sessionId: 'session456',
        },
        target: {
          method: 'GET',
          path: '/api/test',
          endpoint: '/api/test',
          statusCode: 200,
        },
        metrics: {
          duration: 100,
          requestSize: 150,
          responseSize: 300,
        },
        metadata: {
          correlationId: 'corr123',
          headers: { 'user-agent': 'TestAgent/1.0' },
        },
      };

      const eventId = await monitor.recordEvent(event);
      expect(eventId).toBeDefined();

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 10));

      // Get events and verify
      const result = await monitor.getEvents();
      expect(result.events.length).toBe(1);
      expect(result.events[0].id).toBe(eventId);
      expect(result.events[0].source.ip).toBe('192.168.1.1');
    });
  });

  describe('getStats', () => {
    it('should return traffic statistics', async () => {
      // Record some events
      await monitor.recordEvent({
        type: 'request',
        source: { ip: '192.168.1.1' },
        target: { method: 'GET', path: '/api/test', endpoint: '/api/test', statusCode: 200 },
        metrics: { duration: 100, requestSize: 100, responseSize: 200 },
        metadata: {},
      });

      await monitor.recordEvent({
        type: 'error',
        source: { ip: '192.168.1.2' },
        target: { method: 'POST', path: '/api/error', endpoint: '/api/error', statusCode: 500 },
        metrics: { duration: 50, requestSize: 150, responseSize: 100 },
        metadata: { error: { message: 'Test error', code: 'TEST_ERROR' } },
      });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 10));

      const stats = monitor.getStats();
      
      expect(stats.totalRequests).toBe(2);
      expect(stats.totalErrors).toBe(1);
      expect(stats.methods['GET']).toBe(1);
      expect(stats.methods['POST']).toBe(1);
      expect(stats.statusCodes[200]).toBe(1);
      expect(stats.statusCodes[500]).toBe(1);
      expect(stats.ipAddresses['192.168.1.1']).toBe(1);
      expect(stats.ipAddresses['192.168.1.2']).toBe(1);
      expect(stats.errorTypes['TEST_ERROR']).toBe(1);
    });
  });

  describe('alertRules', () => {
    it('should trigger alert rules when conditions are met', async () => {
      let alertTriggered = false;
      
      // Add an alert rule
      const ruleId = monitor.addAlertRule({
        name: 'High Response Time',
        description: 'Alert when response time is too high',
        severity: 'high',
        enabled: true,
        condition: (event) => event.metrics.duration > 500,
        action: async () => { alertTriggered = true; },
      });

      // Record a slow request
      await monitor.recordEvent({
        type: 'request',
        source: { ip: '192.168.1.1' },
        target: { method: 'GET', path: '/api/slow', endpoint: '/api/slow', statusCode: 200 },
        metrics: { duration: 1000, requestSize: 100, responseSize: 200 },
        metadata: {},
      });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(alertTriggered).toBe(true);
      
      // Check that a security alert was recorded
      const result = await monitor.getEvents({ types: ['security_alert'] });
      expect(result.events.length).toBe(1);
      expect(result.events[0].metadata.alertType).toBe('High Response Time');
      
      // Clean up
      monitor.removeAlertRule(ruleId);
    });
  });

  describe('filtering', () => {
    beforeEach(async () => {
      // Record test events
      await monitor.recordEvent({
        type: 'request',
        source: { ip: '192.168.1.1', userId: 'user1' },
        target: { method: 'GET', path: '/api/users', endpoint: '/api/users', statusCode: 200 },
        metrics: { duration: 100, requestSize: 100, responseSize: 500 },
        metadata: { query: { page: '1' } },
      });

      await monitor.recordEvent({
        type: 'request',
        source: { ip: '192.168.1.2', userId: 'user2' },
        target: { method: 'POST', path: '/api/users', endpoint: '/api/users', statusCode: 201 },
        metrics: { duration: 200, requestSize: 150, responseSize: 100 },
        metadata: { body: { name: 'Test User' } },
      });

      await monitor.recordEvent({
        type: 'error',
        source: { ip: '192.168.1.3' },
        target: { method: 'GET', path: '/api/not-found', endpoint: '/api/not-found', statusCode: 404 },
        metrics: { duration: 50, requestSize: 120, responseSize: 80 },
        metadata: { error: { message: 'Not found', code: 'NOT_FOUND' } },
      });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    it('should filter by event type', async () => {
      const result = await monitor.getEvents({ types: ['error'] });
      expect(result.events.length).toBe(1);
      expect(result.events[0].type).toBe('error');
      expect(result.pagination.total).toBe(1);
    });

    it('should filter by status code', async () => {
      const result = await monitor.getEvents({ statusCodes: [200, 201] });
      expect(result.events.length).toBe(2);
      expect(result.events.every(e => [200, 201].includes(e.target.statusCode!))).toBe(true);
    });

    it('should filter by IP address', async () => {
      const result = await monitor.getEvents({ ipAddresses: ['192.168.1.1'] });
      expect(result.events.length).toBe(1);
      expect(result.events[0].source.ip).toBe('192.168.1.1');
    });

    it('should filter by user ID', async () => {
      const result = await monitor.getEvents({ userIds: ['user2'] });
      expect(result.events.length).toBe(1);
      expect(result.events[0].source.userId).toBe('user2');
    });

    it('should filter by method', async () => {
      const result = await monitor.getEvents({ methods: ['POST'] });
      expect(result.events.length).toBe(1);
      expect(result.events[0].target.method).toBe('POST');
    });

    it('should filter by endpoint', async () => {
      const result = await monitor.getEvents({ endpoints: ['/api/not-found'] });
      expect(result.events.length).toBe(1);
      expect(result.events[0].target.endpoint).toBe('/api/not-found');
    });

    it('should filter by duration', async () => {
      const result = await monitor.getEvents({ minDuration: 150 });
      expect(result.events.length).toBe(1);
      expect(result.events[0].metrics.duration).toBe(200);
    });

    it('should search across fields', async () => {
      const result = await monitor.getEvents({ searchQuery: 'Test User' });
      expect(result.events.length).toBe(1);
      expect(result.events[0].metadata.body).toEqual({ name: 'Test User' });
    });

    it('should support pagination', async () => {
      const page1 = await monitor.getEvents({ limit: 2, offset: 0 });
      expect(page1.events.length).toBe(2);
      expect(page1.pagination.total).toBe(3);
      expect(page1.pagination.limit).toBe(2);
      expect(page1.pagination.offset).toBe(0);

      const page2 = await monitor.getEvents({ limit: 2, offset: 2 });
      expect(page2.events.length).toBe(1);
      expect(page2.pagination.offset).toBe(2);
    });
  });
});
