# Task Checklist - 1073-coordinator-symphony-aligned-question-child-resolution-adapter-extraction

- MCP Task ID: `1073-coordinator-symphony-aligned-question-child-resolution-adapter-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-question-child-resolution-adapter-extraction.md`
- TECH_SPEC: `tasks/specs/1073-coordinator-symphony-aligned-question-child-resolution-adapter-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-question-child-resolution-adapter-extraction.md`

> This lane continues the Symphony-alignment mainline by extracting the child-run question-resolution adapter assembly from `controlServer.ts`.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-question-child-resolution-adapter-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-question-child-resolution-adapter-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-question-child-resolution-adapter-extraction.md`, `tasks/specs/1073-coordinator-symphony-aligned-question-child-resolution-adapter-extraction.md`, `tasks/tasks-1073-coordinator-symphony-aligned-question-child-resolution-adapter-extraction.md`, `.agent/task/1073-coordinator-symphony-aligned-question-child-resolution-adapter-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1073-question-child-resolution-adapter-extraction-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1073-coordinator-symphony-aligned-question-child-resolution-adapter-extraction.md`, `docs/findings/1073-question-child-resolution-adapter-extraction-deliberation.md`, `out/1072-coordinator-symphony-aligned-control-request-context-assembly-extraction/manual/20260308T220352Z-closeout/14-next-slice-note.md`.
- [ ] docs-review approval/override captured for registered `1073`. Evidence: `out/1073-coordinator-symphony-aligned-question-child-resolution-adapter-extraction/manual/<timestamp>-docs-first/00-summary.md`.

## Question Child-Resolution Adapter Extraction

- [ ] Child-resolution adapter assembly ownership moved out of `controlServer.ts` into a dedicated control-local module. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/src/cli/control/`.
- [ ] The extracted seam preserves fallback event emission, delegation/run-root policy, and helper behavior. Evidence: `orchestrator/src/cli/control/`, `orchestrator/tests/ControlServer.test.ts`.
- [ ] Question/expiry behavior remains intact after the extraction. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/tests/ControlServer.test.ts`.

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs`. Evidence: `out/1073-coordinator-symphony-aligned-question-child-resolution-adapter-extraction/manual/<timestamp>-closeout/01-delegation-guard.log`.
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1073-coordinator-symphony-aligned-question-child-resolution-adapter-extraction/manual/<timestamp>-closeout/02-spec-guard.log`.
- [ ] `npm run build`. Evidence: `out/1073-coordinator-symphony-aligned-question-child-resolution-adapter-extraction/manual/<timestamp>-closeout/03-build.log`.
- [ ] `npm run lint`. Evidence: `out/1073-coordinator-symphony-aligned-question-child-resolution-adapter-extraction/manual/<timestamp>-closeout/04-lint.log`.
- [ ] `npm run test`. Evidence: `out/1073-coordinator-symphony-aligned-question-child-resolution-adapter-extraction/manual/<timestamp>-closeout/05-test.log`.
- [ ] `npm run docs:check`. Evidence: `out/1073-coordinator-symphony-aligned-question-child-resolution-adapter-extraction/manual/<timestamp>-closeout/06-docs-check.log`.
- [ ] `npm run docs:freshness`. Evidence: `out/1073-coordinator-symphony-aligned-question-child-resolution-adapter-extraction/manual/<timestamp>-closeout/07-docs-freshness.log`.
- [ ] `node scripts/diff-budget.mjs`. Evidence: `out/1073-coordinator-symphony-aligned-question-child-resolution-adapter-extraction/manual/<timestamp>-closeout/08-diff-budget.log`.
- [ ] `npm run review`. Evidence: `out/1073-coordinator-symphony-aligned-question-child-resolution-adapter-extraction/manual/<timestamp>-closeout/09-review.log`.
- [ ] `npm run pack:smoke`. Evidence: `out/1073-coordinator-symphony-aligned-question-child-resolution-adapter-extraction/manual/<timestamp>-closeout/10-pack-smoke.log`.
- [ ] Manual/mock child-resolution seam evidence captured. Evidence: `out/1073-coordinator-symphony-aligned-question-child-resolution-adapter-extraction/manual/<timestamp>-closeout/11-manual-question-child-resolution-check.json`.
- [ ] Elegance review completed. Evidence: `out/1073-coordinator-symphony-aligned-question-child-resolution-adapter-extraction/manual/<timestamp>-closeout/12-elegance-review.md`.
