# Task Checklist - 1072-coordinator-symphony-aligned-control-request-context-assembly-extraction

- MCP Task ID: `1072-coordinator-symphony-aligned-control-request-context-assembly-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-control-request-context-assembly-extraction.md`
- TECH_SPEC: `tasks/specs/1072-coordinator-symphony-aligned-control-request-context-assembly-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-request-context-assembly-extraction.md`

> This lane continues the Symphony-alignment mainline by extracting the remaining request-context assembly cluster from `controlServer.ts`.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-control-request-context-assembly-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-control-request-context-assembly-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-control-request-context-assembly-extraction.md`, `tasks/specs/1072-coordinator-symphony-aligned-control-request-context-assembly-extraction.md`, `tasks/tasks-1072-coordinator-symphony-aligned-control-request-context-assembly-extraction.md`, `.agent/task/1072-coordinator-symphony-aligned-control-request-context-assembly-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1072-control-request-context-assembly-extraction-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1072-coordinator-symphony-aligned-control-request-context-assembly-extraction.md`, `docs/findings/1072-control-request-context-assembly-extraction-deliberation.md`, `out/1071-coordinator-symphony-aligned-control-event-transport-extraction/manual/20260308T152650Z-closeout/14-next-slice-note.md`.
- [ ] docs-review approval/override captured for registered `1072`. Evidence: `out/1072-coordinator-symphony-aligned-control-request-context-assembly-extraction/manual/<timestamp>-docs-first/00-summary.md`.

## Control Request Context Assembly Extraction

- [ ] Shared request-context and internal-context assembly ownership moved out of `controlServer.ts` into a dedicated builder under `orchestrator/src/cli/control/`. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/src/cli/control/`.
- [ ] The extracted builder preserves request/helper call patterns, internal-context behavior, and presenter/runtime snapshot composition. Evidence: `orchestrator/src/cli/control/`, `orchestrator/tests/ControlServer.test.ts`.
- [ ] Request/route behavior remains intact after the context-builder extraction. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/tests/ControlServer.test.ts`.

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs`. Evidence: `out/1072-coordinator-symphony-aligned-control-request-context-assembly-extraction/manual/<timestamp>-closeout/01-delegation-guard.log`.
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1072-coordinator-symphony-aligned-control-request-context-assembly-extraction/manual/<timestamp>-closeout/02-spec-guard.log`.
- [ ] `npm run build`. Evidence: `out/1072-coordinator-symphony-aligned-control-request-context-assembly-extraction/manual/<timestamp>-closeout/03-build.log`.
- [ ] `npm run lint`. Evidence: `out/1072-coordinator-symphony-aligned-control-request-context-assembly-extraction/manual/<timestamp>-closeout/04-lint.log`.
- [ ] `npm run test`. Evidence: `out/1072-coordinator-symphony-aligned-control-request-context-assembly-extraction/manual/<timestamp>-closeout/05-test.log`.
- [ ] `npm run docs:check`. Evidence: `out/1072-coordinator-symphony-aligned-control-request-context-assembly-extraction/manual/<timestamp>-closeout/06-docs-check.log`.
- [ ] `npm run docs:freshness`. Evidence: `out/1072-coordinator-symphony-aligned-control-request-context-assembly-extraction/manual/<timestamp>-closeout/07-docs-freshness.log`.
- [ ] `node scripts/diff-budget.mjs`. Evidence: `out/1072-coordinator-symphony-aligned-control-request-context-assembly-extraction/manual/<timestamp>-closeout/08-diff-budget.log`.
- [ ] `npm run review`. Evidence: `out/1072-coordinator-symphony-aligned-control-request-context-assembly-extraction/manual/<timestamp>-closeout/09-review.log`.
- [ ] `npm run pack:smoke`. Evidence: `out/1072-coordinator-symphony-aligned-control-request-context-assembly-extraction/manual/<timestamp>-closeout/10-pack-smoke.log`.
- [ ] Manual/mock request-context builder evidence captured. Evidence: `out/1072-coordinator-symphony-aligned-control-request-context-assembly-extraction/manual/<timestamp>-closeout/11-manual-control-request-context-check.json`.
- [ ] Elegance review completed. Evidence: `out/1072-coordinator-symphony-aligned-control-request-context-assembly-extraction/manual/<timestamp>-closeout/12-elegance-review.md`.
