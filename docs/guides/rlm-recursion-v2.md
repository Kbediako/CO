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

## Upstream Capability Watch (Codex CLI)

As of 2026-04-25, these upstream details are relevant for CO planning:

- Built-in `explorer` no longer pins an older profile in `0.105.0`; it inherits top-level model/reasoning unless role `config_file` overrides it.
- For normal `features.multi_agent=true` and older Codex behavior, `agents.max_threads` default remains `6`; CO recommends `12` with optional `max_depth = 4` for active multi-agent lanes, while treating `max_spawn_depth` as a legacy local override rather than current baseline guidance. For Codex CLI `0.125+` with `features.multi_agent_v2=true`, omit `agents.max_threads` entirely; upstream rejects the key, so doctor/default setup must not write or recommend it. Contingency-only fallback profiles remain `8/2` by default and legacy `6/1/1` only for v1/older configs that still consume spawn-depth caps.
- `features.multi_agent` is canonical for v1/older collab tooling; `features.multi_agent_v2` is the Codex CLI `0.125+` path that rejects `agents.max_threads`; `collab` is a legacy alias.
- `features.sqlite` and `features.memories` remain experimental/eval-only (legacy alias `features.memory_tool` remains compatibility-only).
- `features.js_repl` and `features.js_repl_tools_only` are removed in Codex CLI `0.128.0`; do not use them for default posture, break-glass toggles, or deterministic cloud feature lanes.
- Upstream app-server now emits `model/rerouted` notifications; CO should keep this on the watchlist for future run-summary/diagnostic enrichment.
