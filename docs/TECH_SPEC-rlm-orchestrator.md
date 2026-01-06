# Technical Spec - Recursive Language Model Orchestrator (Task 0105)

## Overview
- Objective: Add a portable RLM runner that turns Codex into a self-refining orchestrator loop for any repo, with validator-gated termination and optional role splits.
- In Scope:
  - New CLI `rlm` entrypoint and a pipeline-backed `rlm` mode.
  - Loop execution with self-refine/critique and tool recursion.
  - Validator auto-detection with override support.
  - Artifacts and summaries written alongside existing manifests.
- Out of Scope:
  - Training/fine-tuning, long-term model memory, or new external services.

## Architecture & Design
### Current State
- The CLI already supports `exec` for one-off commands and `start` for pipeline execution.
- Manifests capture command results, logs, approvals, and run summaries.
- The package is distributed via npm and designed to run from any repo (`npx`).

### Proposed Components
1) **CLI entrypoint (`rlm`)**
- Command shape: `codex-orchestrator rlm "<goal>" [options]`
- Wrapper to configure env/context and launch the RLM pipeline runner.

2) **RLM pipeline**
- New pipeline id: `rlm`
- Stages include a single command stage invoking an internal runner script with env-configured goal/validator.

### CLI + pipeline usage (planned syntax)
- Direct: `codex-orchestrator rlm "<goal>" [options]`
- Pipeline-backed: `codex-orchestrator start <pipeline-id> --goal "<goal>"` (pipeline id is `rlm`; canonical in non-interactive contexts).
- Relationship: `rlm` is a blocking wrapper over `start <pipeline-id>` (same run-id + manifest behavior). It starts the pipeline run and then waits (e.g., via `status`/`resume`) to return the exit codes documented here.
- `start <pipeline-id>` follows existing `start` semantics (typically non-blocking unless a future `--wait` mode is added).
- Exit codes apply to `rlm` (blocking) or to a future `start <pipeline-id> --wait`; otherwise use run summary/status for results.
- Monitoring: use existing `status`/`resume` commands with the run id.

3) **RLM runner**
- Implements iteration loop:
  1. Build prompt (goal + prior validator output + diff/status summary).
  2. Invoke Codex (self-refine or role split), allowing tool use.
  3. Run validator.
  4. Stop on pass or continue until iteration cap.
- Persists an RLM state file under `.runs/<task-id>/cli/<run-id>/rlm/`.

4) **Validator detection**
- Default mode: `auto`.
- Heuristics (first match wins, with reason):
  - Node (repo root only):
    - `packageManager` in `package.json` → match tool (`pnpm test` / `yarn test` / `npm test` / `bun test`).
    - `pnpm-lock.yaml` → `pnpm test`; `yarn.lock` → `yarn test`; `package-lock.json` → `npm test`; `bun.lockb` → `bun test`.
    - If multiple candidates exist (monorepo or conflicting signals), require explicit `--validator` and list candidates.
  - Python: `pyproject.toml` → `python -m pytest`; `pytest.ini`/`requirements.txt` → `pytest`.
  - Go: `go.mod` → `go test ./...`.
  - Rust: `Cargo.toml` → `cargo test`.
- Ambiguous (multiple candidates):
  - TTY: prompt user to pick one or provide `--validator "<cmd>"` / `--validator none`.
  - Non-interactive: exit 2 and print the candidate list.
- If multiple ecosystems are detected at repo root (e.g., Node + Python), treat as ambiguous and apply the same behavior.
- Overrides:
  - `--validator "<cmd>"`
  - `--validator none`

5) **Role splits & subagents**
- Modes:
  - `single` (default): one agent does plan → edit → verify.
  - `triad`: planner / critic / reviser loop.
- If Codex supports subagents, spawn them; otherwise, emulate roles in prompts.
- Subagent capability detection: enable when `CODEX_SUBAGENTS=1` or `RLM_SUBAGENTS=1`; otherwise fall back to single-agent prompts.

## Configuration & Precedence

### Pipeline definition resolution
- If `codex.orchestrator.json` defines an `rlm` pipeline, use it.
- Otherwise, fall back to the built-in `rlm` pipeline shipped in the npm package.
  - This keeps `rlm` available in any repo with zero setup.
  - Local config overrides the built-in pipeline only when it explicitly defines `rlm`.

### Runtime option precedence (highest wins)
1. CLI flags
2. Environment variables (e.g., `RLM_GOAL`, `RLM_VALIDATOR`, `RLM_MAX_ITERATIONS`, `RLM_MAX_MINUTES`)
3. Pipeline input defaults (from the selected `rlm` pipeline definition)
4. Built-in defaults (internal fallbacks)

## Task ID Resolution
Order of precedence:
1. `--task <id>`
2. `MCP_RUNNER_TASK_ID`
3. Derived default: `rlm-<repo-name>` (sanitized)
4. Fallback: `rlm-adhoc` (if repo name cannot be resolved)

Always print the resolved task id in the CLI output.

## Loop Algorithm
1. Initialize state (iteration=1, validator selection).
2. Generate prompt (goal + last outputs + repo status snapshot).
3. Execute Codex tool loop (self-refine + tools).
4. Run validator command (if present).
5. If validator passes → stop (success).
6. If `--validator none` and budget reached → stop (success).
7. If max iterations reached with a validator → stop (failure).
8. Else, continue.

## Stop Conditions
- Validator exit code = 0 → success.
- Max iterations reached with failing validator → exit 3; `final.status = max_iterations` (unless `--validator none`).
- Budget = `maxIterations` (default 88; `0` or `unlimited`/`unbounded`/`infinite`/`infinity` means unbounded) plus `maxMinutes` (default 48 hours; set `0` to disable the time cap).
- If `--validator none`, run is budgeted and exits 0 when the budget completes; non-zero only on internal errors or invalid configuration.
- If `maxMinutes` is reached with a validator still failing → treat as budget exhaustion (exit 3; `final.status = max_minutes`).
- If `maxMinutes` is reached with `--validator none` → treat as successful budget completion (exit 0; `final.status = budget_complete`).
- If `--validator none` and `maxIterations=0` and no time cap is set → exit 5 with guidance (prevent unbounded runs).
- Optional: no changes + validator still failing → failure with reason.
- Default max iterations: 88; `0` (or `unlimited` alias) means unlimited (requires validator or time cap).

## Exit Codes (proposed)
- 0: validator passed OR budget completed with `--validator none`
- 2: validator auto-detect failed or ambiguous (no validator selected)
- 3: budget exhausted (max iterations or max minutes) with failing validator
- 4: validator spawn error / command not found
- 5: invalid configuration (e.g., `--validator none` with unbounded budget)
- 10: internal orchestrator error

## Artifacts & Logging
- RLM state file: `.runs/<task-id>/cli/<run-id>/rlm/state.json` (iteration history).
- Validator output: `.runs/<task-id>/cli/<run-id>/rlm/validator-<n>.log`.
- Git status/diff snapshots for each iteration (short summaries stored alongside state).
- Per-task rollups remain at `.runs/<task-id>/metrics.json` and `out/<task-id>/state.json`.

Minimum `state.json` keys:
- `goal`, `validator`, `roles`, `maxIterations`
- `iterations`: array of `{ n, startedAt, summary, validatorExitCode, validatorLogPath, diffSummary }`
- `final`: `{ status, exitCode }` where status is `passed | budget_complete | max_iterations | max_minutes | no_validator | invalid_config | error`

Notes:
- `no_validator` is reserved for auto-detect failure / no selection (exit 2), not for successful `--validator none` runs.

Optional keys:
- `maxMinutes` (time-based guardrail; defaults to 48 hours when unset; set to `0` to disable)

## Failure Modes
- Auto validator not found or ambiguous:
  - TTY: prompt to select `--validator "<cmd>"` or `--validator none`.
  - Non-interactive: exit with code 2 and guidance (include candidate list when ambiguous).
- Validator spawn error / command not found:
  - TTY: prompt for explicit `--validator "<cmd>"` or `--validator none`.
  - Non-interactive: exit 4 with guidance.
- Invalid configuration (e.g., `--validator none` with unbounded budget) → exit 5 with guidance.
- Infinite loop risk when `maxIterations=0` → recommend optional time-based cap (and forbid `--validator none` without a cap).

## Testing Strategy
- Unit tests for validator auto-detection (table-driven file fixtures).
- Loop stop tests using stubbed validator results (fail → pass).
- Max-iterations stop test (always failing validator).

## Documentation & Evidence
- PRD: `docs/PRD-rlm-orchestrator.md`
- Action Plan: `docs/ACTION_PLAN-rlm-orchestrator.md`

## Approvals
- Engineering: pending
- Reviewer: pending
