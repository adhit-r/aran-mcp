'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Icons } from '@/components/icons';
import { fetchServers, fetchServerStatus, deleteMCPServer, MCPServer, ServerStatus } from '@/lib/api';
import { ClerkProtectedRoute } from '@/components/auth/clerk-protected-route';
import { ErrorBoundary } from '@/components/error-boundary';
import { Logo } from '@/components/logo';

export default function ServerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const serverId = params.id as string;
  
  const [server, setServer] = useState<MCPServer | null>(null);
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadServerData();
  }, [serverId]);

  const loadServerData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch server details
      const servers = await fetchServers();
      const foundServer = servers.find(s => s.id === serverId);
      
      if (!foundServer) {
        setError('Server not found');
        return;
      }
      
      setServer(foundServer);
      
      // Fetch server status
      try {
        const serverStatus = await fetchServerStatus(serverId);
        setStatus(serverStatus);
      } catch (err) {
        console.warn('Could not fetch server status:', err);
        // Status is optional, don't fail the whole page
      }
    } catch (err: any) {
      console.error('Error loading server:', err);
      setError(err.message || 'Failed to load server details');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!server) return;
    
    if (!confirm(`Are you sure you want to delete "${server.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleting(true);
      await deleteMCPServer(serverId);
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Error deleting server:', err);
      alert(`Failed to delete server: ${err.message || 'Unknown error'}`);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <ClerkProtectedRoute>
        <div className="min-h-screen bg-aran-white flex items-center justify-center">
          <div className="text-center">
            <Icons.spinner className="h-8 w-8 animate-spin text-aran-orange mx-auto" />
            <p className="mt-4 text-aran-gray-600">Loading server details...</p>
          </div>
        </div>
      </ClerkProtectedRoute>
    );
  }

  if (error || !server) {
    return (
      <ClerkProtectedRoute>
        <div className="min-h-screen bg-aran-white">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 bg-aran-white border-b-2 border-aran-black px-4 md:px-6">
            <Logo size="md" variant="full" />
          </header>
          <main className="flex-1 p-6">
            <div className="max-w-4xl mx-auto">
              <div className="aran-card">
                <div className="aran-card-content text-center py-12">
                  <Icons.alertTriangle className="mx-auto h-12 w-12 text-aran-warning" />
                  <h2 className="mt-4 text-xl font-semibold">Server Not Found</h2>
                  <p className="mt-2 text-aran-gray-600">{error || 'The server you are looking for does not exist.'}</p>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="mt-4 aran-btn-primary"
                  >
                    Back to Dashboard
                  </button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </ClerkProtectedRoute>
    );
  }

  return (
    <ClerkProtectedRoute>
      <ErrorBoundary>
        <div className="min-h-screen bg-aran-white">
          {/* Header */}
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 bg-aran-white border-b-2 border-aran-black px-4 md:px-6">
            <div className="flex items-center gap-2 md:gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 hover:bg-aran-gray-100 rounded transition-colors"
                title="Back to Dashboard"
              >
                <Icons.arrowLeft className="h-5 w-5" />
              </button>
              <Logo size="md" variant="full" />
            </div>
            <div className="flex flex-1 items-center justify-end gap-4">
              <button
                onClick={loadServerData}
                className="aran-btn-secondary"
                title="Refresh"
              >
                <Icons.refresh className="mr-2 h-4 w-4" />
                Refresh
              </button>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Header Section */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight font-display">{server.name}</h1>
                  <p className="text-aran-gray-600 mt-1">
                    {server.description || 'No description available'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`aran-badge ${
                    server.status === 'online' ? 'aran-badge-success' :
                    server.status === 'offline' ? 'aran-badge-destructive' :
                    'aran-badge-warning'
                  }`}>
                    {server.status === 'online' ? 'Online' :
                     server.status === 'offline' ? 'Offline' : 'Error'}
                  </span>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="aran-btn-destructive"
                  >
                    {deleting ? (
                      <>
                        <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Icons.trash className="mr-2 h-4 w-4" />
                        Delete Server
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="aran-card">
                  <div className="aran-card-content">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-aran-gray-600">Response Time</p>
                        <p className="text-2xl font-bold">
                          {status?.responseTime ? `${status.responseTime}ms` : server.responseTime ? `${server.responseTime}ms` : 'N/A'}
                        </p>
                      </div>
                      <Icons.activity className="h-8 w-8 text-aran-orange" />
                    </div>
                  </div>
                </div>

                <div className="aran-card">
                  <div className="aran-card-content">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-aran-gray-600">Uptime</p>
                        <p className="text-2xl font-bold">
                          {status?.uptime ? `${status.uptime.toFixed(1)}%` : server.uptime ? `${server.uptime.toFixed(1)}%` : 'N/A'}
                        </p>
                      </div>
                      <Icons.checkCircle className="h-8 w-8 text-aran-success" />
                    </div>
                  </div>
                </div>

                <div className="aran-card">
                  <div className="aran-card-content">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-aran-gray-600">Error Rate</p>
                        <p className="text-2xl font-bold">
                          {status?.errorRate ? `${status.errorRate.toFixed(2)}%` : server.errorRate ? `${server.errorRate.toFixed(2)}%` : '0%'}
                        </p>
                      </div>
                      <Icons.alertTriangle className="h-8 w-8 text-aran-warning" />
                    </div>
                  </div>
                </div>

                <div className="aran-card">
                  <div className="aran-card-content">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-aran-gray-600">Version</p>
                        <p className="text-2xl font-bold">
                          {server.version || status?.version || 'Unknown'}
                        </p>
                      </div>
                      <Icons.info className="h-8 w-8 text-aran-gray-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Details Section */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Server Information */}
                <div className="aran-card">
                  <div className="aran-card-header">
                    <h2 className="text-xl font-semibold">Server Information</h2>
                  </div>
                  <div className="aran-card-content space-y-4">
                    <div>
                      <p className="text-sm font-medium text-aran-gray-600">URL</p>
                      <p className="mt-1 text-sm break-all">{server.url || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-aran-gray-600">Type</p>
                      <p className="mt-1 text-sm">{server.type || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-aran-gray-600">Status</p>
                      <p className="mt-1 text-sm capitalize">{server.status || 'Unknown'}</p>
                    </div>
                    {server.lastChecked && (
                      <div>
                        <p className="text-sm font-medium text-aran-gray-600">Last Checked</p>
                        <p className="mt-1 text-sm">
                          {new Date(server.lastChecked).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Capabilities */}
                <div className="aran-card">
                  <div className="aran-card-header">
                    <h2 className="text-xl font-semibold">Capabilities</h2>
                  </div>
                  <div className="aran-card-content">
                    {server.capabilities && server.capabilities.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {server.capabilities.map((cap, idx) => (
                          <span key={idx} className="aran-badge aran-badge-info">
                            {cap}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-aran-gray-600">No capabilities listed</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Metrics Chart Placeholder */}
              {status?.metrics && status.metrics.length > 0 && (
                <div className="aran-card">
                  <div className="aran-card-header">
                    <h2 className="text-xl font-semibold">Performance Metrics</h2>
                  </div>
                  <div className="aran-card-content">
                    <p className="text-sm text-aran-gray-600">
                      Metrics visualization would go here (chart implementation needed)
                    </p>
                    <div className="mt-4 space-y-2">
                      {status.metrics.slice(0, 5).map((metric, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span>{new Date(metric.timestamp).toLocaleString()}</span>
                          <span className="text-aran-gray-600">
                            {metric.responseTime}ms | {metric.errorRate}% error
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </ErrorBoundary>
    </ClerkProtectedRoute>
  );
}

