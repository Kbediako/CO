# Task Checklist - 1234-coordinator-symphony-aligned-control-server-lifecycle-orchestration-boundary-extraction

- MCP Task ID: `1234-coordinator-symphony-aligned-control-server-lifecycle-orchestration-boundary-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-control-server-lifecycle-orchestration-boundary-extraction.md`
- TECH_SPEC: `tasks/specs/1234-coordinator-symphony-aligned-control-server-lifecycle-orchestration-boundary-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-lifecycle-orchestration-boundary-extraction.md`

## Docs-first

- [x] PRD drafted and aligned to the current user goal. Evidence: `docs/PRD-coordinator-symphony-aligned-control-server-lifecycle-orchestration-boundary-extraction.md`
- [x] TECH_SPEC drafted with bounded scope, invariants, and validation plan. Evidence: `tasks/specs/1234-coordinator-symphony-aligned-control-server-lifecycle-orchestration-boundary-extraction.md`
- [x] ACTION_PLAN drafted for implementation and closeout. Evidence: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-lifecycle-orchestration-boundary-extraction.md`
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + .agent mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-control-server-lifecycle-orchestration-boundary-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-control-server-lifecycle-orchestration-boundary-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-lifecycle-orchestration-boundary-extraction.md`, `tasks/specs/1234-coordinator-symphony-aligned-control-server-lifecycle-orchestration-boundary-extraction.md`, `tasks/tasks-1234-coordinator-symphony-aligned-control-server-lifecycle-orchestration-boundary-extraction.md`, `.agent/task/1234-coordinator-symphony-aligned-control-server-lifecycle-orchestration-boundary-extraction.md`
- [x] Deliberation/findings captured for the extraction lane. Evidence: `docs/findings/1234-control-server-lifecycle-orchestration-boundary-extraction-deliberation.md`
- [x] `tasks/index.json` updated with the linked TECH_SPEC path. Evidence: `tasks/index.json`
- [x] `docs/docs-freshness-registry.json` updated for all new docs/task artifacts. Evidence: `docs/docs-freshness-registry.json`
- [x] `docs/TASKS.md` updated with the current snapshot and evidence. Evidence: `docs/TASKS.md`
- [x] docs-review approval or explicit override captured for registered `1234`. Evidence: `out/1234-coordinator-symphony-aligned-control-server-lifecycle-orchestration-boundary-extraction/manual/20260316T074236Z-docs-first/05-docs-review-override.md`

## Implementation

- [x] Exact control-server lifecycle orchestration seam revalidated before code changes. Evidence: `docs/findings/1234-control-server-lifecycle-orchestration-boundary-extraction-deliberation.md`, `out/1234-coordinator-symphony-aligned-control-server-lifecycle-orchestration-boundary-extraction/manual/20260316T075807Z-closeout/00-summary.md`
- [x] Owned runtime publication/close sequencing extracted behind a truthful helper surface without widening into route/action dispatch. Evidence: `orchestrator/src/cli/control/controlServerOwnedRuntimeLifecycle.ts`, `orchestrator/src/cli/control/controlServerReadyInstanceLifecycle.ts`
- [x] Bootstrap-publication parity is covered by focused lifecycle regressions. Evidence: `orchestrator/tests/ControlServerReadyInstanceLifecycle.test.ts`, `out/1234-coordinator-symphony-aligned-control-server-lifecycle-orchestration-boundary-extraction/manual/20260316T075807Z-closeout/05b-targeted-tests.log`
- [x] Closeout summary, override notes, and next-slice continuity recorded. Evidence: `out/1234-coordinator-symphony-aligned-control-server-lifecycle-orchestration-boundary-extraction/manual/20260316T075807Z-closeout/00-summary.md`, `out/1234-coordinator-symphony-aligned-control-server-lifecycle-orchestration-boundary-extraction/manual/20260316T075807Z-closeout/13-override-notes.md`, `out/1234-coordinator-symphony-aligned-control-server-lifecycle-orchestration-boundary-extraction/manual/20260316T075807Z-closeout/14-next-slice-note.md`
