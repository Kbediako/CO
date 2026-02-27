# Codex Version Policy (CO)

## Purpose
Define a stable default with evidence-gated prerelease adoption so CO can move fast without forcing global risk.

## Policy
- Global default stays on stable Codex CLI (`0.106.0`) unless explicit promotion is approved.
- CO-repo prerelease usage is allowed only in task-scoped lanes with captured evidence.
- Current CO-approved prerelease candidate: `0.107.0-alpha.4`.

## Required Evidence Gates
For any prerelease promotion decision in CO:
1. Runtime-mode canary passes (`scripts/runtime-mode-canary.mjs`).
2. Cloud canary required contract passes (`scripts/cloud-canary-ci.mjs` with `REQUIRE_CLOUD_CANARY=1`).
3. Cloud fallback contract behavior remains correct (`EXPECT_CLOUD_FALLBACK=1`).
4. No P0/P1 regression versus stable baseline.

## Cadence
- Run canary on each new prerelease candidate considered for CO.
- Run weekly backstop canary while CO is actively using a prerelease.

## Rollback
- Any failed required gate or regression signal triggers immediate HOLD and rollback to stable (`0.106.0`).
- Record rollback decision in:
  - `docs/TASKS.md`
  - `tasks/index.json`
  - task checklists under `tasks/` and `.agent/task/`

## Evidence Paths
- Manifests: `.runs/<task-id>/cli/<run-id>/manifest.json`
- Logs/summaries: `out/<task-id>/manual/`
- Decision summary: `out/<task-id>/manual/codex-version-canary/compare/decision-go-no-go.md`
