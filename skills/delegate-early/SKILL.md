---
name: delegate-early
description: Compatibility alias for delegation-first workflows. Prefer `delegation-usage` as the canonical skill.
---

# Delegate Early (Compatibility Alias)

`delegate-early` is kept for backward compatibility. The canonical delegation workflow now lives in `delegation-usage`.

## Required behavior
- Immediately follow `delegation-usage` for setup, spawn semantics, question queue handling, confirmation flow, and manifest usage.
- Keep delegation MCP enabled by default; enable other MCP servers only when relevant to the task.
- Preserve delegation evidence (task-id stream naming + manifest path capture) exactly as documented in `delegation-usage`.

## Quick routing
1. Use `delegation-usage` as the source of truth.
2. Apply early fan-out only when streams are clearly independent and acceptance criteria are explicit.
3. Keep summaries short and artifact-first; avoid long chat dumps.

## Note
If guidance in this file conflicts with `delegation-usage`, follow `delegation-usage`.
