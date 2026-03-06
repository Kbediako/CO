# TECH_SPEC - Coordinator Linear Advisory Setup + Runbook Implementation (1010)

- Canonical TECH_SPEC: `tasks/specs/1010-coordinator-linear-advisory-setup-and-runbook-implementation.md`.
- Owner: Codex.
- Last Reviewed: 2026-03-06.

## Summary
- Scope: docs-first implementation planning for Linear advisory setup through the Coordinator intake/control bridge.
- Boundary: CO execution authority remains unchanged; no scheduler ownership transfer; no Discord enablement.
- Dependency: Telegram prerequisite is satisfied by completed task `1009` and treated as an input constraint.

## Requirements
- Create docs-first artifacts for 1010:
  - `docs/PRD-coordinator-linear-advisory-setup-and-runbook-implementation.md`
  - `docs/TECH_SPEC-coordinator-linear-advisory-setup-and-runbook-implementation.md`
  - `docs/ACTION_PLAN-coordinator-linear-advisory-setup-and-runbook-implementation.md`
  - `tasks/specs/1010-coordinator-linear-advisory-setup-and-runbook-implementation.md`
  - `tasks/tasks-1010-coordinator-linear-advisory-setup-and-runbook-implementation.md`
  - `.agent/task/1010-coordinator-linear-advisory-setup-and-runbook-implementation.md`
  - `docs/findings/1010-linear-advisory-setup-deliberation.md`
- Update registries:
  - `tasks/index.json` with 1010 `items[]` and `specs[]` entries,
  - `docs/TASKS.md` snapshot entry for 1010,
  - `docs/docs-freshness-registry.json` entries for all 1010 artifacts.

## Authority + Safety Constraints
- CO remains execution authority for all control-state transitions.
- Coordinator remains intake/control bridge only.
- Scheduler ownership transfer is prohibited.
- Discord enablement is prohibited in this slice.

## Dependency Constraint (Telegram)
- 1010 is blocked on Telegram prerequisite completion from task `1009`.
- Telegram prerequisite is currently satisfied and must be referenced in 1010 evidence.
- 1010 must not re-scope or alter 1009 closure semantics.

## Linear Advisory Implementation Contract
- Linear setup/runbook lane must remain advisory/non-authoritative and include:
  - scoped auth/session fail-closed behavior,
  - deterministic idempotency/replay handling,
  - explicit traceability field contract,
  - rollback drill requirements,
  - no scheduler ownership transfer proof points.

## Manual Mock Test Requirements
1. Reject missing/expired/replayed credentials with deterministic reason codes.
2. Verify bounded Linear advisory mapping into Coordinator intake/control intents only.
3. Verify duplicate-event replay dedupe behavior is deterministic.
4. Execute rollback drill and confirm safe baseline restoration without authority expansion.
5. Prove CO execution authority remains unchanged and scheduler ownership fields are not transferred.
6. Verify Telegram dependency gate references completed 1009 evidence before 1010 activation.
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
- `diff -u tasks/tasks-1010-coordinator-linear-advisory-setup-and-runbook-implementation.md .agent/task/1010-coordinator-linear-advisory-setup-and-runbook-implementation.md`
- Logs captured under `out/1010-coordinator-linear-advisory-setup-and-runbook-implementation/manual/<timestamp>-docs-first/`.

## Placeholder Gate Manifests (Future)
- docs-review: `.runs/1010-coordinator-linear-advisory-setup-and-runbook-implementation/cli/<docs-review-run-id>/manifest.json`
- implementation-gate: `.runs/1010-coordinator-linear-advisory-setup-and-runbook-implementation/cli/<implementation-gate-run-id>/manifest.json`
