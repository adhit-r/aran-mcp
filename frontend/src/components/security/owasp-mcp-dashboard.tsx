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
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    loadOWASPMCPData();
  }, [serverId]);

  const loadOWASPMCPData = async () => {
    try {
      setLoading(true);
      
      // Fetch OWASP categories from backend
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api/v1';
      const url = serverId 
        ? `${API_BASE}/security/owasp/results/${serverId}`
        : `${API_BASE}/security/owasp/categories`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch OWASP data: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Transform backend data to component format
      let categoriesData: OWASPMCPCategory[] = [];
      
      if (Array.isArray(data)) {
        categoriesData = data;
      } else if (data.categories) {
        categoriesData = data.categories;
      } else if (data.data) {
        categoriesData = Array.isArray(data.data) ? data.data : [data.data];
      } else if (data.results) {
        // If we have results for a specific server, transform them
        categoriesData = Object.entries(data.results || {}).map(([id, result]: [string, any]) => ({
          id,
          name: result.name || result.category_name || id,
          description: result.description || '',
          severity: (result.severity || result.severity_level || 'MEDIUM').toUpperCase(),
          score: result.score || result.security_score || 0,
          status: result.status || (result.passed ? 'PASS' : result.failed ? 'FAIL' : 'WARN'),
          vulnerabilities: result.vulnerabilities || result.vulnerability_count || 0,
        }));
      }
      
      // If no data, return empty array (will show empty state)
      setCategories(categoriesData);
      setError(null);
    } catch (error: any) {
      console.error('Failed to load OWASP MCP Top 10 data:', error);
      setError(error.message || 'Failed to load OWASP security data');
      // Set empty array on error - component will show error state
      setCategories([]);
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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Icons.alertTriangle className="h-12 w-12 text-red-500" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">Failed to load security data</h3>
          <p className="text-sm text-gray-600 mt-2">{error}</p>
          <button
            onClick={loadOWASPMCPData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Icons.shield className="h-12 w-12 text-gray-400" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">No security data available</h3>
          <p className="text-sm text-gray-600 mt-2">
            {serverId 
              ? 'No security assessment data found for this server.'
              : 'No security categories found. Run a security assessment to see results.'}
          </p>
        </div>
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


