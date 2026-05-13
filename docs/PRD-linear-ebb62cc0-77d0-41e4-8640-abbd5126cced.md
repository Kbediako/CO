# PRD - CO: Surface and handle Linear rate limits in provider tracked-issue rereads

## Added by Bootstrap 2026-03-29

## Traceability
- Linear issue: `CO-34` / `ebb62cc0-77d0-41e4-8640-abbd5126cced`
- Linear URL: https://linear.app/asabeko/issue/CO-34/co-surface-and-handle-linear-rate-limits-in-provider-tracked-issue
- Related source issue: `CO-33`

## Summary
- Problem Statement: `CO-33` fixed the active provider-worker helper write seam, but tracked-issue rereads still collapse Linear `RATELIMITED` responses into generic dispatch-source request failures. When that happens after a successful cached helper read, provider-worker runs end as `tracked_issue_read_failed`, operator/control-host surfaces cannot tell the difference between true rate limiting and other read failures, and CO keeps applying unnecessary reread pressure around active provider lanes.
- Desired Outcome: Preserve explicit Linear rate-limit classification and reset metadata through tracked-issue rereads, allow a short safe reset-aware wait only when it is bounded, and reduce unnecessary reread/poll pressure without weakening truthfulness or issue-ownership checks.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): Finish `CO-34` in the current workspace by repairing the provider tracked-issue reread seam, keeping the earlier `CO-33` helper mutation fix out of scope, and leaving a review-ready docs, test, and proof trail in the repo plus the single Linear workpad comment.
- Success criteria / acceptance:
  - tracked-issue rereads report an explicit rate-limit class with request/reset metadata instead of generic provider request failure text
  - provider-worker proof and control-host read surfaces can distinguish tracked-issue rate limits from other lookup failures
  - rereads only wait through a short reset window when the wait is clearly bounded and safe, otherwise they fail explicitly as rate-limited
  - focused regressions cover by-id tracked-issue rate limits and worker post-turn reread behavior
  - docs reference the Linear response headers used for classification and pacing
- Constraints / non-goals:
  - do not widen into global Linear caching
  - do not rewrite the full dispatch or control-host polling model
  - do not reopen the helper mutation/write seam from `CO-33` except for shared reusable rate-limit metadata

## Goals
- Preserve Linear rate-limit classification in the exact tracked-issue-by-id reread path used by provider workers.
- Carry retryable and reset-window metadata into the provider worker proof so control-host read surfaces can expose it truthfully.
- Add bounded reset-aware retry/backoff only where the worker can safely wait without hiding longer-lived rate limits.
- Reduce avoidable tracked-issue reread pressure around active provider lanes while keeping ownership and state truth authoritative.

## Non-Goals
- Building a broad cross-run Linear cache.
- Replacing the current provider polling architecture.
- Changing unrelated workpad formatting, PR handoff, or merge workflow behavior.

## Stakeholders
- Product: CO operators relying on provider-worker truth surfaces during active issue execution
- Engineering: CO maintainers and future provider-worker issue owners
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - provider-worker reread failures preserve explicit Linear rate-limit classification and reset metadata
  - short-window rate limits can self-clear via bounded wait without excess extra reads
  - focused regressions prove the worker no longer turns a retryable tracked-issue rate limit into an opaque `tracked_issue_read_failed`
- Guardrails / Error Budgets:
  - keep the fix scoped to tracked-issue reread transport, worker proof plumbing, and focused tests/docs
  - preserve truthfulness when the reset window is too long or headers are missing by failing explicitly instead of silently retrying
  - avoid weakening ownership checks or letting stale cached issue data drive started/review-state decisions

## User Experience
- Personas: provider worker, control-host/operator, reviewer diagnosing active-lane failures
- User Journeys:
  - a worker completes a turn, rereads the tracked issue, and either proceeds normally, waits a short bounded reset window, or ends with an explicit rate-limit reason plus reset metadata
  - an operator reading control-host surfaces can distinguish tracked-issue rate limiting from other lookup failures without inspecting raw logs
  - a reviewer can audit the pacing semantics in docs and the exact failure-mode coverage in focused tests

## Technical Considerations
- Architectural Notes:
  - the current collapse point is `orchestrator/src/cli/control/linearDispatchSource.ts`, where tracked-issue GraphQL failures still map to generic `dispatch_source_provider_request_failed`
  - `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts` already implements the bounded `linear_rate_limited` classification and Linear header parsing introduced by `CO-33`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts` currently converts tracked-issue reread failures into a plain thrown error string and persists only `end_reason: tracked_issue_read_failed`
- Dependencies / Integrations:
  - Linear GraphQL API response headers: `retry-after`, `x-ratelimit-requests-reset`, `x-ratelimit-requests-remaining`, and related endpoint/complexity headers
  - provider-worker proof propagation through `selectedRunProjection`, `controlRuntime`, and observability payloads
  - focused tests in `orchestrator/tests/LinearDispatchSource.test.ts`, `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`, and any adjacent control-host read-model tests if the proof shape changes

## Open Questions
- What exact reset-window ceiling is short enough to wait through in the worker without making turns feel hung or misleading?
- Should short-window retry use only `requests_reset_at`, or also honor a smaller `retry-after` value when both are present?

## Approvals
- Product: Self-approved from the Linear issue scope
- Engineering: Pending docs-review and implementation validation
- Design: N/A

## Freshness Review
- 2026-04-29: CO-409 PR #719 freshness review reread this historical task packet/mirror after the Mar 29 cadence crossed the gate; content remains valid for its original issue scope, so only freshness metadata was refreshed under live docs:freshness:maintain owner CO-409.
