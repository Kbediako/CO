# TECH_SPEC - Coordinator Staged External Surfaces Onboarding + Runbook Readiness (1008)

- Canonical TECH_SPEC: `tasks/specs/1008-coordinator-staged-external-surfaces-onboarding-and-runbook-readiness.md`.
- Owner: Codex.
- Last Reviewed: 2026-03-05.

## Summary
- Scope: docs-first planning for staged external-surface setup readiness and runbook contracts.
- Stage policy: Telegram setup/canary first, Linear advisory integration setup now, Discord deferred until Telegram evidence closes.
- Boundary: CO remains execution authority; Coordinator remains intake/control bridge.

## Requirements
- Authority invariants are explicit and unchanged across all artifacts.
- Mutating-control auth/token boundary remains fail-closed:
  - scoped principal binding,
  - expiry/replay/revocation enforcement,
  - deterministic reject reasons for invalid auth/session input.
- Mutating-control idempotency/replay boundary remains fail-closed:
  - deterministic request/intent index behavior,
  - replay-window enforcement,
  - canonical traceability field coverage.
- Rollout sequencing is explicit with gate criteria for each stage.
- Operator runbook deliverables are explicit for Telegram and Linear; Discord remains deferred with entry conditions.
- Mock/manual test expectations are explicit per stage with no-mutation proof for advisory paths.

## Rollout Contract
1. Telegram setup/canary stage (start now).
- Required gate evidence:
  - setup runbook complete,
  - credential scope + rotation documented,
  - canary pass and rollback drill pass,
  - auth/replay/idempotency checks demonstrated via manual simulations.

2. Linear advisory integration setup stage (start now, non-authoritative).
- Required gate evidence:
  - advisory-only dispatch contract preserved,
  - default-off and kill-switch behavior verified,
  - malformed-source fail-closed behavior verified,
  - no-mutation proof captured.

3. Discord deferred stage.
- Entry criteria:
  - Telegram stage evidence closed and stable,
  - same setup/canary controls prepared and approved before activation planning.

## Operator Runbook Deliverables
- Telegram runbook deliverables:
  - onboarding prerequisites and identity mapping,
  - credential and webhook setup procedure,
  - canary execution checklist,
  - rollback + incident handling steps,
  - audit traceability verification checklist.
- Linear runbook deliverables:
  - advisory source-binding procedure,
  - dispatch recommendation validation procedure,
  - kill-switch/default-off verification,
  - malformed-source fail-closed troubleshooting.
- Discord deferred deliverables:
  - deferred-entry checklist,
  - go/no-go gate template,
  - reusable setup/canary/rollback skeleton.

## Mock/Manual Test Expectations
- Telegram manual coverage includes scoped-auth success/failure, replay/expiry rejection, idempotent duplicate handling, and rollback drill traces.
- Linear manual coverage includes advisory scenarios: disabled-default, enabled-advisory, kill-switch-active, malformed-source-fail-closed, plus explicit no-mutation proof.
- Discord manual execution remains out-of-scope in this slice; only deferred readiness checklist is required.

## Ordered Validation Gates (Repository Policy)
1. `node scripts/delegation-guard.mjs`
2. `node scripts/spec-guard.mjs --dry-run`
3. `npm run build`
4. `npm run lint`
5. `npm run test`
6. `npm run docs:check`
7. `npm run docs:freshness`
8. `node scripts/diff-budget.mjs`
9. `npm run review`
10. `npm run pack:smoke` (required only when touching CLI/package/skills/review-wrapper paths intended for downstream npm users)

## Docs-First Stream Validation (This Lane)
- Required in this stream:
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:check`
  - `npm run docs:freshness`
- Full ordered gates remain required for later implementation/closeout lanes.

## Acceptance
- 1008 artifacts and mirrors are synchronized.
- Registry snapshots include 1008 entries in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- Stage ordering and defer criteria are explicit and auditable.
- Docs-first validation logs are captured under `out/1008-coordinator-staged-external-surfaces-onboarding-and-runbook-readiness/manual/<timestamp>-docs-first/`.
