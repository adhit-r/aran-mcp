# MCP Attack Matrix Hardening (SpecKit)

## Problem Statement

Aran MCP Sentinel partially detects and mitigates threats cataloged in the MCP Attack Matrix. Core gaps remain around tool integrity, authorization, drift detection, and consistent application of existing detectors. Without a cohesive hardening plan the platform cannot provide comprehensive protection for MCP tool chains.

## Goals

- Deliver production-grade coverage for all high-risk attack techniques in the matrix.
- Integrate existing analyzers (prompt, credential, behavioral) into live MCP flows.
- Enforce authentication, authorization, and tool integrity on every MCP interaction.
- Provide observability, auditing, and response workflows mapped to each threat class.

## Non-Goals

- Building LLM long-term memory or SSE streaming support.
- Replacing Clerk/Authelia authentication providers.
- Expanding beyond current MCP HTTP transport scope.

## Background

Relevant code paths:
- `backend/internal/mcp` — servers, tools, discovery handlers with limited auth.
- `backend/internal/security` — mock-based security tests, detectors, OWASP MCP Top 10 manager.
- `backend/internal/monitoring` — health checker polling for MCP servers but lacking security posture signals.
- `backend/internal/middleware` — request validation, rate limiting, security headers (global only).

Authentication middleware is currently bypassed for MCP endpoints to aid testing, leaving authorization gaps. Table schemas exist (`mcp_servers`, etc.), but integrity metadata (signatures, versions, drift) is not tracked.

## Current Coverage vs Matrix

| Attack Family | Layer | Coverage Status | Notes |
| --- | --- | --- | --- |
| Prompt & Tool-Based | Input | Partial | Validation middleware exists; no supply-chain attestation for tools. |
| Prompt & Tool-Based | Execution | Gap | No tool identity verification; registry trusts reported metadata. |
| Prompt & Tool-Based | Output | Partial | Prompt analyzer exists but not hooked into tool responses. |
| Server-Based | Input | Partial | Rate limiter global only; no SSE controls. |
| Server-Based | Execution | Gap | No detection for replay/rug-pull; auth disabled on MCP routes. |
| Server-Based | Output | Gap | Authorization bypass possible; no response policy. |
| Data & Credential | Input | Partial | Credential scanner present but unused in pipeline. |
| Data & Credential | Execution | N/A | Memory injection out of scope (no memory module). |
| Data & Credential | Output | Gap | No redaction or data classification enforcement. |
| Agent Manipulation | Input | Partial | Request validator performs schema checks; lacks provenance verification. |
| Agent Manipulation | Execution | Partial | Behavioral analyzer mocked; no real telemetry. |
| Agent Manipulation | Output | Gap | Conditional invocation policies missing; responses ungoverned. |

## Proposed Solution (Phased)

1. **Phase 1 – Access & Integrity Hardening**
   - Re-enable auth middleware on MCP routes with scoped API tokens.
   - Introduce tool registry attestation: store signing keys, version hashes, and execution policies in `mcp_tools` tables.
   - Extend rate limiter middleware for per-tool quotas and IP throttling.

2. **Phase 2 – Detection Pipeline Integration**
   - Wrap tool invocations with prompt/credential analyzer pipeline before returning responses.
   - Add drift detection comparing stored tool fingerprints with live metadata; trigger alerts on mismatch.
   - Implement replay detection by logging invocation fingerprints and timestamps.

3. **Phase 3 – Testing & Response Automation**
   - Expand security tester suite with simulations for tool poisoning, replay, authorization bypass.
   - Surface alerts via monitoring API and publish dashboards; integrate with existing Playwright tests.
   - Deliver coverage report tying controls to matrix rows; add response runbooks.

## Detailed Design

### Authentication & Authorization
- Reinstate Clerk/Authelia middleware in `cmd/server/main.go` under feature flag `ENABLE_MCP_AUTH`.
- Add policy engine (`backend/internal/security/policy`) to enforce per-organization scopes on MCP endpoints.
- Update API client/front-end to include scoped bearer tokens.

### Tool Integrity & Registry Enhancements
- Introduce schema fields: `mcp_tools.signature`, `mcp_tools.version_hash`, `mcp_tools.last_verified_at`.
- Add verification middleware in `internal/mcp/enhanced_handler.go` prior to executing tools.
- Implement periodic attestation job in monitoring package to refresh signatures.

### Detection Pipeline
- Create `internal/security/pipeline` module chaining prompt detector, credential scanner, behavioral analyzer.
- Invoke pipeline on tool responses and discovery payloads; annotate alerts in `mcp_alerts`.
- Extend logging to include pipeline decisions with correlation IDs.

### Drift & Replay Detection
- New table `mcp_tool_invocations` storing request/response hashes, caller identity, timestamps.
- Compare incoming fingerprints to detect rug-pulls or drifts; escalate via monitoring alerts.

### Testing & Simulation
- Expand `SecurityTester` to orchestrate new simulated attacks using MCP HTTP client.
- Establish regression tests (Go + Playwright) covering success/blocked scenarios.

## Risks & Mitigations

- **Performance overhead**: use asynchronous pipeline with bounded latency budget (<10 ms P99).
- **False positives**: start in shadow mode logging-only; gather baseline before enforcement.
- **Schema changes**: coordinate migrations with environments; provide rollback scripts.
- **Auth integration complexity**: maintain feature flag and fall back to existing bypass for emergencies.

## Open Questions

1. Preferred attestation mechanism (PKI, mTLS, HMAC) for tool registry?
2. Where should alerts surface in frontend (new dashboard vs existing monitoring view)?
3. Do we need per-tenant customization of policy rules out of the gate?
4. Requirement for external integrations (PagerDuty, Slack) for alerts?

## Milestones

1. Spec sign-off & design review — Week 1
2. Phase 1 implementation (auth, registry, rate limits) — Weeks 2-3
3. Phase 2 detection integration — Weeks 4-5
4. Phase 3 testing, dashboards, docs — Week 6
5. GA readiness review & launch checklist — Week 7

## Success Metrics

- 100% coverage of matrix rows with documented controls.
- Automated attack simulations show zero critical unmitigated findings.
- False positive rate for prompt/credential alerts under 5% after tuning.
- MCP tool invocation latency increases by no more than 10 ms at P99.

## Rollout Plan

- Introduce feature flags (`ENABLE_MCP_AUTH`, `ENABLE_SECURITY_PIPELINE`).
- Deploy in observe-only mode; compare logs against baseline for two weeks.
- Gradually enforce policies per environment (dev → staging → prod).

## Documentation & Follow-Up

- Update `docs/security/SECURITY_ARCHITECTURE.md` with new controls and data flows.
- Add incident response runbook covering tool poisoning, replay, auth bypass scenarios.
- Publish coverage report in `docs/SECURITY_INNOVATIONS_2025.md`.
