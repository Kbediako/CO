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
- [ ] Classify GitHub REST 403/429 and GraphQL throttle failures explicitly. Evidence: pending.
- [ ] Preserve reset/retry metadata in watcher/provider evidence. Evidence: pending.
- [ ] Add reset-aware cooldown/backoff with bounded jitter. Evidence: pending.
- [ ] Reduce same-head quiet-window fan-out through conservative cached snapshot reuse. Evidence: pending.
- [ ] Preserve existing readiness and merge safety semantics. Evidence: pending.

## Validation
- [ ] Focused watcher tests for REST 403/429, GraphQL throttles, backoff planning, cache reuse/invalidation, and CodeRabbit cooldown distinction. Evidence: pending.
- [ ] Focused provider tests for GitHub API throttle evidence in merge closeout/review promotion. Evidence: pending.
- [ ] `node scripts/delegation-guard.mjs`. Evidence: pending.
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: pending.
- [ ] `npm run build`. Evidence: pending.
- [ ] `npm run lint`. Evidence: pending.
- [ ] `npm run test`. Evidence: pending.
- [ ] `npm run docs:check`. Evidence: pending.
- [ ] `npm run docs:freshness`. Evidence: pending.
- [ ] `node scripts/diff-budget.mjs`. Evidence: pending.
- [ ] Manifest-backed standalone review plus explicit elegance review before review handoff. Evidence: pending.
- [ ] `npm run pack:smoke` because PR watcher/CLI behavior is downstream-facing. Evidence: pending.

## Handoff
- [ ] PR attached to the issue. Evidence: pending.
- [ ] Latest `origin/main` merged into the branch before review-state transition. Evidence: pending.
- [ ] PR checks green and `pr ready-review` drain clean before review-state transition. Evidence: pending.
- [ ] Unresolved actionable review threads: `0` or explicit pushback recorded. Evidence: pending.
- [ ] Issue moved to `In Review`. Evidence: pending.

## Progress Log
- 2026-04-11: Issue moved to `In Progress`, workpad created, branch created, and baseline watcher/provider seam audited.
- 2026-04-11: Docs-review child stream recorded; packet-local docs gates passed and only the repo-wide stale-doc baseline blocked full docs:freshness. Next: implement GitHub throttle/backoff/cache seam.

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
