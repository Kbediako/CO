# Task 0901 — Orchestrator Issue Validation & Prioritization

- MCP Task ID: `0901-orchestrator-issue-validation` (export before orchestrator commands so manifests land under `.runs/0901-orchestrator-issue-validation/cli/`).
- Primary PRD: `docs/PRD-orchestrator-issue-validation.md`
- Tech Spec: `docs/TECH_SPEC-orchestrator-issue-validation.md`
- Run Manifest (latest diagnostics/plan): `.runs/0901-orchestrator-issue-validation/cli/2025-12-12T02-00-30-325Z-9cd0b653/manifest.json`.
- Metrics/State: `.runs/0901-orchestrator-issue-validation/metrics.json`, `out/0901-orchestrator-issue-validation/state.json`.

## Checklist
- [x] Capture diagnostics/plan manifest for task 0901 and mirror links in docs/tasks — Evidence: `.runs/0901-orchestrator-issue-validation/cli/2025-12-12T02-00-30-325Z-9cd0b653/manifest.json`.
- [x] Validate issue #1 (sub‑pipeline error finalization) — Evidence: `orchestrator/src/cli/orchestrator.ts` sub‑pipeline branch awaits `this.start(...)` without try/catch, leaving parent entry `running` on throw.
- [x] Validate issue #2 (CLI exec args passthrough) — Evidence: `orchestrator/src/cli/services/execRuntime.ts` spawns `request.command` without forwarding `request.args`.
- [x] Validate issue #3 (session env override on reuse) — Evidence: `packages/orchestrator/src/exec/session-manager.ts` reuses sessions without updating `envSnapshot`.
- [x] Validate issue #4 (retry config clobbering) — Evidence: `TaskStateStore` and `ExperienceStore` spread `options.lockRetry` over defaults, allowing `undefined` to override.
- [x] Validate issue #5 (`isIsoDate` strictness) — Evidence: `packages/shared/manifest/artifactUtils.ts` treats any parseable date as ISO.
- [x] Validate issue #6 (instruction stamp hard‑fail) — Evidence: `packages/orchestrator/src/instructions/loader.ts` throws on unstamped instruction candidates.
- [x] Validate issue #7 (SIGKILL timeout) — Evidence: `evaluation/harness/index.ts` unconditionally kills with `SIGKILL` on timeout.
- [x] Validate issue #8 (temp dir leakage) — Evidence: `orchestrator/src/learning/crystalizer.ts` and `packages/sdk-node/src/orchestrator.ts` create temp dirs without cleanup.
- [x] Validate issue #9 (eslint plugin side‑effect build) — Evidence: `eslint-plugin-patterns/index.cjs` runs `npm run build:patterns` during rule load.
- [x] Update PRD/spec/docs/TASKS/tasks/index.json mirrors with evidence — Evidence: `.runs/0901-orchestrator-issue-validation/cli/2025-12-12T02-00-30-325Z-9cd0b653/manifest.json`.
- [x] Produce follow‑up fix plan (new task/PR) with priorities and acceptance criteria — Evidence: `tasks/tasks-0902-orchestrator-reliability-fixes.md`.
