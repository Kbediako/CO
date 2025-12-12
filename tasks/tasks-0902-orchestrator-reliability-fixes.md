# Task 0902 — Orchestrator Reliability Fixes

- MCP Task ID: `0902-orchestrator-reliability-fixes`
- Primary PRD: `docs/PRD-orchestrator-reliability-fixes.md`
- Tech Spec: `docs/TECH_SPEC-orchestrator-reliability-fixes.md`
- Action Plan: `docs/ACTION_PLAN-orchestrator-reliability-fixes.md`
- Run Manifest (diagnostics): `.runs/0902-orchestrator-reliability-fixes/cli/2025-12-12T02-34-20-318Z-847a8138/manifest.json`

## Checklist
### Foundation
- [x] Diagnostics/guardrails manifest captured — Evidence: `.runs/0902-orchestrator-reliability-fixes/cli/2025-12-12T02-34-20-318Z-847a8138/manifest.json`.
- [x] Metrics/state snapshots updated — Evidence: `.runs/0902-orchestrator-reliability-fixes/metrics.json`, `out/0902-orchestrator-reliability-fixes/state.json`.
- [x] Mirrors updated in `docs/TASKS.md`, `.agent/task/0902-orchestrator-reliability-fixes.md`, and `tasks/index.json` — Evidence: this commit.

### Fixes
- [x] Issue #1 fixed: sub‑pipeline exceptions finalize parent manifests/stages — Evidence: `orchestrator/src/cli/orchestrator.ts`.
- [x] Issue #2 fixed: CLI exec executor forwards unified exec args — Evidence: `orchestrator/src/cli/services/execRuntime.ts`, `orchestrator/tests/CliExecRuntime.test.ts`.
- [x] Issue #3 fixed: session reuse applies env overrides — Evidence: `packages/orchestrator/src/exec/session-manager.ts`, `packages/orchestrator/tests/ExecSessionManager.test.ts`.
- [x] Issue #4 fixed: retry defaults not clobbered by `undefined` spreads — Evidence: `orchestrator/src/persistence/TaskStateStore.ts`, `orchestrator/src/persistence/ExperienceStore.ts`, store tests.
- [x] Issue #5 fixed: `isIsoDate` enforces strict ISO‑8601 expectations — Evidence: `packages/shared/manifest/artifactUtils.ts`, `packages/shared/tests/ArtifactUtils.test.ts`.
- [x] Issue #6 fixed: instruction loader warns+skips unstamped optional candidates — Evidence: `packages/orchestrator/src/instructions/loader.ts`, `packages/orchestrator/tests/InstructionsLoader.test.ts`.
- [x] Issue #7 fixed: timeout kill is cross‑platform/Windows‑safe — Evidence: `evaluation/harness/index.ts`, `evaluation/tests/harness.test.ts`.
- [x] Issue #8 fixed: temp dirs cleaned in crystalizer and SDK exec — Evidence: `orchestrator/src/learning/crystalizer.ts`, `packages/sdk-node/src/orchestrator.ts`, related tests.
- [x] Issue #9 fixed: eslint plugin no longer runs builds as side effects — Evidence: `eslint-plugin-patterns/index.cjs`.

### Guardrails
- [x] `node scripts/spec-guard.mjs --dry-run` passes — Evidence: `.runs/0902-orchestrator-reliability-fixes/cli/2025-12-12T02-34-20-318Z-847a8138/manifest.json`.
- [x] `npm run lint` passes — Evidence: `.runs/0902-orchestrator-reliability-fixes/cli/2025-12-12T02-34-20-318Z-847a8138/manifest.json`.
- [x] `npm run test` passes — Evidence: `.runs/0902-orchestrator-reliability-fixes/cli/2025-12-12T02-34-20-318Z-847a8138/manifest.json`.
