# Task Checklist - linear-abca2add-198d-40a6-b1c0-35e49f4c78cd

- Linear Issue: `CO-164` / `abca2add-198d-40a6-b1c0-35e49f4c78cd`
- MCP Task ID: `linear-abca2add-198d-40a6-b1c0-35e49f4c78cd`
- Primary PRD: `docs/PRD-linear-abca2add-198d-40a6-b1c0-35e49f4c78cd.md`
- TECH_SPEC: `tasks/specs/linear-abca2add-198d-40a6-b1c0-35e49f4c78cd.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-abca2add-198d-40a6-b1c0-35e49f4c78cd.md`

## Docs
- [x] Live Linear workflow states were rechecked before implementation. Evidence: `linear issue-context --issue-id abca2add-198d-40a6-b1c0-35e49f4c78cd`.
- [x] Issue was moved into the team's actual started state before resumed active work. Evidence: `linear issue-context` returned `state.name = Ready` after blocker `CO-165` reached `Done`, then `linear transition --state "In Progress"` moved `CO-164` back into the live started state.
- [x] Required same-turn parallelization decision recorded. Evidence: `linear parallelization --decision stay_serial --reason single_bounded_change`.
- [x] Exactly one persistent Linear workpad comment is current. Evidence: `linear upsert-workpad --issue-id abca2add-198d-40a6-b1c0-35e49f4c78cd --body-file out/linear-abca2add-198d-40a6-b1c0-35e49f4c78cd/manual/workpad.md` updated comment `0f3f8fa7-825c-4e74-a005-745c33992419`.
- [x] Workspace is already on the CO-164 branch before repo edits. Evidence: `git status --short --branch` returned `## linear/co-164-narrow-generic-forced-cleanup-collateral`.
- [x] Docs packet created and mirrored in `docs/`, `tasks/`, `.agent/`, `tasks/index.json`, and `docs/TASKS.md`. Evidence: this checklist plus PRD, TECH_SPEC, ACTION_PLAN, and registry updates.
- [x] Docs-review child-stream evidence recorded before implementation. Evidence: initial child stream `.runs/linear-abca2add-198d-40a6-b1c0-35e49f4c78cd-docs-review/cli/2026-04-12T20-58-10-918Z-bcd345f7/manifest.json` failed closed on `docs/TASKS.md: tasks-file-too-large: lines=452 max=450`; `npm run docs:archive-tasks` repaired the line budget, displaced snapshots `1014` and `1015` were restored into tracked `docs/TASKS-archive-2026.md`, and the rerun stream `.runs/linear-abca2add-198d-40a6-b1c0-35e49f4c78cd-docs-review/cli/2026-04-12T20-59-41-592Z-468ab71c/manifest.json` completed with `review_outcome=clean-success`.

## Investigation
- [x] Baseline cleanup seam inspected. Evidence: `orchestrator/src/cli/controlHostSupervisionCliShell.ts` and `orchestrator/tests/ControlHostSupervision.test.ts`.
- [x] Pre-implementation issue-quality review captured. Evidence: `tasks/specs/linear-abca2add-198d-40a6-b1c0-35e49f4c78cd.md` review notes.

## Implementation
- [x] Generic forced cleanup kills only the stale control-host process group during timeout escalation. Evidence: `orchestrator/src/cli/controlHostSupervisionCliShell.ts` now keeps timeout cleanup process-group-scoped in `terminateChildProcess(...)`.
- [x] Detached provider-worker descendants are preserved while descendant/process-group diagnostics remain observable. Evidence: `terminateChildProcess(...)` still calls descendant listing for diagnostics but no longer issues descendant `SIGKILL`s outside the stale process group.
- [x] Focused code/test updates stay bounded to the generic supervision teardown seam. Evidence: diff limited to `orchestrator/src/cli/controlHostSupervisionCliShell.ts` and `orchestrator/tests/ControlHostSupervision.test.ts` plus the required docs/task mirrors.

## Validation
- [x] Focused regression proves generic cleanup preserves detached provider-worker descendants in separate process groups. Evidence: `npx vitest run orchestrator/tests/ControlHostSupervision.test.ts` passed (`59` tests).
- [x] `node scripts/delegation-guard.mjs`. Evidence: passed (`Delegation guard: OK (2 subagent manifest(s) found).`).
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: passed (`Spec guard: OK`).
- [x] `npm run build`. Evidence: passed.
- [x] `npm run lint`. Evidence: initially failed on an unused `killTrackedPid` helper left behind by the cleanup narrowing; rerun passed after removing the dead helper and again after the final dead-option trim.
- [x] `npm run test`. Evidence: passed after merging the latest `origin/main`, including the formerly unrelated suites that had been tracked in `CO-165` (`3723` tests green).
- [x] `npm run docs:check`. Evidence: passed before and after restoring displaced snapshots into tracked `docs/TASKS-archive-2026.md`.
- [x] `npm run docs:freshness`. Evidence: passed before and after the archive restore.
- [x] `npm run repo:stewardship`. Evidence: passed.
- [x] `node scripts/diff-budget.mjs`. Evidence: passed (`files=9/25`, `lines=483/1200`).
- [x] Standalone review plus explicit elegance review before review handoff. Evidence: `npm run review -- --base origin/main` executed under `FORCE_CODEX_REVIEW=1`, but telemetry `../../.runs/linear-abca2add-198d-40a6-b1c0-35e49f4c78cd/cli/2026-04-13T12-07-50-943Z-63517b12/review/telemetry.json` ended `review_outcome=failed-boundary` / `termination_boundary.kind=startup-anchor`, so manual fallback and elegance notes were recorded at `out/linear-abca2add-198d-40a6-b1c0-35e49f4c78cd/manual/standalone-review-fallback.md` and `out/linear-abca2add-198d-40a6-b1c0-35e49f4c78cd/manual/elegance-review.md`.
- [x] `npm run pack:smoke` if downstream-facing CLI surfaces change. Evidence: passed.

## Handoff
- [x] PR attached to the issue. Evidence: PR `#464` (`https://github.com/Kbediako/CO/pull/464`) is attached on `CO-164`; `linear attach-pr --issue-id abca2add-198d-40a6-b1c0-35e49f4c78cd --url https://github.com/Kbediako/CO/pull/464 --title "CO-164: narrow generic control-host forced cleanup"` returned `via=existing`.
- [x] Latest `origin/main` merged into the branch before review-state transition. Evidence: merge commit `f1d14c24b` merged `origin/main`, and `git rev-list --left-right --count HEAD...origin/main` returned `3 0` before PR creation.
- [ ] PR checks green and `pr ready-review` drain clean before review-state transition. Evidence: `pr ready-review --pr 464 --quiet-minutes 15` reached the quiet-window start, then exited action-required when CodeRabbit posted `CHANGES_REQUESTED`.
- [ ] Unresolved actionable review threads: `0` or explicit pushback recorded. Evidence: pending CodeRabbit threads on `.agent/task/linear-abca2add-198d-40a6-b1c0-35e49f4c78cd.md` and `tasks/tasks-linear-abca2add-198d-40a6-b1c0-35e49f4c78cd.md`.
- [ ] Issue moved to `In Review`. Evidence: pending.

## Progress Log
- 2026-04-13: Resumed `linear issue-context` found `CO-164` back in `Ready` after the earlier blocked closeout, with no attached PR and existing persistent workpad comment `0f3f8fa7-825c-4e74-a005-745c33992419`; the lane was moved back to `In Progress` after blocker `CO-165` reached `Done`.
- 2026-04-13: Recorded the required same-turn `stay_serial` / `single_bounded_change` decision because the remaining live scope is one bounded teardown helper plus focused docs/tests.
- 2026-04-13: Source audit confirmed `terminateChildProcess(...)` still escalates to descendant `SIGKILL`s after process-group cleanup, while `ensureTrackedProcessTreeExited(...)` is already narrowed and out of scope for this lane.
- 2026-04-13: Docs-first packet was mirrored, the first `docs-review` child stream failed closed on the `docs/TASKS.md` line-budget guard, `npm run docs:archive-tasks` repaired the budget, displaced snapshots `1014` and `1015` were restored into tracked `docs/TASKS-archive-2026.md`, and the rerun child stream completed cleanly with `review_outcome=clean-success`.
- 2026-04-13: `terminateChildProcess(...)` was narrowed to process-group-scoped timeout cleanup with descendant diagnostics only, the dead `killProcess` option was removed in the elegance pass, and the focused `ControlHostSupervision.test.ts` regression passed again after the final trim.
- 2026-04-13: Full `npm run test` remained blocked by unrelated provider suites, so follow-up `CO-165` was created instead of widening CO-164 scope.
- 2026-04-13: After refreshing the workpad with the final blocker state, the issue was moved from `In Progress` to `Blocked` because review handoff cannot proceed until `CO-165` clears the unrelated repo test baseline.
- 2026-04-13: With `CO-165` now `Done`, the lane resumed on the same branch/workpad, refreshed the workpad back to an active validation plan, confirmed the branch trails `origin/main` by seven commits, and restarted the validation loop from the current repo baseline.

## Relevant Files
- `orchestrator/src/cli/controlHostSupervisionCliShell.ts`
- `orchestrator/tests/ControlHostSupervision.test.ts`

## Notes
- This lane intentionally preserves the `CO-163` restart-specific cleanup semantics and only narrows the adjacent generic wrapper cleanup path.
- Same-issue child lanes stayed serial this turn because docs, code, and tests all converge on the same bounded teardown contract.
- The packaged `bin/codex-orchestrator.js linear ...` wrapper started failing in this workspace with an uncaught `[Object: null prototype]`; the underlying `runLinearCliShell(...)` path still worked, so live Linear reads/writes and child-stream launches used that direct shell path instead of broadening scope into wrapper repair.
- `CO-165` tracks the unrelated provider-worker full-suite failures that still block review handoff for this lane.
