# Task Checklist - 1200-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-persistence-callback-extraction

- MCP Task ID: `1200-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-persistence-callback-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-persistence-callback-extraction.md`
- TECH_SPEC: `tasks/specs/1200-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-persistence-callback-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-persistence-callback-extraction.md`

## Docs-first

- [x] PRD drafted and aligned to the current user goal. Evidence: `docs/PRD-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-persistence-callback-extraction.md`
- [x] TECH_SPEC drafted with bounded scope, invariants, and validation plan. Evidence: `tasks/specs/1200-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-persistence-callback-extraction.md`
- [x] ACTION_PLAN drafted for implementation and closeout. Evidence: `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-persistence-callback-extraction.md`
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + .agent mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-persistence-callback-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-persistence-callback-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-persistence-callback-extraction.md`, `tasks/specs/1200-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-persistence-callback-extraction.md`, `tasks/tasks-1200-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-persistence-callback-extraction.md`, `.agent/task/1200-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-persistence-callback-extraction.md`
- [x] Deliberation/findings captured for the resume pre-start failure persistence callback seam. Evidence: `docs/findings/1200-orchestrator-resume-pre-start-failure-persistence-callback-extraction-deliberation.md`
- [x] `tasks/index.json` updated with the linked TECH_SPEC path. Evidence: `tasks/index.json`
- [x] `docs/docs-freshness-registry.json` updated for all new docs/task artifacts. Evidence: `docs/docs-freshness-registry.json`
- [x] `docs/TASKS.md` updated with the current snapshot and evidence. Evidence: `docs/TASKS.md`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1200-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-persistence-callback-extraction.md`, `docs/findings/1200-orchestrator-resume-pre-start-failure-persistence-callback-extraction-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1200`. Evidence: `out/1200-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-persistence-callback-extraction/manual/20260314T222320Z-docs-first/05-docs-review-override.md`

## Implementation

- [x] One bounded file-local helper owns the resume pre-start failure persistence callback behavior. Evidence: `orchestrator/src/cli/orchestrator.ts`, `out/1200-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-persistence-callback-extraction/manual/20260314T223708Z-closeout/00-summary.md`
- [x] `orchestrator.ts` no longer directly owns the inline resume `onStartFailure` callback body. Evidence: `orchestrator/src/cli/orchestrator.ts`, `out/1200-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-persistence-callback-extraction/manual/20260314T223708Z-closeout/00-summary.md`
- [x] Focused regressions preserve failed-status detail, forced persistence, and warning behavior. Evidence: `tests/cli-orchestrator.spec.ts`, `out/1200-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-persistence-callback-extraction/manual/20260314T223708Z-closeout/05b-targeted-tests.log`

## Validation & Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1200-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-persistence-callback-extraction/manual/20260314T223708Z-closeout/01-delegation-guard.log`
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1200-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-persistence-callback-extraction/manual/20260314T223708Z-closeout/02-spec-guard.log`
- [x] `npm run build`. Evidence: `out/1200-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-persistence-callback-extraction/manual/20260314T223708Z-closeout/03-build.log`
- [x] `npm run lint`. Evidence: `out/1200-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-persistence-callback-extraction/manual/20260314T223708Z-closeout/04-lint.log`
- [x] `npm run test`. Evidence: `out/1200-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-persistence-callback-extraction/manual/20260314T223708Z-closeout/05-test.log`
- [x] `npm run docs:check`. Evidence: `out/1200-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-persistence-callback-extraction/manual/20260314T223708Z-closeout/06-docs-check.log`
- [x] `npm run docs:freshness`. Evidence: `out/1200-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-persistence-callback-extraction/manual/20260314T223708Z-closeout/07-docs-freshness.log`
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1200-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-persistence-callback-extraction/manual/20260314T223708Z-closeout/08-diff-budget.log`
- [x] `npm run review`. Evidence: `out/1200-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-persistence-callback-extraction/manual/20260314T223708Z-closeout/09-review.log`
- [x] `npm run pack:smoke`. Evidence: `out/1200-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-persistence-callback-extraction/manual/20260314T223708Z-closeout/10-pack-smoke.log`
- [x] Elegance review completed. Evidence: `out/1200-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-persistence-callback-extraction/manual/20260314T223708Z-closeout/12-elegance-review.md`
