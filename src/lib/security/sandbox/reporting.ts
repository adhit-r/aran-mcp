import { SandboxedServer, SandboxViolation } from './types';
import { format, subDays } from 'date-fns';

type SecurityReport = {
  summary: {
    totalServers: number;
    activeServers: number;
    quarantinedServers: number;
    monitoringServers: number;
    violationsLast24h: number;
    threatsBlocked: number;
    avgUptime: string;
  };
  riskAssessment: {
    highRiskServers: number;
    mediumRiskServers: number;
    lowRiskServers: number;
    riskScore: number; // 0-100
  };
  recentViolations: Array<{
    id: string;
    serverId: string;
    serverName: string;
    type: string;
    severity: string;
    timestamp: string;
    description: string;
  }>;
  recommendations: string[];
  generatedAt: string;
  timeRange: {
    start: string;
    end: string;
  };
};

/**
 * Generate a comprehensive security report for sandboxed servers
 */
export function generateSecurityReport(
  servers: SandboxedServer[],
  violations: SandboxViolation[],
  options: {
    timeRangeDays?: number;
    includeDetails?: boolean;
  } = {}
): SecurityReport {
  const now = new Date();
  const timeRangeDays = options.timeRangeDays || 7;
  const startDate = subDays(now, timeRangeDays);
  
  // Filter violations within the time range
  const recentViolations = violations.filter(
    v => new Date(v.timestamp) >= startDate
  );
  
  // Calculate risk scores for each server
  const serverRiskScores = servers.map(server => {
    const serverViolations = violations.filter(v => v.serverId === server.serverId);
    const recentServerViolations = recentViolations.filter(v => v.serverId === server.serverId);
    
    // Base risk score based on sandbox level
    let riskScore = server.level === 'strict' ? 80 : 
                   server.level === 'moderate' ? 50 : 
                   server.level === 'light' ? 20 : 0;
    
    // Increase risk based on violations
    riskScore += Math.min(serverViolations.length * 5, 20);
    
    // Recent violations have more weight
    riskScore += Math.min(recentServerViolations.length * 10, 30);
    
    // Cap at 100
    riskScore = Math.min(riskScore, 100);
    
    return {
      serverId: server.serverId,
      serverName: server.serverName,
      riskScore,
      level: server.level,
      status: server.status,
      violationCount: serverViolations.length,
    };
  });
  
  // Calculate overall metrics
  const highRiskServers = serverRiskScores.filter(s => s.riskScore >= 70).length;
  const mediumRiskServers = serverRiskScores.filter(s => s.riskScore >= 30 && s.riskScore < 70).length;
  const lowRiskServers = serverRiskScores.filter(s => s.riskScore < 30).length;
  
  // Calculate average risk score
  const avgRiskScore = serverRiskScores.length > 0
    ? Math.round(serverRiskScores.reduce((sum, s) => sum + s.riskScore, 0) / serverRiskScores.length)
    : 0;
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  if (highRiskServers > 0) {
    recommendations.push(
      `Review and remediate ${highRiskServers} high-risk server${highRiskServers !== 1 ? 's' : ''}`
    );
  }
  
  if (recentViolations.length > 0) {
    recommendations.push(
      `Investigate ${recentViolations.length} security violation${recentViolations.length !== 1 ? 's' : ''} from the last ${timeRangeDays} days`
    );
  }
  
  if (servers.some(s => s.status === 'quarantined')) {
    recommendations.push(
      'Review quarantined servers and determine if they can be safely released or require further action'
    );
  }
  
  if (recommendations.length === 0) {
    recommendations.push('No critical issues detected. Continue regular monitoring.');
  }
  
  // Prepare the report
  const report: SecurityReport = {
    summary: {
      totalServers: servers.length,
      activeServers: servers.filter(s => s.status === 'active').length,
      quarantinedServers: servers.filter(s => s.status === 'quarantined').length,
      monitoringServers: servers.filter(s => s.status === 'monitoring').length,
      violationsLast24h: violations.filter(
        v => new Date(v.timestamp) >= subDays(now, 1)
      ).length,
      threatsBlocked: servers.reduce((sum, s) => sum + s.stats.threatsBlocked, 0),
      avgUptime: calculateAverageUptime(servers),
    },
    riskAssessment: {
      highRiskServers,
      mediumRiskServers,
      lowRiskServers,
      riskScore: avgRiskScore,
    },
    recentViolations: recentViolations
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10) // Limit to 10 most recent
      .map(v => ({
        id: v.id,
        serverId: v.serverId,
        serverName: servers.find(s => s.serverId === v.serverId)?.serverName || 'Unknown',
        type: v.violationType,
        severity: v.severity,
        timestamp: v.timestamp,
        description: v.description,
      })),
    recommendations,
    generatedAt: now.toISOString(),
    timeRange: {
      start: startDate.toISOString(),
      end: now.toISOString(),
    },
  };
  
  return report;
}

/**
 * Calculate the average uptime of all sandboxed servers
 */
function calculateAverageUptime(servers: SandboxedServer[]): string {
  if (servers.length === 0) return 'N/A';
  
  const now = new Date();
  const totalUptimeMs = servers.reduce((sum, server) => {
    const uptimeMs = now.getTime() - new Date(server.stats.startTime).getTime();
    return sum + uptimeMs;
  }, 0);
  
  const avgUptimeMs = totalUptimeMs / servers.length;
  
  // Format the duration
  const days = Math.floor(avgUptimeMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((avgUptimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((avgUptimeMs % (1000 * 60 * 60)) / (1000 * 60));
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
  
  return parts.join(' ');
}

/**
 * Format the security report as a human-readable string
 */
export function formatSecurityReport(report: SecurityReport): string {
  const lines: string[] = [];
  
  // Header
  lines.push('='.repeat(60));
  lines.push(`SECURITY REPORT - ${format(new Date(report.generatedAt), 'yyyy-MM-dd HH:mm:ss')}`);
  lines.push(`Time Range: ${format(new Date(report.timeRange.start), 'PPpp')} to ${format(new Date(report.timeRange.end), 'PPpp')}`);
  lines.push('='.repeat(60));
  lines.push('');
  
  // Summary
  lines.push('SUMMARY');
  lines.push('-------');
  lines.push(`Total Servers: ${report.summary.totalServers}`);
  lines.push(`Active: ${report.summary.activeServers}, ` +
            `Quarantined: ${report.summary.quarantinedServers}, ` +
            `Monitoring: ${report.summary.monitoringServers}`);
  lines.push(`Violations (24h): ${report.summary.violationsLast24h}, ` +
            `Threats Blocked: ${report.summary.threatsBlocked}`);
  lines.push(`Average Uptime: ${report.summary.avgUptime}`);
  lines.push('');
  
  // Risk Assessment
  lines.push('RISK ASSESSMENT');
  lines.push('---------------');
  lines.push(`Overall Risk Score: ${report.riskAssessment.riskScore}/100`);
  lines.push(`High Risk: ${report.riskAssessment.highRiskServers}, ` +
            `Medium: ${report.riskAssessment.mediumRiskServers}, ` +
            `Low: ${report.riskAssessment.lowRiskServers}`);
  lines.push('');
  
  // Recent Violations
  if (report.recentViolations.length > 0) {
    lines.push('RECENT VIOLATIONS');
    lines.push('-----------------');
    
    report.recentViolations.forEach((violation, index) => {
      lines.push(`[${index + 1}] ${format(new Date(violation.timestamp), 'yyyy-MM-dd HH:mm')} - ${violation.serverName} (${violation.serverId})`);
      lines.push(`    ${violation.type} (${violation.severity}): ${violation.description}`);
    });
    
    lines.push('');
  }
  
  // Recommendations
  lines.push('RECOMMENDATIONS');
  lines.push('--------------');
  
  if (report.recommendations.length > 0) {
    report.recommendations.forEach((rec, index) => {
      lines.push(`${index + 1}. ${rec}`);
    });
  } else {
    lines.push('No specific recommendations at this time.');
  }
  
  return lines.join('\n');
}

/**
 * Export the security report in JSON format
 */
export function exportSecurityReport(report: SecurityReport): string {
  return JSON.stringify(report, null, 2);
}
