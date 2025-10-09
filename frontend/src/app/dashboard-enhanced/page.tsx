'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  Search, 
  Smartphone, 
  Layout,
  Settings,
  RefreshCw
} from 'lucide-react';
import { ClerkProtectedRoute } from '@/components/auth/clerk-protected-route';
import { ErrorBoundary } from '@/components/error-boundary';

// Import new components
import InteractiveDashboard from '@/components/dashboard/interactive-dashboard';
import AdvancedSearch from '@/components/search/advanced-search';
import MobileDashboard from '@/components/mobile/mobile-dashboard';
import CustomizableWorkspace from '@/components/workspace/customizable-workspace';

export default function EnhancedDashboardPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  return (
    <ClerkProtectedRoute>
      <ErrorBoundary>
        <div className="min-h-screen bg-gray-50">
          {/* Enhanced Header */}
          <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">MCP Sentinel</h1>
                  <p className="text-sm text-gray-600">Enhanced Dashboard</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="border-b border-gray-200 bg-white">
                <div className="px-6">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="dashboard" className="flex items-center space-x-2">
                      <BarChart3 className="h-4 w-4" />
                      <span>Dashboard</span>
                    </TabsTrigger>
                    <TabsTrigger value="search" className="flex items-center space-x-2">
                      <Search className="h-4 w-4" />
                      <span>Search</span>
                    </TabsTrigger>
                    <TabsTrigger value="mobile" className="flex items-center space-x-2">
                      <Smartphone className="h-4 w-4" />
                      <span>Mobile</span>
                    </TabsTrigger>
                    <TabsTrigger value="workspace" className="flex items-center space-x-2">
                      <Layout className="h-4 w-4" />
                      <span>Workspace</span>
                    </TabsTrigger>
                  </TabsList>
                </div>
              </div>

              <div className="p-6">
                <TabsContent value="dashboard" className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Interactive Dashboard</h2>
                      <p className="text-gray-600">Real-time monitoring with advanced visualizations</p>
                    </div>
                  </div>
                  <InteractiveDashboard />
                </TabsContent>

                <TabsContent value="search" className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Advanced Search</h2>
                      <p className="text-gray-600">Find and filter servers with precision</p>
                    </div>
                  </div>
                  <AdvancedSearch />
                </TabsContent>

                <TabsContent value="mobile" className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Mobile Dashboard</h2>
                      <p className="text-gray-600">Optimized for mobile devices with PWA features</p>
                    </div>
                  </div>
                  <MobileDashboard />
                </TabsContent>

                <TabsContent value="workspace" className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Customizable Workspace</h2>
                      <p className="text-gray-600">Create and manage personalized dashboards</p>
                    </div>
                  </div>
                  <CustomizableWorkspace />
                </TabsContent>
              </div>
            </Tabs>
          </main>
        </div>
      </ErrorBoundary>
    </ClerkProtectedRoute>
  );
}

