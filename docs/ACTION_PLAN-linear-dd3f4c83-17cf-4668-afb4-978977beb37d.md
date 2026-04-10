# ACTION_PLAN - linear-dd3f4c83-17cf-4668-afb4-978977beb37d

## Added by Bootstrap (refresh as needed)

## Summary
- Goal: migrate the live host from the legacy shim-backed LaunchAgent onto the shipped `CO-117` supervision path and make rollout truth machine-checkable.
- Scope: docs-first packet, audited docs-review child stream, live host/operator audit, bounded rollout or status or migration changes, focused tests, and the normal validation or review handoff flow.
- Assumptions:
  - the existing `control-host supervise` family is the right base surface; the gap is rollout adoption and truth, not a missing command family
  - the migration path should be bounded and operator-friendly for the real shim baseline on this host

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: preserve `CO-117`, `control-host supervise install|status|restart|uninstall|run`, `legacy shim`, `packaged supervision path`, `LaunchAgent`, `co-control-host-supervisor.sh`, `launchd`, `control-host`, and the separation from queue-management and merge-policy logic.
- Not done if: the live host still launches through `~/.local/bin/co-control-host-supervisor.sh`, operators still need manual plist edits, or `status` still cannot classify legacy versus packaged rollout truthfully.
- Pre-implementation issue-quality review: approved. This lane is explicitly a rollout/adoption follow-up to `CO-117`, not a reopened feature-design lane.

## Milestones & Sequencing
1. Create the CO-141 docs packet, checklist mirrors, freshness-registry entries, task snapshot, and the required single workpad source, then run audited `linear child-stream --pipeline docs-review`.
2. Audit the current source, built artifact, operator entrypoint, launchd plist, and active process lineage to pin down the exact rollout gap.
3. Implement the bounded rollout changes: truthful status classification, legacy-shim migration/install behavior, and any required supported entrypoint adjustments.
4. Add focused tests and docs updates for rollout classification and legacy-to-managed adoption.
5. Run the required validation floor, standalone review, explicit elegance pass, refresh the workpad, and prepare PR/review handoff.

## Dependencies
- `bin/codex-orchestrator.ts`
- `orchestrator/src/cli/controlHostSupervisionCliShell.ts`
- `orchestrator/src/cli/control/controlHostSupervision.ts`
- `orchestrator/tests/ControlHostSupervision.test.ts`
- `orchestrator/tests/CodexOrchestratorCli.test.ts`
- `docs/public/provider-onboarding.md`
- live macOS `launchctl` / LaunchAgent / process-lineage checks on this host

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-dd3f4c83-17cf-4668-afb4-978977beb37d "/opt/homebrew/Cellar/node/25.2.1/bin/node" "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-141-docs-review --format json`
  - focused Vitest coverage for rollout classification, legacy migration/install behavior, and any touched command-surface help or parsing
  - host-level before or after verification for command surface, launchd truth, process lineage, and managed config/state
  - required repo validation floor after implementation
  - `npm run pack:smoke` if the diff changes downstream CLI packaging or operator entrypoint behavior
- Rollback plan:
  - revert rollout or status or migration changes together so the current shipped-but-bypassed surface remains unchanged rather than leaving a half-migrated contract

## Risks & Mitigations
- Risk: `status` claims managed rollout while launchd still points at the shim.
  - Mitigation: derive rollout classification from the actual LaunchAgent payload and launchctl truth, not only from managed config presence.
- Risk: migration changes break the currently useful health-poll/restart semantics.
  - Mitigation: keep the runtime loop unchanged where possible and confine changes to rollout classification, artifact rendering, and migration helpers.
- Risk: rollout becomes coupled to one stale or machine-specific operator entrypoint.
  - Mitigation: explicitly bless or render the supported entrypoint during install or migration instead of relying on ambient PATH coincidence.

## Approvals
- Reviewer: docs-review child stream manifest `.runs/linear-dd3f4c83-17cf-4668-afb4-978977beb37d-co-141-docs-review/cli/2026-04-10T07-01-12-520Z-3922c49d/manifest.json`; manual fallback note `out/linear-dd3f4c83-17cf-4668-afb4-978977beb37d/manual/20260410T070112Z-docs-review-fallback.md`
- Date: 2026-04-10
