# Task Checklist - 1009-coordinator-telegram-setup-canary-and-runbook-implementation

- MCP Task ID: `1009-coordinator-telegram-setup-canary-and-runbook-implementation`
- Primary PRD: `docs/PRD-coordinator-telegram-setup-canary-and-runbook-implementation.md`
- TECH_SPEC: `tasks/specs/1009-coordinator-telegram-setup-canary-and-runbook-implementation.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-telegram-setup-canary-and-runbook-implementation.md`

## Foundation
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-telegram-setup-canary-and-runbook-implementation.md`, `docs/TECH_SPEC-coordinator-telegram-setup-canary-and-runbook-implementation.md`, `docs/ACTION_PLAN-coordinator-telegram-setup-canary-and-runbook-implementation.md`, `tasks/specs/1009-coordinator-telegram-setup-canary-and-runbook-implementation.md`, `tasks/tasks-1009-coordinator-telegram-setup-canary-and-runbook-implementation.md`, `.agent/task/1009-coordinator-telegram-setup-canary-and-runbook-implementation.md`.
- [x] Telegram deliberation findings captured. Evidence: `docs/findings/1009-telegram-setup-canary-deliberation.md`.
- [x] Registry snapshots updated for 1009. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.

## Boundaries
- [x] CO execution authority is preserved. Evidence: `docs/PRD-coordinator-telegram-setup-canary-and-runbook-implementation.md`, `tasks/specs/1009-coordinator-telegram-setup-canary-and-runbook-implementation.md`.
- [x] Coordinator remains intake/control bridge only. Evidence: `docs/PRD-coordinator-telegram-setup-canary-and-runbook-implementation.md`, `docs/TECH_SPEC-coordinator-telegram-setup-canary-and-runbook-implementation.md`.
- [x] No scheduler ownership transfer in this slice. Evidence: `docs/PRD-coordinator-telegram-setup-canary-and-runbook-implementation.md`, `tasks/specs/1009-coordinator-telegram-setup-canary-and-runbook-implementation.md`.
- [x] No Discord enablement in this slice. Evidence: `docs/PRD-coordinator-telegram-setup-canary-and-runbook-implementation.md`, `docs/findings/1009-telegram-setup-canary-deliberation.md`.

## Manual Mock Test Requirements
- [x] Telegram manual mock matrix is explicit (auth/session fail-closed, command mapping, idempotent replay, rollback, no scheduler transfer indicators). Evidence: `docs/PRD-coordinator-telegram-setup-canary-and-runbook-implementation.md`, `docs/TECH_SPEC-coordinator-telegram-setup-canary-and-runbook-implementation.md`, `tasks/specs/1009-coordinator-telegram-setup-canary-and-runbook-implementation.md`.
- [x] Linear advisory follow-up linkage is explicit and non-authoritative. Evidence: `docs/PRD-coordinator-telegram-setup-canary-and-runbook-implementation.md`, `docs/findings/1009-telegram-setup-canary-deliberation.md`.

## Exact Validation Gate Order (Policy Reference)
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

## Validation (Docs-First Stream)
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1009-coordinator-telegram-setup-canary-and-runbook-implementation/manual/20260305T135203Z-docs-first/01-spec-guard.log`.
- [x] `npm run docs:check`. Evidence: `out/1009-coordinator-telegram-setup-canary-and-runbook-implementation/manual/20260305T135203Z-docs-first/02-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1009-coordinator-telegram-setup-canary-and-runbook-implementation/manual/20260305T135203Z-docs-first/03-docs-freshness.log`.
- [x] Task/.agent mirror parity confirmed. Evidence: `out/1009-coordinator-telegram-setup-canary-and-runbook-implementation/manual/20260305T135203Z-docs-first/04-mirror-parity.diff`.
- [x] Elegance review note recorded. Evidence: `out/1009-coordinator-telegram-setup-canary-and-runbook-implementation/manual/20260305T135203Z-docs-first/05-elegance-review.md`.

## Completion Sync (Authoritative)
- [x] docs-review override run is captured with terminal success. Evidence: `.runs/1009-coordinator-telegram-setup-canary-and-runbook-implementation/cli/2026-03-05T13-57-38-457Z-39cc3edc/manifest.json`.
- [x] implementation-gate override run is captured with terminal success and is the canonical gate pointer. Evidence: `.runs/1009-coordinator-telegram-setup-canary-and-runbook-implementation/cli/2026-03-05T14-10-26-672Z-dd7191f1/manifest.json`, `tasks/index.json`.
- [x] Authoritative chain summary is captured. Evidence: `out/1009-coordinator-telegram-setup-canary-and-runbook-implementation/manual/20260305T135709Z-authoritative-gates/12-summary.md`.
- [x] Manual simulation pass/fail matrix is captured. Evidence: `out/1009-coordinator-telegram-setup-canary-and-runbook-implementation/manual/20260305T135122Z-manual-sim/05-pass-fail-matrix.md`.
- [x] Implementation feasibility logs are captured. Evidence: `out/1009-coordinator-telegram-setup-canary-and-runbook-implementation/manual/20260305T135505Z-impl-feasibility/`.
- [x] Override rationale is explicit: override lane runs were used as authoritative closeout evidence in shared-checkout conditions without expanding scope. Evidence: `.runs/1009-coordinator-telegram-setup-canary-and-runbook-implementation/cli/2026-03-05T13-57-38-457Z-39cc3edc/manifest.json`, `.runs/1009-coordinator-telegram-setup-canary-and-runbook-implementation/cli/2026-03-05T14-10-26-672Z-dd7191f1/manifest.json`, `out/1009-coordinator-telegram-setup-canary-and-runbook-implementation/manual/20260305T135709Z-authoritative-gates/12-summary.md`.
- [x] Registry/task snapshot status is synchronized to `completed` with `completed_at: 2026-03-05`. Evidence: `tasks/index.json`, `docs/TASKS.md`.
