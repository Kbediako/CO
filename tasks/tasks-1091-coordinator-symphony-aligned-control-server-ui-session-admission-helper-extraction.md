# Task Checklist - 1091-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction

- MCP Task ID: `1091-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction.md`
- TECH_SPEC: `tasks/specs/1091-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction.md`

> This lane extracts the remaining UI session admission helper assembly from `controlServer.ts` into the existing UI-session controller boundary, or a tiny adjacent controller-owned helper, so the file keeps request-entry orchestration responsibility without carrying `/auth/session` wiring, loopback helper ownership, and local allowed-host normalization inline.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction.md`, `tasks/specs/1091-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction.md`, `tasks/tasks-1091-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction.md`, `.agent/task/1091-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1091-control-server-ui-session-admission-helper-extraction-deliberation.md`, `out/1090-coordinator-symphony-aligned-control-server-public-route-and-ui-asset-helper-extraction/manual/20260309T135121Z-closeout/14-next-slice-note.md`, `out/1091-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction/manual/20260309T141055Z-docs-first/04-scout-summary.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1091-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction.md`, `docs/findings/1091-control-server-ui-session-admission-helper-extraction-deliberation.md`.
- [x] docs-review approval/override captured for registered `1091`. Evidence: `out/1091-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction/manual/20260309T141055Z-docs-first/00-summary.md`, `out/1091-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction/manual/20260309T141055Z-docs-first/05-docs-review-override.md`.

## UI Session Admission Helper Extraction

- [x] Shared UI session admission helpers extracted behind one bounded controller-owned seam. Evidence: `orchestrator/src/cli/control/uiSessionController.ts`, `out/1091-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction/manual/20260309T142435Z-closeout/12-elegance-review.md`.
- [x] `controlServer.ts` delegates `/auth/session` handling through the extracted helper without changing branch ordering. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `out/1091-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction/manual/20260309T142435Z-closeout/11-manual-ui-session-admission-check.json`.
- [x] `/auth/session` behavior remains unchanged after extraction. Evidence: `orchestrator/tests/UiSessionController.test.ts`, `orchestrator/tests/ControlServer.test.ts`, `out/1091-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction/manual/20260309T142435Z-closeout/05b-targeted-tests.log`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs` Evidence: `out/1091-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction/manual/20260309T142435Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run` Evidence: `out/1091-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction/manual/20260309T142435Z-closeout/02-spec-guard.log`.
- [x] `npm run build` Evidence: `out/1091-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction/manual/20260309T142435Z-closeout/03-build.log`.
- [x] `npm run lint` Evidence: `out/1091-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction/manual/20260309T142435Z-closeout/04-lint.log`.
- [x] `npm run test` Evidence: `out/1091-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction/manual/20260309T142435Z-closeout/05-test.log`, `out/1091-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction/manual/20260309T142435Z-closeout/05b-targeted-tests.log`, `.runs/1091-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction-scout/cli/2026-03-09T14-24-20-607Z-328e9b37/commands/04-test.ndjson`.
- [x] `npm run docs:check` Evidence: `out/1091-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction/manual/20260309T142435Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness` Evidence: `out/1091-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction/manual/20260309T142435Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs` Evidence: `out/1091-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction/manual/20260309T142435Z-closeout/08-diff-budget.log`.
- [x] `npm run review` Evidence: `out/1091-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction/manual/20260309T142435Z-closeout/09-review.log`.
- [x] `npm run pack:smoke` Evidence: `out/1091-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction/manual/20260309T142435Z-closeout/10-pack-smoke.log`.
- [x] Manual/mock UI session admission helper evidence captured. Evidence: `out/1091-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction/manual/20260309T142435Z-closeout/11-manual-ui-session-admission-check.json`.
- [x] Elegance review completed. Evidence: `out/1091-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction/manual/20260309T142435Z-closeout/12-elegance-review.md`.
