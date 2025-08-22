import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sandboxManager } from '@/lib/security/sandbox/service';
import { SandboxLevel, SandboxStatus, SandboxTrigger } from '@/lib/security/sandbox/types';

// Helper to validate sandbox level
const isValidSandboxLevel = (level: string): level is SandboxLevel => {
  return ['none', 'light', 'moderate', 'strict'].includes(level);
};

// Helper to validate sandbox status
const isValidSandboxStatus = (status: string): status is SandboxStatus => {
  return ['active', 'quarantined', 'monitoring', 'released', 'error', 'disabled'].includes(status);
};

// GET /api/sandbox - List sandboxed servers with optional filtering
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as SandboxStatus | null;
    const level = searchParams.get('level') as SandboxLevel | null;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Validate status and level if provided
    if (status && !isValidSandboxStatus(status)) {
      return NextResponse.json(
        { error: 'Invalid status parameter' },
        { status: 400 }
      );
    }

    if (level && !isValidSandboxLevel(level)) {
      return NextResponse.json(
        { error: 'Invalid level parameter' },
        { status: 400 }
      );
    }

    // Get filtered list of sandboxed servers
    let servers = sandboxManager.listSandboxedServers(status || undefined);
    
    // Apply additional filters
    if (level) {
      servers = servers.filter(server => server.level === level);
    }

    // Apply pagination
    const paginatedServers = servers.slice(offset, offset + limit);
    const total = servers.length;

    return NextResponse.json({
      data: paginatedServers,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Error listing sandboxed servers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/sandbox - Create a new sandboxed server
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admins can manually sandbox servers
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { serverId, serverName, level, reason } = body;

    if (!serverId || !serverName || !level) {
      return NextResponse.json(
        { error: 'Missing required fields: serverId, serverName, level' },
        { status: 400 }
      );
    }

    if (!isValidSandboxLevel(level)) {
      return NextResponse.json(
        { error: 'Invalid sandbox level' },
        { status: 400 }
      );
    }

    // Check if server is already sandboxed
    const existing = sandboxManager.getSandboxedServer(serverId);
    if (existing && existing.status !== 'released') {
      return NextResponse.json(
        { 
          error: 'Server is already sandboxed',
          data: existing,
        },
        { status: 409 }
      );
    }

    // Sandbox the server
    const sandboxedServer = await sandboxManager.sandboxServer(
      serverId,
      serverName,
      level,
      'manual' as SandboxTrigger,
      { reason },
      session.user.id
    );

    return NextResponse.json({
      message: 'Server sandboxed successfully',
      data: sandboxedServer,
    }, { status: 201 });
  } catch (error) {
    console.error('Error sandboxing server:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/sandbox/:serverId - Update sandbox status or level
export async function PATCH(
  request: Request,
  { params }: { params: { serverId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admins can modify sandbox settings
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const { serverId } = params;
    const body = await request.json();
    const { action, level, reason } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Missing required field: action' },
        { status: 400 }
      );
    }

    const server = sandboxManager.getSandboxedServer(serverId);
    if (!server || server.status === 'released') {
      return NextResponse.json(
        { error: 'Server not found or not sandboxed' },
        { status: 404 }
      );
    }

    let updatedServer;

    switch (action) {
      case 'update_level':
        if (!level || !isValidSandboxLevel(level)) {
          return NextResponse.json(
            { error: 'Invalid or missing level' },
            { status: 400 }
          );
        }
        updatedServer = await sandboxManager.updateSandboxLevel(
          serverId,
          level,
          'manual' as SandboxTrigger,
          { reason },
          session.user.id
        );
        break;

      case 'release':
        updatedServer = await sandboxManager.releaseServer(
          serverId,
          reason || 'Manually released by admin',
          session.user.id
        );
        break;

      case 'quarantine':
        updatedServer = await sandboxManager.updateSandboxLevel(
          serverId,
          'strict',
          'manual' as SandboxTrigger,
          { reason: reason || 'Manually quarantined by admin' },
          session.user.id
        );
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      message: `Server ${action.replace('_', ' ')}d successfully`,
      data: updatedServer,
    });
  } catch (error) {
    console.error('Error updating sandboxed server:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/sandbox/violations - List violations with optional filtering
export async function GET_VIOLATIONS(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const serverId = searchParams.get('serverId');
    const severity = searchParams.get('severity');
    const resolved = searchParams.get('resolved') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Get violations with filters
    let violations = sandboxManager.getViolations(serverId || undefined, resolved);
    
    // Apply severity filter if provided
    if (severity && ['low', 'medium', 'high', 'critical'].includes(severity)) {
      violations = violations.filter(v => v.severity === severity);
    }

    // Apply pagination
    const paginatedViolations = violations.slice(offset, offset + limit);
    const total = violations.length;

    return NextResponse.json({
      data: paginatedViolations,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Error listing violations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/sandbox/violations - Record a new violation
export async function POST_VIOLATION(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const apiKey = request.headers.get('x-api-key');
    const isInternalRequest = apiKey === process.env.INTERNAL_API_KEY;
    
    // Require either a valid session with admin role or a valid API key
    if (!session && !isInternalRequest) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // If it's a session-based request, verify admin privileges
    if (session && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      serverId,
      serverName,
      violationType,
      severity,
      description,
      details,
      actionTaken = 'Blocked',
      policyIds = []
    } = body;

    // Validate required fields
    if (!serverId || !violationType || !severity || !description) {
      return NextResponse.json(
        { 
          error: 'Missing required fields: serverId, violationType, severity, description' 
        },
        { status: 400 }
      );
    }

    // Validate severity
    if (!['low', 'medium', 'high', 'critical'].includes(severity)) {
      return NextResponse.json(
        { error: 'Invalid severity level' },
        { status: 400 }
      );
    }

    // Check if server exists, create if not
    let server = sandboxManager.getSandboxedServer(serverId);
    if (!server) {
      // Auto-sandbox server if it doesn't exist
      server = await sandboxManager.sandboxServer(
        serverId,
        serverName || `Server ${serverId}`,
        'light',
        'policy' as SandboxTrigger,
        { reason: 'Auto-sandboxed due to security violation' },
        'system'
      );
    }

    // Record the violation
    const violation = await sandboxManager.recordViolation(
      serverId,
      violationType,
      severity,
      description,
      details,
      actionTaken,
      policyIds
    );

    return NextResponse.json({
      message: 'Violation recorded successfully',
      data: {
        violation,
        server: sandboxManager.getSandboxedServer(serverId)
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error recording violation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/sandbox/violations/:violationId - Resolve a violation
export async function PATCH_VIOLATION(
  request: Request,
  { params }: { params: { violationId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admins can resolve violations
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const { violationId } = params;
    const { resolved, notes } = await request.json();

    if (resolved === undefined) {
      return NextResponse.json(
        { error: 'Missing required field: resolved' },
        { status: 400 }
      );
    }

    // In a real implementation, we would have a method to get a violation by ID
    // For now, we'll get all violations and find the one we want
    const violations = sandboxManager.getViolations();
    const violation = violations.find(v => v.id === violationId);

    if (!violation) {
      return NextResponse.json(
        { error: 'Violation not found' },
        { status: 404 }
      );
    }

    if (resolved) {
      await sandboxManager.resolveViolation(
        violationId,
        session.user.id,
        notes
      );

      return NextResponse.json({
        message: 'Violation resolved successfully',
        data: { violationId, resolved: true }
      });
    }

    return NextResponse.json({
      message: 'No changes made',
      data: { violationId, resolved: false }
    });
  } catch (error) {
    console.error('Error resolving violation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/sandbox/metrics - Get sandbox metrics
export async function GET_METRICS() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admins can view metrics
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const metrics = sandboxManager.getMetrics();
    return NextResponse.json({ data: metrics });
  } catch (error) {
    console.error('Error getting sandbox metrics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
