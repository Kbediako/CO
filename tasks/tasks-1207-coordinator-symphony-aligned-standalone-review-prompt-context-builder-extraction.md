# Task Checklist - 1207-coordinator-symphony-aligned-standalone-review-prompt-context-builder-extraction

- MCP Task ID: `1207-coordinator-symphony-aligned-standalone-review-prompt-context-builder-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-prompt-context-builder-extraction.md`
- TECH_SPEC: `tasks/specs/1207-coordinator-symphony-aligned-standalone-review-prompt-context-builder-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-prompt-context-builder-extraction.md`

## Docs-first

- [x] PRD drafted and aligned to the current user goal. Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-prompt-context-builder-extraction.md`
- [x] TECH_SPEC drafted with bounded scope, invariants, and validation plan. Evidence: `tasks/specs/1207-coordinator-symphony-aligned-standalone-review-prompt-context-builder-extraction.md`
- [x] ACTION_PLAN drafted for implementation and closeout. Evidence: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-prompt-context-builder-extraction.md`
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + .agent mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-prompt-context-builder-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-prompt-context-builder-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-prompt-context-builder-extraction.md`, `tasks/specs/1207-coordinator-symphony-aligned-standalone-review-prompt-context-builder-extraction.md`, `tasks/tasks-1207-coordinator-symphony-aligned-standalone-review-prompt-context-builder-extraction.md`, `.agent/task/1207-coordinator-symphony-aligned-standalone-review-prompt-context-builder-extraction.md`
- [x] Deliberation/findings captured for the extraction lane. Evidence: `docs/findings/1207-standalone-review-prompt-context-builder-extraction-deliberation.md`
- [x] `tasks/index.json` updated with the linked TECH_SPEC path. Evidence: `tasks/index.json`
- [x] `docs/docs-freshness-registry.json` updated for all new docs/task artifacts. Evidence: `docs/docs-freshness-registry.json`
- [x] `docs/TASKS.md` updated with the current snapshot and evidence. Evidence: `docs/TASKS.md`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1207-coordinator-symphony-aligned-standalone-review-prompt-context-builder-extraction.md`, `docs/findings/1207-standalone-review-prompt-context-builder-extraction-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1207`. Evidence: `out/1207-coordinator-symphony-aligned-standalone-review-prompt-context-builder-extraction/manual/20260315T021518Z-docs-first/05-docs-review-override.md`, `out/1207-coordinator-symphony-aligned-standalone-review-prompt-context-builder-extraction/manual/20260315T021518Z-docs-first/05-docs-review.log`

## Implementation

- [x] Prompt/context support extracted into a dedicated helper under `scripts/lib/`. Evidence: `scripts/lib/review-prompt-context.ts`
- [x] `scripts/run-review.ts` delegates task-context lookup, prompt scaffolding, active closeout provenance, and NOTES fallback through the helper. Evidence: `scripts/run-review.ts`
- [x] Focused review-wrapper coverage proves the extracted prompt/context contract stayed stable. Evidence: `tests/review-prompt-context.spec.ts`, `tests/run-review.spec.ts`

## Validation & Closeout

- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1207-coordinator-symphony-aligned-standalone-review-prompt-context-builder-extraction/manual/20260315T021518Z-docs-first/02-spec-guard.log`
- [x] `npm run docs:check`. Evidence: `out/1207-coordinator-symphony-aligned-standalone-review-prompt-context-builder-extraction/manual/20260315T021518Z-docs-first/03-docs-check.log`
- [x] `npm run docs:freshness`. Evidence: `out/1207-coordinator-symphony-aligned-standalone-review-prompt-context-builder-extraction/manual/20260315T021518Z-docs-first/04-docs-freshness.log`
- [x] Task-scoped `node scripts/delegation-guard.mjs` passed with manifest-backed delegation evidence. Evidence: `out/1207-coordinator-symphony-aligned-standalone-review-prompt-context-builder-extraction/manual/20260315T023422Z-closeout/01-delegation-guard.log`, `.runs/1207-coordinator-symphony-aligned-standalone-review-prompt-context-builder-extraction-guard/cli/2026-03-15T02-32-41-682Z-41509be8/manifest.json`
- [x] Focused prompt/context regression coverage passed. Evidence: `out/1207-coordinator-symphony-aligned-standalone-review-prompt-context-builder-extraction/manual/20260315T023422Z-closeout/05a-helper-tests.log`, `out/1207-coordinator-symphony-aligned-standalone-review-prompt-context-builder-extraction/manual/20260315T023422Z-closeout/05b-targeted-tests.log`
- [x] Full validation lane passed or any truthful override was recorded explicitly. Evidence: `out/1207-coordinator-symphony-aligned-standalone-review-prompt-context-builder-extraction/manual/20260315T023422Z-closeout/06-test.log`, `.runs/1207-coordinator-symphony-aligned-standalone-review-prompt-context-builder-extraction-guard/cli/2026-03-15T02-32-41-682Z-41509be8/errors/04-test.json`, `out/1207-coordinator-symphony-aligned-standalone-review-prompt-context-builder-extraction/manual/20260315T023422Z-closeout/13-override-notes.md`
- [x] Bounded `npm run review -- --manifest ...` returned no findings or explicit truthful override was recorded. Evidence: `out/1207-coordinator-symphony-aligned-standalone-review-prompt-context-builder-extraction/manual/20260315T023422Z-closeout/10-review.log`, `.runs/1207-coordinator-symphony-aligned-standalone-review-prompt-context-builder-extraction-guard/cli/2026-03-15T02-32-41-682Z-41509be8/review/output.log`, `out/1207-coordinator-symphony-aligned-standalone-review-prompt-context-builder-extraction/manual/20260315T023422Z-closeout/13-override-notes.md`
- [x] `npm run pack:smoke` passed. Evidence: `out/1207-coordinator-symphony-aligned-standalone-review-prompt-context-builder-extraction/manual/20260315T023422Z-closeout/11-pack-smoke.log`
- [x] Elegance review completed. Evidence: `out/1207-coordinator-symphony-aligned-standalone-review-prompt-context-builder-extraction/manual/20260315T023422Z-closeout/12-elegance-review.md`
