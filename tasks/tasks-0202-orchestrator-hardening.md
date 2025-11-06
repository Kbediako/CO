# Task Checklist — Orchestrator Resilience Hardening (0202)

> Export `MCP_RUNNER_TASK_ID=0202-orchestrator-hardening` before executing orchestrator commands. Mirror status across `/tasks`, `docs/TASKS.md`, and `.agent/task/0202-orchestrator-hardening.md`. Every `[x]` entry must include the manifest path that proves completion.

## Foundation
- [x] Synchronize collateral — `tasks/index.json`, `docs/PRD.md`, `docs/TECH_SPEC.md`, `docs/ACTION_PLAN.md`, `.agent/task/0202-orchestrator-hardening.md` reference Task 0202; Evidence: `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`.
- [x] Prepare run directories — `.runs/0202-orchestrator-hardening/cli/` initializes via diagnostics run; Evidence: `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`.
- [x] Environment defaults — `MCP_RUNNER_TASK_ID` exported in shell / CI and reflected in diagnostics manifest task id; Evidence: `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`.

## Persistence Reliability
- [x] Implement lock retry + backoff in `TaskStateStore` with bounded attempts; Evidence: `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`, tests `orchestrator/tests/TaskStateStore.test.ts`.
- [x] Update `PersistenceCoordinator` to persist manifests when snapshot retries exhaust; Evidence: `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`, tests `orchestrator/tests/PersistenceCoordinator.test.ts`.

## Heartbeat Safety
- [x] Queue heartbeat writes with awaited promises and 30s manifest throttle; Evidence: `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`.
- [x] Log heartbeat failures and ensure forced flush on completion; Evidence: `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`.

## Output Bounding
- [x] Cap stdout/stderr buffers at 64 KiB per stream in `runCommandStage`; Evidence: `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`, tests `orchestrator/tests/Manifest.test.ts`.
- [x] Truncate error payloads in `appendCommandError` to ≤8 KiB; Evidence: `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`, tests `orchestrator/tests/Manifest.test.ts`.

- [x] Run diagnostics (`npx codex-orchestrator start diagnostics --format json`); Evidence: `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`.
- [x] Guardrails — `node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test`; Evidence: `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`.
- [x] Reviewer hand-off — `npm run review` executed with latest manifest; Evidence: `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`.
- [x] Documentation sync — Update `docs/TASKS.md` and `.agent/task/0202-orchestrator-hardening.md` checklist mirrors with manifest paths; Evidence: `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`.

_Flip each `[ ]` to `[x]` with the exact manifest path (e.g., `.runs/0202-orchestrator-hardening/cli/2025-10-31T20-15-00Z/manifest.json`) once acceptance criteria are satisfied._
