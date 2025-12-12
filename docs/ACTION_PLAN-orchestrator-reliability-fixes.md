# Action Plan — Orchestrator Reliability Fixes (Task 0902)

1. Add Task 0902 PRD/spec/task mirrors and link from 0901 follow‑up.
2. Implement fixes for issues #1‑#9 with minimal diffs.
3. Add/extend regression tests alongside each fix.
4. Run diagnostics/guardrails non‑interactively:
   - `MCP_RUNNER_TASK_ID=0902-orchestrator-reliability-fixes npx codex-orchestrator start diagnostics --format json`
   - `node scripts/spec-guard.mjs --dry-run`
   - `npm run lint`
   - `npm run test`
5. Update checklist mirrors with manifest/metrics/state evidence and flip `[ ]` → `[x]`.
6. Commit changes with evidence links in message.

