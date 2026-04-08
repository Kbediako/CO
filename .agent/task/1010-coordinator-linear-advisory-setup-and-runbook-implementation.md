# Task Checklist - 1010-coordinator-linear-advisory-setup-and-runbook-implementation

- MCP Task ID: `1010-coordinator-linear-advisory-setup-and-runbook-implementation`
- Primary PRD: `docs/PRD-coordinator-linear-advisory-setup-and-runbook-implementation.md`
- TECH_SPEC: `tasks/specs/1010-coordinator-linear-advisory-setup-and-runbook-implementation.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-linear-advisory-setup-and-runbook-implementation.md`

## Foundation
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-linear-advisory-setup-and-runbook-implementation.md`, `docs/TECH_SPEC-coordinator-linear-advisory-setup-and-runbook-implementation.md`, `docs/ACTION_PLAN-coordinator-linear-advisory-setup-and-runbook-implementation.md`, `tasks/specs/1010-coordinator-linear-advisory-setup-and-runbook-implementation.md`, `tasks/tasks-1010-coordinator-linear-advisory-setup-and-runbook-implementation.md`, `.agent/task/1010-coordinator-linear-advisory-setup-and-runbook-implementation.md`.
- [x] Linear advisory deliberation findings captured. Evidence: `docs/findings/1010-linear-advisory-setup-deliberation.md`.
- [x] Registry snapshots updated for 1010. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.

## Dependency State
- [x] Telegram prerequisite from task `1009` is explicitly marked satisfied for 1010. Evidence: `tasks/index.json`, `docs/TASKS.md`, `.runs/1009-coordinator-telegram-setup-canary-and-runbook-implementation/cli/2026-03-05T14-10-26-672Z-dd7191f1/manifest.json`.

## Boundaries
- [x] CO execution authority is preserved. Evidence: `docs/PRD-coordinator-linear-advisory-setup-and-runbook-implementation.md`, `tasks/specs/1010-coordinator-linear-advisory-setup-and-runbook-implementation.md`.
- [x] Coordinator remains intake/control bridge only. Evidence: `docs/PRD-coordinator-linear-advisory-setup-and-runbook-implementation.md`, `docs/TECH_SPEC-coordinator-linear-advisory-setup-and-runbook-implementation.md`.
- [x] No scheduler ownership transfer in this slice. Evidence: `docs/PRD-coordinator-linear-advisory-setup-and-runbook-implementation.md`, `tasks/specs/1010-coordinator-linear-advisory-setup-and-runbook-implementation.md`.
- [x] No Discord enablement in this slice. Evidence: `docs/PRD-coordinator-linear-advisory-setup-and-runbook-implementation.md`, `docs/findings/1010-linear-advisory-setup-deliberation.md`.

## Manual Mock Test Requirements
- [x] Linear advisory manual mock matrix is explicit (auth/session fail-closed, bounded advisory mapping, idempotent replay, rollback, no scheduler transfer indicators). Evidence: `docs/PRD-coordinator-linear-advisory-setup-and-runbook-implementation.md`, `docs/TECH_SPEC-coordinator-linear-advisory-setup-and-runbook-implementation.md`, `tasks/specs/1010-coordinator-linear-advisory-setup-and-runbook-implementation.md`.
- [x] Telegram dependency satisfied check is explicit before 1010 activation. Evidence: `docs/PRD-coordinator-linear-advisory-setup-and-runbook-implementation.md`, `docs/findings/1010-linear-advisory-setup-deliberation.md`.

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
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1010-coordinator-linear-advisory-setup-and-runbook-implementation/manual/20260305T144418Z-docs-first/01-spec-guard.log`.
- [x] `npm run docs:check`. Evidence: `out/1010-coordinator-linear-advisory-setup-and-runbook-implementation/manual/20260305T144418Z-docs-first/02-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1010-coordinator-linear-advisory-setup-and-runbook-implementation/manual/20260305T144418Z-docs-first/03-docs-freshness.log`.
- [x] Task/.agent mirror parity confirmed. Evidence: `out/1010-coordinator-linear-advisory-setup-and-runbook-implementation/manual/20260305T144418Z-docs-first/04-mirror-parity.diff`.
- [x] Elegance review note recorded. Evidence: `out/1010-coordinator-linear-advisory-setup-and-runbook-implementation/manual/20260305T144418Z-docs-first/05-elegance-review.md`.

## Completion Sync (Authoritative)
- [x] docs-review override run is captured with terminal success. Evidence: `.runs/1010-coordinator-linear-advisory-setup-and-runbook-implementation/cli/2026-03-05T14-49-38-559Z-5c202e4a/manifest.json`.
- [x] implementation-gate override run is captured with terminal success and is the canonical gate pointer. Evidence: `.runs/1010-coordinator-linear-advisory-setup-and-runbook-implementation/cli/2026-03-05T15-04-14-048Z-a24ddda9/manifest.json`, `tasks/index.json`.
- [x] Ordered chain matrix is captured and retained as baseline evidence. Evidence: `out/1010-coordinator-linear-advisory-setup-and-runbook-implementation/manual/20260305T152730Z-ordered-chain/00-pass-fail-matrix.md`.
- [x] Ordered-chain baseline failures and supplemental rerun passes are both explicitly preserved (no suppression). Evidence: `out/1010-coordinator-linear-advisory-setup-and-runbook-implementation/manual/20260305T152730Z-ordered-chain/00-pass-fail-matrix.md`, `out/1010-coordinator-linear-advisory-setup-and-runbook-implementation/manual/20260305T153406Z-supplemental-validation/00-supplemental-summary.md`.
- [x] Supplemental validation rerun pass is captured for closeout completeness. Evidence: `out/1010-coordinator-linear-advisory-setup-and-runbook-implementation/manual/20260305T153406Z-supplemental-validation/00-supplemental-summary.md`.
- [x] Registry/task snapshot status is synchronized to `completed` with `completed_at: 2026-03-05`. Evidence: `tasks/index.json`, `docs/TASKS.md`.
