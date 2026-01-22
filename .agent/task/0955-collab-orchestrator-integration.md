# Task Checklist - Codex Collab Orchestrator Integration (0955)

- MCP Task ID: `0955-collab-orchestrator-integration`
- Primary PRD: `docs/PRD-collab-orchestrator-integration.md`
- TECH_SPEC: `tasks/specs/0955-collab-orchestrator-integration.md`
- ACTION_PLAN: `docs/ACTION_PLAN-collab-orchestrator-integration.md`
- Summary of scope: Research collab features, plan orchestrator + RLM integration, and decide MCP vs collab guidance.

> Set `MCP_RUNNER_TASK_ID=0955-collab-orchestrator-integration` for orchestrator commands. Guardrails required: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `npm run review`. Mirror with `docs/TASKS.md` and `.agent/task/0955-collab-orchestrator-integration.md`. Flip `[ ]` to `[x]` only with evidence (manifest or log when required; standalone review approvals can cite spec/task notes).

## Checklist

### Foundation
- [x] Task scaffolding + mirrors registered — Evidence: `docs/TASKS.md`, `tasks/index.json`, `tasks/tasks-0955-collab-orchestrator-integration.md`, `.agent/task/0955-collab-orchestrator-integration.md`.
- [x] PRD + TECH_SPEC + ACTION_PLAN drafted — Evidence: `docs/PRD-collab-orchestrator-integration.md`, `tasks/specs/0955-collab-orchestrator-integration.md`, `docs/ACTION_PLAN-collab-orchestrator-integration.md`, `docs/TECH_SPEC-collab-orchestrator-integration.md`.
- [x] Delegation subagent run captured — Evidence: `.runs/0955-collab-orchestrator-integration-scout/cli/2026-01-21T23-26-20-269Z-3a22397b/manifest.json`.
- [x] Standalone review approval captured (pre-implementation) — Evidence: `tasks/specs/0955-collab-orchestrator-integration.md`.

### Planning
- [x] Collab capability map + config/flag confirmation — Evidence: `tasks/specs/0955-collab-orchestrator-integration.md`.
- [x] RLM integration decision (iterative + symbolic) — Evidence: `tasks/specs/0955-collab-orchestrator-integration.md`.
- [x] CO-managed patched Codex CLI install plan — Evidence: `tasks/specs/0955-collab-orchestrator-integration.md`.
- [x] MCP vs collab recommendation finalized — Evidence: `docs/PRD-collab-orchestrator-integration.md`.
- [x] Real-world eval plan drafted (multi-hour/multi-day + context-rot) — Evidence: `tasks/specs/0955-collab-orchestrator-integration.md`.
- [x] Symbolic RLM large-context experiment captured (invalid_config) — Evidence: `.runs/0955-collab-orchestrator-integration/cli/2026-01-22T00-07-21-450Z-e3a8ad9c/manifest.json`, `.runs/0955-collab-orchestrator-integration/cli/2026-01-22T00-09-38-245Z-ce05ddab/manifest.json`.
- [x] Symbolic RLM large-context collab run succeeded (2 iterations, final) — Evidence: `.runs/0955-collab-orchestrator-integration/cli/2026-01-22T06-09-33-041Z-6fad25a7/manifest.json`.
- [x] Cross-package dependency alignment (design-reference-tools React 18.3.1) with collab verification — Evidence: `.runs/0955-collab-orchestrator-integration/cli/2026-01-22T06-20-14-418Z-90a5d7e1/manifest.json`, `packages/design-reference-tools/apps/web/package.json`, `packages/design-reference-tools/packages/ui/package.json`.
- [x] Multi-hour refactor checkpoint run (run-path consolidation) — Evidence: `.runs/0955-collab-orchestrator-integration/cli/2026-01-22T07-14-45-894Z-7b0ffa51/manifest.json`, `scripts/lib/run-manifests.js`, `scripts/design/pipeline/context.ts`, `orchestrator/src/sync/CloudSyncWorker.ts`.

### Validation + handoff
- [x] Docs-review manifest captured — Evidence: `.runs/0955-collab-orchestrator-integration/cli/2026-01-22T01-40-50-054Z-7a110e74/manifest.json`.
- [x] Implementation-gate review captured — Evidence: `.runs/0955-collab-orchestrator-integration/cli/2026-01-22T05-14-22-335Z-f89c7bea/manifest.json`, `.runs/0955-collab-orchestrator-integration/cli/2026-01-22T06-24-55-773Z-8a7896f7/manifest.json`, `.runs/0955-collab-orchestrator-integration/cli/2026-01-22T10-48-21-718Z-d3f91f61/manifest.json`.

## Relevant Files
- `docs/PRD-collab-orchestrator-integration.md`
- `tasks/specs/0955-collab-orchestrator-integration.md`
- `docs/ACTION_PLAN-collab-orchestrator-integration.md`
- `docs/TECH_SPEC-collab-orchestrator-integration.md`
- `orchestrator/src/cli/rlmRunner.ts`
- `orchestrator/src/cli/rlm/symbolic.ts`
- `packages/shared/manifest/types.ts`
