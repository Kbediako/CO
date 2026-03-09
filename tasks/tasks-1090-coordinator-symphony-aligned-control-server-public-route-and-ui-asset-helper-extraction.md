# Task Checklist - 1090-coordinator-symphony-aligned-control-server-public-route-and-ui-asset-helper-extraction

- MCP Task ID: `1090-coordinator-symphony-aligned-control-server-public-route-and-ui-asset-helper-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-control-server-public-route-and-ui-asset-helper-extraction.md`
- TECH_SPEC: `tasks/specs/1090-coordinator-symphony-aligned-control-server-public-route-and-ui-asset-helper-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-public-route-and-ui-asset-helper-extraction.md`

> This lane extracts the remaining public-route/UI-asset helper cluster from `controlServer.ts` so the file keeps request-entry orchestration responsibility without carrying basic `/health`, root redirect, and static asset serving inline.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-control-server-public-route-and-ui-asset-helper-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-control-server-public-route-and-ui-asset-helper-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-public-route-and-ui-asset-helper-extraction.md`, `tasks/specs/1090-coordinator-symphony-aligned-control-server-public-route-and-ui-asset-helper-extraction.md`, `tasks/tasks-1090-coordinator-symphony-aligned-control-server-public-route-and-ui-asset-helper-extraction.md`, `.agent/task/1090-coordinator-symphony-aligned-control-server-public-route-and-ui-asset-helper-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1090-control-server-public-route-and-ui-asset-helper-extraction-deliberation.md`, `out/1089-coordinator-symphony-aligned-control-server-request-body-helper-extraction/manual/20260309T132458Z-closeout/12-elegance-review.md`, `out/1089-coordinator-symphony-aligned-control-server-request-body-helper-extraction/manual/20260309T132458Z-closeout/14-next-slice-note.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1090-coordinator-symphony-aligned-control-server-public-route-and-ui-asset-helper-extraction.md`, `docs/findings/1090-control-server-public-route-and-ui-asset-helper-extraction-deliberation.md`.
- [ ] docs-review approval/override captured for registered `1090`. Evidence: `out/1090-coordinator-symphony-aligned-control-server-public-route-and-ui-asset-helper-extraction/manual/<timestamp>-docs-first/00-summary.md`, `out/1090-coordinator-symphony-aligned-control-server-public-route-and-ui-asset-helper-extraction/manual/<timestamp>-docs-first/05-docs-review-override.md`.

## Public Route / UI Asset Helper Extraction

- [ ] Shared public-route/UI-asset helpers extracted behind one bounded module. Evidence: helper module change, focused public-route tests.
- [ ] `controlServer.ts` delegates `/health`, `/`, and static UI asset handling through the extracted helper without changing branch ordering. Evidence: `orchestrator/src/cli/control/controlServer.ts`, focused route evidence.
- [ ] Public route and static asset behavior remain unchanged after extraction. Evidence: focused route regressions.

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs`. Evidence: `out/1090-coordinator-symphony-aligned-control-server-public-route-and-ui-asset-helper-extraction/manual/<timestamp>-closeout/01-delegation-guard.log`, `.runs/1090-coordinator-symphony-aligned-control-server-public-route-and-ui-asset-helper-extraction-*/cli/<timestamp>/manifest.json`.
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1090-coordinator-symphony-aligned-control-server-public-route-and-ui-asset-helper-extraction/manual/<timestamp>-closeout/02-spec-guard.log`.
- [ ] `npm run build`. Evidence: `out/1090-coordinator-symphony-aligned-control-server-public-route-and-ui-asset-helper-extraction/manual/<timestamp>-closeout/03-build.log`.
- [ ] `npm run lint`. Evidence: `out/1090-coordinator-symphony-aligned-control-server-public-route-and-ui-asset-helper-extraction/manual/<timestamp>-closeout/04-lint.log`.
- [ ] `npm run test`. Evidence: `out/1090-coordinator-symphony-aligned-control-server-public-route-and-ui-asset-helper-extraction/manual/<timestamp>-closeout/05-test.log`, `out/1090-coordinator-symphony-aligned-control-server-public-route-and-ui-asset-helper-extraction/manual/<timestamp>-closeout/05b-targeted-tests.log`.
- [ ] `npm run docs:check`. Evidence: `out/1090-coordinator-symphony-aligned-control-server-public-route-and-ui-asset-helper-extraction/manual/<timestamp>-closeout/06-docs-check.log`.
- [ ] `npm run docs:freshness`. Evidence: `out/1090-coordinator-symphony-aligned-control-server-public-route-and-ui-asset-helper-extraction/manual/<timestamp>-closeout/07-docs-freshness.log`.
- [ ] `node scripts/diff-budget.mjs`. Evidence: `out/1090-coordinator-symphony-aligned-control-server-public-route-and-ui-asset-helper-extraction/manual/<timestamp>-closeout/08-diff-budget.log`.
- [ ] `npm run review`. Evidence: `out/1090-coordinator-symphony-aligned-control-server-public-route-and-ui-asset-helper-extraction/manual/<timestamp>-closeout/09-review.log`.
- [ ] `npm run pack:smoke`. Evidence: `out/1090-coordinator-symphony-aligned-control-server-public-route-and-ui-asset-helper-extraction/manual/<timestamp>-closeout/10-pack-smoke.log`.
- [ ] Manual/mock public-route helper evidence captured. Evidence: `out/1090-coordinator-symphony-aligned-control-server-public-route-and-ui-asset-helper-extraction/manual/<timestamp>-closeout/11-manual-public-route-helper-check.json`.
- [ ] Elegance review completed. Evidence: `out/1090-coordinator-symphony-aligned-control-server-public-route-and-ui-asset-helper-extraction/manual/<timestamp>-closeout/12-elegance-review.md`.
