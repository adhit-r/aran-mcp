// Authelia integration for MCP Sentinel
// This replaces the custom JWT authentication with Authelia

export interface AutheliaUser {
  username: string;
  displayName: string;
  email: string;
  groups: string[];
}

export interface AutheliaSession {
  isAuthenticated: boolean;
  user: AutheliaUser | null;
}

// Check if user is authenticated via Authelia
export async function checkAutheliaAuth(): Promise<AutheliaSession> {
  try {
    // For now, return a mock authenticated user for testing
    // This will be replaced with real Authelia integration later
    return {
      isAuthenticated: true,
      user: {
        username: 'admin',
        displayName: 'MCP Sentinel Admin',
        email: 'admin@mcp-sentinel.local',
        groups: ['admins', 'dev'],
      },
    };
  } catch (error) {
    console.error('Authelia auth check failed:', error);
    return {
      isAuthenticated: false,
      user: null,
    };
  }
}

// Get user info from Authelia headers
export function getUserFromHeaders(): AutheliaUser | null {
  // This would be populated by Nginx with Authelia headers
  // In a real implementation, these would come from the backend
  const username = 'admin'; // This would come from Remote-User header
  const displayName = 'MCP Sentinel Admin'; // This would come from Remote-Name header
  const email = 'admin@mcp-sentinel.local'; // This would come from Remote-Email header
  const groups = ['admins', 'dev']; // This would come from Remote-Groups header

  if (username) {
    return {
      username,
      displayName,
      email,
      groups,
    };
  }

  return null;
}

// Logout from Authelia
export async function logoutFromAuthelia(): Promise<void> {
  try {
    // Redirect to Authelia logout endpoint
    window.location.href = 'http://auth.mcp-sentinel.local/api/logout';
  } catch (error) {
    console.error('Authelia logout failed:', error);
  }
}

// Get Authelia portal URL
export function getAutheliaPortalUrl(): string {
  return 'http://auth.mcp-sentinel.local';
}

// Check if user has required group
export function hasGroup(user: AutheliaUser | null, group: string): boolean {
  if (!user) return false;
  return user.groups.includes(group);
}

// Check if user is admin
export function isAdmin(user: AutheliaUser | null): boolean {
  return hasGroup(user, 'admins');
}
