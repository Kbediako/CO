---
id: 20260329-linear-ebb62cc0-77d0-41e4-8640-abbd5126cced
title: CO: Surface and handle Linear rate limits in provider tracked-issue rereads
relates_to: docs/PRD-linear-ebb62cc0-77d0-41e4-8640-abbd5126cced.md
risk: high
owners:
  - Codex
last_review: 2026-04-29
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-ebb62cc0-77d0-41e4-8640-abbd5126cced.md`
- PRD: `docs/PRD-linear-ebb62cc0-77d0-41e4-8640-abbd5126cced.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-ebb62cc0-77d0-41e4-8640-abbd5126cced.md`
- Task checklist: `tasks/tasks-linear-ebb62cc0-77d0-41e4-8640-abbd5126cced.md`

## Traceability
- Linear issue: `CO-34` / `ebb62cc0-77d0-41e4-8640-abbd5126cced`
- Linear URL: https://linear.app/asabeko/issue/CO-34/co-surface-and-handle-linear-rate-limits-in-provider-tracked-issue
- Related source issue: `CO-33`

## Summary
- Objective: Preserve explicit Linear rate-limit classification and bounded safe retry behavior in provider tracked-issue rereads.
- Scope:
  - docs-first registration for `CO-34`
  - shared rate-limit metadata mapping for tracked-issue-by-id reads
  - provider-worker proof/end-reason plumbing for tracked-issue reread failures
  - short-window reset-aware wait/backoff for rereads only
  - focused regressions plus normal validation before review handoff
- Constraints:
  - keep the write/mutation seam from `CO-33` out of scope
  - do not add broad caching or a new polling subsystem
  - preserve truthful failure surfacing when the reset window is too long, missing, or otherwise unsafe to wait through

## Technical Requirements
- Functional requirements:
  - map tracked-issue GraphQL `RATELIMITED` responses to an explicit rate-limit failure class instead of `dispatch_source_provider_request_failed`
  - preserve actionable request/reset metadata from Linear headers on tracked-issue-by-id failures
  - let provider-worker rereads wait through a short reset window only when the metadata proves the wait is bounded and safe
  - persist structured tracked-issue read failure details into `ProviderLinearWorkerProof` and use a distinct terminal reason for rate-limited rereads
  - reduce unnecessary reread pressure around active provider lanes where the worker already has a fresh tracked issue and the reread would not change truth/ownership semantics
- Non-functional requirements (performance, reliability, security):
  - never mask true prolonged rate limiting as a transient generic read failure
  - keep retries bounded to the worker reread seam and avoid retry storms when the reset window is long or unavailable
  - preserve source binding, scope mismatch, and inactive-issue handling outside the new rate-limit path
- Interfaces / contracts:
  - `orchestrator/src/cli/control/linearDispatchSource.ts`
  - `orchestrator/src/cli/control/linearGraphqlClient.ts`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/src/cli/control/controlRuntime.ts` / selected-run observability surfaces via raw proof passthrough

## Architecture & Data
- Architecture / design adjustments:
  - extract or reuse a shared Linear rate-limit mapper so tracked-issue reads and workflow-facade helper mutations speak the same metadata contract
  - preserve structured tracked-issue resolution failures instead of converting them to a plain thrown string in the worker runner
  - compute a bounded reread wait from Linear reset semantics, preferring `retry-after` and otherwise waiting for the latest exhausted or still-unknown reset boundary advertised by the rate-limit headers
  - skip or defer unnecessary immediate rereads only when the worker already has a fresh post-turn truth source and the omission does not weaken ownership/state checks
- Data model changes / migrations:
  - widen `ProviderLinearWorkerProof` with structured tracked-issue reread failure metadata
  - no persisted repo data migrations
- External dependencies / integrations:
  - Linear GraphQL API headers:
    - `retry-after`
    - `x-ratelimit-requests-reset`
    - `x-ratelimit-requests-remaining`
    - related endpoint/complexity headers when present

## Validation Plan
- Tests / checks:
  - focused `LinearDispatchSource` coverage for by-id rate limits and metadata classification
  - focused `ProviderLinearWorkerRunner` coverage for post-turn reread rate limits, bounded retry, and proof persistence
  - control-host read-model or presenter coverage only if proof/payload expectations need updating
  - required repo validation floor after implementation
- Rollout verification:
  - verify the worker proof distinguishes tracked-issue rate limits from generic reread failures
  - verify bounded waits occur only for short reset windows and preserve explicit rate-limit surfacing otherwise
  - verify docs record the header/reset semantics used for pacing and classification
- Monitoring / alerts:
  - keep evidence in the current workpad and task packet; no new alerting channel required

## Open Questions
- Should the bounded wait ceiling be shared/configurable later, or stay hard-coded for this narrow lane until more evidence exists?
- Is there a safe additional reread reduction beyond the post-turn seam without touching the broader dispatch/control-host model?

## Approvals
- Reviewer: docs-review approved via `/Users/kbediako/Code/CO/.runs/linear-ebb62cc0-77d0-41e4-8640-abbd5126cced-docs-review/cli/2026-03-29T11-31-24-681Z-749a0ed3/manifest.json`
- Date: 2026-03-29

## Freshness Review
- 2026-04-29: CO-409 PR #719 freshness review reread this historical task packet/mirror after the Mar 29 cadence crossed the gate; content remains valid for its original issue scope, so only freshness metadata was refreshed under live docs:freshness:maintain owner CO-409.
