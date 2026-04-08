# PRD - Coordinator Telegram Setup + Canary + Runbook Implementation (1009)

## Summary
- Problem Statement: task 1008 closed planning/readiness, but Telegram setup/canary implementation is not yet captured as a dedicated execution lane with explicit bridge-only authority boundaries.
- Desired Outcome: establish a docs-first implementation slice for Telegram setup/canary through Coordinator intake/control bridge controls, while linking Linear advisory follow-up and keeping Discord deferred.
- Scope Status: docs-first planning stream for task `1009-coordinator-telegram-setup-canary-and-runbook-implementation`; runtime implementation remains downstream.

## User Request Translation
- Create task lane `1009` and full docs-first artifacts for Telegram setup/canary implementation.
- Keep hard boundaries explicit:
  - CO remains execution authority,
  - Coordinator remains intake/control bridge,
  - no scheduler ownership transfer,
  - no Discord enablement in this slice.
- Include exact validation gate order and explicit manual mock test requirements.

## Authority + Scope Boundaries
- CO remains the only execution authority for run/control state transitions.
- Coordinator is limited to intake/control bridge behavior and cannot own scheduler execution.
- Scheduler ownership transfer is out of scope and forbidden in this slice.
- Discord enablement is out of scope and deferred.

## Slice Scope (1009)
- In scope:
  - Telegram setup + canary implementation plan and acceptance contract,
  - operator runbook implementation deliverables for Telegram,
  - explicit manual mock test matrix for Telegram intake/control paths,
  - linkage to Linear advisory follow-up (advisory-only contract continuity).
- Out of scope:
  - Discord activation,
  - production scheduler authority changes,
  - broad multi-transport rollout in one lane.

## Linear Advisory Follow-Up Linkage
- Keep advisory path non-authoritative and linked to existing dispatch evidence in task `1000` and planning posture in `1008`.
- Require post-1009 follow-up note to confirm any Telegram-derived learnings that affect advisory runbooks without expanding 1009 scope.

## Manual Mock Test Requirements (Telegram)
1. Auth/session failure paths are fail-closed (missing/expired/replayed token requests rejected).
2. Allowed intake commands map to bounded CO control intents with deterministic trace fields.
3. Idempotent replay behavior is deterministic for duplicate intent submissions.
4. Canary flow includes rollback drill demonstrating return to safe baseline behavior.
5. No scheduler ownership transfer indicators appear in status/event traces.
6. Linear advisory linkage verification confirms advisory-only behavior remains non-mutating.
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
1. PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror are created for task 1009.
2. `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` include 1009 entries.
3. Boundaries (CO authority, intake bridge only, no scheduler transfer, no Discord enablement) are explicit across 1009 artifacts.
4. Telegram manual mock test requirements are explicit and auditable.
5. Docs-first validations (`spec-guard --dry-run`, `docs:check`, `docs:freshness`) pass with logs under task-scoped evidence path.
