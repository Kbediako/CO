# Task Checklist - 1216-coordinator-symphony-aligned-standalone-review-meta-surface-boundary-analysis-extraction

- MCP Task ID: `1216-coordinator-symphony-aligned-standalone-review-meta-surface-boundary-analysis-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-meta-surface-boundary-analysis-extraction.md`
- TECH_SPEC: `tasks/specs/1216-coordinator-symphony-aligned-standalone-review-meta-surface-boundary-analysis-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-meta-surface-boundary-analysis-extraction.md`

## Docs-first

- [x] PRD drafted and aligned to the current user goal. Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-meta-surface-boundary-analysis-extraction.md`
- [x] TECH_SPEC drafted with bounded scope, invariants, and validation plan. Evidence: `tasks/specs/1216-coordinator-symphony-aligned-standalone-review-meta-surface-boundary-analysis-extraction.md`
- [x] ACTION_PLAN drafted for implementation and closeout. Evidence: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-meta-surface-boundary-analysis-extraction.md`
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + .agent mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-meta-surface-boundary-analysis-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-meta-surface-boundary-analysis-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-meta-surface-boundary-analysis-extraction.md`, `tasks/specs/1216-coordinator-symphony-aligned-standalone-review-meta-surface-boundary-analysis-extraction.md`, `tasks/tasks-1216-coordinator-symphony-aligned-standalone-review-meta-surface-boundary-analysis-extraction.md`, `.agent/task/1216-coordinator-symphony-aligned-standalone-review-meta-surface-boundary-analysis-extraction.md`
- [x] Deliberation/findings captured for the extraction lane. Evidence: `docs/findings/1216-standalone-review-meta-surface-boundary-analysis-extraction-deliberation.md`
- [x] `tasks/index.json` updated with the linked TECH_SPEC path. Evidence: `tasks/index.json`
- [x] `docs/docs-freshness-registry.json` updated for all new docs/task artifacts. Evidence: `docs/docs-freshness-registry.json`
- [x] `docs/TASKS.md` updated with the current snapshot and evidence. Evidence: `docs/TASKS.md`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1216-coordinator-symphony-aligned-standalone-review-meta-surface-boundary-analysis-extraction.md`, `docs/findings/1216-standalone-review-meta-surface-boundary-analysis-extraction-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1216`. Evidence: `out/1216-coordinator-symphony-aligned-standalone-review-meta-surface-boundary-analysis-extraction/manual/20260315T103449Z-docs-first/05-docs-review-override.md`

## Implementation

- [ ] Shared meta-surface boundary analyzer helpers extracted from `scripts/lib/review-execution-state.ts` into a bounded helper module without widening review-policy ownership. Evidence: shipped helper path plus the updated state consumer will be recorded in the closeout packet.
- [ ] Focused regressions prove the extracted meta-surface seam preserves startup-anchor progress, audit env rebinding detection, active closeout reread behavior, and helper-family `review-support` parity. Evidence: the shipped focused test set will be recorded in the closeout packet.

## Validation & Closeout

- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1216-coordinator-symphony-aligned-standalone-review-meta-surface-boundary-analysis-extraction/manual/<timestamp>-closeout/00-summary.md`
- [ ] `npm run docs:check`. Evidence: `out/1216-coordinator-symphony-aligned-standalone-review-meta-surface-boundary-analysis-extraction/manual/<timestamp>-closeout/00-summary.md`
- [ ] `npm run docs:freshness`. Evidence: `out/1216-coordinator-symphony-aligned-standalone-review-meta-surface-boundary-analysis-extraction/manual/<timestamp>-closeout/00-summary.md`
- [ ] Task-scoped `node scripts/delegation-guard.mjs` passed with manifest-backed delegation evidence. Evidence: `out/1216-coordinator-symphony-aligned-standalone-review-meta-surface-boundary-analysis-extraction/manual/<timestamp>-closeout/00-summary.md`
- [ ] `npm run build` passed on the shipped tree. Evidence: `out/1216-coordinator-symphony-aligned-standalone-review-meta-surface-boundary-analysis-extraction/manual/<timestamp>-closeout/00-summary.md`
- [ ] `npm run lint` passed on the shipped tree. Evidence: `out/1216-coordinator-symphony-aligned-standalone-review-meta-surface-boundary-analysis-extraction/manual/<timestamp>-closeout/00-summary.md`
- [ ] Focused meta-surface regressions passed. Evidence: `out/1216-coordinator-symphony-aligned-standalone-review-meta-surface-boundary-analysis-extraction/manual/<timestamp>-closeout/00-summary.md`
- [ ] Full validation lane passed on the shipped tree or the explicit override was recorded truthfully. Evidence: `out/1216-coordinator-symphony-aligned-standalone-review-meta-surface-boundary-analysis-extraction/manual/<timestamp>-closeout/13-override-notes.md`
- [ ] `node scripts/diff-budget.mjs` passed with explicit override only if required. Evidence: `out/1216-coordinator-symphony-aligned-standalone-review-meta-surface-boundary-analysis-extraction/manual/<timestamp>-closeout/13-override-notes.md`
- [ ] Bounded `npm run review` returned no findings or an explicit override was recorded truthfully. Evidence: `out/1216-coordinator-symphony-aligned-standalone-review-meta-surface-boundary-analysis-extraction/manual/<timestamp>-closeout/13-override-notes.md`
- [ ] `npm run pack:smoke` passed. Evidence: `out/1216-coordinator-symphony-aligned-standalone-review-meta-surface-boundary-analysis-extraction/manual/<timestamp>-closeout/00-summary.md`
- [ ] Elegance review completed. Evidence: `out/1216-coordinator-symphony-aligned-standalone-review-meta-surface-boundary-analysis-extraction/manual/<timestamp>-closeout/12-elegance-review.md`
- [ ] Closeout summary and explicit override notes recorded. Evidence: `out/1216-coordinator-symphony-aligned-standalone-review-meta-surface-boundary-analysis-extraction/manual/<timestamp>-closeout/00-summary.md`, `out/1216-coordinator-symphony-aligned-standalone-review-meta-surface-boundary-analysis-extraction/manual/<timestamp>-closeout/13-override-notes.md`
