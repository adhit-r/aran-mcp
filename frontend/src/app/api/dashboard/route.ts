import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api/v1';

/**
 * Dashboard API route that fetches real data from the backend
 * Aggregates data from multiple backend endpoints to create a comprehensive dashboard view
 */
export async function GET(request: NextRequest) {
  try {
    // Fetch data from multiple backend endpoints in parallel
    const [serversResponse, monitoringResponse, alertsResponse, healthResponse] = await Promise.allSettled([
      fetch(`${BACKEND_URL}/mcp/servers`, {
        headers: {
          'Content-Type': 'application/json',
        },
      }),
      fetch(`${BACKEND_URL}/mcp/monitoring/status`, {
        headers: {
          'Content-Type': 'application/json',
        },
      }),
      fetch(`${BACKEND_URL}/mcp/monitoring/alerts?limit=10`, {
        headers: {
          'Content-Type': 'application/json',
        },
      }),
      fetch(`${BACKEND_URL}/health/comprehensive/dashboard`, {
        headers: {
          'Content-Type': 'application/json',
        },
      }).catch(() => null), // Health dashboard is optional
    ]);

    // Process servers data
    let servers: any[] = [];
    if (serversResponse.status === 'fulfilled' && serversResponse.value.ok) {
      const serversData = await serversResponse.value.json();
      servers = serversData.servers || serversData.data || [];
    }

    // Process monitoring data
    let monitoringStatus: any[] = [];
    if (monitoringResponse.status === 'fulfilled' && monitoringResponse.value.ok) {
      const monitoringData = await monitoringResponse.value.json();
      monitoringStatus = monitoringData.statuses || monitoringData.data || [];
    }

    // Process alerts data
    let alerts: any[] = [];
    if (alertsResponse.status === 'fulfilled' && alertsResponse.value.ok) {
      const alertsData = await alertsResponse.value.json();
      alerts = alertsData.alerts || alertsData.data || [];
    }

    // Process health dashboard data (optional)
    let healthDashboard: any = null;
    if (healthResponse && healthResponse.status === 'fulfilled' && healthResponse.value?.ok) {
      healthDashboard = await healthResponse.value.json();
    }

    // Calculate stats from real data
    const onlineServers = servers.filter((s: any) => s.status === 'online' || s.Status === 'online').length;
    const totalServers = servers.length;
    const activeServers = monitoringStatus.length;
    const criticalAlerts = alerts.filter((a: any) => 
      (a.severity === 'critical' || a.Level === 'critical') && !a.resolved && !a.Resolved
    ).length;

    // Calculate average response time
    const responseTimes = monitoringStatus
      .map((s: any) => s.ResponseTime || s.response_time || 0)
      .filter((rt: number) => rt > 0);
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum: number, rt: number) => sum + rt, 0) / responseTimes.length
      : 0;

    // Calculate uptime percentage
    const uptimePercentages = monitoringStatus
      .map((s: any) => s.Metrics?.UptimePercentage || s.uptime_percentage || 0)
      .filter((up: number) => up > 0);
    const avgUptime = uptimePercentages.length > 0
      ? uptimePercentages.reduce((sum: number, up: number) => sum + up, 0) / uptimePercentages.length
      : 0;

    // Build dashboard response
    const dashboardData = {
      stats: {
        totalServers,
        activeServers,
        onlineServers,
        offlineServers: totalServers - onlineServers,
        alerts: alerts.length,
        criticalAlerts,
        uptime: `${avgUptime.toFixed(1)}%`,
        averageResponseTime: Math.round(avgResponseTime),
      },
      recentEvents: alerts.slice(0, 10).map((alert: any) => ({
        id: alert.id || alert.ID,
        type: alert.type || alert.Type || 'alert',
        message: alert.message || alert.Message,
        timestamp: alert.created_at || alert.Timestamp || alert.timestamp,
        severity: alert.severity || alert.Level || 'info',
      })),
      servers: servers.map((server: any) => ({
        id: server.id || server.ID,
        name: server.name || server.Name,
        status: server.status || server.Status,
        url: server.url || server.URL,
        responseTime: server.response_time || server.ResponseTime,
        uptime: server.uptime_percentage || server.Metrics?.UptimePercentage,
      })),
      monitoring: monitoringStatus,
      healthDashboard, // Include if available
    };

    return NextResponse.json(dashboardData);
  } catch (error: any) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch dashboard data',
        message: error.message || 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Forward alert rule creation to backend
    const response = await fetch(`${BACKEND_URL}/mcp/monitoring/alerts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: 'Failed to create alert rule', details: errorData },
        { status: response.status }
      );
    }

    const alertRule = await response.json();
    return NextResponse.json(alertRule);
  } catch (error: any) {
    console.error('Alert rule creation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create alert rule',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
