# Action Plan - Delegation Guard Actionable Diagnostics (Task 0951)

## Phase 0 — Preconditions
- Capture a representative delegation-guard failure log.
- Confirm desired diagnostic schema (headline → missing → expected paths → fix guidance).
- Confirm candidate manifest cap (3) + override messaging requirements.
- Capture PR #165 Core Lane failure log (diff budget) + CodeRabbit change requests.
- Capture a representative large prompt example (or synthetic 10M‑token scenario) to validate true RLM behavior.

## Phase 1 — Docs Review
- Run `npx codex-orchestrator start docs-review --format json --no-interactive --task 0951-delegation-rlm-quick-wins`.
- Update mirrors (`tasks/`, `.agent/task/`, `docs/TASKS.md`) with manifest evidence.

## Phase 2 — Implementation (guard + delegation + archives)
- Update `scripts/delegation-guard.mjs` to:
  - Report missing `MCP_RUNNER_TASK_ID` with explicit export example.
  - Enumerate expected subagent manifest locations (respecting `CODEX_ORCHESTRATOR_RUNS_DIR`).
  - List discovered manifests (cap 3) and why they were rejected.
  - Provide copy/pasteable fix guidance.
  - Surface `DELEGATION_GUARD_OVERRIDE_REASON` when set.
- Optional: add a short troubleshooting section to `.agent/SOPs/review-loop.md`.
- Update delegation usage docs and workflow guide to clarify `delegate.mode` vs `delegate_mode`, recommend RLM depth/time overrides, and document the current `delegate.spawn` long-run timeout limitation + workaround.
- Implement async/start-only `delegate.spawn` behavior (`start_only: boolean`, default `false`) so long-running delegated runs are not blocked by tool-call timeouts:
  - Require `task_id` when `start_only=true`.
  - Snapshot `.runs/<task-id>/cli/*` before spawn; poll for a new manifest (or mtime > spawn time).
  - Poll `.runs/<task-id>/cli/*/manifest.json`; return once manifest exists (no reliance on child stdout).
  - Read `run_id` + `manifest_path` from the manifest and return those (plus derived `events_path`/`log_path`).
  - Persist delegation token before returning so question queues work.
  - Child stdout must not be inherited (MCP safety). Drain/ignore or redirect stdout/stderr so pipes cannot fill and stall the child.
  - Use `delegate.status` for progress.
- Fix implementation-docs archive automation for PR #165:
  - Ensure doc-archives payloads exist before stubs land (or fail fast).
  - Correct stub URLs for missing archives (tasks/0927 PRD, tasks/specs/0924).
  - Add a diff-budget strategy (split PRs or set `DIFF_BUDGET_OVERRIDE_REASON` automatically with rationale).

## Phase 3 — Implementation (TRUE RLM symbolic)
- Implement context builder:
  - Ingest `RLM_CONTEXT_PATH` (raw file or prebuilt context object dir).
  - Write `.runs/.../rlm/context/{source.txt,index.json}`.
- Implement planner protocol:
  - Planner prompt template that returns JSON only (`schema_version=1`).
  - JSON parse + one repair retry on failure; otherwise exit with `invalid_config`.
- Implement runner executor:
  - Execute `searches`, then `reads`, then `subcalls` with per-iteration budgets.
  - Store subcall artifacts under `.runs/.../rlm/subcalls/...`.
  - Extend `rlm/state.json` with `{ mode, context: { object_id, index_path, chunk_count }, symbolic_iterations: [...] }`.
- Define subcall execution profile:
  - Single completion, no tools, no repo writes.
  - Concurrency limited by `RLM_MAX_CONCURRENCY`.
- Demo harness:
  - Script or documented command to generate ≥50 MB synthetic context.
  - Run `codex-orchestrator rlm` (or pipeline) with `RLM_CONTEXT_PATH=<file>`.
  - Verify `rlm/state.json` and subcall artifacts reference pointers (no full prompt stuffing).
- Demo commands (example):
```
python - <<'PY'
path = "/tmp/rlm-context.txt"
with open(path, "wb") as f:
    f.write(b"a" * (50 * 1024 * 1024))
print(path)
PY

RLM_MODE=symbolic RLM_CONTEXT_PATH=/tmp/rlm-context.txt \
  npx codex-orchestrator start rlm --format json --no-interactive --task 0951-delegation-rlm-quick-wins

# Replace <run-id> with the manifest run_id
RUN_DIR=".runs/0951-delegation-rlm-quick-wins/cli/<run-id>"
test -f "$RUN_DIR/rlm/context/index.json"
test -f "$RUN_DIR/rlm/state.json"

python - <<'PY'
import json, os
state_path = os.path.join(".runs/0951-delegation-rlm-quick-wins/cli/<run-id>", "rlm", "state.json")
state = json.load(open(state_path))
assert state.get("context", {}).get("object_id")
assert state.get("symbolic_iterations")
subcalls = state["symbolic_iterations"][0].get("subcalls", [])
assert subcalls and subcalls[0].get("artifact_paths")
assert "planner_prompt_bytes" in state["symbolic_iterations"][0]
print("RLM evidence OK")
PY
```
- Tests:
  - Unit tests for chunking determinism + index layout.
  - Plan parsing + clamp tests.
  - Small integration test that asserts prompt bytes bound and at least one subcall artifact is produced.
- PR strategy: split “true RLM” into its own PR if diff budget is likely to fail.

## Phase 4 — Validation
- Run guard checks locally (or add minimal tests if none exist).
- Verify output readability in CI-style logs.
- After implementation + validation, update shipped delegation docs to reflect the final, tested behavior:
  - `skills/delegation-usage/SKILL.md`
  - `skills/delegation-usage/DELEGATION_GUIDE.md`
  - `docs/delegation-runner-workflow.md`
- Validation checklist (expected outcomes):
  - Missing `MCP_RUNNER_TASK_ID` → export guidance shown.
  - Unregistered task ID → explicit registration guidance.
  - `tasks/index.json` unreadable → actionable error.
  - Runs dir unreadable → actionable error.
  - No manifests found → expected paths + fix steps shown.
  - Candidate list capped at 3 with rejection reasons.
  - `DELEGATION_GUARD_OVERRIDE_REASON` set → override path confirmed.
  - Success path unchanged when evidence is present.
- Validation checklist (delegate.spawn + archive fixes):
  - `delegate.spawn` with `start_only=true` requires `task_id`.
  - `delegate.spawn` returns within tool-call timeout after the child manifest is created (target < 10s).
  - Return happens after manifest creation (no stdout parsing), and the child continues running.
  - Child does not hang due to undrained stdout/stderr (pipes are drained/redirected).
  - Delegation token is available immediately for question queue usage.
  - Large prompt example completes using pointer-based context access (no full prompt stuffing).
  - Subcalls are created by the runner (not authored as O(N) tool calls).
  - PR #165 archive stubs resolve to actual doc-archives files.
  - Core Lane diff budget passes (override or split change).
- Validation checklist (true RLM artifacts):
  - `rlm/context/index.json` exists with correct `chunk_count`.
  - `rlm/state.json` contains `context.object_id`, `planner_prompt_bytes`, and at least one `subcalls[]` entry with artifact paths.
  - `planner_prompt_bytes` ≤ `RLM_MAX_PLANNER_PROMPT_BYTES` and any truncation is recorded in `rlm/state.json`.
  - Logs/manifests show bounded subcalls and chunk reads.
  - Prompt snapshots or prompt byte logs show bounded top-level prompt size.
  - `RLM_MODE=auto` by default; `auto` resolves to `symbolic` when delegated (`CODEX_DELEGATION_PARENT_MANIFEST_PATH`), or when `RLM_CONTEXT_PATH` is set, or when context size ≥ `RLM_SYMBOLIC_MIN_BYTES`; otherwise `iterative`.

## Phase 5 — Evidence + Mirrors
- Update `docs/TASKS.md`, `tasks/tasks-0951-delegation-rlm-quick-wins.md`, `.agent/task/0951-delegation-rlm-quick-wins.md` with manifest links.
- Refresh `tasks/index.json` gate metadata and docs registry entries.

## Risks & Mitigations
- Risk: Output becomes too verbose or noisy.
- Mitigation: Keep success path unchanged; keep diagnostics to a short, structured block.

## Appendix — Example Diagnostic Block (draft)

```
Delegation guard: issues detected
 - Missing: MCP_RUNNER_TASK_ID
 - Expected manifests: <runs-root>/<task-id>-*/cli/<run-id>/manifest.json
 - Candidates (first 3): <path> (reason: <why>)
 - Fix: export MCP_RUNNER_TASK_ID=<task-id> and run a subagent with <task-id>-<stream>
 - Override: set DELEGATION_GUARD_OVERRIDE_REASON="..." (if delegation is impossible)
```
