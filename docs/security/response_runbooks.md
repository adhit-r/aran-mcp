# MCP Security Incident Response Runbooks

This document provides detailed runbooks for responding to security incidents detected by the MCP Attack Matrix hardening controls.

## Incident Response Framework

### General Process
1. **Detection**: Alert triggered by detection pipeline or security tests
2. **Assessment**: Evaluate severity and impact
3. **Containment**: Isolate affected systems
4. **Eradication**: Remove threat components
5. **Recovery**: Restore normal operations
6. **Lessons Learned**: Update controls and documentation

## Runbook: Tool Poisoning Incident

### Detection
- **Alert Type**: `tool_poisoning`
- **Source**: Detection pipeline analyzing tool execution
- **Severity**: High/Critical

### Immediate Response
1. **Isolate Server**: Disable the affected MCP server
   ```bash
   # Via API
   curl -X POST /api/v1/mcp/servers/{server_id}/disable
   ```

2. **Quarantine Tools**: Mark poisoned tools as suspicious
   ```sql
   UPDATE mcp_tools SET status = 'quarantined' WHERE id = '{tool_id}';
   ```

3. **Alert Team**: Notify security team via configured channels

### Investigation
1. **Review Logs**: Examine tool execution logs
   ```sql
   SELECT * FROM mcp_tool_invocations
   WHERE tool_id = '{tool_id}' AND created_at > '{incident_time}';
   ```

2. **Analyze Payload**: Review the malicious payload
   - Check for injection patterns
   - Identify attack vector (file paths, commands, etc.)

3. **Trace Origin**: Determine how poisoning occurred
   - Review recent tool updates
   - Check attestation signatures

### Containment
1. **Block Malicious Patterns**: Update detection rules
2. **Revoke Access**: Temporarily revoke user/tool access
3. **Network Isolation**: Segment affected network segments

### Eradication
1. **Clean Tools**: Reinstall or patch affected tools
2. **Update Signatures**: Refresh attestation signatures
3. **Patch Vulnerabilities**: Apply security patches

### Recovery
1. **Re-enable Server**: Gradually restore service
2. **Monitor Closely**: Increased monitoring for 24-48 hours
3. **User Communication**: Notify affected users if necessary

## Runbook: Replay Attack Incident

### Detection
- **Alert Type**: `replay_attack`
- **Source**: Security tester or pipeline duplicate detection
- **Severity**: Medium

### Immediate Response
1. **Rate Limiting**: Increase rate limits on affected endpoints
2. **Session Invalidation**: Force re-authentication for suspicious sessions

### Investigation
1. **Analyze Patterns**: Review request sequences
   ```sql
   SELECT request_hash, COUNT(*) as frequency
   FROM mcp_tool_invocations
   WHERE created_at > '{time_window}'
   GROUP BY request_hash
   HAVING COUNT(*) > {threshold};
   ```

2. **Identify Source**: Trace IP addresses and user agents
3. **Check for Automation**: Look for scripted attack patterns

### Containment
1. **IP Blocking**: Block suspicious IP addresses
2. **Request Throttling**: Implement per-user rate limits
3. **Challenge-Response**: Add CAPTCHA or similar

### Eradication
1. **Update Detection**: Enhance replay detection algorithms
2. **Session Security**: Implement proper session management

## Runbook: Authentication Bypass Incident

### Detection
- **Alert Type**: `auth_bypass_mcp`
- **Source**: Security tester or access logs
- **Severity**: Critical

### Immediate Response
1. **Emergency Lockdown**: Enable full authentication enforcement
   ```bash
   export ENABLE_MCP_AUTH=true
   # Restart services
   ```

2. **Audit All Access**: Review recent unauthorized access
3. **Key Compromise Check**: Verify authentication keys/certificates

### Investigation
1. **Access Logs Review**:
   ```sql
   SELECT * FROM audit_logs
   WHERE action = 'unauthorized_access'
   AND created_at > '{incident_time}';
   ```

2. **Token Analysis**: Check for token reuse or forgery
3. **Configuration Review**: Verify auth middleware configuration

### Containment
1. **Full Authentication**: Require MFA for all access
2. **Token Revocation**: Invalidate all active tokens
3. **Access Reviews**: Audit user permissions

### Eradication
1. **Key Rotation**: Rotate all authentication keys
2. **Patch Auth System**: Update authentication components
3. **Configuration Hardening**: Strengthen auth policies

## Runbook: Drift Detection Incident

### Detection
- **Alert Type**: `drift_detection`
- **Source**: Pipeline version/behavior monitoring
- **Severity**: Medium

### Investigation
1. **Version Comparison**: Compare expected vs actual behavior
2. **Change Review**: Check recent tool updates
3. **Integrity Verification**: Re-verify tool attestations

### Response
1. **Rollback Changes**: Revert to known good version
2. **Update Monitoring**: Adjust drift thresholds
3. **Documentation Update**: Update expected behavior baselines

## Escalation Procedures

### Severity Levels
- **Low**: Log and monitor, no immediate action
- **Medium**: Investigate within 4 hours, contain within 8 hours
- **High**: Investigate within 1 hour, contain within 4 hours
- **Critical**: Immediate response, contain within 1 hour

### Escalation Matrix
| Severity | Response Time | Escalation |
|----------|---------------|------------|
| Low | 24 hours | Security Analyst |
| Medium | 4 hours | Security Lead |
| High | 1 hour | Security Team |
| Critical | Immediate | CISO + Executive Team |

## Communication Templates

### Internal Alert
```
Subject: Security Incident - {INCIDENT_TYPE} Detected

Details:
- Time: {TIMESTAMP}
- Severity: {SEVERITY}
- Affected Systems: {SYSTEMS}
- Initial Assessment: {SUMMARY}

Actions Taken: {IMMEDIATE_ACTIONS}
Next Steps: {INVESTIGATION_PLAN}

On-call: {ONCALL_PERSON}
```

### User Notification (if required)
```
Subject: Security Update - {SERVICE} Incident

Dear User,

We detected and contained a security incident affecting {SERVICE}.
Your data is safe, and no action is required on your part.

What happened: {BRIEF_DESCRIPTION}
What we're doing: {RESPONSE_ACTIONS}
Timeline: {EXPECTED_RESOLUTION}

For questions: security@{company}.com
```

## Post-Incident Activities

### Debrief Meeting
- **Attendees**: Security team, affected teams, management
- **Agenda**:
  - Incident timeline
  - Root cause analysis
  - Lessons learned
  - Prevention improvements

### Follow-up Actions
1. **Update Runbooks**: Incorporate lessons learned
2. **Training**: Provide additional security training
3. **Tool Updates**: Enhance detection and response tools
4. **Metrics Review**: Update security metrics and KPIs

### Continuous Improvement
- **Retrospective**: Quarterly review of incidents
- **Capability Updates**: Regular updates to security controls
- **Threat Intelligence**: Incorporate new threat patterns

---

*These runbooks are living documents and should be updated based on actual incident responses and lessons learned.*