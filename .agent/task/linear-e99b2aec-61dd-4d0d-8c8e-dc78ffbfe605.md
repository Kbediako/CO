# Task Checklist - linear-e99b2aec-61dd-4d0d-8c8e-dc78ffbfe605

- Linear Issue: `CO-151` / `e99b2aec-61dd-4d0d-8c8e-dc78ffbfe605`
- MCP Task ID: `linear-e99b2aec-61dd-4d0d-8c8e-dc78ffbfe605`
- Primary PRD: `docs/PRD-linear-e99b2aec-61dd-4d0d-8c8e-dc78ffbfe605.md`
- TECH_SPEC: `tasks/specs/linear-e99b2aec-61dd-4d0d-8c8e-dc78ffbfe605.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-e99b2aec-61dd-4d0d-8c8e-dc78ffbfe605.md`

## Docs
- [x] Live Linear workflow states were rechecked before transition. Evidence: `linear issue-context --issue-id e99b2aec-61dd-4d0d-8c8e-dc78ffbfe605`.
- [x] Issue moved from `Ready` to `In Progress` before active coding. Evidence: `linear transition --state "In Progress"` succeeded at `2026-04-11T00:50:31.178Z`.
- [x] Required same-turn parallelization decision recorded. Evidence: `linear parallelization --decision stay_serial --reason overlapping_scope`.
- [x] Exactly one persistent Linear workpad comment is current. Evidence: remote comment `b1b11431-793e-4ad0-9b85-76aa6395c185`, local source `out/linear-e99b2aec-61dd-4d0d-8c8e-dc78ffbfe605/workpad.md`.
- [x] Docs packet created and mirrored in `docs/`, `tasks/`, `.agent/`, `tasks/index.json`, and `docs/TASKS.md`. Evidence: this checklist plus PRD, TECH_SPEC, ACTION_PLAN, and registry updates.
- [x] Docs-review child-stream evidence recorded before implementation. Evidence: `.runs/linear-e99b2aec-61dd-4d0d-8c8e-dc78ffbfe605-co-151-docs-review/cli/2026-04-11T00-57-29-630Z-45cacf66/manifest.json` passed delegation guard, spec-guard, and docs:check, then failed only on the standing repo-wide docs:freshness stale-doc baseline; fallback classified in `out/linear-e99b2aec-61dd-4d0d-8c8e-dc78ffbfe605/manual/20260411T005731Z-docs-review-fallback.md`.

## Investigation
- [x] Workspace moved from detached `HEAD` onto branch `linear/co-151-github-api-backoff` before repo edits. Evidence: `git switch -c linear/co-151-github-api-backoff`.
- [x] Baseline audit confirmed the bounded seam. Evidence: `scripts/lib/pr-watch-merge.js`, `scripts/lib/pr-watch-merge.d.ts`, `orchestrator/src/cli/control/providerMergeCloseout.ts`, `tests/pr-watch-merge.spec.ts`.
- [x] Pre-implementation issue-quality review captured. Evidence: `tasks/specs/linear-e99b2aec-61dd-4d0d-8c8e-dc78ffbfe605.md` review notes and readiness gate.

## Implementation
- [x] Classify GitHub REST 403/429 and GraphQL throttle failures explicitly. Evidence: `scripts/lib/pr-watch-merge.js`, `tests/pr-watch-merge.spec.ts`.
- [x] Preserve reset/retry metadata in watcher/provider evidence. Evidence: `scripts/lib/pr-watch-merge.js`, `orchestrator/src/cli/control/providerMergeCloseout.ts`, `orchestrator/tests/ProviderMergeCloseout.test.ts`.
- [x] Add reset-aware cooldown/backoff with bounded jitter. Evidence: `planGitHubRateLimitBackoff`, watcher polling/fan-out/update-branch throttle paths, and focused tests.
- [x] Reduce same-head quiet-window fan-out through conservative cached snapshot reuse. Evidence: watcher fan-out cache implementation and focused cache reuse/invalidation tests.
- [x] Prevent provider branch-recovery and ready-snapshot mutation while snapshot-backed GitHub throttle metadata is present. Evidence: `classifyPreBranchRecoverySnapshot` gates merge closeout and review-promotion before `gh pr update-branch`, and `classifyProviderMutationRateLimitSnapshot` gates non-terminal ready snapshots before `gh pr merge` or Linear `Merging` promotion.
- [x] Harden PR feedback edge cases without widening the lane. Evidence: parsed payload prose no longer counts as transport rate-limit headers, oversized reset/retry-after values are ignored safely, deterministic watcher action-required blockers run before rate-limit sleeps, and provider closeout reads snake_case embedded `github_rate_limit` records.
- [x] Preserve existing readiness and merge safety semantics. Evidence: required checks still refresh each poll, CodeRabbit cooldown is not GitHub throttling, closed PRs still return `pr_closed_unmerged`, and full test suite passed.

## Validation
- [x] Focused watcher tests for REST 403/429, GraphQL throttles, backoff planning, cache reuse/invalidation, update-branch throttles, parsed-payload text, invalid reset/retry-after values, action-required precedence, stale reset fallback, provider branch-recovery throttle guard, ready-snapshot throttle mutation guard, and CodeRabbit cooldown distinction. Evidence: `npx vitest run --config vitest.config.core.ts tests/pr-watch-merge.spec.ts` passed with 78 tests after retry-after hardening.
- [x] Focused provider tests for GitHub API throttle evidence in merge closeout/review promotion. Evidence: `orchestrator/tests/ProviderMergeCloseout.test.ts` passed with 39 tests after PR feedback hardening.
- [x] Combined watcher/provider focused regression suite. Evidence: `npx vitest run --config vitest.config.core.ts tests/pr-watch-merge.spec.ts orchestrator/tests/ProviderMergeCloseout.test.ts` passed with 117 tests after retry-after hardening.
- [x] `node scripts/delegation-guard.mjs`. Evidence: passed; 1 subagent manifest found.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: passed.
- [x] `npm run build`. Evidence: passed after retry-after hardening.
- [x] `npm run lint`. Evidence: passed after retry-after hardening.
- [x] `npm run test`. Evidence: first run exposed two unrelated `ProviderIssueHandoff` timing/order failures, isolated rerun passed 211 tests, and latest full rerun passed 326 files / 3480 tests.
- [x] `npm run docs:check`. Evidence: passed.
- [x] `npm run docs:freshness`. Evidence: ran; failed only on standing repo-wide stale-doc baseline (`missing_registry=0`, `stale=77`).
- [x] `node scripts/diff-budget.mjs`. Evidence: passed with `DIFF_BUDGET_OVERRIDE_REASON`; latest retry-after working-tree scope was 2 files / 82 lines before checklist mirrors.
- [x] Manifest-backed standalone review plus explicit elegance review before review handoff. Evidence: wrapper review failed closed on `failed-boundary` / `command-intent`; latest manual correctness/elegance fallback recorded in `out/linear-e99b2aec-61dd-4d0d-8c8e-dc78ffbfe605/manual/20260411T032100Z-review-retry-after-fallback.md`.
- [x] `npm run pack:smoke` because PR watcher/CLI behavior is downstream-facing. Evidence: passed.

## Handoff
- [x] PR attached to the issue. Evidence: PR #436 is attached to `CO-151`.
- [ ] Latest `origin/main` merged into the branch before review-state transition. Evidence: pending.
- [ ] PR checks green and `pr ready-review` drain clean before review-state transition. Evidence: pending.
- [ ] Unresolved actionable review threads: `0` or explicit pushback recorded. Evidence: pending.
- [ ] Issue moved to `In Review`. Evidence: pending.

## Progress Log
- 2026-04-11: Issue moved to `In Progress`, workpad created, branch created, and baseline watcher/provider seam audited.
- 2026-04-11: Docs-review child stream recorded; packet-local docs gates passed and only the repo-wide stale-doc baseline blocked full docs:freshness. Next: implement GitHub throttle/backoff/cache seam.
- 2026-04-11: PR feedback rework addressed CodeRabbit/Codex comments for parsed text false positives, update-branch throttle retry, provider evidence propagation, closed PR precedence, and task-checklist mirroring.
- 2026-04-11: Live `pr ready-review` drain exposed stale secondary REST reset metadata causing near-immediate retries; fixed `planGitHubRateLimitBackoff` to ignore stale reset/retry timestamps and fall back to the configured cooldown.
- 2026-04-11: Follow-up CodeRabbit review showed provider branch recovery could still call `gh pr update-branch` on snapshot-backed throttle metadata; added pre-recovery throttle classification for merge closeout and review promotion with focused regressions.
- 2026-04-11: Follow-up CodeRabbit review showed provider paths could still mutate on non-terminal ready snapshots carrying throttle metadata; added a pre-mutation guard before `gh pr merge` and Linear `Merging` promotion with focused regressions.
- 2026-04-11: Follow-up Codex/CodeRabbit review hardened evidence parsing and provider propagation: parsed payload prose is no longer treated as header evidence, invalid reset epochs are guarded, deterministic action-required blockers now win before rate-limit sleeps, and provider errors accept snake_case `github_rate_limit`.
- 2026-04-11: Ready-review drain exposed one remaining Codex P2 for oversized `retry-after` ISO conversion; guarded retry-at conversion/backoff candidate selection and added focused regressions.

## Relevant Files
- `scripts/lib/pr-watch-merge.js`
- `scripts/lib/pr-watch-merge.d.ts`
- `orchestrator/src/cli/control/providerMergeCloseout.ts`
- `orchestrator/src/cli/control/providerIssueObservability.ts`
- `tests/pr-watch-merge.spec.ts`
- `orchestrator/tests/ProviderMergeCloseout.test.ts`

## Notes
- This lane intentionally excludes Linear API budget work and CodeRabbit service cooldown interpretation.
- Subagent usage: use workspace-scoped `linear child-stream` evidence for docs/review gates; child lanes are not active in this first turn because the initial watcher/provider scope overlaps.
