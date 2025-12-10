# Threat Modeling Framework - SAFE-MCP Integration

## Overview

Aran MCP Sentinel integrates the [SAFE-MCP (Security Analysis Framework for Evaluation of Model Context Protocol)](https://github.com/SAFE-MCP/safe-mcp) framework to provide comprehensive threat modeling capabilities. SAFE-MCP adapts the proven MITRE ATT&CK methodology specifically for MCP environments.

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Threat Modeling System                       │
├─────────────────────────────────────────────────────────────────┤
│  SAFE-MCP TTPs    │  Detection Rules  │  Mitigation Controls   │
├─────────────────────────────────────────────────────────────────┤
│  Behavioral       │  Alert System     │  Incident Response     │
│  Analysis         │                   │                         │
└─────────────────────────────────────────────────────────────────┘
```

## SAFE-MCP Framework

SAFE-MCP provides structured documentation of adversary tactics, techniques, and procedures (TTPs) targeting MCP implementations:

- **14 Tactical Categories**: From reconnaissance to impact
- **81 Documented Techniques**: Comprehensive coverage of MCP-specific threats
- **47 Mitigations**: Actionable security controls with effectiveness ratings
- **MITRE ATT&CK Alignment**: Compatible with established security frameworks

## Threat Categories

### 1. Reconnaissance (ATK-TA0043)
Information gathering to plan future operations against MCP deployments.

### 2. Resource Development (ATK-TA0042)
- **SAFE-T2107**: AI Model Poisoning via MCP Tool Training Data Contamination

### 3. Initial Access (ATK-TA0001)
Techniques to gain entry into MCP environments:
- **SAFE-T1001**: Tool Poisoning Attack (TPA)
- **SAFE-T1002**: Supply Chain Compromise
- **SAFE-T1003**: Malicious MCP-Server Distribution
- **SAFE-T1004**: Server Impersonation / Name-Collision
- **SAFE-T1008**: Tool Shadowing Attack
- **SAFE-T1005**: Exposed Endpoint Exploit
- **SAFE-T1006**: User-Social-Engineering Install
- **SAFE-T1007**: OAuth Authorization Phishing
- **SAFE-T1009**: Authorization Server Mix-up

### 4. Execution (ATK-TA0002)
Running malicious code via MCP:
- **SAFE-T1101**: Command Injection
- **SAFE-T1102**: Prompt Injection (Multiple Vectors)
- **SAFE-T1103**: Fake Tool Invocation (Function Spoofing)
- **SAFE-T1104**: Over-Privileged Tool Abuse
- **SAFE-T1105**: Path Traversal via File Tool
- **SAFE-T1106**: Autonomous Loop Exploit
- **SAFE-T1109**: Debugging Tool Exploitation
- **SAFE-T1110**: Multimodal Prompt Injection via Images/Audio
- **SAFE-T1111**: AI Agent CLI Weaponization

### 5. Persistence (ATK-TA0003)
Maintaining foothold in MCP:
- **SAFE-T1201**: MCP Rug Pull Attack
- **SAFE-T1202**: OAuth Token Persistence
- **SAFE-T1203**: Backdoored Server Binary
- **SAFE-T1204**: Context Memory Implant
- **SAFE-T1205**: Persistent Tool Redefinition
- **SAFE-T1206**: Credential Implant in Config
- **SAFE-T1207**: Hijack Update Mechanism
- **SAFE-T2106**: Context Memory Poisoning via Vector Store Contamination

### 6. Privilege Escalation (ATK-TA0004)
Gaining higher-level permissions:
- **SAFE-T1301**: Cross-Server Tool Shadowing
- **SAFE-T1302**: High-Privilege Tool Abuse
- **SAFE-T1303**: Sandbox Escape via Server Exec
- **SAFE-T1304**: Credential Relay Chain
- **SAFE-T1305**: Host OS Priv-Esc (RCE)
- **SAFE-T1306**: Rogue Authorization Server
- **SAFE-T1307**: Confused Deputy Attack
- **SAFE-T1308**: Token Scope Substitution
- **SAFE-T1309**: Privileged Tool Invocation via Prompt Manipulation

### 7. Defense Evasion (ATK-TA0005)
Avoiding detection:
- **SAFE-T1401**: Line Jumping
- **SAFE-T1402**: Instruction Steganography
- **SAFE-T1403**: Consent-Fatigue Exploit
- **SAFE-T1404**: Response Tampering
- **SAFE-T1405**: Tool Obfuscation/Renaming
- **SAFE-T1406**: Metadata Manipulation
- **SAFE-T1407**: Server Proxy Masquerade
- **SAFE-T1408**: OAuth Protocol Downgrade

### 8. Credential Access (ATK-TA0006)
Stealing credentials:
- **SAFE-T1501**: Full-Schema Poisoning (FSP)
- **SAFE-T1502**: File-Based Credential Harvest
- **SAFE-T1503**: Env-Var Scraping
- **SAFE-T1504**: Token Theft via API Response
- **SAFE-T1505**: In-Memory Secret Extraction
- **SAFE-T1506**: Infrastructure Token Theft
- **SAFE-T1507**: Authorization Code Interception

### 9. Discovery (ATK-TA0007)
Environment reconnaissance:
- **SAFE-T1601**: MCP Server Enumeration
- **SAFE-T1602**: Tool Enumeration
- **SAFE-T1603**: System-Prompt Disclosure
- **SAFE-T1604**: Server Version Enumeration
- **SAFE-T1605**: Capability Mapping
- **SAFE-T1606**: Directory Listing via File Tool

### 10. Lateral Movement (ATK-TA0008)
Moving through the environment:
- **SAFE-T1701**: Cross-Tool Contamination
- **SAFE-T1702**: Shared-Memory Poisoning
- **SAFE-T1703**: Tool-Chaining Pivot
- **SAFE-T1704**: Compromised-Server Pivot
- **SAFE-T1705**: Cross-Agent Instruction Injection
- **SAFE-T1706**: OAuth Token Pivot Replay
- **SAFE-T1707**: CSRF Token Relay

### 11. Collection (ATK-TA0009)
Gathering data of interest:
- **SAFE-T1801**: Automated Data Harvesting
- **SAFE-T1802**: File Collection
- **SAFE-T1803**: Database Dump
- **SAFE-T1804**: API Data Harvest
- **SAFE-T1805**: Context Snapshot Capture

### 12. Command and Control (ATK-TA0011)
Communicating with compromised systems:
- **SAFE-T1901**: Outbound Webhook C2
- **SAFE-T1902**: Covert Channel in Responses
- **SAFE-T1903**: Malicious Server Control Channel
- **SAFE-T1904**: Chat-Based Backchannel

### 13. Exfiltration (ATK-TA0010)
Stealing data:
- **SAFE-T1910**: Covert Channel Exfiltration
- **SAFE-T1911**: Parameter Exfiltration
- **SAFE-T1912**: Stego Response Exfil
- **SAFE-T1913**: HTTP POST Exfil
- **SAFE-T1914**: Tool-to-Tool Exfil
- **SAFE-T1915**: Cross-Chain Laundering via Bridges/DEXs

### 14. Impact (ATK-TA0040)
Manipulating, interrupting, or destroying systems:
- **SAFE-T2101**: Data Destruction
- **SAFE-T2102**: Service Disruption
- **SAFE-T2103**: Code Sabotage
- **SAFE-T2104**: Fraudulent Transactions
- **SAFE-T2105**: Disinformation Output

## Mitigation Framework

SAFE-MCP provides 47 actionable mitigations categorized by type and effectiveness:

### High-Effectiveness Mitigations (26 controls)
- **SAFE-M-1**: Control/Data Flow Separation (Architectural Defense)
- **SAFE-M-2**: Cryptographic Integrity for Tool Descriptions
- **SAFE-M-6**: Tool Registry Verification
- **SAFE-M-11**: Behavioral Monitoring
- **SAFE-M-13**: OAuth Flow Verification
- **SAFE-M-14**: Server Allowlisting
- And 20 more...

### Medium-High Effectiveness Mitigations (15 controls)
- **SAFE-M-3**: AI-Powered Content Analysis
- **SAFE-M-4**: Unicode Sanitization and Filtering
- **SAFE-M-7**: Content Rendering Parity
- And 12 more...

### Medium Effectiveness Mitigations (6 controls)
- **SAFE-M-5**: Content Sanitization
- **SAFE-M-10**: Automated Scanning
- And 4 more...

## Integration with Aran MCP Sentinel

### Existing Security Features Mapped to SAFE-MCP

#### Tool Poisoning Detection
- **Maps to**: SAFE-T1001, SAFE-T1501
- **Mitigations**: SAFE-M-2, SAFE-M-3, SAFE-M-4, SAFE-M-5
- **Current Implementation**: `backend/internal/security/prompt_injection_detector.go`

#### Behavioral Analysis
- **Maps to**: Multiple TTPs across all categories
- **Mitigations**: SAFE-M-11, SAFE-M-20, SAFE-M-36
- **Current Implementation**: `backend/internal/security/behavioral_analyzer.go`

#### Credential Scanning
- **Maps to**: SAFE-T1502, SAFE-T1503, SAFE-T1504
- **Mitigations**: SAFE-M-12, SAFE-M-19
- **Current Implementation**: `backend/internal/security/credential_scanner.go`

#### OWASP MCP Top 10
- **Maps to**: Various SAFE-MCP techniques
- **Current Implementation**: `backend/internal/security/owasp_mcp_top10.go`

### New Capabilities Added

1. **Threat Intelligence Database**: Structured storage of SAFE-MCP TTPs
2. **Detection Rules**: Pattern matching for known attack techniques
3. **Mitigation Tracking**: Monitor implementation and effectiveness of controls
4. **Threat Matrix Visualization**: Visual representation of threat landscape
5. **Risk Assessment**: Automated scoring based on detected TTPs

## Usage Guidelines

### For Security Teams
1. Review the TTP reference table to understand threats
2. Use the threat matrix dashboard to visualize current risks
3. Implement recommended mitigations based on priority
4. Monitor detection alerts for active threats

### For Developers
1. Review techniques relevant to your MCP tools
2. Implement recommended mitigations in code
3. Use the security testing endpoints to validate controls
4. Follow secure coding practices from SAFE-MCP guidelines

### For Compliance Officers
1. Map SAFE-MCP techniques to existing security controls
2. Use MITRE ATT&CK linkages for compliance reporting
3. Track mitigation implementation status
4. Generate compliance reports from threat intelligence data

### For Red Teams
1. Reference attack techniques for security testing
2. Use PoC examples to validate defenses
3. Report findings using standardized TTP IDs
4. Validate detection and response capabilities

## API Endpoints

### Threat Intelligence
- `GET /api/v1/threat-model/tactics` - List all tactics
- `GET /api/v1/threat-model/techniques` - List all techniques
- `GET /api/v1/threat-model/techniques/:id` - Get technique details
- `GET /api/v1/threat-model/mitigations` - List all mitigations
- `GET /api/v1/threat-model/mitigations/:id` - Get mitigation details

### Detection and Alerts
- `GET /api/v1/threat-model/detections` - List detected threats
- `POST /api/v1/threat-model/detections/scan` - Run threat detection scan
- `GET /api/v1/threat-model/alerts` - Get active security alerts

### Risk Assessment
- `GET /api/v1/threat-model/risk-assessment` - Get overall risk assessment
- `POST /api/v1/threat-model/risk-assessment/server/:id` - Assess specific server

## References

- **SAFE-MCP Repository**: https://github.com/SAFE-MCP/safe-mcp
- **MITRE ATT&CK**: https://attack.mitre.org/
- **Aran Security Architecture**: [SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md)
- **OWASP MCP Top 10**: Integrated in Aran security modules

## Continuous Updates

The SAFE-MCP framework is continuously updated as new threats emerge. Aran MCP Sentinel will maintain alignment with the latest threat intelligence through:

- Regular updates to the threat database
- Community-contributed detection rules
- Integration with threat intelligence feeds
- Automated synchronization with SAFE-MCP repository

---

*This threat modeling framework provides Aran MCP Sentinel with comprehensive, structured, and actionable threat intelligence for securing MCP deployments.*
