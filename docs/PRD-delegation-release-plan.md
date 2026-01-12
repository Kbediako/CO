# PRD - Delegation NPM Release Plan (Task 0942)

## Summary
- Problem Statement: The latest npm release (0.1.3 published 2026-01-05) lacks the newly merged delegation control-plane features, so users cannot access delegate.* MCP tools, confirm-to-act behavior, or question polling without a new release.
- Desired Outcome: Publish a new npm release that includes the delegation MCP server, confirm-to-act control plane, and question queue features with updated dependencies, plus clear release notes and rollback guidance.

## Goals
- Verify release deltas between main and npm 0.1.3 (package.json + feature presence).
- Define the release version/tag strategy and release notes.
- Validate packaging allowlist/pack audit compatibility for delegation runtime assets.
- Execute the tag-driven release workflow for 0.1.4.
- Update PRD/TECH_SPEC/ACTION_PLAN/task mirrors with evidence.

## Non-Goals
- Manual npm publish outside the tag-driven release workflow.
- Developing new delegation/control-plane features (this task ships already-merged functionality via release metadata + validation).

## Stakeholders
- Product: Codex Orchestrator Platform
- Engineering: Orchestrator Core + Autonomy
- Release: Maintainers

## Metrics & Guardrails
- Primary Success Metrics:
  - New npm version published with delegation server + confirm-to-act + question queue support.
  - Release workflow completes with pack audit + smoke test passing.
- Guardrails / Error Budgets:
  - Release tag must match package.json version.
  - Only files under allowlist prefixes (dist/, schemas/, templates/) ship.
  - Delegation features remain opt-in via config flags.

## Current Release Delta (0.1.3 vs main)
- package.json: main adds dependencies `@iarna/toml` and `canonicalize` (required for delegation config + confirm-to-act canonicalization).
- Feature presence: published tarball lacks `delegate.*` tool definitions and confirm-to-act control server references; main includes them in `orchestrator/src/cli/delegationServer.ts` and control server modules.
- CLI surface: main exposes a `delegation-server` entrypoint; npm 0.1.3 dist does not include these strings.
- Target release: ship patch release `0.1.4` (no prerelease planned).

## User Experience
- Personas:
  - Operators who need delegation + question queue in Codex sessions.
  - Developers who need confirm-to-act enforcement for destructive operations.
- User Journeys:
  - Install new npm version, enable `mcp_servers.delegation.enabled=true`, and run delegate workflows with question queue and confirm-to-act.

## Technical Considerations
- Delegation MCP server + confirm-to-act control plane compiled under dist/orchestrator.
- Added dependencies for TOML parsing and canonicalization.
- Pack audit allowlist already permits dist/orchestrator/**; no new top-level paths expected.
- Release workflow uses tag-driven publish (see `.agent/SOPs/release.md`).

## Documentation & Evidence
- Tech Spec: `docs/TECH_SPEC-delegation-release-plan.md`
- Action Plan: `docs/ACTION_PLAN-delegation-release-plan.md`
- Task checklist: `tasks/tasks-0942-delegation-release-plan.md`
- Run Manifest Link: (docs-review run recorded in task checklist)

## Open Questions
- None (version fixed at 0.1.4; no prerelease planned).

## Approvals
- Product: Approved (2026-01-12, no conflicts)
- Engineering: Approved (2026-01-12, no conflicts)
- Release: Approved (2026-01-12, no conflicts)
