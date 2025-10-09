'use client';

import { useState } from 'react';
import { Icons } from '@/components/icons';
import { OWASPMCPDashboard } from '@/components/security/owasp-mcp-dashboard';
import { AdvancedSecurityPanel } from '@/components/security/advanced-security-panel';
import { ClerkProtectedRoute } from '@/components/auth/clerk-protected-route';
import { AuthenticatedLayout } from '@/components/authenticated-layout';
import { ErrorBoundary } from '@/components/error-boundary';

export default function SecurityPage() {
  const [activeTab, setActiveTab] = useState<'owasp' | 'advanced' | 'reports'>('owasp');

  return (
    <ClerkProtectedRoute>
      <ErrorBoundary>
        <AuthenticatedLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight font-display">Security Center</h1>
              <p className="text-aran-gray-600">
                Comprehensive security monitoring and compliance management
              </p>
            </div>
            <div className="flex space-x-2">
              <button className="aran-btn-secondary">
                <Icons.download className="mr-2 h-4 w-4" />
                Export Report
              </button>
              <button className="aran-btn-accent">
                <Icons.shield className="mr-2 h-4 w-4" />
                Run Security Scan
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 border-2 border-aran-black rounded-lg p-1">
            <button
              onClick={() => setActiveTab('owasp')}
              className={`flex-1 rounded px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === 'owasp'
                  ? 'bg-aran-black text-aran-white'
                  : 'text-aran-gray-700 hover:text-aran-black hover:bg-aran-gray-100'
              }`}
            >
              <Icons.shield className="inline mr-2 h-4 w-4" />
              OWASP MCP Top 10
            </button>
            <button
              onClick={() => setActiveTab('advanced')}
              className={`flex-1 rounded px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === 'advanced'
                  ? 'bg-aran-black text-aran-white'
                  : 'text-aran-gray-700 hover:text-aran-black hover:bg-aran-gray-100'
              }`}
            >
              <Icons.alertTriangle className="inline mr-2 h-4 w-4" />
              AI Security (2025)
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`flex-1 rounded px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === 'reports'
                  ? 'bg-aran-black text-aran-white'
                  : 'text-aran-gray-700 hover:text-aran-black hover:bg-aran-gray-100'
              }`}
            >
              <Icons.fileText className="inline mr-2 h-4 w-4" />
              Reports
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'owasp' && (
            <OWASPMCPDashboard />
          )}

          {activeTab === 'advanced' && (
            <AdvancedSecurityPanel />
          )}

          {activeTab === 'vulnerabilities' && (
            <div className="space-y-6">
              <div className="aran-card">
                <div className="aran-card-header">
                  <h2 className="text-xl font-semibold font-display">Vulnerability Management</h2>
                </div>
                <div className="aran-card-content">
                  <div className="text-center py-12">
                    <Icons.alertTriangle className="mx-auto h-12 w-12 text-aran-gray-400" />
                    <h3 className="mt-4 text-lg font-semibold">Vulnerability Scanner</h3>
                    <p className="mt-2 text-aran-gray-600">
                      Advanced vulnerability scanning and management capabilities coming soon.
                    </p>
                    <button className="mt-4 aran-btn-primary">
                      <Icons.play className="mr-2 h-4 w-4" />
                      Start Vulnerability Scan
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="aran-card">
                <div className="aran-card-header">
                  <h2 className="text-xl font-semibold font-display">Security Reports</h2>
                </div>
                <div className="aran-card-content">
                  <div className="text-center py-12">
                    <Icons.fileText className="mx-auto h-12 w-12 text-aran-gray-400" />
                    <h3 className="mt-4 text-lg font-semibold">Security Reporting</h3>
                    <p className="mt-2 text-aran-gray-600">
                      Comprehensive security reports and compliance documentation coming soon.
                    </p>
                    <button className="mt-4 aran-btn-primary">
                      <Icons.download className="mr-2 h-4 w-4" />
                      Generate Report
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        </AuthenticatedLayout>
      </ErrorBoundary>
    </ClerkProtectedRoute>
  );
}
