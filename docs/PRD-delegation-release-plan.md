# PRD - Delegation NPM Release Plan (Task 0942)

## Summary
- Problem Statement: The latest npm release (0.1.4 published 2026-01-12) includes delegation features, but the delegation MCP server times out when used with Codex CLI because it expects Content-Length framing while Codex sends newline-delimited JSON (JSONL).
- Desired Outcome: Publish a patch release that fixes delegation MCP framing compatibility with Codex CLI while preserving existing delegation features, with updated release notes and rollback guidance.

## Goals
- Verify release deltas between main and npm 0.1.4 (protocol compatibility and runtime behavior).
- Define the patch release version/tag strategy and release notes.
- Validate packaging allowlist/pack audit compatibility for delegation runtime assets.
- Execute the tag-driven release workflow for 0.1.5.
- Update PRD/TECH_SPEC/ACTION_PLAN/task mirrors with evidence.

## Non-Goals
- Manual npm publish outside the tag-driven release workflow.
- Developing new delegation/control-plane features beyond the framing compatibility fix.

## Stakeholders
- Product: Codex Orchestrator Platform
- Engineering: Orchestrator Core + Autonomy
- Release: Maintainers

## Metrics & Guardrails
- Primary Success Metrics:
- New npm version published with delegation server + confirm-to-act + question queue support and MCP framing compatibility with Codex CLI.
  - Release workflow completes with pack audit + smoke test passing.
- Guardrails / Error Budgets:
- Release tag must match package.json version.
  - Only files under allowlist prefixes (dist/, schemas/, templates/) ship.
  - Delegation features remain opt-in via config flags.

## Current Release Delta (0.1.4 vs main)
- package.json: 0.1.4 includes delegation dependencies; no new deps required for the framing fix.
- Runtime behavior: delegation server expects Content-Length framed MCP requests; Codex CLI sends JSONL over stdio, causing handshake timeouts.
- Target release: ship patch release `0.1.5` (no prerelease planned).

## User Experience
- Personas:
  - Operators who need delegation + question queue in Codex sessions.
  - Developers who need confirm-to-act enforcement for destructive operations.
- User Journeys:
- Install new npm version, enable `mcp_servers.delegation.enabled=true`, and run delegate workflows without MCP handshake timeouts.

## Technical Considerations
- Delegation MCP server compiled under dist/orchestrator with additional JSONL framing compatibility.
- No new dependencies expected.
- Pack audit allowlist already permits dist/orchestrator/**; no new top-level paths expected.
- Release workflow uses tag-driven publish (see `.agent/SOPs/release.md`).

## Documentation & Evidence
- Tech Spec: `docs/TECH_SPEC-delegation-release-plan.md`
- Action Plan: `docs/ACTION_PLAN-delegation-release-plan.md`
- Task checklist: `tasks/tasks-0942-delegation-release-plan.md`
- Run Manifest Link: (docs-review run recorded in task checklist)

## Open Questions
- None (version fixed at 0.1.5; no prerelease planned).

## Approvals
- Product: Approved (2026-01-12, no conflicts)
- Engineering: Approved (2026-01-12, no conflicts)
- Release: Approved (2026-01-12, no conflicts)
