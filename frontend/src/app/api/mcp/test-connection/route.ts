import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api/v1';

/**
 * Test MCP server connection by actually connecting to the server
 * Uses the backend's MCP protocol endpoints to test the connection
 */
export async function POST(request: NextRequest) {
  try {
    const { name, url, type } = await request.json();

    if (!url) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'URL is required to test connection' 
        },
        { status: 400 }
      );
    }

    // Use backend's ping endpoint to test the connection
    const pingResponse = await fetch(`${BACKEND_URL}/mcp/protocol/ping`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!pingResponse.ok) {
      const errorData = await pingResponse.json().catch(() => ({}));
      return NextResponse.json({
        success: false,
        error: errorData.error || errorData.message || 'Failed to connect to MCP server',
        details: errorData,
      }, { status: pingResponse.status });
    }

    const pingData = await pingResponse.json();

    // Try to get server capabilities if ping succeeded
    let capabilities: string[] = [];
    let version = 'unknown';
    
    try {
      // If we have a server ID from ping, try to get capabilities
      if (pingData.server_id) {
        const capabilitiesResponse = await fetch(
          `${BACKEND_URL}/mcp/protocol/servers/${pingData.server_id}/capabilities`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (capabilitiesResponse.ok) {
          const capsData = await capabilitiesResponse.json();
          if (capsData.capabilities) {
            // Extract capability names
            capabilities = Object.keys(capsData.capabilities).filter(
              key => capsData.capabilities[key] === true
            );
          }
          version = capsData.version || capsData.server_info?.version || 'unknown';
        }
      }
    } catch (capError) {
      // Capabilities fetch failed, but connection test succeeded
      console.warn('Failed to fetch capabilities:', capError);
    }

    return NextResponse.json({
      success: true,
      serverInfo: {
        name: name || pingData.name || 'Unknown',
        url,
        type: type || pingData.type || 'unknown',
        status: pingData.status || 'online',
        responseTime: pingData.response_time || pingData.responseTime || 0,
        version: version,
        capabilities: capabilities.length > 0 ? capabilities : pingData.capabilities || [],
        uptime: pingData.uptime || '0.00:00:00',
        memoryUsage: pingData.memory_usage || pingData.memoryUsage || 'N/A',
        serverId: pingData.server_id || pingData.serverId,
      }
    });

  } catch (error: any) {
    console.error('Error testing MCP connection:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to test MCP server connection',
        message: error.message || 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
