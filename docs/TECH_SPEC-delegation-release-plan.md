# Technical Spec - Delegation NPM Release Plan (Task 0942)

## Overview
- Objective: Publish the next npm release that includes delegation MCP server, confirm-to-act control plane, and question queue support.
- In Scope: version bump + tag strategy, release notes, pack audit/allowlist validation, release SOP execution plan.
- Out of Scope: new feature changes or refactors beyond minimal test typing fixes required for validation.

## Architecture & Design
### Current State
- npm latest is 0.1.3 (published 2026-01-05) and its dist tarball does not include delegate.* tool definitions or confirm-to-act references.
- main includes delegation server + confirm-to-act control plane and adds dependencies `@iarna/toml` and `canonicalize`.

### Proposed Changes
- Version bump target: `0.1.4` (patch release).
- Tag strategy:
  - Stable: `v0.1.4` -> npm dist-tag `latest`.
  - Prerelease: none planned.
- Release notes include:
  - Delegation MCP server (delegate.spawn/pause/cancel/status + question queue).
  - Confirm-to-act enforcement + nonce validation.
  - New dependencies (`@iarna/toml`, `canonicalize`).
- Packaging:
  - Ensure all delegation/runtime assets stay under existing allowlist prefixes (dist/orchestrator/**, dist/bin/**, schemas/**, templates/**).
  - Run pack audit + pack smoke as part of the release gate.

### Data Persistence / State Impact
- None (release-only changes).

### External Dependencies
- npm registry and GitHub Actions tag-driven release workflow.

## Operational Considerations
- Failure Modes:
  - Tag/version mismatch blocks release workflow.
  - pack audit failure if new dist paths escape allowlist.
  - Missing dependency additions could break delegation runtime.
- Observability & Telemetry:
  - Monitor `.github/workflows/release.yml` run output and artifact checks.
- Security / Privacy:
  - Delegation token + confirm_nonce remain runner-injected; no new telemetry.
- Performance Targets:
  - No new performance targets for this release.

## Testing Strategy
- Unit / Integration: rely on existing tests; no new tests expected for this planning task (test-only typing fixes may be required as dependencies/TS configs evolve).
- Tooling / Automation:
  - Release SOP sequence: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `npm run review`.
  - Release validation: `npm run clean:dist && npm run build`, `npm run pack:audit`, `npm run pack:smoke`.
- Rollback Plan:
  - If publish fails, fix and retag; do not publish from non-release artifacts.
  - If regression found post-release, publish a patch (0.1.5) and update release notes.

## Documentation & Evidence
- Linked PRD: `docs/PRD-delegation-release-plan.md`
- Run Manifest Link: (docs-review run recorded in task checklist)
- Metrics / State Snapshots: `.runs/0942-delegation-release-plan/metrics.json`, `out/0942-delegation-release-plan/state.json`

## Open Questions
- None (full matrix validation required per release SOP).

## Approvals
- Engineering: Approved (2026-01-12, no conflicts)
- Reviewer: Approved (2026-01-12, no conflicts)
