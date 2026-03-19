# Task Checklist - 1011-coordinator-discord-enablement-after-telegram-evidence

- MCP Task ID: `1011-coordinator-discord-enablement-after-telegram-evidence`
- Primary PRD: `docs/PRD-coordinator-discord-enablement-after-telegram-evidence.md`
- TECH_SPEC: `tasks/specs/1011-coordinator-discord-enablement-after-telegram-evidence.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-discord-enablement-after-telegram-evidence.md`

## Foundation
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-discord-enablement-after-telegram-evidence.md`, `docs/TECH_SPEC-coordinator-discord-enablement-after-telegram-evidence.md`, `docs/ACTION_PLAN-coordinator-discord-enablement-after-telegram-evidence.md`, `tasks/specs/1011-coordinator-discord-enablement-after-telegram-evidence.md`, `tasks/tasks-1011-coordinator-discord-enablement-after-telegram-evidence.md`, `.agent/task/1011-coordinator-discord-enablement-after-telegram-evidence.md`.
- [x] Discord enablement deliberation findings captured. Evidence: `docs/findings/1011-discord-enablement-deliberation.md`.
- [x] Registry snapshots updated for 1011. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.

## Dependency State
- [x] Telegram prerequisite from task `1009` is explicitly marked completed. Evidence: `tasks/index.json`, `docs/TASKS.md`, `.runs/1009-coordinator-telegram-setup-canary-and-runbook-implementation/cli/2026-03-05T14-10-26-672Z-dd7191f1/manifest.json`.
- [x] Linear advisory lane (`1010`) status is explicitly referenced as in-progress advisory dependency context. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/findings/1011-discord-enablement-deliberation.md`.

## Boundaries
- [x] CO execution authority is preserved. Evidence: `docs/PRD-coordinator-discord-enablement-after-telegram-evidence.md`, `tasks/specs/1011-coordinator-discord-enablement-after-telegram-evidence.md`.
- [x] Coordinator remains intake/control bridge only. Evidence: `docs/PRD-coordinator-discord-enablement-after-telegram-evidence.md`, `docs/TECH_SPEC-coordinator-discord-enablement-after-telegram-evidence.md`.
- [x] No scheduler ownership transfer in this slice. Evidence: `docs/PRD-coordinator-discord-enablement-after-telegram-evidence.md`, `tasks/specs/1011-coordinator-discord-enablement-after-telegram-evidence.md`.

## Security + Audit Contract
- [x] Auth/token boundary requirements are explicit and fail-closed. Evidence: `docs/PRD-coordinator-discord-enablement-after-telegram-evidence.md`, `docs/TECH_SPEC-coordinator-discord-enablement-after-telegram-evidence.md`.
- [x] Idempotency, traceability, and auditable event output requirements are explicit. Evidence: `docs/PRD-coordinator-discord-enablement-after-telegram-evidence.md`, `tasks/specs/1011-coordinator-discord-enablement-after-telegram-evidence.md`.

## Manual Mock Test Requirements
- [x] Manual mock matrix includes token/auth rejects, ingress binding, idempotent replay, dependency checks, traceability fields, and auditable outputs. Evidence: `docs/PRD-coordinator-discord-enablement-after-telegram-evidence.md`, `docs/TECH_SPEC-coordinator-discord-enablement-after-telegram-evidence.md`, `tasks/specs/1011-coordinator-discord-enablement-after-telegram-evidence.md`.

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
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1011-coordinator-discord-enablement-after-telegram-evidence/manual/20260305T153637Z-docs-first/01-spec-guard.log`.
- [x] `npm run docs:check`. Evidence: `out/1011-coordinator-discord-enablement-after-telegram-evidence/manual/20260305T153637Z-docs-first/02-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1011-coordinator-discord-enablement-after-telegram-evidence/manual/20260305T153637Z-docs-first/03-docs-freshness.log`.
- [x] Task/.agent mirror parity confirmed. Evidence: `out/1011-coordinator-discord-enablement-after-telegram-evidence/manual/20260305T153637Z-docs-first/04-mirror-parity.diff`.
- [x] Elegance review note recorded. Evidence: `out/1011-coordinator-discord-enablement-after-telegram-evidence/manual/20260305T153637Z-docs-first/05-elegance-review.md`.

## Completion Sync (Authoritative)
- [x] docs-review override run is captured with terminal success. Evidence: `.runs/1011-coordinator-discord-enablement-after-telegram-evidence/cli/2026-03-05T15-42-58-014Z-6645c4b0/manifest.json`.
- [x] implementation-gate override run is captured with terminal success and is the canonical gate pointer. Evidence: `.runs/1011-coordinator-discord-enablement-after-telegram-evidence/cli/2026-03-05T15-55-37-550Z-6c3246b0/manifest.json`, `tasks/index.json`.
- [x] Ordered chain matrix is captured and retained as baseline evidence. Evidence: `out/1011-coordinator-discord-enablement-after-telegram-evidence/manual/20260305T161414Z-ordered-chain/00-pass-fail-matrix.md`.
- [x] Baseline failures and supplemental rerun passes are both explicitly preserved (no suppression). Evidence: `out/1011-coordinator-discord-enablement-after-telegram-evidence/manual/20260305T161414Z-ordered-chain/00-pass-fail-matrix.md`, `out/1011-coordinator-discord-enablement-after-telegram-evidence/manual/20260305T161414Z-ordered-chain/00-supplemental-test-rerun-note.md`.
- [x] Manual simulation pass/fail matrix is captured. Evidence: `out/1011-coordinator-discord-enablement-after-telegram-evidence/manual/20260305T153510Z-manual-sim/05-pass-fail-matrix.md`.
- [x] Implementation no-code verdict logs are captured. Evidence: `out/1011-coordinator-discord-enablement-after-telegram-evidence/manual/20260305T153504Z-impl/`.
- [x] Registry/task snapshot status is synchronized to `completed` with `completed_at: 2026-03-05`. Evidence: `tasks/index.json`, `docs/TASKS.md`.
