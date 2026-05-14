# Task Checklist - 1112-coordinator-symphony-aligned-standalone-review-active-closeout-root-provenance-hint

- MCP Task ID: `1112-coordinator-symphony-aligned-standalone-review-active-closeout-root-provenance-hint`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-active-closeout-root-provenance-hint.md`
- TECH_SPEC: `tasks/specs/1112-coordinator-symphony-aligned-standalone-review-active-closeout-root-provenance-hint.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-active-closeout-root-provenance-hint.md`

> This lane follows `1111` by surfacing the already-resolved active closeout provenance in the diff-mode handoff before broader standalone-review drift work resumes.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-active-closeout-root-provenance-hint.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-active-closeout-root-provenance-hint.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-active-closeout-root-provenance-hint.md`, `tasks/specs/1112-coordinator-symphony-aligned-standalone-review-active-closeout-root-provenance-hint.md`, `tasks/tasks-1112-coordinator-symphony-aligned-standalone-review-active-closeout-root-provenance-hint.md`, `.agent/task/1112-coordinator-symphony-aligned-standalone-review-active-closeout-root-provenance-hint.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1112-standalone-review-active-closeout-root-provenance-hint-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1112-coordinator-symphony-aligned-standalone-review-active-closeout-root-provenance-hint.md`, `docs/findings/1112-standalone-review-active-closeout-root-provenance-hint-deliberation.md`.
- [x] docs-review approval/override captured for registered `1112`. Evidence: `out/1112-coordinator-symphony-aligned-standalone-review-active-closeout-root-provenance-hint/manual/20260311T042547Z-docs-first/05-docs-review-override.md`.

## Active Closeout Provenance Hint

- [x] Diff-mode handoff includes a short active closeout provenance note when roots are resolved. Evidence: `scripts/run-review.ts`, `tests/run-review.spec.ts`.
- [x] The note reuses the same resolved root set already enforced at runtime, including delegated parent-task fallback and `TODO-closeout` plus latest completed closeout handling. Evidence: `scripts/run-review.ts`, `tests/run-review.spec.ts`.
- [x] The note frames those paths as already-resolved self-referential surfaces so reviewers do not need to re-derive or re-enumerate them unless directly necessary. Evidence: `scripts/run-review.ts`, `docs/standalone-review-guide.md`, `tests/run-review.spec.ts`.
- [x] Runtime-facing coverage proves the handoff note for direct task, delegated parent-task inheritance, and `TODO-closeout` plus latest completed closeout behavior. Evidence: `tests/run-review.spec.ts`, `out/1112-coordinator-symphony-aligned-standalone-review-active-closeout-root-provenance-hint/manual/20260311T044021Z-closeout/05a-targeted-tests.log`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1112-coordinator-symphony-aligned-standalone-review-active-closeout-root-provenance-hint/manual/20260311T044021Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1112-coordinator-symphony-aligned-standalone-review-active-closeout-root-provenance-hint/manual/20260311T044021Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1112-coordinator-symphony-aligned-standalone-review-active-closeout-root-provenance-hint/manual/20260311T044021Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1112-coordinator-symphony-aligned-standalone-review-active-closeout-root-provenance-hint/manual/20260311T044021Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1112-coordinator-symphony-aligned-standalone-review-active-closeout-root-provenance-hint/manual/20260311T044021Z-closeout/05-test.log`, `out/1112-coordinator-symphony-aligned-standalone-review-active-closeout-root-provenance-hint/manual/20260311T044021Z-closeout/05a-targeted-tests.log`.
- [x] `npm run docs:check`. Evidence: `out/1112-coordinator-symphony-aligned-standalone-review-active-closeout-root-provenance-hint/manual/20260311T044021Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1112-coordinator-symphony-aligned-standalone-review-active-closeout-root-provenance-hint/manual/20260311T044021Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1112-coordinator-symphony-aligned-standalone-review-active-closeout-root-provenance-hint/manual/20260311T044021Z-closeout/08-diff-budget.log`, `out/1112-coordinator-symphony-aligned-standalone-review-active-closeout-root-provenance-hint/manual/20260311T044021Z-closeout/13-override-notes.md`.
- [x] `npm run review`. Evidence: `out/1112-coordinator-symphony-aligned-standalone-review-active-closeout-root-provenance-hint/manual/20260311T044021Z-closeout/09-review.log`.
- [x] `npm run pack:smoke`. Evidence: `out/1112-coordinator-symphony-aligned-standalone-review-active-closeout-root-provenance-hint/manual/20260311T044021Z-closeout/10-pack-smoke.log`.
- [x] Manual provenance-hint evidence captured. Evidence: `out/1112-coordinator-symphony-aligned-standalone-review-active-closeout-root-provenance-hint/manual/20260311T044021Z-closeout/11-manual-active-closeout-root-provenance-hint-check.json`.
- [x] Elegance review completed. Evidence: `out/1112-coordinator-symphony-aligned-standalone-review-active-closeout-root-provenance-hint/manual/20260311T044021Z-closeout/12-elegance-review.md`.
