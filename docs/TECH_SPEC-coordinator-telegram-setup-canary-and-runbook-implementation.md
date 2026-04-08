# TECH_SPEC - Coordinator Telegram Setup + Canary + Runbook Implementation (1009)

- Canonical TECH_SPEC: `tasks/specs/1009-coordinator-telegram-setup-canary-and-runbook-implementation.md`.
- Owner: Codex.
- Last Reviewed: 2026-03-06.

## Summary
- Scope: docs-first implementation planning for Telegram setup/canary under Coordinator intake/control bridge constraints.
- Boundary: CO execution authority remains unchanged; no scheduler ownership transfer; no Discord enablement.
- Linkage: retain Linear advisory follow-up continuity as advisory-only.

## Requirements
- Create docs-first artifacts for 1009:
  - `docs/PRD-coordinator-telegram-setup-canary-and-runbook-implementation.md`
  - `docs/TECH_SPEC-coordinator-telegram-setup-canary-and-runbook-implementation.md`
  - `docs/ACTION_PLAN-coordinator-telegram-setup-canary-and-runbook-implementation.md`
  - `tasks/specs/1009-coordinator-telegram-setup-canary-and-runbook-implementation.md`
  - `tasks/tasks-1009-coordinator-telegram-setup-canary-and-runbook-implementation.md`
  - `.agent/task/1009-coordinator-telegram-setup-canary-and-runbook-implementation.md`
  - `docs/findings/1009-telegram-setup-canary-deliberation.md`
- Update registries:
  - `tasks/index.json` with 1009 `items[]` and `specs[]` entries,
  - `docs/TASKS.md` snapshot entry for 1009,
  - `docs/docs-freshness-registry.json` entries for all 1009 artifacts.

## Authority + Safety Constraints
- CO remains execution authority for all control-state transitions.
- Coordinator remains intake/control bridge only.
- Scheduler ownership transfer is prohibited.
- Discord enablement is prohibited in this slice.

## Telegram Implementation Contract
- Telegram setup/canary lane must include:
  - scoped auth/session enforcement and fail-closed rejection,
  - deterministic idempotency/replay handling,
  - auditable trace field contract,
  - rollback drill requirements,
  - canary pass/fail/rollback decision conditions.

## Linear Advisory Follow-Up Contract
- Maintain advisory-only, non-authoritative behavior.
- Record explicit follow-up linkage to task `1000` and task `1008` outputs.
- Do not expand 1009 into advisory transport activation changes.

## Manual Mock Test Requirements
1. Reject missing/expired/replayed tokens with deterministic reason codes.
2. Verify bounded command mapping into CO control intents and traceability fields.
3. Verify duplicate-intent replay dedupe behavior is deterministic.
4. Execute rollback drill and confirm safe baseline restoration.
5. Prove no scheduler ownership transfer fields/events are introduced.
6. Verify Linear linkage remains advisory-only and non-mutating.
7. Verify Discord remains deferred (no activation/manual onboarding in this slice).

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
10. `npm run pack:smoke` (required when touching CLI/package/skills/review-wrapper paths intended for downstream npm users)

## Docs-First Stream Validation (This Lane)
- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- Logs captured under `out/1009-coordinator-telegram-setup-canary-and-runbook-implementation/manual/<timestamp>-docs-first/`.
