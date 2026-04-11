# PRD - CO: Back off GitHub GraphQL and REST polling in PR readiness and merge closeout

## Added by Bootstrap 2026-04-11

## Traceability
- Linear issue: `CO-151` / `e99b2aec-61dd-4d0d-8c8e-dc78ffbfe605`
- Linear URL: https://linear.app/asabeko/issue/CO-151/co-back-off-github-graphql-and-rest-polling-in-pr-readiness-and-merge
- Related lanes:
  - `CO-10` / `linear-9d962236-4c38-4b28-b144-007c6f3a1395`
  - `CO-116` / `linear-a770da1f-7a08-499d-a680-7f1cd8eee4ad`
  - `CO-140` / `linear-97d69ad8-ba75-432f-b8b2-21ca83754325`
  - `CO-120` / `linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702`

## Summary
- Problem Statement: live `pr ready-review`, `pr resolve-merge`, and provider deterministic closeout can burn GitHub REST and GraphQL budgets while polling through quiet windows. The watcher currently treats most `gh` failures as generic polling errors and retries on the fixed poll interval, while each fresh same-head snapshot can fan out to GraphQL plus multiple REST endpoints for required checks, inline bot feedback, rereview signals, reviews, comments, and reactions.
- Desired Outcome: preserve the existing PR readiness and merge safety semantics while making GitHub REST and GraphQL budget exhaustion explicit, reset-aware, observable, and less wasteful during same-head quiet windows.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): the provider worker should keep the current review-thread, required-check, bot-feedback, rereview, and merge-state gates intact, but stop repeatedly spending GitHub API calls during known throttle windows. Rate-limit failures should carry structured reset/retry metadata, provider proof should distinguish GitHub API exhaustion from CodeRabbit service cooldown and Linear API budget issues, and same-head cached evidence should be reused when it is sufficient for a quiet-window poll.
- Success criteria / acceptance:
  - simulated GraphQL throttle and REST 403/429 cases produce explicit GitHub rate-limit status instead of generic polling errors
  - `pr ready-review`, `pr resolve-merge`, and provider merge closeout wait through reset windows with bounded jitter/backoff
  - provider proof/closeout evidence distinguishes GitHub API budget exhaustion from CodeRabbit service cooldown and Linear API budget
  - existing readiness and merge safety semantics remain unchanged
- Constraints / non-goals:
  - do not weaken review-thread, required-check, bot-feedback, rereview, or merge-state gates
  - do not treat CodeRabbit service cooldown comments as GitHub API throttling
  - do not widen this lane into Linear API budget work or generic GitHub API replacement

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `Back off GitHub GraphQL and REST polling`
  - `PR readiness and merge closeout`
  - `Classify GitHub REST and GraphQL primary/secondary rate-limit failures`
  - `Preserve reset/retry metadata`
  - `Reduce avoidable fan-out when a same-head cached snapshot is sufficient during a quiet window`
- Protected terms / exact artifact and surface names:
  - `scripts/lib/pr-watch-merge.js`
  - `providerMergeCloseout.ts`
  - `pr ready-review`
  - `pr resolve-merge`
  - `review_handoff`
  - `merge_closeout`
  - `CodeRabbit service cooldown`
  - `Linear API budget`
  - `GitHub REST`
  - `GitHub GraphQL`
- Nearby wrong interpretations to reject:
  - "poll less by skipping unresolved thread, check, bot feedback, rereview, or merge-state gates"
  - "classify CodeRabbit service rate-limit comments as GitHub API throttling"
  - "fix this by changing Linear API cooldown behavior"
  - "replace GitHub CLI usage wholesale instead of hardening the existing watcher"

## Parity / Alignment Matrix
- Not applicable as a formal parity lane. Guardrail comparison for this hardening lane:
- Current truth:
  - `scripts/lib/pr-watch-merge.js` fetches a GraphQL PR snapshot each poll and then fans out through REST-backed `gh pr checks`, pull comments, issue comments, reviews, reactions, and comment reactions.
  - `runPrWatchMerge(...)` retries polling errors on the fixed interval without preserving GitHub reset metadata in status lines.
  - `fetchPrStatusSnapshot(...)` is reused by provider review promotion and deterministic merge closeout.
  - Existing branch recovery from `CO-140` must remain unchanged.
- Reference truth:
  - GitHub primary and secondary rate limits expose reset or retry metadata that should drive cooldown rather than blind fixed sleeps.
  - Same-head quiet-window polls can reuse previously fetched expensive REST fan-out when no new PR head or updated timestamp invalidates that evidence.
- Target truth / intended delta:
  - explicit GitHub rate-limit records exist for REST and GraphQL failures, including reset/retry metadata when available.
  - watcher/provider polling sleeps through reset-aware cooldowns with bounded jitter and exits with classified errors only after the bounded timeout.
  - same-head cached snapshots avoid redundant fan-out while preserving all safety gates.
- Explicitly out-of-scope differences:
  - Linear API request-budget policy
  - CodeRabbit service cooldown interpretation
  - review/merge gate weakening

## Not Done If
- CodeRabbit service rate-limit comments are treated as GitHub API throttling.
- Linear API rate-limit work is widened into this lane.
- The fix weakens review-thread, check, bot-feedback, rereview, or merge-state gates to avoid GitHub calls.
- GitHub throttle errors remain generic polling errors without reset/retry evidence.

## Goals
- Add explicit GitHub REST and GraphQL rate-limit classification in the PR watcher.
- Preserve reset/retry metadata in watcher status and provider evidence.
- Make `pr ready-review`, `pr resolve-merge`, and provider merge closeout wait through GitHub reset windows with bounded jitter/backoff.
- Reuse same-head cached snapshot/fan-out evidence during quiet-window polling when it is still safe.

## Non-Goals
- Linear API budget hardening.
- CodeRabbit service cooldown classification changes.
- GitHub CLI replacement.
- Any weakening of readiness or merge safety gates.

## Stakeholders
- Product: CO operators who need autonomous review and merge shepherding to survive GitHub API budget pressure.
- Engineering: PR watcher, provider review promotion, and deterministic merge closeout maintainers.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics:
  - REST 403/429 and GraphQL throttle fixtures yield `github_rate_limited`-style evidence with reset/retry metadata.
  - quiet-window polling uses fewer fresh GitHub fan-out calls on unchanged PR heads.
  - provider proof shows GitHub API throttle separately from Linear cooldown and CodeRabbit service comments.
- Guardrails / Error Budgets:
  - required-check, unresolved-thread, actionable-bot, rereview, and merge-state semantics must stay unchanged.
  - fail closed when cache validity is unclear.
  - keep sleeps bounded by the existing overall monitor timeout.

## User Experience
- Personas:
  - provider worker shepherding an attached PR through review handoff or merge closeout
  - reviewer inspecting workpad/provider proof after GitHub throttling
  - operator debugging whether the blocker is GitHub, CodeRabbit, or Linear
- User Journeys:
  - a PR enters a quiet window and GitHub GraphQL is throttled; the watcher records the reset time, sleeps until the safe retry boundary, and resumes without collapsing to a generic polling failure.
  - a same-head quiet-window poll needs no fresh fan-out; cached required checks and bot/review evidence remain authoritative until PR head or update metadata changes.
  - provider merge closeout hits GitHub REST 429 while loading feedback signals; closeout proof records GitHub API budget exhaustion, not Linear cooldown or CodeRabbit service cooldown.

## Technical Considerations
- Architectural Notes:
  - keep the primary implementation in `scripts/lib/pr-watch-merge.js` so CLI and provider callers share one rate-limit/backoff contract
  - extend `fetchPrStatusSnapshot(...)` and provider snapshot mapping additively, preserving existing snapshot fields
  - keep cache reuse keyed to head SHA plus PR update timestamp or a stricter equivalent
- Dependencies / Integrations:
  - GitHub CLI `gh api graphql`
  - GitHub CLI REST endpoints for checks, comments, reviews, and reactions
  - `orchestrator/src/cli/control/providerMergeCloseout.ts`
  - provider proof and observability surfaces

## Open Questions
- Pending docs-review: the exact maximum cooldown cap and jitter window for GitHub throttles within the existing monitor timeout.
- Pending implementation audit: whether provider proof should expose only the latest GitHub throttle or a bounded history of throttle events.

## Approvals
- Product: Linear issue `CO-151`
- Engineering: pending docs-review
- Design: N/A
