# Codex Version Policy (CO)

## Purpose
Define a stable default with evidence-gated prerelease adoption, so CO can move fast without forcing global risk.

## Policy
- Global default stays on stable Codex CLI (`0.107.0`) unless explicit promotion is approved.
- CO-repo prerelease usage is allowed only in task-scoped lanes with captured evidence.
- Latest evaluated prerelease lane: `0.107.0-alpha.9` (HOLD; not approved as default).
- Manual Codex re-review requests are quota-aware: send at most one `@codex` ping per PR head SHA, then wait for a new head before re-requesting.
- Codex review quota exhaustion is an operational availability event, not a prerelease-promotion signal; if it blocks review, use the merge-waiver path documented in `AGENTS.md` and `docs/AGENTS.md` (checks green, unresolved actionable threads = `0`, waiver evidence recorded).

## Required Evidence Gates
For any prerelease promotion decision in CO:
1. Runtime-mode canary passes (`node scripts/runtime-mode-canary.mjs`).
2. Cloud canary required contract passes (`CODEX_CLOUD_ENV_ID=<env-id> CODEX_CLOUD_CANARY_REQUIRED=1 node scripts/cloud-canary-ci.mjs`).
3. Cloud fallback contract behavior remains correct (`CODEX_CLOUD_ENV_ID=<env-id> CODEX_CLOUD_CANARY_REQUIRED=1 CLOUD_CANARY_EXPECT_FALLBACK=1 node scripts/cloud-canary-ci.mjs`).
4. No P0/P1 regression versus stable baseline.

## Cadence
- Run canary on each new prerelease candidate considered for CO.
- Run weekly backstop canary while CO is actively using a prerelease.

## Rollback
- Any failed required gate or regression signal triggers immediate HOLD and rollback to stable (`0.107.0`).
- Record rollback decision in:
  - `docs/TASKS.md`
  - `tasks/index.json`
  - task checklists under `tasks/` and `.agent/task/`

## Evidence Paths
- Manifests: `.runs/<task-id>/cli/<run-id>/manifest.json`
- Logs/summaries: `out/<task-id>/manual/`
- Decision summary: `out/<task-id>/manual/codex-version-canary/compare/decision-go-no-go.md`
