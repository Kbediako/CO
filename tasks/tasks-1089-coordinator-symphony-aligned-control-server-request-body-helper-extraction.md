# Task Checklist - 1089-coordinator-symphony-aligned-control-server-request-body-helper-extraction

- MCP Task ID: `1089-coordinator-symphony-aligned-control-server-request-body-helper-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-control-server-request-body-helper-extraction.md`
- TECH_SPEC: `tasks/specs/1089-coordinator-symphony-aligned-control-server-request-body-helper-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-request-body-helper-extraction.md`

> This lane extracts the shared raw-body / JSON-body request parsing helpers from `controlServer.ts` so the file keeps request entry/orchestration responsibility without carrying the request-body IO cluster inline.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-control-server-request-body-helper-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-control-server-request-body-helper-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-request-body-helper-extraction.md`, `tasks/specs/1089-coordinator-symphony-aligned-control-server-request-body-helper-extraction.md`, `tasks/tasks-1089-coordinator-symphony-aligned-control-server-request-body-helper-extraction.md`, `.agent/task/1089-coordinator-symphony-aligned-control-server-request-body-helper-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1089-control-server-request-body-helper-extraction-deliberation.md`, `out/1088-coordinator-symphony-aligned-control-server-audit-and-error-helper-extraction/manual/20260309T125736Z-closeout/12-elegance-review.md`, `out/1088-coordinator-symphony-aligned-control-server-audit-and-error-helper-extraction/manual/20260309T125736Z-closeout/14-next-slice-note.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1089-coordinator-symphony-aligned-control-server-request-body-helper-extraction.md`, `docs/findings/1089-control-server-request-body-helper-extraction-deliberation.md`.
- [ ] docs-review approval/override captured for registered `1089`. Evidence: `out/1089-coordinator-symphony-aligned-control-server-request-body-helper-extraction/manual/<timestamp>-docs-first/00-summary.md`, `out/1089-coordinator-symphony-aligned-control-server-request-body-helper-extraction/manual/<timestamp>-docs-first/05-docs-review-override.md`.

## Request Body Helper Extraction

- [ ] Shared request-body helpers extracted behind one bounded module. Evidence: helper module change, focused request-body tests.
- [ ] `controlServer.ts` delegates Linear webhook and authenticated-route request parsing through the extracted helper without changing route/controller behavior. Evidence: `orchestrator/src/cli/control/controlServer.ts`, focused request-body evidence.
- [ ] `invalid_json` and `request_body_too_large` behavior remain unchanged after extraction. Evidence: focused request-body regressions.

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs`. Evidence: `out/1089-coordinator-symphony-aligned-control-server-request-body-helper-extraction/manual/<timestamp>-closeout/01-delegation-guard.log`, `.runs/1089-coordinator-symphony-aligned-control-server-request-body-helper-extraction-*/cli/<timestamp>/manifest.json`.
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1089-coordinator-symphony-aligned-control-server-request-body-helper-extraction/manual/<timestamp>-closeout/02-spec-guard.log`.
- [ ] `npm run build`. Evidence: `out/1089-coordinator-symphony-aligned-control-server-request-body-helper-extraction/manual/<timestamp>-closeout/03-build.log`.
- [ ] `npm run lint`. Evidence: `out/1089-coordinator-symphony-aligned-control-server-request-body-helper-extraction/manual/<timestamp>-closeout/04-lint.log`.
- [ ] `npm run test`. Evidence: `out/1089-coordinator-symphony-aligned-control-server-request-body-helper-extraction/manual/<timestamp>-closeout/05-test.log`, `out/1089-coordinator-symphony-aligned-control-server-request-body-helper-extraction/manual/<timestamp>-closeout/05b-targeted-tests.log`.
- [ ] `npm run docs:check`. Evidence: `out/1089-coordinator-symphony-aligned-control-server-request-body-helper-extraction/manual/<timestamp>-closeout/06-docs-check.log`.
- [ ] `npm run docs:freshness`. Evidence: `out/1089-coordinator-symphony-aligned-control-server-request-body-helper-extraction/manual/<timestamp>-closeout/07-docs-freshness.log`.
- [ ] `node scripts/diff-budget.mjs`. Evidence: `out/1089-coordinator-symphony-aligned-control-server-request-body-helper-extraction/manual/<timestamp>-closeout/08-diff-budget.log`.
- [ ] `npm run review`. Evidence: `out/1089-coordinator-symphony-aligned-control-server-request-body-helper-extraction/manual/<timestamp>-closeout/09-review.log`.
- [ ] `npm run pack:smoke`. Evidence: `out/1089-coordinator-symphony-aligned-control-server-request-body-helper-extraction/manual/<timestamp>-closeout/10-pack-smoke.log`.
- [ ] Manual/mock request-body helper evidence captured. Evidence: `out/1089-coordinator-symphony-aligned-control-server-request-body-helper-extraction/manual/<timestamp>-closeout/11-manual-request-body-helper-check.json`.
- [ ] Elegance review completed. Evidence: `out/1089-coordinator-symphony-aligned-control-server-request-body-helper-extraction/manual/<timestamp>-closeout/12-elegance-review.md`.
