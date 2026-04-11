# ACTION_PLAN - CO: prevent duplicate same-task control hosts from competing on provider intake

## Added by Bootstrap 2026-04-11

## Summary
- Goal: make same-task control-host ownership exclusive before provider refresh polling can compete on one provider-intake state.
- Scope:
  - docs-first packet and workpad
  - startup owner-lock acquisition
  - active duplicate fail-closed diagnostics
  - stale-owner cleanup by liveness metadata
  - operator-visible owner metadata
  - focused tests and validation/review handoff
- Assumptions:
  - provider-intake state remains the authoritative claim ledger
  - duplicate protection should not terminate any process
  - the launchd-supervised host remains the normal owner path

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `control-host --task local-mcp --run control-host --pipeline provider-linear-worker`
  - `provider-intake-state.json`
  - `provider_poll_lifecycle_stuck`
  - `provider_refresh_lifecycle_stuck`
  - `co-status`
- Not done if:
  - concurrent same-task hosts can poll one provider-intake state
  - duplicate detection relies on manual process killing
  - API budget exhaustion is hidden by duplicate-host wording
  - provider claims can be corrupted, discarded, or orphaned
- Pre-implementation issue-quality review:
  - Approved on 2026-04-11 after live Linear state inspection, workpad bootstrap, parallelization decision, branch creation, and source audit. The lane covers the full requested duplicate-host ownership boundary and rejects narrower-only refresh timeout handling.

## Milestones & Sequencing
1. Docs and audited design gate
   - Create PRD, TECH_SPEC, ACTION_PLAN, task checklist, `.agent` mirror, registry entries, and `docs/TASKS.md` snapshot.
   - Run `linear child-stream --pipeline docs-review` and record manifest or truthful fallback.
2. Baseline and implementation
   - Add owner-lock helper and constants.
   - Acquire ownership before ready-instance startup/provider refresh scheduling.
   - Release ownership safely on shutdown.
   - Add duplicate/stale owner metadata to local artifact and runtime/polling diagnostics.
3. Tests and validation
   - Add focused duplicate active-owner, stale cleanup, and current-owner release tests.
   - Add lifecycle and runtime/status regressions.
   - Run required repo validation, standalone review, elegance pass, PR create/attach, PR checks, and `pr ready-review` drain before review handoff.

## Dependencies
- `orchestrator/src/cli/control/controlServerPublicLifecycle.ts`
- `orchestrator/src/cli/control/controlServerStartupInputPreparation.ts`
- `orchestrator/src/cli/control/controlRuntime.ts`
- `orchestrator/src/cli/control/providerPollingHealth.ts`
- `orchestrator/src/cli/control/providerIntakeState.ts`
- `orchestrator/tests/ControlServerPublicLifecycle.test.ts`
- `orchestrator/tests/ControlRuntime.test.ts`

## Validation
- Checks / tests:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - focused Vitest for ownership/lifecycle/runtime regressions
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - manifest-backed `codex-orchestrator review`
- Rollback plan:
  - revert owner-lock wiring and leave the docs packet with the failing duplicate-host evidence if any active-worker or provider-claim safety regression appears.

## Risks & Mitigations
- Risk: stale cleanup removes an active owner because liveness detection is wrong.
  - Mitigation: fail closed on ambiguous metadata and inject liveness checks in tests.
- Risk: startup lock blocks legitimate replacement after crash.
  - Mitigation: stale-owner path removes only the lock metadata after owner pid is inactive and preserves provider-intake claims.
- Risk: diagnostics conflate duplicate host with API budget exhaustion.
  - Mitigation: use explicit `duplicate_control_host_owner` reason and keep Linear/GitHub budget metadata separate.

## Approvals
- Reviewer: pending audited docs-review
- Date: 2026-04-11
