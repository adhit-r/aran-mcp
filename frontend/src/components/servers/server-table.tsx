'use client';

import { useState } from 'react';
import { MCPServer, ServerStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface ServerTableProps {
  servers: MCPServer[];
  statuses: ServerStatus[];
  onRemove: (id: string) => Promise<void>;
  isLoading: boolean;
}

export function ServerTable({ servers, statuses, onRemove, isLoading }: ServerTableProps) {
  const [removingId, setRemovingId] = useState<string | null>(null);

  const getServerStatus = (serverId: string) => {
    return statuses.find(s => s.serverId === serverId)?.status || 'unknown';
  };

  const getLastChecked = (serverId: string) => {
    const status = statuses.find(s => s.serverId === serverId);
    return status ? formatDistanceToNow(new Date(status.lastChecked), { addSuffix: true }) : 'Never';
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
      online: { variant: 'default', label: 'Online' },
      offline: { variant: 'destructive', label: 'Offline' },
      error: { variant: 'destructive', label: 'Error' },
      unknown: { variant: 'outline', label: 'Unknown' },
    };

    const { variant, label } = statusMap[status] || { variant: 'outline' as const, label: status };
    return <Badge variant={variant}>{label}</Badge>;
  };

  const handleRemove = async (id: string) => {
    try {
      setRemovingId(id);
      await onRemove(id);
    } finally {
      setRemovingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-muted/50 rounded-md animate-pulse" />
        ))}
      </div>
    );
  }

  if (servers.length === 0) {
    return (
      <div className="text-center py-8">
        <Icons.server className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-2 text-sm font-medium">No servers found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Get started by adding a new server.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Host</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Checked</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {servers.map((server) => {
            const status = getServerStatus(server.id);
            return (
              <TableRow key={server.id}>
                <TableCell className="font-medium">{server.name}</TableCell>
                <TableCell>{server.host}</TableCell>
                <TableCell>{getStatusBadge(status)}</TableCell>
                <TableCell>{getLastChecked(server.id)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" size="sm">
                      <Icons.pencil className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemove(server.id)}
                      disabled={removingId === server.id}
                    >
                      {removingId === server.id ? (
                        <Icons.spinner className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Icons.trash className="h-4 w-4 mr-2" />
                      )}
                      Remove
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
