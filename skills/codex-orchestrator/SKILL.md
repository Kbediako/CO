---
name: codex-orchestrator
description: "Primary entrypoint for Codex Orchestrator usage: route tasks to the right pipeline, mode, and supporting skills with minimal, auditable steps."
---

# Codex-Orchestrator Workflow Router

## Overview

Use this skill as the default entrypoint for work in CO or downstream repos using `@kbediako/codex-orchestrator`. It routes intent to the smallest correct command path and points to specialized skills only when needed.

## Core Contract

- Keep MCP as the control plane by default.
- Use docs-first before implementation edits.
- Use delegation early for non-trivial work with bounded stream ownership.
- Keep runtime and execution modes explicit and orthogonal:
  - `runtimeMode=cli|appserver`
  - `executionMode=mcp|cloud`

## Default Command Path

For most task-scoped work:
- `codex-orchestrator flow --task <task-id>`
- `codex-orchestrator doctor --usage --window-days 30 --task <task-id>`
- `codex-orchestrator review --task <task-id>`

For explicit stage control:
- `codex-orchestrator start docs-review --task <task-id> --format json`
- `codex-orchestrator start implementation-gate --task <task-id> --format json`
- `codex-orchestrator status --run <run-id> --watch --interval 10`

## Intent Router

1) Task/spec scaffolding and mirror sync:
- Use `docs-first`.

2) Delegation setup/run-control and subagent evidence discipline:
- Use `delegation-usage`.

3) Stream decomposition across independent bounded work:
- Use `collab-subagents-first`.

4) Option analysis, tradeoffs, and decision framing before implementation:
- Use `collab-deliberation`.

5) Long-running checks/reviews/cloud jobs that need patience-first monitoring:
- Use `long-poll-wait`.

6) Implementation checkpoint reviews and final handoff:
- Use `standalone-review`, then `elegance-review`.

7) Release/tag/publish workflows:
- Use `release`.

8) Collab/multi-agent scenario testing and evidence capture:
- Use `collab-evals`.

## Feature Posture

- Codex CLI `0.128.0` removed `js_repl` and `js_repl_tools_only`; do not treat them as default-on, break-glass toggleable, or eligible for cloud feature lanes, and do not set cloud feature env vars or `codex features enable/disable` commands for either removed name.
- Use cloud feature lanes only for active non-removed feature names after checking `codex features list`.
- `memories` stays scoped to explicit eval lanes.
- Subagent context forking (`fork_context`) is guidance-first: keep it `false` for bounded streams, and set `true` only when the child must inherit prior thread history.
- Compatibility note: upstream still accepts the legacy alias `memory_tool`; use `memories` in new CO guidance unless documenting legacy compatibility behavior.

## Related Docs

- `AGENTS.md`
- `docs/AGENTS.md`
- `README.md`
- `docs/README.md`

## Related Skills

- `docs-first`
- `delegation-usage`
- `collab-subagents-first`
- `collab-deliberation`
- `standalone-review`
- `elegance-review`
- `long-poll-wait`
- `release`
- `agent-first-adoption-steering`
