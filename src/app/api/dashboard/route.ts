import { NextResponse } from 'next/server';
import { trafficMonitor } from '@/lib/security/monitoring/service';
import { TrafficFilterOptions } from '@/lib/security/monitoring/types';

// GET /api/dashboard
// Get dashboard data with optional filters
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse filter parameters
    const filters: Partial<TrafficFilterOptions> = {};
    
    // Handle array parameters
    const arrayParams = ['types', 'statusCodes', 'methods', 'endpoints', 'userIds', 'ipAddresses'];
    arrayParams.forEach(param => {
      const value = searchParams.get(param);
      if (value) {
        filters[param as keyof TrafficFilterOptions] = value.split(',');
      }
    });
    
    // Handle number parameters
    const numberParams = ['minDuration', 'maxDuration', 'limit', 'offset'];
    numberParams.forEach(param => {
      const value = searchParams.get(param);
      if (value) {
        filters[param as keyof TrafficFilterOptions] = Number(value);
      }
    });
    
    // Handle search query
    const searchQuery = searchParams.get('searchQuery');
    if (searchQuery) {
      filters.searchQuery = searchQuery;
    }
    
    // Get filtered events and stats
    const result = await trafficMonitor.getEvents(filters as TrafficFilterOptions);
    
    // Get time series data
    const timeSeries = trafficMonitor.getTimeSeries();
    
    return NextResponse.json({
      success: true,
      data: {
        events: result.events,
        stats: result.stats,
        timeSeries,
        pagination: result.pagination,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}

// POST /api/dashboard/alert-rule
// Create a new alert rule
export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // In a real app, you would validate the input data here
    const ruleId = trafficMonitor.addAlertRule({
      name: data.name,
      description: data.description,
      severity: data.severity,
      enabled: data.enabled !== false, // Default to true if not specified
      condition: eval(`(${data.condition})`), // In a real app, use a safer evaluation method
      action: eval(`(${data.action})`), // In a real app, use a safer evaluation method
    });
    
    return NextResponse.json({
      success: true,
      data: { ruleId },
    });
  } catch (error) {
    console.error('Error creating alert rule:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create alert rule' },
      { status: 500 }
    );
  }
}
