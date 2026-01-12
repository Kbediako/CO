# Technical Spec - Delegation NPM Release Plan (Task 0942)

## Overview
- Objective: Publish a patch npm release that fixes delegation MCP framing compatibility with Codex CLI while preserving delegation features.
- In Scope: JSONL framing support in delegation MCP server, version bump + tag strategy, release notes, pack audit/allowlist validation, release SOP execution plan.
- Out of Scope: feature expansions beyond framing compatibility, or unrelated refactors.

## Architecture & Design
### Current State
- npm latest is 0.1.4 (published 2026-01-12) and includes delegation features, but the MCP server expects Content-Length framing and times out with Codex CLI JSONL framing.
- main includes delegation server + confirm-to-act control plane; no new dependencies are required for the framing fix.

### Proposed Changes
- Version bump target: `0.1.5` (patch release).
- Tag strategy:
- Stable: `v0.1.5` -> npm dist-tag `latest`.
  - Prerelease: none planned.
- Release notes include:
- Delegation MCP server (delegate.spawn/pause/cancel/status + question queue).
- Confirm-to-act enforcement + nonce validation.
- MCP framing compatibility: accept JSONL framing from Codex CLI in addition to Content-Length framed requests.
- Packaging:
- Ensure all delegation/runtime assets stay under existing allowlist prefixes (dist/orchestrator/**, dist/bin/**, schemas/**, templates/**).
- Run pack audit + pack smoke as part of the release gate.

### Data Persistence / State Impact
- None (patch-level runtime compatibility change).

### External Dependencies
- npm registry and GitHub Actions tag-driven release workflow.

## Operational Considerations
- Failure Modes:
- Tag/version mismatch blocks release workflow.
- pack audit failure if new dist paths escape allowlist.
- Regression risk if framing detection mishandles partial buffers.
- Observability & Telemetry:
  - Monitor `.github/workflows/release.yml` run output and artifact checks.
- Security / Privacy:
  - Delegation token + confirm_nonce remain runner-injected; no new telemetry.
- Performance Targets:
  - No new performance targets for this release.

## Testing Strategy
- Unit / Integration: add framing tests for JSONL inputs; keep existing MCP framing tests.
- Tooling / Automation:
  - Release SOP sequence: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `npm run review`.
  - Release validation: `npm run clean:dist && npm run build`, `npm run pack:audit`, `npm run pack:smoke`.
- Rollback Plan:
- If publishing fails, fix and retag; do not publish from non-release artifacts.
- If a regression is found post-release, publish a patch (0.1.6) and update release notes.

## Documentation & Evidence
- Linked PRD: `docs/PRD-delegation-release-plan.md`
- Run Manifest Link: (docs-review run recorded in task checklist)
- Metrics / State Snapshots: `.runs/0942-delegation-release-plan/metrics.json`, `out/0942-delegation-release-plan/state.json`

## Open Questions
- None (full matrix validation required per release SOP).

## Approvals
- Engineering: Approved (2026-01-12, no conflicts)
- Reviewer: Approved (2026-01-12, no conflicts)
