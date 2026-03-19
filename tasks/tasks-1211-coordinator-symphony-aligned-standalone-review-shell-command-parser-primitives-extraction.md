# Task Checklist - 1211-coordinator-symphony-aligned-standalone-review-shell-command-parser-primitives-extraction

- MCP Task ID: `1211-coordinator-symphony-aligned-standalone-review-shell-command-parser-primitives-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-shell-command-parser-primitives-extraction.md`
- TECH_SPEC: `tasks/specs/1211-coordinator-symphony-aligned-standalone-review-shell-command-parser-primitives-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-shell-command-parser-primitives-extraction.md`

## Docs-first

- [x] PRD drafted and aligned to the current user goal. Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-shell-command-parser-primitives-extraction.md`
- [x] TECH_SPEC drafted with bounded scope, invariants, and validation plan. Evidence: `tasks/specs/1211-coordinator-symphony-aligned-standalone-review-shell-command-parser-primitives-extraction.md`
- [x] ACTION_PLAN drafted for implementation and closeout. Evidence: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-shell-command-parser-primitives-extraction.md`
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + .agent mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-shell-command-parser-primitives-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-shell-command-parser-primitives-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-shell-command-parser-primitives-extraction.md`, `tasks/specs/1211-coordinator-symphony-aligned-standalone-review-shell-command-parser-primitives-extraction.md`, `tasks/tasks-1211-coordinator-symphony-aligned-standalone-review-shell-command-parser-primitives-extraction.md`, `.agent/task/1211-coordinator-symphony-aligned-standalone-review-shell-command-parser-primitives-extraction.md`
- [x] Deliberation/findings captured for the extraction lane. Evidence: `docs/findings/1211-standalone-review-shell-command-parser-primitives-extraction-deliberation.md`
- [x] `tasks/index.json` updated with the linked TECH_SPEC path. Evidence: `tasks/index.json`
- [x] `docs/docs-freshness-registry.json` updated for all new docs/task artifacts. Evidence: `docs/docs-freshness-registry.json`
- [x] `docs/TASKS.md` updated with the current snapshot and evidence. Evidence: `docs/TASKS.md`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1211-coordinator-symphony-aligned-standalone-review-shell-command-parser-primitives-extraction.md`, `docs/findings/1211-standalone-review-shell-command-parser-primitives-extraction-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1211`. Evidence: `out/1211-coordinator-symphony-aligned-standalone-review-shell-command-parser-primitives-extraction/manual/20260315T054106Z-docs-first/05-docs-review.log`, `out/1211-coordinator-symphony-aligned-standalone-review-shell-command-parser-primitives-extraction/manual/20260315T054106Z-docs-first/05-docs-review-override.md`

## Implementation

- [x] Shared shell-command parser primitives extracted from `scripts/lib/review-execution-state.ts` into a bounded helper module without widening review-policy ownership. Evidence: `scripts/lib/review-execution-state.ts`, `scripts/lib/review-shell-command-parser.ts`, `out/1211-coordinator-symphony-aligned-standalone-review-shell-command-parser-primitives-extraction/manual/20260315T055302Z-closeout/00-summary.md`
- [x] Focused regressions prove the extracted parser preserves shell-control segmentation, launcher unwrap, and shell-command payload behavior for the existing analyzers. Evidence: `tests/review-execution-state.spec.ts`, `tests/run-review.spec.ts`, `out/1211-coordinator-symphony-aligned-standalone-review-shell-command-parser-primitives-extraction/manual/20260315T055302Z-closeout/05a-targeted-tests.log`

## Validation & Closeout

- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1211-coordinator-symphony-aligned-standalone-review-shell-command-parser-primitives-extraction/manual/20260315T055302Z-closeout/02-spec-guard.log`
- [x] `npm run docs:check`. Evidence: `out/1211-coordinator-symphony-aligned-standalone-review-shell-command-parser-primitives-extraction/manual/20260315T055302Z-closeout/07-docs-check.log`
- [x] `npm run docs:freshness`. Evidence: `out/1211-coordinator-symphony-aligned-standalone-review-shell-command-parser-primitives-extraction/manual/20260315T055302Z-closeout/08-docs-freshness.log`
- [x] Task-scoped `node scripts/delegation-guard.mjs` passed with manifest-backed delegation evidence. Evidence: `out/1211-coordinator-symphony-aligned-standalone-review-shell-command-parser-primitives-extraction/manual/20260315T055302Z-closeout/01-delegation-guard.log`, `.runs/1211-coordinator-symphony-aligned-standalone-review-shell-command-parser-primitives-extraction-guard/cli/2026-03-15T05-53-21-211Z-dc0785da/manifest.json`
- [x] `npm run build` passed on the shipped tree. Evidence: `out/1211-coordinator-symphony-aligned-standalone-review-shell-command-parser-primitives-extraction/manual/20260315T055302Z-closeout/03-build.log`
- [x] `npm run lint` passed on the shipped tree. Evidence: `out/1211-coordinator-symphony-aligned-standalone-review-shell-command-parser-primitives-extraction/manual/20260315T055302Z-closeout/04-lint.log`
- [x] Focused parser regressions passed. Evidence: `out/1211-coordinator-symphony-aligned-standalone-review-shell-command-parser-primitives-extraction/manual/20260315T055302Z-closeout/05a-targeted-tests.log`
- [x] Full validation lane passed on the shipped tree. Evidence: `out/1211-coordinator-symphony-aligned-standalone-review-shell-command-parser-primitives-extraction/manual/20260315T055302Z-closeout/05-test.log`
- [x] `node scripts/diff-budget.mjs` passed with explicit override only if required. Evidence: `out/1211-coordinator-symphony-aligned-standalone-review-shell-command-parser-primitives-extraction/manual/20260315T055302Z-closeout/09-diff-budget.log`, `out/1211-coordinator-symphony-aligned-standalone-review-shell-command-parser-primitives-extraction/manual/20260315T055302Z-closeout/13-override-notes.md`
- [x] Bounded `npm run review` returned no findings or an explicit override was recorded truthfully. Evidence: `out/1211-coordinator-symphony-aligned-standalone-review-shell-command-parser-primitives-extraction/manual/20260315T055302Z-closeout/10-review.log`
- [x] `npm run pack:smoke` passed. Evidence: `out/1211-coordinator-symphony-aligned-standalone-review-shell-command-parser-primitives-extraction/manual/20260315T055302Z-closeout/11-pack-smoke.log`
- [x] Elegance review completed. Evidence: `out/1211-coordinator-symphony-aligned-standalone-review-shell-command-parser-primitives-extraction/manual/20260315T055302Z-closeout/12-elegance-review.md`
- [x] Closeout summary and explicit override notes recorded. Evidence: `out/1211-coordinator-symphony-aligned-standalone-review-shell-command-parser-primitives-extraction/manual/20260315T055302Z-closeout/00-summary.md`, `out/1211-coordinator-symphony-aligned-standalone-review-shell-command-parser-primitives-extraction/manual/20260315T055302Z-closeout/13-override-notes.md`
