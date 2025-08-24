'use client';

import { useState, useCallback, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Bell, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAlerts, markAlertAsRead, type Alert as AlertType } from '@/lib/api';

export function RecentAlerts() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(true);
  
  const { 
    data: alerts = [], 
    refetch,
    isFetching 
  } = useQuery<AlertType[]>({
    queryKey: ['alerts'],
    queryFn: () => getAlerts(10),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Set loading state based on query status
  useEffect(() => {
    if (!isFetching) {
      setIsLoading(false);
    }
  }, [isFetching]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  const unreadAlerts = (alerts || []).filter((alert: AlertType) => !alert.read);
  const hasUnreadAlerts = unreadAlerts.length > 0;

  const handleMarkAsRead = useCallback(async (alertId: string) => {
    try {
      await markAlertAsRead(alertId);
      await queryClient.invalidateQueries({ queryKey: ['alerts'] });
    } catch (error) {
      console.error('Failed to mark alert as read:', error);
    }
  }, [queryClient]);

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await Promise.all(
        unreadAlerts.map((alert: AlertType) => markAlertAsRead(alert.id))
      );
      await queryClient.invalidateQueries({ queryKey: ['alerts'] });
    } catch (error) {
      console.error('Failed to mark all alerts as read:', error);
    }
  }, [unreadAlerts, queryClient]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <h3 className="font-semibold">Recent Alerts</h3>
          {hasUnreadAlerts && (
            <span className="inline-flex items-center justify-center h-5 px-2.5 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
              {unreadAlerts.length}
            </span>
          )}
        </div>
        {hasUnreadAlerts && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={handleMarkAllAsRead}
          >
            Mark all as read
          </Button>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
          <CheckCircle className="h-8 w-8 mb-2 text-green-500" />
          <p>No alerts to display</p>
          <p className="text-sm">Everything looks good!</p>
        </div>
      ) : (
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-3">
            {alerts.map((alert) => (
              <Alert 
                key={alert.id} 
                className={`relative overflow-hidden ${
                  !alert.read ? 'border-l-4 border-l-amber-500' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {alert.severity === 'critical' ? (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    ) : alert.severity === 'warning' ? (
                      <AlertCircle className="h-5 w-5 text-amber-500" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <AlertTitle className="text-sm font-medium">
                      {alert.type === 'status_change' 
                        ? 'Status Change' 
                        : alert.type === 'performance' 
                          ? 'Performance Issue' 
                          : 'Error'}
                    </AlertTitle>
                    <AlertDescription className="text-sm">
                      {alert.message}
                    </AlertDescription>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {new Date(alert.createdAt).toLocaleString()}
                    </div>
                  </div>
                  {!alert.read && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 ml-2 -mr-2"
                      onClick={() => handleMarkAsRead(alert.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                      <span className="sr-only">Mark as read</span>
                    </Button>
                  )}
                </div>
              </Alert>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
