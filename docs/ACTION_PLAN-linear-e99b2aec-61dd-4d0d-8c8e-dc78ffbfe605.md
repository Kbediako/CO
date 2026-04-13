# ACTION_PLAN - CO: Back off GitHub GraphQL and REST polling in PR readiness and merge closeout

## Added by Bootstrap 2026-04-11

## Summary
- Goal: make PR readiness and merge closeout resilient to GitHub REST/GraphQL throttling without reducing safety evidence.
- Scope:
  - docs-first packet and workpad
  - PR watcher GitHub throttle classifier
  - reset-aware backoff/cooldown
  - safe same-head fan-out cache reuse
  - provider evidence wiring
  - focused tests and full validation/review handoff
- Assumptions:
  - existing `CO-140` branch-recovery behavior is correct and must stay intact
  - provider closeout should consume the same watcher snapshot contract rather than invent a parallel GitHub client

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `GitHub REST`, `GitHub GraphQL`, `pr ready-review`, `pr resolve-merge`, `provider merge closeout`, `CodeRabbit service cooldown`, `Linear API budget`
- Not done if:
  - GitHub throttles remain generic polling errors
  - CodeRabbit service cooldown comments are treated as GitHub API throttling
  - Linear API budget work is widened into this lane
  - existing PR readiness or merge gates are weakened
- Pre-implementation issue-quality review:
  - Approved on 2026-04-11 after live Linear state inspection, branch creation, workpad bootstrap, and baseline code audit. The task is not still plausibly narrower than the issue request: it covers `pr ready-review`, `pr resolve-merge`, and provider merge-closeout snapshot usage while excluding Linear and CodeRabbit service cooldown work.

## Milestones & Sequencing
1. Docs and audited design gate
   - Create PRD, TECH_SPEC, ACTION_PLAN, task checklist, `.agent` mirror, registry entries, and `docs/TASKS.md` snapshot.
   - Run `linear child-stream --pipeline docs-review` and record manifest or truthful fallback.
2. Baseline and implementation
   - Add GitHub REST/GraphQL rate-limit classification.
   - Add reset-aware sleep planning and bounded jitter.
   - Add same-head quiet-window snapshot/fan-out cache reuse with conservative invalidation.
   - Thread GitHub API throttle metadata through provider closeout/review-promotion evidence.
3. Tests and validation
   - Add focused watcher/provider tests for throttle classification, backoff, cache reuse/invalidation, and CodeRabbit/Linear distinction.
   - Run required repo validation gates, standalone review, elegance pass, PR creation/attachment, CI, and `pr ready-review` drain before handoff.

## Dependencies
- `scripts/lib/pr-watch-merge.js`
- `scripts/lib/pr-watch-merge.d.ts`
- `orchestrator/src/cli/control/providerMergeCloseout.ts`
- `orchestrator/src/cli/control/providerIssueObservability.ts` if provider debug projection changes
- `tests/pr-watch-merge.spec.ts`
- `orchestrator/tests/ProviderMergeCloseout.test.ts`

## Validation
- Checks / tests:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - focused Vitest for watcher/provider regressions
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - manifest-backed `codex-orchestrator review`
  - `npm run pack:smoke` because PR watcher/CLI behavior is downstream-facing
- Rollback plan:
  - revert the watcher/provider additive rate-limit/cache changes and retain the docs packet as follow-up evidence if any safety gate regression appears.

## Risks & Mitigations
- Risk: cache reuse accidentally hides new safety evidence.
  - Mitigation: require same head plus update anchor and complete prior safety fields; fail closed to live fetch.
- Risk: long reset windows exceed monitor timeout.
  - Mitigation: bound sleep by remaining timeout and surface classified GitHub throttle status.
- Risk: provider evidence conflates GitHub, Linear, and CodeRabbit throttles.
  - Mitigation: preserve separate classifier names and tests for each distinction.

## Approvals
- Reviewer: pending audited docs-review
- Date: 2026-04-11
