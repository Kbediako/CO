# ACTION_PLAN - CO: harden control-host supervise restart against orphaned duplicate host burn

## Added by Bootstrap 2026-04-12

## Summary
- Goal: make supervised restart a deterministic control-host replacement boundary and stop stuck refreshes from continuing direct Linear burn after restart is already required.
- Scope:
  - docs-first packet and workpad
  - supervised restart orphan cleanup/wait logic
  - stuck-refresh abort seam
  - operator-facing status/runbook clarification
  - focused tests and validation/review handoff
- Assumptions:
  - CO-152 ownership artifacts remain the canonical duplicate-owner evidence path
  - provider workers launched by control-host remain detached issue processes and are not part of the supervised control-host tree cleanup target
  - the 45s stuck threshold remains the signal boundary for this lane

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `control-host supervise restart`
  - `orphaned duplicate control-host child`
  - `provider_refresh_lifecycle_stuck`
  - `dispatch_source_issue_by_id`
  - `restart_required`
- Not done if:
  - supervised restart can return success while the old child tree is still alive
  - stuck refresh continues new issue-by-id reads after restart is already required
  - worker issue processes are killed as collateral
  - operator guidance still implies manual orphan cleanup is the normal path
- Pre-implementation issue-quality review:
  - Approved on 2026-04-12 after live Linear state inspection, same-turn parallelization decision, branch creation, and source audit. The implementation is intentionally narrower than another duplicate-owner redesign: it only hardens restart replacement and stuck-refresh abort behavior on top of the existing ownership lock.

## Milestones & Sequencing
1. Docs and audited design gate
   - Create PRD, TECH_SPEC, ACTION_PLAN, task checklist, `.agent` mirror, registry entries, and `docs/TASKS.md` snapshot.
   - Run `linear child-stream --pipeline docs-review` and record manifest or truthful fallback.
2. Restart cleanup implementation
   - Extract or add a restart helper around `launchctl kickstart -k`.
   - Wait for the prior supervised child pid to exit and force-clean only that tree if launchd leaves it behind.
   - Surface structured prior-child cleanup evidence in restart output and status-facing operator guidance.
3. Stuck-refresh abort implementation
   - Thread a sticky abort seam from polling health into `providerIssueHandoff` refresh logic.
   - Stop later direct issue reads or fresh discovery once the lifecycle is already classified as stuck.
4. Tests and validation
   - Add focused supervision restart/orphan cleanup tests.
   - Add focused stuck-refresh no-further-burn regression coverage.
   - Run required repo validation, standalone review, elegance pass, PR create/attach, PR checks, and `pr ready-review` drain before review handoff.

## Dependencies
- `orchestrator/src/cli/controlHostSupervisionCliShell.ts`
- `orchestrator/src/cli/control/controlHostOwnership.ts`
- `orchestrator/src/cli/control/controlServerPublicLifecycle.ts`
- `orchestrator/src/cli/control/providerIssueHandoff.ts`
- `orchestrator/src/cli/control/providerPollingHealth.ts`
- `orchestrator/tests/ControlHostSupervision.test.ts`
- `orchestrator/tests/ControlServerPublicLifecycle.test.ts`
- `orchestrator/tests/ProviderIssueHandoff.test.ts`
- `docs/public/provider-onboarding.md`

## Validation
- Checks / tests:
  - `linear child-stream --pipeline docs-review` or recorded fallback
  - focused Vitest for supervision restart/orphan cleanup and stuck-refresh abort
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - `npm run pack:smoke`
  - manifest-backed `codex-orchestrator review`
- Rollback plan:
  - revert restart cleanup and abort-seam wiring together if focused regressions show collateral worker kills, ownership drift, or stale status evidence.

## Risks & Mitigations
- Risk: restart cleanup kills the wrong process tree.
  - Mitigation: target only the previously tracked supervised child pid and its process group/descendants, not broad `pkill` patterns.
- Risk: the abort seam stops legitimate recovery work too early.
  - Mitigation: trigger only after polling health is already stuck and scoped to suppressing further live reads in the same refresh cycle.
- Risk: operator guidance still leaves host-vs-worker process identity ambiguous.
  - Mitigation: include child pid semantics directly in status text and the public runbook.

## Approvals
- Reviewer: audited docs-review fallback clean (`.runs/linear-b84c9a78-b62f-48fa-b1c4-88f8222535da-co-163-docs-review/cli/2026-04-12T15-55-23-100Z-6b52bdd3/manifest.json`)
- Date: 2026-04-12
