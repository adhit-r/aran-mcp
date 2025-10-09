'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DebugPage() {
  const [servers, setServers] = useState<any[]>([]);
  const [productionServers, setProductionServers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const loadServers = async () => {
    setLoading(true);
    addLog('Starting to load servers...');
    
    try {
      const token = localStorage.getItem('access_token');
      addLog(`Token found: ${token ? 'YES' : 'NO'}`);
      
      if (!token) {
        addLog('ERROR: No token found in localStorage');
        return;
      }

      addLog('Making API call to /monitoring/servers...');
      const response = await fetch('http://localhost:8080/api/v1/monitoring/servers', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      addLog(`Response status: ${response.status}`);
      
      if (!response.ok) {
        addLog(`ERROR: Response not OK - ${response.status} ${response.statusText}`);
        return;
      }

      const data = await response.json();
      addLog(`Response data: ${JSON.stringify(data, null, 2)}`);
      
      setServers(data.data || []);
      addLog(`Set servers: ${data.data?.length || 0} servers`);
      
    } catch (error) {
      addLog(`ERROR: ${error.message}`);
      console.error('Error loading servers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProductionServers = async () => {
    setLoading(true);
    addLog('Starting to load production servers...');
    
    try {
      const token = localStorage.getItem('access_token');
      addLog(`Token found: ${token ? 'YES' : 'NO'}`);
      
      if (!token) {
        addLog('ERROR: No token found in localStorage');
        return;
      }

      addLog('Making API call to /mcp/mcp/production-servers...');
      const response = await fetch('http://localhost:8080/api/v1/mcp/mcp/production-servers', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      addLog(`Response status: ${response.status}`);
      
      if (!response.ok) {
        addLog(`ERROR: Response not OK - ${response.status} ${response.statusText}`);
        return;
      }

      const data = await response.json();
      addLog(`Response data: ${JSON.stringify(data, null, 2)}`);
      
      setProductionServers(data.data || []);
      addLog(`Set production servers: ${data.data?.length || 0} servers`);
      
    } catch (error) {
      addLog(`ERROR: ${error.message}`);
      console.error('Error loading production servers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAll = async () => {
    await loadServers();
    await loadProductionServers();
  };

  useEffect(() => {
    addLog('Debug page loaded');
    addLog(`localStorage access_token: ${localStorage.getItem('access_token') ? 'EXISTS' : 'NOT FOUND'}`);
  }, []);

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Debug Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={loadServers} disabled={loading}>
              Load Your Servers
            </Button>
            <Button onClick={loadProductionServers} disabled={loading}>
              Load Production Servers
            </Button>
            <Button onClick={loadAll} disabled={loading}>
              Load All
            </Button>
            <Button onClick={() => setLogs([])}>
              Clear Logs
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Your Servers:</strong> {servers.length}</p>
              <p><strong>Production Servers:</strong> {productionServers.length}</p>
              <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Logs */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Debug Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-100 p-4 rounded max-h-96 overflow-y-auto">
            {logs.map((log, index) => (
              <div key={index} className="text-sm font-mono mb-1">
                {log}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Server Lists */}
      {servers.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Your Servers ({servers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(servers, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {productionServers.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Production Servers ({productionServers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
              {JSON.stringify(productionServers, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


