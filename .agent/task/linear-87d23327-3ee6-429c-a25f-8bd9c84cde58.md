# Task Checklist - linear-87d23327-3ee6-429c-a25f-8bd9c84cde58

- Linear Issue: `CO-132` / `87d23327-3ee6-429c-a25f-8bd9c84cde58`
- MCP Task ID: `linear-87d23327-3ee6-429c-a25f-8bd9c84cde58`
- Primary PRD: `docs/PRD-linear-87d23327-3ee6-429c-a25f-8bd9c84cde58.md`
- TECH_SPEC: `tasks/specs/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-87d23327-3ee6-429c-a25f-8bd9c84cde58.md`

## Docs-First
- [x] PRD drafted for the broad repo test-lane stabilization/classification lane. Evidence: `docs/PRD-linear-87d23327-3ee6-429c-a25f-8bd9c84cde58.md`.
- [x] TECH_SPEC drafted with the bounded reproduction/classification/fix contract. Evidence: `tasks/specs/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58.md`, `docs/TECH_SPEC-linear-87d23327-3ee6-429c-a25f-8bd9c84cde58.md`.
- [x] ACTION_PLAN drafted for docs-review, fresh reproduction, implementation, validation, and handoff. Evidence: `docs/ACTION_PLAN-linear-87d23327-3ee6-429c-a25f-8bd9c84cde58.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry and review date. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] `docs/docs-freshness-registry.json` updated with the new packet entries. Evidence: `docs/docs-freshness-registry.json`.
- [x] Checklist mirrored to `.agent/task/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58.md`. Evidence: `.agent/task/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58.md`.
- [x] Pre-implementation issue-quality review is captured in the spec packet. Evidence: `tasks/specs/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58.md`.
- [x] docs-review approval captured for `linear-87d23327-3ee6-429c-a25f-8bd9c84cde58` via explicit fallback. Evidence: `.runs/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58-co-132-docs-review-rework/cli/2026-04-10T06-58-57-866Z-f78281ef/manifest.json`, `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T065901Z-docs-review-fallback.md`, `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T072053Z-post-merge-validation/07-docs-freshness.log`.

## Workflow
- [x] Issue is in the live started-state family (`Rework`) before active coding. Evidence: `linear issue-context` on 2026-04-10 reported state `Rework`.
- [x] The required turn-level parallelization decision was recorded for this turn. Evidence: provider-worker `parallelization` = `forbid_parallel` / `parent_only_mutation` on 2026-04-10.
- [x] Detached workspace is on a dedicated issue branch reset and then merged forward to current `origin/main`. Evidence: `linear/co-132-timeout-test-lane-truth` at `8b64f436f`.
- [x] Exactly one persistent `## Codex Workpad` comment is kept current on the issue. Evidence: refreshed Linear workpad plus local source `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/workpad.md`.
- [x] Prior rework artifacts were retired before the new attempt. Evidence: PR `#400` is closed and the prior workpad was removed before the fresh upsert.

## Investigation
- [x] Source blocker evidence from `CO-94` is captured in this packet. Evidence: `/Users/kbediako/Code/CO/.runs/linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d/cli/2026-04-09T08-36-05-967Z-014680f3/provider-linear-worker-proof.json`, `/Users/kbediako/Code/CO/.runs/linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d/cli/2026-04-09T08-36-05-967Z-014680f3/provider-linear-issue-context-cache.json`.
- [x] Adjacent prior lanes were reviewed so this issue stays narrower than a generic historical hang rehash. Evidence: `docs/PRD-linear-723139d4-2d01-4022-aa09-e88bda7dfd89.md`, `docs/PRD-linear-1e1a879a-42d2-4321-9a43-3ecc0ee7ce60.md`, `docs/PRD-linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955.md`.
- [x] The prior closed `CO-132` attempt is preserved as historical comparison context only. Evidence: closed PR `#400`, local artifacts under `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/`.
- [x] Fresh current-tree full-lane evidence is captured with exact classification on merged head `8b64f436f`. Evidence: `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T070100Z-baseline-repro/01-npm-test.log`, `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T070100Z-baseline-repro/02-npm-test-postfix.log`, `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T072053Z-post-merge-validation/05-test.log`.
- [x] The smallest owner seam is identified truthfully on current head. Evidence: `orchestrator/tests/CodexOrchestratorCli.test.ts`, `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T070100Z-baseline-repro/01-npm-test.log`, `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T072053Z-post-merge-validation/05-test.log`.

## Implementation
- [x] Smallest truthful outcome is landed for current head. Evidence: `orchestrator/tests/CodexOrchestratorCli.test.ts`.
- [x] Focused regressions or deterministic evidence cover the chosen owner seam. Evidence: `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T070100Z-baseline-repro/02-npm-test-postfix.log`, `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T072053Z-post-merge-validation/05-test.log`.

## Validation
- [x] `linear child-stream --pipeline docs-review` finished with explicit fallback recorded truthfully for this packet. Evidence: `.runs/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58-co-132-docs-review-rework/cli/2026-04-10T06-58-57-866Z-f78281ef/manifest.json`, `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T065901Z-docs-review-fallback.md`.
- [x] Fresh broad-lane repro or exact environment-sensitive blocker record is captured under `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/`. Evidence: `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T070100Z-baseline-repro/01-npm-test.log`, `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T070100Z-baseline-repro/02-npm-test-postfix.log`, `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T072053Z-post-merge-validation/05-test.log`.
- [x] Required validation commands pass or exact remaining blockers are recorded truthfully for the final diff. Evidence: `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T072053Z-post-merge-validation/01-delegation-guard.log`, `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T072053Z-post-merge-validation/02-spec-guard.log`, `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T072053Z-post-merge-validation/03-build.log`, `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T072053Z-post-merge-validation/04-lint.log`, `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T072053Z-post-merge-validation/05-test.log`, `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T072053Z-post-merge-validation/06a-docs-archive-tasks.log`, `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T072053Z-post-merge-validation/06-docs-check-rerun.log`, `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T072053Z-post-merge-validation/07-docs-freshness.log`, `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T072053Z-post-merge-validation/08-diff-budget.log`.
- [x] Standalone review plus explicit elegance review are captured before any review handoff if the final diff is non-trivial. Evidence: `.runs/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/cli/2026-04-10T06-48-54-933Z-397abe26/review/telemetry.json`, `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T072053Z-post-merge-validation/10-elegance-review.md`.

## Handoff
- [x] Workpad refreshed after docs, after reproduction/classification, after implementation, and immediately before any review or merge handoff. Evidence: `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/workpad.md`.
- [ ] Replacement PR attached to the Linear issue before any review-state transition. Evidence: pending.
- [x] Latest `origin/main` merged into the branch before review-state transition. Evidence: `git rev-parse HEAD` = `8b64f436f`.
- [ ] PR checks green and actionable review feedback handled or explicitly pushed back before review-state transition. Evidence: pending.
- [x] Issue remains active until review handoff prerequisites are complete. Evidence: issue state is currently `Rework`.
