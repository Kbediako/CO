# Task Checklist - linear-87d23327-3ee6-429c-a25f-8bd9c84cde58

- Linear Issue: `CO-132` / `87d23327-3ee6-429c-a25f-8bd9c84cde58`
- MCP Task ID: `linear-87d23327-3ee6-429c-a25f-8bd9c84cde58`
- Primary PRD: `docs/PRD-linear-87d23327-3ee6-429c-a25f-8bd9c84cde58.md`
- TECH_SPEC: `tasks/specs/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-87d23327-3ee6-429c-a25f-8bd9c84cde58.md`

## Docs-First
- [x] PRD drafted for the broad repo test-lane stabilization and classification lane. Evidence: `docs/PRD-linear-87d23327-3ee6-429c-a25f-8bd9c84cde58.md`.
- [x] TECH_SPEC drafted with the bounded reproduction, classification, and fix contract. Evidence: `tasks/specs/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58.md`, `docs/TECH_SPEC-linear-87d23327-3ee6-429c-a25f-8bd9c84cde58.md`.
- [x] ACTION_PLAN drafted and refreshed with the actual evidence path. Evidence: `docs/ACTION_PLAN-linear-87d23327-3ee6-429c-a25f-8bd9c84cde58.md`.
- [x] `tasks/index.json` updated with the CO-132 spec entry and truthful docs-review fallback. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the current CO-132 snapshot. Evidence: `docs/TASKS.md`.
- [x] `docs/docs-freshness-registry.json` still contains the CO-132 packet entries. Evidence: `docs/docs-freshness-registry.json`.
- [x] Checklist mirrored to `.agent/task/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58.md`. Evidence: `.agent/task/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58.md`.
- [x] Pre-implementation issue-quality review remains captured in the spec packet. Evidence: `tasks/specs/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58.md`.
- [x] docs-review approval is captured via truthful fallback. Evidence: `.runs/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58-co-132-docs-review-rework/cli/2026-04-10T06-58-57-866Z-f78281ef/manifest.json`, `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T065901Z-docs-review-fallback.md`, `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T075554Z-closeout-validation/05-docs-check.log`, `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T075554Z-closeout-validation/06-docs-freshness.log`.

## Workflow
- [x] Issue remains in the live started-state family while active work continues. Evidence: `linear issue-context` on 2026-04-10 currently reports state `In Progress`.
- [x] The required turn-level parallelization decision was recorded as `forbid_parallel` / `parent_only_mutation`. Evidence: provider-worker `parallelization` on 2026-04-10.
- [x] Workspace remains on the dedicated issue branch `linear/co-132-timeout-test-lane-truth`, now merged with latest `origin/main`. Evidence: `git log --oneline --decorate -4`.
- [x] Exactly one persistent `## Codex Workpad` comment exists on the issue and is current. Evidence: local source `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/workpad.md`, Linear comment `6b7340b8-8a70-4e2a-b065-3d6e250d624e`.
- [x] Prior rework artifacts were retired before this attempt. Evidence: PR `#400` is closed.

## Investigation
- [x] Source blocker evidence from `CO-94` is captured in this packet. Evidence: `/Users/kbediako/Code/CO/.runs/linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d/cli/2026-04-09T08-36-05-967Z-014680f3/provider-linear-worker-proof.json`, `/Users/kbediako/Code/CO/.runs/linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d/cli/2026-04-09T08-36-05-967Z-014680f3/provider-linear-issue-context-cache.json`.
- [x] The prior closed `CO-132` attempt is preserved as historical comparison only. Evidence: closed PR `#400`, packet references in the PRD and TECH_SPEC.
- [x] Fresh broad-lane evidence was recollected and classified. Evidence: `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T070659Z-baseline-repro/01-npm-test-run-1.log`, `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T070659Z-baseline-repro/02-run-review-isolated.log`, `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T070659Z-baseline-repro/03-cli-command-surface-isolated.log`, `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T070659Z-baseline-repro/04-four-red-suites.log`, `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T070659Z-baseline-repro/05b-npm-test-maxworkers4-min1.log`.
- [x] The smallest owner seam is identified truthfully. Evidence: `vitest.config.core.ts`, `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/tests/ProviderIssueHandoff.test.ts`, `tests/vitest-progress-config.spec.ts`, `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T070659Z-baseline-repro/09-manual-review-and-elegance-fallback.md`.

## Implementation
- [x] The broad-lane worker cap is limited to `CI` and stage-owned `CODEX_VITEST_PROGRESS` runs rather than all non-interactive runs. Evidence: `vitest.config.core.ts`, `tests/vitest-progress-config.spec.ts`.
- [x] Provider-handoff timer-sensitive tests now assert against local scheduler injection instead of ambient global timer noise. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/tests/ProviderIssueHandoff.test.ts`.
- [x] The final broad lane passes with the current code path. Evidence: `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T070659Z-baseline-repro/06-targeted-after-fix.log`, `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T070659Z-baseline-repro/08-npm-test-after-review-scope-fix.log`.

## Validation
- [x] `linear child-stream --pipeline docs-review` finished with truthful fallback recorded for this packet. Evidence: `.runs/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58-co-132-docs-review-rework/cli/2026-04-10T06-58-57-866Z-f78281ef/manifest.json`, `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T065901Z-docs-review-fallback.md`.
- [x] Current post-main-merge validation bundle is green. Evidence: `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T081428Z-post-main-merge-validation/01-delegation-guard.log`, `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T081428Z-post-main-merge-validation/02-spec-guard.log`, `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T081428Z-post-main-merge-validation/03-build.log`, `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T081428Z-post-main-merge-validation/04-lint.log`, `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T081428Z-post-main-merge-validation/05-test.log`, `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T081428Z-post-main-merge-validation/06-docs-check.log`, `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T081428Z-post-main-merge-validation/07-docs-freshness.log`, `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T081428Z-post-main-merge-validation/08-diff-budget.log`.
- [x] Full broad-lane proof remains green after merging latest `origin/main`. Evidence: `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T081428Z-post-main-merge-validation/05-test.log`.
- [x] Manifest-backed standalone review was attempted and classified truthfully as a boundary failure. Evidence: `.runs/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/cli/2026-04-10T06-49-37-271Z-acbe6566/review/telemetry.json`.
- [x] Manual correctness, regressions, and elegance review were recorded instead of stalling on wrapper retry. Evidence: `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T070659Z-baseline-repro/09-manual-review-and-elegance-fallback.md`.

## Handoff
- [x] Workpad source and live Linear comment are refreshed to match the current classification, validation bundle, and review fallback. Evidence: `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/workpad.md`, `https://linear.app/asabeko/issue/CO-132/stabilize-broad-timeout-heavy-repo-test-lane-so-unrelated-failures#comment-6b7340b8`.
- [x] Replacement PR is attached to the Linear issue before any review-state transition. Evidence: `https://github.com/Kbediako/CO/pull/410`.
- [ ] `pr ready-review` drain completed cleanly on the replacement PR. Evidence: pending.
- [ ] PR checks are green and actionable review feedback is handled or explicitly pushed back before review-state transition. Evidence: pending.
- [x] Issue remains active until handoff prerequisites are complete. Evidence: issue state is currently `In Progress`.
