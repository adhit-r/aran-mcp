'use client';

import { useState } from 'react';
import { ClerkProtectedRoute } from '@/components/auth/clerk-protected-route';
import { ErrorBoundary } from '@/components/error-boundary';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { RealMCPDashboard } from '@/components/dashboard/real-mcp-dashboard';
import { EnhancedServerManager } from '@/components/servers/enhanced-server-manager';
import { ToolExplorer } from '@/components/tools/tool-explorer';
import { RealTimeMonitor } from '@/components/monitoring/real-time-monitor';
import { 
  LayoutDashboard, 
  Server, 
  Tool, 
  Activity, 
  Settings,
  Menu,
  X
} from 'lucide-react';

type TabType = 'overview' | 'servers' | 'tools' | 'monitoring' | 'settings';

export default function RealDashboardPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'servers', label: 'Servers', icon: Server },
    { id: 'tools', label: 'Tools', icon: Tool },
    { id: 'monitoring', label: 'Monitoring', icon: Activity },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <RealMCPDashboard />;
      case 'servers':
        return <EnhancedServerManager />;
      case 'tools':
        return <ToolExplorer />;
      case 'monitoring':
        return <RealTimeMonitor />;
      case 'settings':
        return (
          <div className="text-center py-12">
            <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Settings</h3>
            <p className="text-gray-600">Settings panel coming soon...</p>
          </div>
        );
      default:
        return <RealMCPDashboard />;
    }
  };

  return (
    <ClerkProtectedRoute>
      <ErrorBoundary>
        <div className="min-h-screen bg-gray-50">
          {/* Mobile sidebar backdrop */}
          {sidebarOpen && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar */}
          <div className={`
            fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            lg:translate-x-0 lg:static lg:inset-0
          `}>
            <div className="flex items-center justify-between h-16 px-6 border-b">
              <Logo size="md" variant="full" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <nav className="mt-6 px-3">
              <div className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setSidebarOpen(false);
                      }}
                      className={`
                        w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
                        ${activeTab === tab.id
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }
                      `}
                    >
                      <Icon className="h-5 w-5 mr-3" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </nav>

            {/* Sidebar Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
              <div className="text-xs text-gray-500 text-center">
                <p>MCP Sentinel v1.0</p>
                <p>Real MCP Platform</p>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="lg:pl-64">
            {/* Top bar */}
            <div className="sticky top-0 z-30 flex h-16 items-center gap-4 bg-white border-b px-4 lg:px-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden"
              >
                <Menu className="h-4 w-4" />
              </Button>
              
              <div className="flex-1">
                <h1 className="text-xl font-semibold capitalize">
                  {tabs.find(tab => tab.id === activeTab)?.label}
                </h1>
              </div>

              <div className="flex items-center space-x-2">
                <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Live</span>
                </div>
              </div>
            </div>

            {/* Page content */}
            <main className="flex-1 p-4 lg:p-6">
              <div className="max-w-7xl mx-auto">
                {renderContent()}
              </div>
            </main>
          </div>
        </div>
      </ErrorBoundary>
    </ClerkProtectedRoute>
  );
}