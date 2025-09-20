'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface RealServerFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function RealServerForm({ onSuccess, onCancel }: RealServerFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: 'Aran Filesystem Server',
    url: 'http://localhost:3001',
    description: 'Real MCP Filesystem Server for file operations',
    type: 'filesystem'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Test connection to the real MCP server
      const response = await fetch('/api/mcp/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          url: formData.url,
          type: formData.type
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        // Store the real server in localStorage for now
        const servers = JSON.parse(localStorage.getItem('mcp-servers') || '[]');
        const newServer = {
          id: Date.now().toString(),
          name: formData.name,
          url: formData.url,
          description: formData.description,
          type: formData.type,
          status: 'online',
          lastChecked: new Date().toISOString(),
          responseTime: result.responseTime || 0,
          version: result.version || '1.0.0',
          capabilities: result.capabilities || ['read_file', 'write_file', 'list_directory', 'get_server_info']
        };
        
        servers.push(newServer);
        localStorage.setItem('mcp-servers', JSON.stringify(servers));

        toast.success('Real MCP server added successfully!', {
          description: `Connected to ${formData.name} with ${result.capabilities?.length || 0} capabilities`
        });

        onSuccess?.();
      } else {
        throw new Error('Failed to connect to MCP server');
      }
    } catch (error) {
      console.error('Error adding server:', error);
      toast.error('Failed to add MCP server', {
        description: 'Please make sure the MCP server is running on the specified URL'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="glass-card border-gray-200 dark:border-white/20">
      <CardHeader>
        <CardTitle className="text-gray-900 dark:text-white/90">Add Real MCP Server</CardTitle>
        <CardDescription className="text-gray-600 dark:text-white/60">
          Connect to the Aran Filesystem MCP Server for real file operations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-gray-700 dark:text-white/80">
              Server Name
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="glass-input text-gray-900 dark:text-white/90 placeholder:text-gray-500 dark:placeholder:text-white/50"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url" className="text-gray-700 dark:text-white/80">
              Server URL
            </Label>
            <Input
              id="url"
              type="url"
              value={formData.url}
              onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
              className="glass-input text-gray-900 dark:text-white/90 placeholder:text-gray-500 dark:placeholder:text-white/50"
              placeholder="http://localhost:3001"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-gray-700 dark:text-white/80">
              Description
            </Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="glass-input text-gray-900 dark:text-white/90 placeholder:text-gray-500 dark:placeholder:text-white/50"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="glass-button border-gray-200 dark:border-white/20 text-gray-900 dark:text-white/90 hover:bg-gray-100 dark:hover:bg-white/20"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={isLoading}
              className="glass-button bg-gray-100 dark:bg-white/20 text-gray-900 dark:text-white/90 hover:bg-gray-200 dark:hover:bg-white/30"
            >
              {isLoading ? 'Connecting...' : 'Add Real Server'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
