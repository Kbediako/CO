# RLM Recursion v2 (Symbolic) Usage Guide

CO’s symbolic RLM loop is designed for “slice, delegate, and stitch” workflows. The planner reads from chunked context pointers, spawns bounded subcalls, and can return a final result via a variable binding (a `FINAL_VAR`-style contract).

## Quick Start

Symbolic (no collab):
```bash
RLM_MODE=symbolic codex-orchestrator rlm "<goal>"
```

Symbolic + collab subagents (requires Codex `features.multi_agent=true`; `collab` remains a legacy alias):
```bash
codex-orchestrator rlm --multi-agent auto "<goal>"
```

Legacy equivalent:
```bash
codex-orchestrator rlm --collab auto "<goal>"
```

Safe exploration:
```bash
codex-orchestrator rlm --help
```

## Auto Mode (Large-Context Default)

`RLM_MODE=auto` now stays iterative unless both conditions are true:
- Context size reaches `RLM_SYMBOLIC_MIN_BYTES` (large-context threshold)
- An explicit context signal is present (delegated run or `RLM_CONTEXT_PATH`)

This keeps routine/small-context runs in iterative mode while still auto-switching to symbolic for true large-context workflows.

## Core Concepts

Pointers (planner-facing reference format):
- Context chunks: `ctx:<object_id>#chunk:<chunk_id>`
- Prior subcall outputs: `subcall:<iteration>:<subcall_id>`

The planner produces JSON plans each iteration that include:
- `reads[]`: small excerpts from pointers
- `searches[]`: pointer-indexed search hits
- `subcalls[]`: bounded child prompts with pointer snippets/spans
- `final_answer` (string) or `final_var` (variable lookup)

## FINAL_VAR-Style Variable Handoff

Symbolic RLM supports an explicit variable contract:
- Subcalls may set `output_var` (string).
- A final plan may set `final_var` (string) to a previously bound `output_var`.

When `final_var` is set, the runtime resolves the final answer by reading the bound subcall output artifact (rather than relying on free-form parsing).

Practical prompting tip (agent-to-agent):
- Ask the planner to bind important extracted results with stable `output_var` names.
- Ask the final step to return via `final_var` when the result is large or structured.

## Where To Inspect Results

- RLM state: `.runs/<task-id>/cli/<run-id>/rlm/state.json`
- Planner failures/retries: `.runs/<task-id>/cli/<run-id>/rlm/planner/`
- Subcall artifacts: `.runs/<task-id>/cli/<run-id>/rlm/subcalls/`

## Tuning (When Needed)

Symbolic budgets are controlled via env vars (defaults are intentionally conservative):
- `RLM_MAX_BYTES_PER_SNIPPET`
- `RLM_MAX_SUBCALL_INPUT_BYTES`
- `RLM_MAX_CONCURRENCY`

If you want strict “small slice” behavior (for example, keeping subcalls around ~2k characters), lower `RLM_MAX_BYTES_PER_SNIPPET` and/or `RLM_MAX_SUBCALL_INPUT_BYTES`.
