# Mini-Spec - Recursive Language Model Orchestrator (Task 0105)

last_review: 2026-01-06

## Summary & Scope
- Add an RLM runner that can be invoked via `npx` on any repo.
- Loop includes self-refine/critique, tool recursion, and validator gating.
- Support optional role splits (planner/critic/reviser) with subagent hooks.

## Acceptance Criteria
- CLI entrypoint defined (`codex-orchestrator rlm "<goal>"`).
- Pipeline-backed mode exists (`rlm`) for manifests/monitoring.
- Task-id resolution documented for ad-hoc runs (`--task` → `MCP_RUNNER_TASK_ID` → default).
- Validator auto-detected by default; explicit override supported.
- Auto-detect failure stops with guidance to supply `--validator "<cmd>"` or `--validator none`.
- Default max iterations = 88, with override (`0` or `unlimited`/`unbounded`/`infinite`/`infinity` = unlimited).
- Default max minutes = 48 hours; override via `--max-minutes` / `RLM_MAX_MINUTES` (set `0` to disable when a validator is present; invalid to disable when `--validator none` with `maxIterations=0`, exit 5).
- Artifacts written per iteration (validator logs + status/diff summaries).

## Risks & Mitigations
- Wrong validator selection → print reason + allow override.
- Infinite loops (maxIterations=0) → optional time-based cap + warnings.
- Subagent support variance → fallback to single-agent role prompts.

## Review Decisions
- Require a docs-review gate before implementation.
- Keep MVP minimal (loop + validator + pipeline + CLI wrapper) before adding role splits.
