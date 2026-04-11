# Task Checklist - linear-87d23327-3ee6-429c-a25f-8bd9c84cde58

- Linear Issue: `CO-132` / `87d23327-3ee6-429c-a25f-8bd9c84cde58`
- MCP Task ID: `linear-87d23327-3ee6-429c-a25f-8bd9c84cde58`
- Primary PRD: `docs/PRD-linear-87d23327-3ee6-429c-a25f-8bd9c84cde58.md`
- TECH_SPEC: `tasks/specs/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-87d23327-3ee6-429c-a25f-8bd9c84cde58.md`

## Docs-First
- [x] PRD drafted for the broad repo test-lane stabilization and classification lane. Evidence: `docs/PRD-linear-87d23327-3ee6-429c-a25f-8bd9c84cde58.md`.
- [x] TECH_SPEC drafted with the bounded reproduction, classification, and fix contract. Evidence: `tasks/specs/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58.md`, `docs/TECH_SPEC-linear-87d23327-3ee6-429c-a25f-8bd9c84cde58.md`.
- [x] ACTION_PLAN drafted for the reset attempt. Evidence: `docs/ACTION_PLAN-linear-87d23327-3ee6-429c-a25f-8bd9c84cde58.md`.
- [x] `tasks/index.json` updated with the `CO-132` spec entry. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the current `CO-132` snapshot. Evidence: `docs/TASKS.md`.
- [x] `docs/docs-freshness-registry.json` contains the `CO-132` packet entries. Evidence: `docs/docs-freshness-registry.json`.
- [x] Checklist mirrored to `.agent/task/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58.md`. Evidence: `.agent/task/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58.md`.
- [x] Pre-implementation issue-quality review is captured in the spec packet. Evidence: `tasks/specs/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58.md`.
- [x] docs-review approval is captured via child-stream evidence. Evidence: `.runs/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58-co-132-docs-review-rework/cli/2026-04-10T10-06-08-744Z-b3959672/manifest.json`, `.runs/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58-co-132-docs-review-rework/cli/2026-04-10T10-06-08-744Z-b3959672/review/telemetry.json`.

## Workflow
- [x] Live issue workflow states were rechecked with `linear issue-context`, and the active state is `Rework`. Evidence: `linear issue-context`.
- [x] The required turn-level parallelization decision was recorded as `forbid_parallel` / `parent_only_mutation`. Evidence: provider-worker `linear parallelization` on 2026-04-10.
- [x] Prior rework artifacts were retired before this attempt. Evidence: PR `#410` is closed and the prior workpad comment was deleted.
- [x] Workspace reset to the dedicated issue branch `linear/co-132-timeout-test-lane-truth` on fresh `origin/main`, with the old attempt preserved on `backup/linear-co-132-rework-20260410T095713Z`. Evidence: `git status --short --branch`, `git branch backup/linear-co-132-rework-20260410T095713Z`.
- [x] Exactly one persistent `## Codex Workpad` comment exists on the issue and is current. Evidence: `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/workpad.md`, Linear comment `0ca2619d-4145-457d-b094-12e4ad1bdb55`.

## Investigation
- [x] Source blocker evidence from `CO-94` is captured in this packet. Evidence: `/Users/kbediako/Code/CO/.runs/linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d/cli/2026-04-09T08-36-05-967Z-014680f3/provider-linear-worker-proof.json`, `/Users/kbediako/Code/CO/.runs/linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d/cli/2026-04-09T08-36-05-967Z-014680f3/provider-linear-issue-context-cache.json`.
- [x] Prior `CO-132` attempts are preserved only for historical comparison. Evidence: closed PR `#400`, closed PR `#410`, and backup ref `backup/linear-co-132-rework-20260410T095713Z`.
- [x] Fresh broad-lane evidence is recollected and classified on the reset branch. Evidence: `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T101130Z-reset-baseline-repro/01-npm-test-run-1.log`, `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T101130Z-closeout-validation/05-test.log`, and `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T101130Z-closeout-validation/06-test-maxworkers4-min1.log`.
- [x] The smallest truthful owner seam is identified. Evidence: the live timeout family narrowed to `tests/cli-command-surface.spec.ts` and `tests/cli-frontend-test.spec.ts` on uncapped broad-lane runs, while the capped rerun and post-fix broad lane passed; see `docs/PRD-linear-87d23327-3ee6-429c-a25f-8bd9c84cde58.md`, `docs/TECH_SPEC-linear-87d23327-3ee6-429c-a25f-8bd9c84cde58.md`, and the manual logs above.

## Implementation
- [x] A bounded shared fix is landed in the proven owner seam. Evidence: `vitest.config.core.ts` caps workers only for `CI` and `CODEX_VITEST_PROGRESS`.
- [x] Focused regressions cover the new config contract. Evidence: `tests/vitest-progress-config.spec.ts`, `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T101130Z-post-fix-validation/00-targeted-config.log`.
- [x] The docs-review child-stream finding is resolved. Evidence: `docs/TASKS-archive-2026.md` restores snapshot `0991`.
- [x] The packet and workpad classify the uncapped failure family and the final fix. Evidence: `docs/PRD-linear-87d23327-3ee6-429c-a25f-8bd9c84cde58.md`, `docs/TECH_SPEC-linear-87d23327-3ee6-429c-a25f-8bd9c84cde58.md`, `docs/ACTION_PLAN-linear-87d23327-3ee6-429c-a25f-8bd9c84cde58.md`, `tasks/tasks-linear-87d23327-3ee6-429c-a25f-8bd9c84cde58.md`, `.agent/task/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58.md`, and `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/workpad.md`.

## Validation
- [x] `linear child-stream --pipeline docs-review` finished with evidence recorded for this packet. Evidence: `.runs/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58-co-132-docs-review-rework/cli/2026-04-10T10-06-08-744Z-b3959672/manifest.json`, `.runs/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58-co-132-docs-review-rework/cli/2026-04-10T10-06-08-744Z-b3959672/review/telemetry.json`.
- [x] Fresh reproduction artifacts are captured under `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/`. Evidence: `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T101130Z-reset-baseline-repro/01-npm-test-run-1.log`, `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T101130Z-closeout-validation/05-test.log`, `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T101130Z-closeout-validation/06-test-maxworkers4-min1.log`, `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T101130Z-post-fix-validation/05-test.log`.
- [x] Required repo validation floor is green on the merged handoff branch. Evidence: `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T101130Z-post-merge-validation/01-delegation-guard.log`, `02-spec-guard.log`, `03-build.log`, `04-lint.log`, `05-test.log`, `06-docs-check.log`, `07-docs-freshness.log`, `08-diff-budget.log`.
- [x] Standalone review and explicit elegance review are recorded truthfully for this branch. Evidence: review wrapper telemetry `.runs/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/cli/2026-04-10T09-55-26-495Z-4594022e/review/telemetry.json` (`review_outcome: failed-boundary`, `termination_boundary.kind=command-intent`), manual fallback `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T101130Z-post-merge-validation/10-manual-review-fallback.md`, elegance note `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T101130Z-post-merge-validation/11-elegance-review.md`.

## Handoff
- [ ] Replacement PR is attached to the Linear issue before any review-state transition. Evidence: pending.
- [ ] `pr ready-review` drain completed cleanly on the replacement PR. Evidence: pending.
- [ ] PR checks are green and actionable review feedback is handled or explicitly pushed back before review-state transition. Evidence: pending.
- [ ] Issue remains active until handoff prerequisites are complete. Evidence: pending.
