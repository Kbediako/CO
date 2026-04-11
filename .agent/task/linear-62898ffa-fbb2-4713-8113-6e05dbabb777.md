# Task Checklist - linear-62898ffa-fbb2-4713-8113-6e05dbabb777

- Linear Issue: `CO-150` / `62898ffa-fbb2-4713-8113-6e05dbabb777`
- MCP Task ID: `linear-62898ffa-fbb2-4713-8113-6e05dbabb777`
- Primary PRD: `docs/PRD-linear-62898ffa-fbb2-4713-8113-6e05dbabb777.md`
- TECH_SPEC: `docs/TECH_SPEC-linear-62898ffa-fbb2-4713-8113-6e05dbabb777.md`
- Task spec: `tasks/specs/linear-62898ffa-fbb2-4713-8113-6e05dbabb777.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-62898ffa-fbb2-4713-8113-6e05dbabb777.md`

## Docs-First
- [x] PRD, TECH_SPEC, ACTION_PLAN, task spec, task checklist, `.agent` mirror, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, and saved workpad source were drafted for `CO-150`. Evidence: `docs/PRD-linear-62898ffa-fbb2-4713-8113-6e05dbabb777.md`, `docs/TECH_SPEC-linear-62898ffa-fbb2-4713-8113-6e05dbabb777.md`, `docs/ACTION_PLAN-linear-62898ffa-fbb2-4713-8113-6e05dbabb777.md`, `tasks/specs/linear-62898ffa-fbb2-4713-8113-6e05dbabb777.md`, `tasks/tasks-linear-62898ffa-fbb2-4713-8113-6e05dbabb777.md`, `.agent/task/linear-62898ffa-fbb2-4713-8113-6e05dbabb777.md`, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, `out/linear-62898ffa-fbb2-4713-8113-6e05dbabb777/manual/workpad.md`.
- [x] Standalone pre-implementation self-review notes captured in the task spec before coding. Evidence: `tasks/specs/linear-62898ffa-fbb2-4713-8113-6e05dbabb777.md`.
- [x] Docs-review approval captured for this task, or a truthful fallback recorded if the child stream stops on an existing repo baseline. Evidence: first docs-review manifest `.runs/linear-62898ffa-fbb2-4713-8113-6e05dbabb777-co-150-docs-review/cli/2026-04-11T03-40-15-301Z-c81a3eba/manifest.json` found P2 packet fixes; clean rerun manifest `.runs/linear-62898ffa-fbb2-4713-8113-6e05dbabb777-co-150-docs-review-r2/cli/2026-04-11T03-47-09-381Z-eee21cae/manifest.json` recorded `review_outcome: clean-success`.

## Workflow
- [x] Issue moved from `Ready` to the live started state `In Progress` before active coding. Evidence: packaged `linear transition` on `2026-04-11`.
- [x] Exactly one persistent `## Codex Workpad` comment is kept current on the issue. Evidence: `out/linear-62898ffa-fbb2-4713-8113-6e05dbabb777/manual/workpad.md`, packaged `linear upsert-workpad`.
- [x] Exactly one explicit same-turn parallelization decision was recorded. Evidence: packaged `linear parallelization` recorded `stay_serial` / `single_bounded_change`.
- [x] Workspace moved from detached `HEAD` onto a task branch based on current `origin/main`. Evidence: branch `linear-62898ffa-fbb2-4713-8113-6e05dbabb777`, initially `345af4dd2`, then rebased onto `origin/main` `6d7ab74f8`.

## Investigation
- [x] Fresh current-main reproduction captures the exact failing test case and assertion context. Evidence: no matching failure reproduced after rebasing onto `origin/main` `6d7ab74f8`; focused snapshot-only `Todo` subset, full `ProviderIssueHandoff` file, and full `npm run test` all passed.
- [x] Owning retry scheduling cause is identified with source/test evidence. Evidence: no live production retry scheduling bug is implicated at current HEAD; the issue-reported non-terminal `continues...` anchor is stale, current non-terminal source anchor is `releases...` around line 6686, and later Core Lane evidence isolated nearby queued-retry test-harness timer dispatch races.
- [x] The lane remains separate from `CO-128` frontend-test bootstrap work. Evidence: `docs/PRD-linear-62898ffa-fbb2-4713-8113-6e05dbabb777.md`.

## Implementation
- [x] Smallest responsible code or validation-contract change is applied at the owning retry seam. Evidence: no production retry code change was made for the issue-reported snapshot-only `Todo` surface; the bounded code delta stabilizes nearby queued-retry overlap tests by advancing Vitest's fake timer clock synchronously.
- [x] Focused regression or assertion proof covers the snapshot-only `Todo` retry/non-terminal blocker path and nearby queued retry timer dispatch seam. Evidence: `out/linear-62898ffa-fbb2-4713-8113-6e05dbabb777/manual/20260411T0412Z-focused-snapshot-todo-repro-post-rebase.log`, `out/linear-62898ffa-fbb2-4713-8113-6e05dbabb777/manual/20260411T0412Z-provider-handoff-file-repro-post-rebase.log`, `out/linear-62898ffa-fbb2-4713-8113-6e05dbabb777/manual/20260411T0442Z-focused-refresh-lock-after-patch.log`, `out/linear-62898ffa-fbb2-4713-8113-6e05dbabb777/manual/20260411T0501Z-focused-rehydrate-ownership-after-patch.log`, and `out/linear-62898ffa-fbb2-4713-8113-6e05dbabb777/manual/20260411T0501Z-provider-handoff-file-after-second-patch.log`.

## Validation
- [x] Focused `ProviderIssueHandoff` test path passes after the repair or contract update. Evidence: `out/linear-62898ffa-fbb2-4713-8113-6e05dbabb777/manual/20260411T0412Z-focused-snapshot-todo-repro-post-rebase.log`, `out/linear-62898ffa-fbb2-4713-8113-6e05dbabb777/manual/20260411T0412Z-provider-handoff-file-repro-post-rebase.log`, `out/linear-62898ffa-fbb2-4713-8113-6e05dbabb777/manual/20260411T0442Z-focused-refresh-lock-after-patch.log`, `out/linear-62898ffa-fbb2-4713-8113-6e05dbabb777/manual/20260411T0501Z-focused-rehydrate-ownership-after-patch.log`, and `out/linear-62898ffa-fbb2-4713-8113-6e05dbabb777/manual/20260411T0501Z-provider-handoff-file-after-second-patch.log`.
- [x] Repo-wide `npm run test` passes cleanly or a specific repo-owned validation contract is documented. Evidence: `out/linear-62898ffa-fbb2-4713-8113-6e05dbabb777/manual/20260411T0413Z-npm-run-test-post-rebase.log` reports `328` files and `3494` tests passed; `out/linear-62898ffa-fbb2-4713-8113-6e05dbabb777/manual/20260411T0440Z-npm-test-ci-node20-after-core-failure.log` reports the Node 20 CI-mode suite passed after the test-harness stabilization.
- [x] Standard validation floor runs before review handoff for a non-trivial diff. Evidence: post-rebase logs under `out/linear-62898ffa-fbb2-4713-8113-6e05dbabb777/manual/20260411T0417Z-post-rebase-*`, `20260411T0418Z-post-rebase-*`, `20260411T0413Z-npm-run-test-post-rebase.log`, and test-patch logs `20260411T0443Z-test-patch-*` / `20260411T0444Z-test-patch-*`.
- [x] Standalone review and explicit elegance/minimality pass complete before handoff. Evidence: `out/linear-62898ffa-fbb2-4713-8113-6e05dbabb777/manual/20260411T0420Z-standalone-review-final.log`, review telemetry `.runs/linear-62898ffa-fbb2-4713-8113-6e05dbabb777/cli/2026-04-11T03-33-21-295Z-51d47db3/review/telemetry.json`, `out/linear-62898ffa-fbb2-4713-8113-6e05dbabb777/manual/20260411T0424Z-elegance-review.md`, `out/linear-62898ffa-fbb2-4713-8113-6e05dbabb777/manual/20260411T0445Z-standalone-review-test-patch.log`, and `out/linear-62898ffa-fbb2-4713-8113-6e05dbabb777/manual/20260411T0447Z-elegance-review-test-patch.md`.

## Handoff
- [ ] Workpad refreshed after docs, reproduction, implementation, validation, and immediately before review handoff. Evidence: pending final handoff refresh.
- [x] PR attached to the Linear issue before review-state transition. Evidence: PR #437 attachment id `f6e2199b-c018-4e8b-a055-34c97eb08750`.
- [x] Latest `origin/main` merged into the branch before review-state transition. Evidence: branch rebased onto `origin/main` `6d7ab74f8`.
- [ ] PR checks are green, actionable review feedback is handled or explicitly pushed back, `pr ready-review` drains cleanly, and the issue moves to `In Review` only after coding stops. Evidence: pending.
