# Action Plan — TaskStateStore Run History File Fix (Task 0903)

1. Add 0903 task mirrors and link from 0902 follow‑up.
2. Implement TaskStateStore snapshot path migration to `runs.json`.
3. Update/add unit tests.
4. Run diagnostics/guardrails:
   - `MCP_RUNNER_TASK_ID=0903-taskstate-store-run-history-fix npx codex-orchestrator start diagnostics --format json`
   - `node scripts/spec-guard.mjs --dry-run`
   - `npm run lint`
   - `npm run test`
5. Update checklist mirrors with evidence and commit.

