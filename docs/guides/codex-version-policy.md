# Codex Version Policy (CO)

## Purpose
Define the current stable compatibility/adoption target for CO and keep newer CLI/model moves evidence-gated.

## Current Posture
- Current CO compatibility/adoption target is stable Codex CLI `0.111.0`.
- Current model posture is `gpt-5.4` for top-level, delegated subagent, and review surfaces.
- Keep `explorer_fast` as the only explicit `gpt-5.3-codex-spark` exception (fast text-only search/synthesis).
- When authenticating through ChatGPT, do not target delegated or review surfaces at `gpt-5.4-codex`; those runs currently fail immediately. Use `gpt-5.4` instead until provider compatibility changes.
- Newer stable/prerelease Codex builds may run only in task-scoped lanes with captured evidence.
- Manual Codex re-review requests are quota-aware: send at most one `@codex` ping per PR head SHA, then wait for a new head before re-requesting.
- Codex review quota exhaustion is an operational availability event, not an adoption/promotion signal; if it blocks review, use the merge-waiver path documented in `AGENTS.md` and `docs/AGENTS.md` (checks green, unresolved actionable threads = `0`, waiver evidence recorded).

## Required Evidence Gates
For any change to the current `0.111.0` / `gpt-5.4` posture, or any promotion of a newer Codex build in CO:
1. Local appserver path passes on the candidate Codex CLI + model posture.
2. Delegated/review surfaces are verified on the actual auth provider in use; for ChatGPT auth, this means `gpt-5.4`, not `gpt-5.4-codex`, unless new compatibility evidence exists.
3. Runtime-mode canary passes (`node scripts/runtime-mode-canary.mjs`).
4. Cloud canary required contract passes (`CODEX_CLOUD_ENV_ID=<env-id> CODEX_CLOUD_CANARY_REQUIRED=1 node scripts/cloud-canary-ci.mjs`).
5. Cloud fallback contract behavior remains correct (`CODEX_CLOUD_ENV_ID=<env-id> CODEX_CLOUD_CANARY_REQUIRED=1 CLOUD_CANARY_EXPECT_FALLBACK=1 node scripts/cloud-canary-ci.mjs`).
6. No P0/P1 regression versus the current stable baseline.

## Cadence
- Re-verify the current posture when auth/provider behavior changes materially.
- Run canary on each newer stable/prerelease candidate considered for CO.
- Run weekly backstop canary while CO is actively adopting a non-baseline Codex build.

## Rollback
- Any failed required gate, provider compatibility regression, or P0/P1 signal triggers immediate HOLD and rollback to the last verified stable posture.
- Record rollback decision in:
  - `docs/TASKS.md`
  - `tasks/index.json`
  - task checklists under `tasks/` and `.agent/task/`

## Evidence Paths
- Manifests: `.runs/<task-id>/cli/<run-id>/manifest.json`
- Logs/summaries: `out/<task-id>/manual/`
- Handover notes: `out/handovers/`
- Decision summary: `out/<task-id>/manual/codex-version-canary/compare/decision-go-no-go.md`
