'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestAPIPage() {
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const testAPI = async (endpoint: string, name: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      console.log('Token from localStorage:', token ? token.substring(0, 50) + '...' : 'No token');
      
      const response = await fetch(`http://localhost:8080/api/v1${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      console.log(`${name} response:`, data);
      
      setResults(prev => ({
        ...prev,
        [name]: {
          status: response.status,
          data: data,
          success: response.ok
        }
      }));
    } catch (error) {
      console.error(`${name} error:`, error);
      setResults(prev => ({
        ...prev,
        [name]: {
          error: error.message,
          success: false
        }
      }));
    } finally {
      setLoading(false);
    }
  };

  const testAll = async () => {
    await testAPI('/monitoring/servers', 'Your Servers');
    await testAPI('/mcp/mcp/production-servers', 'Production Servers');
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">API Connection Test</h1>
      
      <div className="space-y-4 mb-8">
        <Button onClick={() => testAPI('/monitoring/servers', 'Your Servers')} disabled={loading}>
          Test Your Servers API
        </Button>
        <Button onClick={() => testAPI('/mcp/mcp/production-servers', 'Production Servers')} disabled={loading}>
          Test Production Servers API
        </Button>
        <Button onClick={testAll} disabled={loading}>
          Test All APIs
        </Button>
      </div>

      <div className="grid gap-4">
        {Object.entries(results).map(([name, result]) => (
          <Card key={name}>
            <CardHeader>
              <CardTitle className={result.success ? 'text-green-600' : 'text-red-600'}>
                {name} - {result.success ? 'SUCCESS' : 'FAILED'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}


