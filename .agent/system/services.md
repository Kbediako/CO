# Services Catalog

This repository is primarily a Node.js/TypeScript monorepo. Most “services” are CLIs and libraries (not long-running daemons). Treat this file as a catalog of the major components you’ll touch during agentic work.

## Core components

| Component | Type | Location | Runtime | Primary interface(s) | Notes |
| --- | --- | --- | --- | --- | --- |
| Codex Orchestrator CLI | CLI | `bin/codex-orchestrator.ts` → `dist/bin/codex-orchestrator.js` | Node.js | `npx codex-orchestrator ...` | Executes pipelines from `codex.orchestrator.json` and writes evidence to `.runs/**`. |
| Orchestrator core | Library | `orchestrator/src/**` | Node.js | Imported by the CLI | TaskManager, agents, persistence, and run lifecycle wiring. |
| Shared orchestrator toolkit | Library | `packages/orchestrator/**` | Node.js | Imported by orchestrator + adapters | Approval/sandbox helpers and shared orchestration utilities. |
| Shared types/schemas | Library | `packages/shared/**` | Node.js | Imported across packages | Shared manifest types + config helpers. |

## Supporting modules

| Component | Type | Location | Runtime | Primary interface(s) | Notes |
| --- | --- | --- | --- | --- | --- |
| Patterns & codemods | Build artifact + tooling | `patterns/**`, `eslint-plugin-patterns/**` | Node.js | `npm run build:patterns`, `npm run lint` | `npm run lint` runs `build:patterns` first via `prelint`. |
| Evaluation harness | Test harness | `evaluation/harness/**`, `evaluation/tests/**` | Node.js (+ optional Python) | `npm run eval:test` | Keep `vitest run` mode for CI/non-interactive runs. |
| Mirror tooling | CLI scripts | `scripts/mirror-*.mjs` | Node.js | `npm run mirror:{fetch,serve,check}` | Used by downstream packages under `packages/<project>/public`. |
| Legacy MCP shims | Shell scripts | `scripts/mcp-runner-*.sh`, `scripts/run-mcp-diagnostics.sh` | shell | `scripts/run-mcp-diagnostics.sh` | Backwards-compatible wrappers; prefer `codex-orchestrator` for new workflows. |

## Downstream projects (under `packages/`)
Downstream codebases/adapters live under `packages/<project>/`. Current projects in this repo:
- `packages/abetkaua/`
- `packages/aim-app/`
- `packages/control-plane-schemas/`
- `packages/des-obys/`
- `packages/design-reference-tools/`
- `packages/design-system/`
- `packages/eminente/`
- `packages/obys-library/`
- `packages/sdk-node/`

Each project may have its own build/test/docs; keep task evidence scoped by setting `MCP_RUNNER_TASK_ID` so artifacts land under `.runs/<task-id>/` and `out/<task-id>/`.
