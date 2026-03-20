# Task Checklist - 1308-coordinator-live-provider-child-run-cli-command-surface-subprocess-completion-follow-up

- MCP Task ID: `1308-coordinator-live-provider-child-run-cli-command-surface-subprocess-completion-follow-up`
- Primary PRD: `docs/PRD-coordinator-live-provider-child-run-cli-command-surface-subprocess-completion-follow-up.md`
- TECH_SPEC: `tasks/specs/1308-coordinator-live-provider-child-run-cli-command-surface-subprocess-completion-follow-up.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-live-provider-child-run-cli-command-surface-subprocess-completion-follow-up.md`

## Docs-First
- [x] PRD drafted for the post-`1307` command-surface completion reassessment. Evidence: `docs/PRD-coordinator-live-provider-child-run-cli-command-surface-subprocess-completion-follow-up.md`.
- [x] TECH_SPEC drafted with the patience-first validation plan and live rerun requirement. Evidence: `tasks/specs/1308-coordinator-live-provider-child-run-cli-command-surface-subprocess-completion-follow-up.md`.
- [x] ACTION_PLAN drafted for the follow-up lane. Evidence: `docs/ACTION_PLAN-coordinator-live-provider-child-run-cli-command-surface-subprocess-completion-follow-up.md`.
- [x] Deliberation/findings captured for the bounded post-`1307` reassessment. Evidence: `docs/findings/1308-live-provider-child-run-cli-command-surface-subprocess-completion-follow-up-deliberation.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry and review date. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot and truthful predecessor wording. Evidence: `docs/TASKS.md`.
- [x] Checklist mirrored to `.agent/task/1308-coordinator-live-provider-child-run-cli-command-surface-subprocess-completion-follow-up.md`. Evidence: `.agent/task/1308-coordinator-live-provider-child-run-cli-command-surface-subprocess-completion-follow-up.md`.
- [x] `docs/docs-freshness-registry.json` updated for the new docs/task artifacts. Evidence: `docs/docs-freshness-registry.json`.
- [x] Delegation scout run captured for the registered `1308` task id. Evidence: `.runs/1308-coordinator-live-provider-child-run-cli-command-surface-subprocess-completion-follow-up-scout/cli/2026-03-19T23-20-19-325Z-af4c531a/manifest.json`.
- [x] docs-review approval captured for registered `1308`. Evidence: `.runs/1308-coordinator-live-provider-child-run-cli-command-surface-subprocess-completion-follow-up-docs-rerun/cli/2026-03-19T23-44-17-826Z-d4c5ecb0/manifest.json`.

## Implementation
- [x] Focused `tests/cli-command-surface.spec.ts` remeasurement shows the suspected blocker is terminal, not a proven hang (`100/100` tests, `297.91s`). Evidence: current-turn focused Vitest rerun.
- [x] Current-tree runtime-env override precedence remains intact after the stacked `1307` patch set. Evidence: `out/1308-coordinator-live-provider-child-run-cli-command-surface-subprocess-completion-follow-up/manual/20260320T001529Z-live-provider-rerun-closeout/00-summary.md`.
- [x] Full `npm run test` returns terminally on the implementation tree. Evidence: `out/1308-coordinator-live-provider-child-run-cli-command-surface-subprocess-completion-follow-up/manual/20260320T001529Z-live-provider-rerun-closeout/00-summary.md`.
- [x] Live provider rerun recorded the next exact blocker after getting beyond `delegation-guard`: the resumed child run terminated `stage:test:failed` with `8` failures in `tests/delegation-guard.spec.ts`, while `05-spec-guard` stayed pending. Evidence: `out/1308-coordinator-live-provider-child-run-cli-command-surface-subprocess-completion-follow-up/manual/20260320T001529Z-live-provider-rerun-closeout/13-live-rerun-evidence.md`.

## Validation
- [x] Focused `npx vitest run --config vitest.config.core.ts tests/cli-command-surface.spec.ts`. Evidence: current-turn focused Vitest rerun (`100/100` tests, `297.91s`).
- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1308-coordinator-live-provider-child-run-cli-command-surface-subprocess-completion-follow-up/manual/20260320T001529Z-live-provider-rerun-closeout/00-summary.md`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1308-coordinator-live-provider-child-run-cli-command-surface-subprocess-completion-follow-up/manual/20260320T001529Z-live-provider-rerun-closeout/00-summary.md`.
- [x] `npm run build`. Evidence: `out/1308-coordinator-live-provider-child-run-cli-command-surface-subprocess-completion-follow-up/manual/20260320T001529Z-live-provider-rerun-closeout/00-summary.md`.
- [x] `npm run lint`. Evidence: `out/1308-coordinator-live-provider-child-run-cli-command-surface-subprocess-completion-follow-up/manual/20260320T001529Z-live-provider-rerun-closeout/00-summary.md`.
- [x] `npm run test`. Evidence: `out/1308-coordinator-live-provider-child-run-cli-command-surface-subprocess-completion-follow-up/manual/20260320T001529Z-live-provider-rerun-closeout/00-summary.md`.
- [x] `npm run docs:check`. Evidence: `out/1308-coordinator-live-provider-child-run-cli-command-surface-subprocess-completion-follow-up/manual/20260320T001529Z-live-provider-rerun-closeout/00-summary.md`.
- [x] `npm run docs:freshness`. Evidence: `out/1308-coordinator-live-provider-child-run-cli-command-surface-subprocess-completion-follow-up/manual/20260320T001529Z-live-provider-rerun-closeout/00-summary.md`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1308-coordinator-live-provider-child-run-cli-command-surface-subprocess-completion-follow-up/manual/20260320T001529Z-live-provider-rerun-closeout/00-summary.md`.
- [x] `npm run review` executed and produced manifest-backed evidence, but the wrapper terminated at the bounded relevant-reinspection dwell boundary without concrete findings. Evidence: `.runs/1308-coordinator-live-provider-child-run-cli-command-surface-subprocess-completion-follow-up-docs-rerun/cli/2026-03-19T23-44-17-826Z-d4c5ecb0/review/output.log`, `.runs/1308-coordinator-live-provider-child-run-cli-command-surface-subprocess-completion-follow-up-docs-rerun/cli/2026-03-19T23-44-17-826Z-d4c5ecb0/review/telemetry.json`.
- [x] `npm run pack:smoke`. Evidence: `out/1308-coordinator-live-provider-child-run-cli-command-surface-subprocess-completion-follow-up/manual/20260320T001529Z-live-provider-rerun-closeout/00-summary.md`.
- [x] Explicit elegance review pass recorded. Evidence: `out/1308-coordinator-live-provider-child-run-cli-command-surface-subprocess-completion-follow-up/manual/20260320T001529Z-live-provider-rerun-closeout/12-elegance-review.md`.
- [ ] Unresolved actionable review threads verified as `0`, or waiver recorded with evidence, before merge. Evidence: pending PR closeout.
