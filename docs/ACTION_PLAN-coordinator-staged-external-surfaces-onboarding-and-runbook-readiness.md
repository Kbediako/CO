# ACTION_PLAN - Coordinator Staged External Surfaces Onboarding + Runbook Readiness (1008)

## Phase 1 - Docs-First Foundation
- [x] Create PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror for task 1008.
- [x] Record authority, auth/token, and idempotency invariants as non-negotiable constraints.
- [x] Define staged rollout order and stage-entry gates (Telegram first, Linear advisory now, Discord deferred).
- Evidence: `docs/PRD-coordinator-staged-external-surfaces-onboarding-and-runbook-readiness.md`, `docs/TECH_SPEC-coordinator-staged-external-surfaces-onboarding-and-runbook-readiness.md`, `tasks/specs/1008-coordinator-staged-external-surfaces-onboarding-and-runbook-readiness.md`, `tasks/tasks-1008-coordinator-staged-external-surfaces-onboarding-and-runbook-readiness.md`, `.agent/task/1008-coordinator-staged-external-surfaces-onboarding-and-runbook-readiness.md`.

## Phase 2 - Runbook + Test Contract Definition
- [x] Define Telegram operator runbook deliverables with canary + rollback expectations.
- [x] Define Linear advisory operator runbook deliverables with no-mutation and fail-closed expectations.
- [x] Define Discord deferred-entry criteria and reusable runbook skeleton.
- [x] Define mock/manual test expectations by stage.
- Evidence: `docs/PRD-coordinator-staged-external-surfaces-onboarding-and-runbook-readiness.md`, `docs/TECH_SPEC-coordinator-staged-external-surfaces-onboarding-and-runbook-readiness.md`, `docs/findings/1008-transport-readiness-deliberation.md`.

## Phase 3 - Registry + Snapshot Sync
- [x] Add task 1008 to `tasks/index.json` with docs-first phase metadata.
- [x] Add 1008 task snapshot line to `docs/TASKS.md`.
- [x] Register 1008 artifact paths in `docs/docs-freshness-registry.json`.
- Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.

## Phase 4 - Validation (Docs-First Stream)
- [x] Run `node scripts/spec-guard.mjs --dry-run` and capture log.
- [x] Run `npm run docs:check` and capture log.
- [x] Run `npm run docs:freshness` and capture log.
- Evidence: `out/1008-coordinator-staged-external-surfaces-onboarding-and-runbook-readiness/manual/20260305T115910Z-docs-first/00-docs-first-summary.md`, `out/1008-coordinator-staged-external-surfaces-onboarding-and-runbook-readiness/manual/20260305T115910Z-docs-first/09-spec-guard-dry-run.postsync.log`, `out/1008-coordinator-staged-external-surfaces-onboarding-and-runbook-readiness/manual/20260305T115910Z-docs-first/10-docs-check.postsync.log`, `out/1008-coordinator-staged-external-surfaces-onboarding-and-runbook-readiness/manual/20260305T115910Z-docs-first/11-docs-freshness.postsync.log`.

## Ordered Validation Gates Reference (Implementation/Closeout Lanes)
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

## Explicit Stream Boundaries
- No runtime edits in `orchestrator/src/**` for this docs-first stream.
- Discord remains deferred until Telegram evidence closes.
- Linear path remains advisory/non-authoritative.
