'use client';

import { useState, useEffect } from 'react';
import { Icons } from '@/components/icons';

interface OWASPMCPCategory {
  id: string;
  name: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  score: number;
  status: 'PASS' | 'FAIL' | 'WARN' | 'ERROR';
  vulnerabilities: number;
}

interface OWASPMCPDashboardProps {
  serverId?: string;
}

export function OWASPMCPDashboard({ serverId }: OWASPMCPDashboardProps) {
  const [categories, setCategories] = useState<OWASPMCPCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    loadOWASPMCPData();
  }, [serverId]);

  const loadOWASPMCPData = async () => {
    try {
      setLoading(true);
      // Mock data for now - replace with actual API call
      const mockData: OWASPMCPCategory[] = [
        {
          id: 'A01',
          name: 'Broken Access Control',
          description: 'MCP servers that fail to properly restrict access to resources and functionality',
          severity: 'HIGH',
          score: 85,
          status: 'PASS',
          vulnerabilities: 0,
        },
        {
          id: 'A02',
          name: 'Cryptographic Failures',
          description: 'MCP servers that fail to protect sensitive data in transit and at rest',
          severity: 'HIGH',
          score: 70,
          status: 'WARN',
          vulnerabilities: 2,
        },
        {
          id: 'A03',
          name: 'Injection',
          description: 'MCP servers vulnerable to injection attacks through user input',
          severity: 'HIGH',
          score: 90,
          status: 'PASS',
          vulnerabilities: 0,
        },
        {
          id: 'A04',
          name: 'Insecure Design',
          description: 'MCP servers with fundamental design flaws that compromise security',
          severity: 'MEDIUM',
          score: 80,
          status: 'PASS',
          vulnerabilities: 0,
        },
        {
          id: 'A05',
          name: 'Security Misconfiguration',
          description: 'MCP servers with insecure default configurations or missing security controls',
          severity: 'MEDIUM',
          score: 45,
          status: 'FAIL',
          vulnerabilities: 3,
        },
        {
          id: 'A06',
          name: 'Vulnerable and Outdated Components',
          description: 'MCP servers using components with known vulnerabilities',
          severity: 'MEDIUM',
          score: 65,
          status: 'WARN',
          vulnerabilities: 1,
        },
        {
          id: 'A07',
          name: 'Identification and Authentication Failures',
          description: 'MCP servers with weak authentication mechanisms or session management',
          severity: 'HIGH',
          score: 95,
          status: 'PASS',
          vulnerabilities: 0,
        },
        {
          id: 'A08',
          name: 'Software and Data Integrity Failures',
          description: 'MCP servers that fail to verify software and data integrity',
          severity: 'MEDIUM',
          score: 88,
          status: 'PASS',
          vulnerabilities: 0,
        },
        {
          id: 'A09',
          name: 'Security Logging and Monitoring Failures',
          description: 'MCP servers with insufficient logging and monitoring capabilities',
          severity: 'LOW',
          score: 60,
          status: 'WARN',
          vulnerabilities: 0,
        },
        {
          id: 'A10',
          name: 'Server-Side Request Forgery (SSRF)',
          description: 'MCP servers vulnerable to SSRF attacks through untrusted input',
          severity: 'HIGH',
          score: 92,
          status: 'PASS',
          vulnerabilities: 0,
        },
      ];
      setCategories(mockData);
    } catch (error) {
      console.error('Failed to load OWASP MCP Top 10 data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'text-red-600 bg-red-100';
      case 'HIGH':
        return 'text-orange-600 bg-orange-100';
      case 'MEDIUM':
        return 'text-yellow-600 bg-yellow-100';
      case 'LOW':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PASS':
        return 'text-green-600 bg-green-100';
      case 'FAIL':
        return 'text-red-600 bg-red-100';
      case 'WARN':
        return 'text-yellow-600 bg-yellow-100';
      case 'ERROR':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const overallScore = categories.length > 0 
    ? Math.round(categories.reduce((sum, cat) => sum + cat.score, 0) / categories.length)
    : 0;

  const totalVulnerabilities = categories.reduce((sum, cat) => sum + cat.vulnerabilities, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Icons.spinner className="h-8 w-8 animate-spin text-aran-orange" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-display">OWASP MCP Top 10 Security</h2>
          <p className="text-aran-gray-600">
            Comprehensive security assessment based on OWASP MCP Top 10 framework
          </p>
        </div>
        <button 
          onClick={loadOWASPMCPData}
          className="aran-btn-secondary"
        >
          <Icons.refresh className="mr-2 h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Overall Security Score */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="aran-card">
          <div className="aran-card-content">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-aran-gray-600">Overall Score</p>
                <p className={`text-3xl font-bold ${getScoreColor(overallScore)}`}>
                  {overallScore}/100
                </p>
              </div>
              <Icons.shield className="h-8 w-8 text-aran-orange" />
            </div>
          </div>
        </div>

        <div className="aran-card">
          <div className="aran-card-content">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-aran-gray-600">Vulnerabilities</p>
                <p className="text-3xl font-bold text-red-600">{totalVulnerabilities}</p>
              </div>
              <Icons.alertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </div>
        </div>

        <div className="aran-card">
          <div className="aran-card-content">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-aran-gray-600">Categories Passed</p>
                <p className="text-3xl font-bold text-green-600">
                  {categories.filter(cat => cat.status === 'PASS').length}
                </p>
              </div>
              <Icons.checkCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="aran-card">
          <div className="aran-card-content">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-aran-gray-600">Categories Failed</p>
                <p className="text-3xl font-bold text-red-600">
                  {categories.filter(cat => cat.status === 'FAIL').length}
                </p>
              </div>
              <Icons.xCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* OWASP MCP Top 10 Categories */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold font-display">Security Categories</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {categories.map((category) => (
            <div 
              key={category.id} 
              className={`aran-card aran-transition cursor-pointer ${
                selectedCategory === category.id ? 'ring-2 ring-aran-orange' : ''
              }`}
              onClick={() => setSelectedCategory(
                selectedCategory === category.id ? null : category.id
              )}
            >
              <div className="aran-card-content">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-mono text-sm font-bold text-aran-black">
                        {category.id}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(category.severity)}`}>
                        {category.severity}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(category.status)}`}>
                        {category.status}
                      </span>
                    </div>
                    <h4 className="font-semibold text-aran-black mb-1">
                      {category.name}
                    </h4>
                    <p className="text-sm text-aran-gray-600 mb-3">
                      {category.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <Icons.trendingUp className="h-4 w-4 text-aran-gray-400" />
                          <span className={`text-sm font-medium ${getScoreColor(category.score)}`}>
                            {category.score}/100
                          </span>
                        </div>
                        {category.vulnerabilities > 0 && (
                          <div className="flex items-center space-x-1">
                            <Icons.alertTriangle className="h-4 w-4 text-red-500" />
                            <span className="text-sm text-red-600">
                              {category.vulnerabilities} vuln{category.vulnerabilities !== 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                      </div>
                      <Icons.chevronRight className="h-4 w-4 text-aran-gray-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed View */}
      {selectedCategory && (
        <div className="aran-card">
          <div className="aran-card-header">
            <h3 className="text-lg font-semibold">
              {categories.find(cat => cat.id === selectedCategory)?.name} Details
            </h3>
          </div>
          <div className="aran-card-content">
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm font-medium text-aran-gray-600">Status</label>
                  <p className={`font-semibold ${getStatusColor(categories.find(cat => cat.id === selectedCategory)?.status || '')}`}>
                    {categories.find(cat => cat.id === selectedCategory)?.status}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-aran-gray-600">Score</label>
                  <p className={`font-semibold ${getScoreColor(categories.find(cat => cat.id === selectedCategory)?.score || 0)}`}>
                    {categories.find(cat => cat.id === selectedCategory)?.score}/100
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-aran-gray-600">Vulnerabilities</label>
                  <p className="font-semibold text-red-600">
                    {categories.find(cat => cat.id === selectedCategory)?.vulnerabilities}
                  </p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-aran-gray-600">Description</label>
                <p className="text-sm text-aran-gray-700 mt-1">
                  {categories.find(cat => cat.id === selectedCategory)?.description}
                </p>
              </div>

              <div className="flex space-x-2">
                <button className="aran-btn-primary">
                  <Icons.play className="mr-2 h-4 w-4" />
                  Run Test
                </button>
                <button className="aran-btn-secondary">
                  <Icons.download className="mr-2 h-4 w-4" />
                  Export Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


