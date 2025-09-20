import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Mock dashboard data for now
    const dashboardData = {
      stats: {
        totalServers: 3,
        activeServers: 2,
        alerts: 1,
        uptime: '99.9%'
      },
      recentEvents: [
        {
          id: '1',
          type: 'server_status',
          message: 'Server "filesystem-mcp" came online',
          timestamp: new Date().toISOString(),
          severity: 'info'
        },
        {
          id: '2',
          type: 'alert',
          message: 'High response time detected on "api-mcp"',
          timestamp: new Date(Date.now() - 300000).toISOString(),
          severity: 'warning'
        }
      ],
      timeSeries: {
        responseTime: [
          { time: '00:00', value: 45 },
          { time: '01:00', value: 52 },
          { time: '02:00', value: 48 },
          { time: '03:00', value: 55 },
          { time: '04:00', value: 42 },
          { time: '05:00', value: 38 }
        ],
        requests: [
          { time: '00:00', value: 120 },
          { time: '01:00', value: 95 },
          { time: '02:00', value: 110 },
          { time: '03:00', value: 85 },
          { time: '04:00', value: 130 },
          { time: '05:00', value: 145 }
        ]
      }
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Mock alert rule creation
    const alertRule = {
      id: Math.random().toString(36).substr(2, 9),
      name: body.name || 'New Alert Rule',
      condition: body.condition || 'response_time > 1000',
      severity: body.severity || 'warning',
      created: new Date().toISOString()
    };

    return NextResponse.json(alertRule);
  } catch (error) {
    console.error('Alert rule creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create alert rule' },
      { status: 500 }
    );
  }
}
