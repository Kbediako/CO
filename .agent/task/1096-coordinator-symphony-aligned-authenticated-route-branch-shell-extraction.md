# Task Checklist - 1096-coordinator-symphony-aligned-authenticated-route-branch-shell-extraction

- MCP Task ID: `1096-coordinator-symphony-aligned-authenticated-route-branch-shell-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-authenticated-route-branch-shell-extraction.md`
- TECH_SPEC: `tasks/specs/1096-coordinator-symphony-aligned-authenticated-route-branch-shell-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-authenticated-route-branch-shell-extraction.md`

> This lane resumes the next bounded Symphony-aligned `controlServer.ts` seam immediately after the standalone-review `1095` follow-on.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-authenticated-route-branch-shell-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-authenticated-route-branch-shell-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-authenticated-route-branch-shell-extraction.md`, `tasks/specs/1096-coordinator-symphony-aligned-authenticated-route-branch-shell-extraction.md`, `tasks/tasks-1096-coordinator-symphony-aligned-authenticated-route-branch-shell-extraction.md`, `.agent/task/1096-coordinator-symphony-aligned-authenticated-route-branch-shell-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1096-authenticated-route-branch-shell-extraction-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1096-coordinator-symphony-aligned-authenticated-route-branch-shell-extraction.md`, `docs/findings/1096-authenticated-route-branch-shell-extraction-deliberation.md`.
- [x] docs-review approval/override captured for registered `1096`. Evidence: `out/1096-coordinator-symphony-aligned-authenticated-route-branch-shell-extraction/manual/20260310T061100Z-docs-first/00-summary.md`, `out/1096-coordinator-symphony-aligned-authenticated-route-branch-shell-extraction/manual/20260310T061100Z-docs-first/05-docs-review-override.md`.

## Authenticated Route Branch Shell

- [x] `controlServer.ts` delegates the authenticated-route branch through one bounded helper. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/src/cli/control/controlServerAuthenticatedRouteBranch.ts`, `out/1096-coordinator-symphony-aligned-authenticated-route-branch-shell-extraction/manual/20260309T182942Z-closeout/00-summary.md`.
- [x] Authenticated gate failures and handled-route success behavior remain unchanged. Evidence: `orchestrator/src/cli/control/controlServerAuthenticatedRouteBranch.ts`, `orchestrator/tests/ControlServerAuthenticatedRouteBranch.test.ts`, `out/1096-coordinator-symphony-aligned-authenticated-route-branch-shell-extraction/manual/20260309T182942Z-closeout/11-manual-authenticated-route-branch-check.json`.
- [x] Protected authenticated-route `404 {"error":"not_found"}` behavior remains unchanged. Evidence: `orchestrator/src/cli/control/controlServerAuthenticatedRouteBranch.ts`, `orchestrator/tests/ControlServerAuthenticatedRouteBranch.test.ts`, `out/1096-coordinator-symphony-aligned-authenticated-route-branch-shell-extraction/manual/20260309T182942Z-closeout/11-manual-authenticated-route-branch-check.json`.
- [x] Regression coverage proves the extracted shell without widening branch order scope. Evidence: `orchestrator/tests/ControlServerAuthenticatedRouteBranch.test.ts`, `orchestrator/tests/AuthenticatedControlRouteGate.test.ts`, `orchestrator/tests/ControlServer.test.ts`, `out/1096-coordinator-symphony-aligned-authenticated-route-branch-shell-extraction/manual/20260309T182942Z-closeout/05-targeted-tests.log`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1096-coordinator-symphony-aligned-authenticated-route-branch-shell-extraction/manual/20260309T182942Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1096-coordinator-symphony-aligned-authenticated-route-branch-shell-extraction/manual/20260309T182942Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1096-coordinator-symphony-aligned-authenticated-route-branch-shell-extraction/manual/20260309T182942Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1096-coordinator-symphony-aligned-authenticated-route-branch-shell-extraction/manual/20260309T182942Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1096-coordinator-symphony-aligned-authenticated-route-branch-shell-extraction/manual/20260309T182942Z-closeout/05-test.log`.
- [x] `npm run docs:check`. Evidence: `out/1096-coordinator-symphony-aligned-authenticated-route-branch-shell-extraction/manual/20260309T182942Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1096-coordinator-symphony-aligned-authenticated-route-branch-shell-extraction/manual/20260309T182942Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1096-coordinator-symphony-aligned-authenticated-route-branch-shell-extraction/manual/20260309T182942Z-closeout/08-diff-budget.log`.
- [x] `npm run review`. Evidence: `out/1096-coordinator-symphony-aligned-authenticated-route-branch-shell-extraction/manual/20260309T182942Z-closeout/09-review.log`.
- [x] `npm run pack:smoke`. Evidence: `out/1096-coordinator-symphony-aligned-authenticated-route-branch-shell-extraction/manual/20260309T182942Z-closeout/10-pack-smoke.log`.
- [x] Manual authenticated-route shell evidence captured. Evidence: `out/1096-coordinator-symphony-aligned-authenticated-route-branch-shell-extraction/manual/20260309T182942Z-closeout/11-manual-authenticated-route-branch-check.json`.
- [x] Elegance review completed. Evidence: `out/1096-coordinator-symphony-aligned-authenticated-route-branch-shell-extraction/manual/20260309T182942Z-closeout/12-elegance-review.md`.
