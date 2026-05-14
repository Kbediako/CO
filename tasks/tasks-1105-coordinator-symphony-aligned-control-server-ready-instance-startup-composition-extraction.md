# Task Checklist - 1105-coordinator-symphony-aligned-control-server-ready-instance-startup-composition-extraction

- MCP Task ID: `1105-coordinator-symphony-aligned-control-server-ready-instance-startup-composition-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-control-server-ready-instance-startup-composition-extraction.md`
- TECH_SPEC: `tasks/specs/1105-coordinator-symphony-aligned-control-server-ready-instance-startup-composition-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-ready-instance-startup-composition-extraction.md`

> This lane follows `1104` by extracting only the remaining ready-instance startup composition from `ControlServer.start()` without reopening seed loading, request-shell binding, bootstrap helper internals, or startup-sequence behavior.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-control-server-ready-instance-startup-composition-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-control-server-ready-instance-startup-composition-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-ready-instance-startup-composition-extraction.md`, `tasks/specs/1105-coordinator-symphony-aligned-control-server-ready-instance-startup-composition-extraction.md`, `tasks/tasks-1105-coordinator-symphony-aligned-control-server-ready-instance-startup-composition-extraction.md`, `.agent/task/1105-coordinator-symphony-aligned-control-server-ready-instance-startup-composition-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1105-control-server-ready-instance-startup-composition-extraction-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1105-coordinator-symphony-aligned-control-server-ready-instance-startup-composition-extraction.md`, `docs/findings/1105-control-server-ready-instance-startup-composition-extraction-deliberation.md`.
- [x] docs-review approval/override captured for registered `1105`. Evidence: `out/1105-coordinator-symphony-aligned-control-server-ready-instance-startup-composition-extraction/manual/20260310T040500Z-docs-first/05-docs-review-override.md`.

## Control Server Ready-Instance Startup Composition

- [x] `ControlServer.start()` delegates the remaining ready-instance startup composition through one dedicated helper. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/src/cli/control/controlServerReadyInstanceStartup.ts`.
- [x] The helper owns only ready startup bundle assembly, bootstrap lifecycle attachment, and final startup sequencing over the extracted collaborators. Evidence: `orchestrator/src/cli/control/controlServerReadyInstanceStartup.ts`, `orchestrator/src/cli/control/controlBootstrapAssembly.ts`, `orchestrator/src/cli/control/controlServerStartupSequence.ts`.
- [x] Focused regression coverage proves the new startup composition seam without reopening request-shell or startup-sequence behavior. Evidence: `orchestrator/tests/ControlServerReadyInstanceStartup.test.ts`, `orchestrator/tests/ControlServerStartupSequence.test.ts`, `out/1105-coordinator-symphony-aligned-control-server-ready-instance-startup-composition-extraction/manual/20260310T041150Z-closeout/05-targeted-tests.log`, `out/1105-coordinator-symphony-aligned-control-server-ready-instance-startup-composition-extraction/manual/20260310T041150Z-closeout/11-manual-startup-composition-check.json`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1105-coordinator-symphony-aligned-control-server-ready-instance-startup-composition-extraction/manual/20260310T041150Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1105-coordinator-symphony-aligned-control-server-ready-instance-startup-composition-extraction/manual/20260310T041150Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1105-coordinator-symphony-aligned-control-server-ready-instance-startup-composition-extraction/manual/20260310T041150Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1105-coordinator-symphony-aligned-control-server-ready-instance-startup-composition-extraction/manual/20260310T041150Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1105-coordinator-symphony-aligned-control-server-ready-instance-startup-composition-extraction/manual/20260310T041150Z-closeout/05-test.log`.
- [x] `npm run docs:check`. Evidence: `out/1105-coordinator-symphony-aligned-control-server-ready-instance-startup-composition-extraction/manual/20260310T041150Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1105-coordinator-symphony-aligned-control-server-ready-instance-startup-composition-extraction/manual/20260310T041150Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1105-coordinator-symphony-aligned-control-server-ready-instance-startup-composition-extraction/manual/20260310T041150Z-closeout/08-diff-budget.log`, `out/1105-coordinator-symphony-aligned-control-server-ready-instance-startup-composition-extraction/manual/20260310T041150Z-closeout/13-override-notes.md`.
- [x] `npm run review`. Evidence: `out/1105-coordinator-symphony-aligned-control-server-ready-instance-startup-composition-extraction/manual/20260310T041150Z-closeout/09-review.log`.
- [x] `npm run pack:smoke`. Evidence: `out/1105-coordinator-symphony-aligned-control-server-ready-instance-startup-composition-extraction/manual/20260310T041150Z-closeout/10-pack-smoke.log`.
- [x] Manual startup-composition evidence captured. Evidence: `out/1105-coordinator-symphony-aligned-control-server-ready-instance-startup-composition-extraction/manual/20260310T041150Z-closeout/11-manual-startup-composition-check.json`.
- [x] Elegance review completed. Evidence: `out/1105-coordinator-symphony-aligned-control-server-ready-instance-startup-composition-extraction/manual/20260310T041150Z-closeout/12-elegance-review.md`.
