# Task Checklist - 1088-coordinator-symphony-aligned-control-server-audit-and-error-helper-extraction

- MCP Task ID: `1088-coordinator-symphony-aligned-control-server-audit-and-error-helper-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-control-server-audit-and-error-helper-extraction.md`
- TECH_SPEC: `tasks/specs/1088-coordinator-symphony-aligned-control-server-audit-and-error-helper-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-audit-and-error-helper-extraction.md`

> This lane extracts the remaining Linear webhook, dispatch-pilot, and control-action audit payload shaping plus shared JSON control-error writing from `controlServer.ts` so the file keeps request entry/orchestration responsibility without carrying the local audit/error helper cluster inline.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-control-server-audit-and-error-helper-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-control-server-audit-and-error-helper-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-audit-and-error-helper-extraction.md`, `tasks/specs/1088-coordinator-symphony-aligned-control-server-audit-and-error-helper-extraction.md`, `tasks/tasks-1088-coordinator-symphony-aligned-control-server-audit-and-error-helper-extraction.md`, `.agent/task/1088-coordinator-symphony-aligned-control-server-audit-and-error-helper-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1088-control-server-audit-and-error-helper-extraction-deliberation.md`, `out/1087-coordinator-symphony-aligned-control-server-seeded-runtime-bundle-boundary-tightening/manual/20260309T122328Z-closeout/12-elegance-review.md`, `out/1087-coordinator-symphony-aligned-control-server-seeded-runtime-bundle-boundary-tightening/manual/20260309T122328Z-closeout/14-next-slice-note.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1088-coordinator-symphony-aligned-control-server-audit-and-error-helper-extraction.md`, `docs/findings/1088-control-server-audit-and-error-helper-extraction-deliberation.md`.
- [ ] docs-review approval/override captured for registered `1088`. Evidence: `out/1088-coordinator-symphony-aligned-control-server-audit-and-error-helper-extraction/manual/<timestamp>-docs-first/00-summary.md`, `out/1088-coordinator-symphony-aligned-control-server-audit-and-error-helper-extraction/manual/<timestamp>-docs-first/05-docs-review-override.md`.

## Audit and Error Helper Extraction

- [ ] Control-server audit payload shaping extracted behind one bounded helper module. Evidence: helper module change, focused audit/error tests.
- [ ] `controlServer.ts` delegates Linear webhook, dispatch-pilot, and control-action audit/error shaping without changing route/controller behavior. Evidence: `orchestrator/src/cli/control/controlServer.ts`, focused route/audit evidence.
- [ ] Shared JSON control-error writes remain behaviorally identical after extraction. Evidence: focused authenticated-route/control-server regressions.

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs`. Evidence: `out/1088-coordinator-symphony-aligned-control-server-audit-and-error-helper-extraction/manual/<timestamp>-closeout/01-delegation-guard.log`, `.runs/1088-coordinator-symphony-aligned-control-server-audit-and-error-helper-extraction-*/cli/<timestamp>/manifest.json`.
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1088-coordinator-symphony-aligned-control-server-audit-and-error-helper-extraction/manual/<timestamp>-closeout/02-spec-guard.log`.
- [ ] `npm run build`. Evidence: `out/1088-coordinator-symphony-aligned-control-server-audit-and-error-helper-extraction/manual/<timestamp>-closeout/03-build.log`.
- [ ] `npm run lint`. Evidence: `out/1088-coordinator-symphony-aligned-control-server-audit-and-error-helper-extraction/manual/<timestamp>-closeout/04-lint.log`.
- [ ] `npm run test`. Evidence: `out/1088-coordinator-symphony-aligned-control-server-audit-and-error-helper-extraction/manual/<timestamp>-closeout/05-test.log`, `out/1088-coordinator-symphony-aligned-control-server-audit-and-error-helper-extraction/manual/<timestamp>-closeout/05b-targeted-tests.log`.
- [ ] `npm run docs:check`. Evidence: `out/1088-coordinator-symphony-aligned-control-server-audit-and-error-helper-extraction/manual/<timestamp>-closeout/06-docs-check.log`.
- [ ] `npm run docs:freshness`. Evidence: `out/1088-coordinator-symphony-aligned-control-server-audit-and-error-helper-extraction/manual/<timestamp>-closeout/07-docs-freshness.log`.
- [ ] `node scripts/diff-budget.mjs`. Evidence: `out/1088-coordinator-symphony-aligned-control-server-audit-and-error-helper-extraction/manual/<timestamp>-closeout/08-diff-budget.log`.
- [ ] `npm run review`. Evidence: `out/1088-coordinator-symphony-aligned-control-server-audit-and-error-helper-extraction/manual/<timestamp>-closeout/09-review.log`.
- [ ] `npm run pack:smoke`. Evidence: `out/1088-coordinator-symphony-aligned-control-server-audit-and-error-helper-extraction/manual/<timestamp>-closeout/10-pack-smoke.log`.
- [ ] Manual/mock audit/error helper evidence captured. Evidence: `out/1088-coordinator-symphony-aligned-control-server-audit-and-error-helper-extraction/manual/<timestamp>-closeout/11-manual-audit-error-helper-check.json`.
- [ ] Elegance review completed. Evidence: `out/1088-coordinator-symphony-aligned-control-server-audit-and-error-helper-extraction/manual/<timestamp>-closeout/12-elegance-review.md`.
