---
id: 20260411-linear-e99b2aec-61dd-4d0d-8c8e-dc78ffbfe605
title: CO: Back off GitHub GraphQL and REST polling in PR readiness and merge closeout
status: done
owner: Codex
created: 2026-04-11
last_review: 2026-05-13
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-e99b2aec-61dd-4d0d-8c8e-dc78ffbfe605.md
related_action_plan: docs/ACTION_PLAN-linear-e99b2aec-61dd-4d0d-8c8e-dc78ffbfe605.md
related_tasks:
  - tasks/tasks-linear-e99b2aec-61dd-4d0d-8c8e-dc78ffbfe605.md
review_notes:
  - 2026-04-11: Opened from Linear issue `CO-151` in the provider-worker workspace after rechecking live CO team states with the packaged `linear issue-context` helper, moving the issue from `Ready` to `In Progress`, recording the required same-turn `stay_serial` / `overlapping_scope` parallelization decision, and switching the detached workspace onto branch `linear/co-151-github-api-backoff`.
  - 2026-04-11: Baseline audit confirms the bounded seam: `scripts/lib/pr-watch-merge.js` performs a GraphQL PR read then fans out to REST-backed required checks, inline bot feedback, rereview comments, reviews, reactions, and comment reactions; `fetchPrStatusSnapshot(...)` is reused by `providerMergeCloseout.ts` for review promotion and deterministic merge closeout.
  - 2026-04-11: Pre-implementation issue-quality review approves this as narrower than Linear budget work or CodeRabbit service cooldown handling. The protected implementation path is GitHub REST/GraphQL classification, reset-aware watcher/provider backoff, and same-head snapshot/fan-out cache reuse without weakening safety gates.
  - 2026-04-11: Audited docs-review child stream `co-151-docs-review` passed delegation guard, spec-guard, and docs:check, then failed only on the standing repo-wide `docs:freshness` stale-doc baseline (`77` stale older docs, `missing_registry=0`, `missing_on_disk=0`, `invalid_entries=0`). CO-151 packet files were present, registered, and not stale, so the fallback is accepted for pre-implementation. Evidence: `.runs/linear-e99b2aec-61dd-4d0d-8c8e-dc78ffbfe605-co-151-docs-review/cli/2026-04-11T00-57-29-630Z-45cacf66/manifest.json`, `out/linear-e99b2aec-61dd-4d0d-8c8e-dc78ffbfe605/manual/20260411T005731Z-docs-review-fallback.md`.
  - 2026-05-13: CO-523 live Linear audit verified CO-151 is Done/completed; reclassified this task spec as inactive done metadata for strict spec-guard evidence. Evidence: out/linear-8573da42-d9f9-44ce-a24e-224984539044/manual/20260512T1850Z-baseline/live-linear-states.json.
---

# Technical Specification

## Context
`CO-151` follows a live `CO-120` merge shepherding incident where GitHub REST budget was exhausted first and later GraphQL was throttled while the provider worker still needed PR-thread and merge-closeout evidence. Current `pr-watch-merge.js` already owns the right safety substrate for review handoff and merge closeout, including required checks, unresolved threads, actionable bot feedback, rereview signals, merge-state readiness, and the `CO-140` branch-recovery helper. The gap is not gate semantics; it is GitHub API budget behavior around the existing polling scheduler and snapshot/fan-out path.

## Requirements
1. GitHub REST 403/429 and GraphQL primary/secondary throttle responses must be classified as explicit GitHub API rate-limit events.
2. Classification must preserve reset/retry metadata when GitHub exposes it through headers, response JSON, stderr, or structured CLI output.
3. `runPrWatchMerge(...)` must use reset-aware cooldown/backoff with bounded jitter instead of only sleeping the fixed poll interval after GitHub throttles.
4. `fetchPrStatusSnapshot(...)` and provider callers must surface GitHub API budget exhaustion distinctly from Linear API cooldown and CodeRabbit service cooldown comments.
5. Same-head quiet-window polling must reuse cached expensive fan-out evidence when the PR head and freshness anchors still prove the cached snapshot is authoritative enough for the existing gates.
6. Cache reuse must fail closed: any changed head, changed PR update timestamp, missing safety fields, or previous fetch error requiring fresh evidence must trigger a live read.
7. Existing review-thread, required-check, bot-feedback, rereview, branch-recovery, and merge-state safety semantics must remain unchanged.

## Design
- Add a small GitHub API rate-limit classifier around `gh` command failures in `scripts/lib/pr-watch-merge.js`.
- Normalize rate-limit evidence into an additive record with fields such as `kind`, `surface`, `status`, `reset_at`, `retry_after_seconds`, `retry_at`, and a scrubbed message.
- Teach snapshot/fan-out helpers to return or throw classified GitHub throttle evidence instead of swallowing all REST fan-out errors as generic fetch errors.
- Add a reset-aware sleep planner used by the watcher loop. The planned sleep must be bounded by the remaining monitor timeout and include deterministic bounded jitter so simultaneous workers do not immediately stampede the reset boundary.
- Add a same-head snapshot cache for expensive fan-out data used during quiet-window monitoring. Reuse only when head SHA and PR update timestamp match the current GraphQL anchor and prior safety fields are complete.
- Extend provider snapshot mapping and closeout/review-promotion records additively so GitHub throttle metadata appears in provider proof without changing existing readiness fields.

## Implementation Surface
- Expected codepaths:
  - `scripts/lib/pr-watch-merge.js`
  - `scripts/lib/pr-watch-merge.d.ts`
  - `orchestrator/src/cli/control/providerMergeCloseout.ts`
  - `orchestrator/src/cli/control/providerIssueObservability.ts` if operator/debug summaries need a new GitHub-throttle line
- Expected tests:
  - `tests/pr-watch-merge.spec.ts`
  - `orchestrator/tests/ProviderMergeCloseout.test.ts`
  - `orchestrator/tests/ProviderIssueObservability.test.ts` if projected proof changes

## Protected Expectations
- Do not skip unresolved review threads.
- Do not skip required checks.
- Do not skip actionable bot feedback or rereview signals.
- Do not change CodeRabbit service cooldown comment handling into GitHub API throttle handling.
- Do not change Linear API budget classification.
- Do not regress `CO-140` branch-recovery behavior for `BEHIND` or `DIRTY`.

## Reject These Wrong Interpretations
- "Use cache even when the PR head or updated timestamp changed."
- "Ignore bot feedback while GitHub API budget is low."
- "Treat CodeRabbit rate-limit prose as a GitHub rate-limit response."
- "Move Linear shared-budget handling into this lane."

## Parity / Alignment Matrix
- Not applicable as a formal parity lane.
- Current truth: fixed-interval retry and generic polling errors hide GitHub reset metadata; same-head quiet-window polls can refetch GraphQL and REST fan-out every interval.
- Reference truth: GitHub rate-limit responses should drive cooldown timing, and unchanged PR anchors should permit safe reuse of expensive fan-out evidence.
- Target truth / intended delta: explicit GitHub throttle evidence, reset-aware sleeps, and same-head cache reuse while preserving all readiness gates.
- Explicitly out-of-scope differences: Linear budget policy, CodeRabbit service cooldown semantics, and generic GitHub API replacement.

## Not Done If
- GitHub REST 403/429 or GraphQL throttle fixtures still surface as generic polling errors.
- Reset/retry metadata is lost before provider proof or watcher status can report it.
- Same-head cache reuse skips any existing safety gate.
- CodeRabbit service cooldown comments or Linear API cooldowns are relabeled as GitHub API exhaustion.

## Validation Plan
- Audited `linear child-stream --pipeline docs-review` before implementation.
- Focused watcher regressions for:
  - REST 403 with rate-limit headers
  - REST 429 with `retry-after`
  - GraphQL throttle payload or stderr
  - reset-aware sleep planning with bounded jitter
  - same-head cache reuse and invalidation on changed head/update timestamp
  - CodeRabbit service cooldown prose not classified as GitHub API throttling
- Focused provider regressions proving merge closeout/review promotion records preserve GitHub throttle metadata without confusing Linear cooldown.
- Required repo validation floor before review handoff.

## Approvals
- Reviewer: audited docs-review child stream with repo-wide stale-doc fallback
- Date: 2026-04-11
