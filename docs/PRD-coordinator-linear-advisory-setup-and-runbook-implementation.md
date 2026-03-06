# PRD - Coordinator Linear Advisory Setup + Runbook Implementation (1010)

## Summary
- Problem Statement: task 1009 closed Telegram setup/canary implementation, but Linear advisory setup/runbook implementation is not yet captured as a dedicated non-authoritative lane with bridge-only authority boundaries.
- Desired Outcome: establish docs-first implementation scope for Linear advisory setup through the Coordinator intake/control bridge while preserving CO execution authority.
- Scope Status: docs-first planning stream for task `1010-coordinator-linear-advisory-setup-and-runbook-implementation`; runtime implementation remains downstream.

## User Request Translation
- Create and register task lane `1010` with complete docs-first artifacts and registry wiring.
- Keep hard boundaries explicit:
  - CO remains execution authority,
  - Coordinator remains intake/control bridge only,
  - no scheduler ownership transfer,
  - no Discord enablement in this slice.
- Keep this lane non-authoritative (advisory setup only) and include exact validation gate order plus explicit manual mock expectations.

## Dependency Status
- Telegram dependency is satisfied via completed task `1009` (implementation-gate override succeeded).
- Task `1010` consumes that prerequisite and does not re-open Telegram implementation ownership.

## Authority + Scope Boundaries
- CO remains the only execution authority for run/control state transitions.
- Coordinator is limited to intake/control bridge behavior and cannot own scheduler execution.
- Scheduler ownership transfer is out of scope and forbidden in this slice.
- Discord enablement is out of scope and deferred.

## Slice Scope (1010)
- In scope:
  - Linear advisory setup implementation contract (non-authoritative),
  - operator runbook implementation deliverables for Linear advisory flows,
  - explicit manual mock matrix for advisory intake/control bridge behavior,
  - dependency linkage to completed Telegram canary lane (`1009`).
- Out of scope:
  - authoritative ownership changes,
  - scheduler ownership transfer,
  - Discord onboarding/enablement,
  - broad multi-transport activation in one lane.

## Manual Mock Test Requirements (Linear Advisory)
1. Auth/session failure paths are fail-closed (missing/expired/replayed credentials rejected deterministically).
2. Allowed Linear advisory inputs map only to bounded Coordinator intake/control intents (no direct mutating execution authority).
3. Duplicate advisory events are deduped/idempotent with deterministic replay handling.
4. Advisory runbook rollback drill returns the bridge path to a safe baseline without scheduler ownership changes.
5. Trace output confirms CO retains execution authority and scheduler ownership fields remain unchanged.
6. Telegram dependency check confirms `1009` prerequisite is satisfied before enabling 1010 setup path.
7. Discord activation tests are not executed in this slice.

## Exact Validation Gate Order (Policy)
1. `node scripts/delegation-guard.mjs`
2. `node scripts/spec-guard.mjs --dry-run`
3. `npm run build`
4. `npm run lint`
5. `npm run test`
6. `npm run docs:check`
7. `npm run docs:freshness`
8. `node scripts/diff-budget.mjs`
9. `npm run review`
10. `npm run pack:smoke` (required when touching CLI/package/skills/review-wrapper paths for downstream npm users)

## Acceptance Criteria
1. PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror are created for task 1010.
2. `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` include 1010 entries.
3. Advisory-only scope, CO authority boundary, no scheduler transfer, and Discord deferral are explicit across 1010 artifacts.
4. Telegram dependency satisfied state is explicit and traceable to 1009 evidence.
5. Docs-first validations (`spec-guard --dry-run`, `docs:check`, `docs:freshness`, mirror parity) pass with logs under task-scoped evidence path.
