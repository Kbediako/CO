# PRD - CO STATUS: clear stale retry state when active claims rehydrate so one issue cannot appear in both Running and Backoff

## Added by Bootstrap 2026-04-10

## Traceability
- Linear issue: `CO-145` / `cb368f80-6d3e-4deb-b89b-4bd3577562cc`
- Linear URL: https://linear.app/asabeko/issue/CO-145/co-status-clear-stale-retry-state-when-active-claims-rehydrate-so-one
- Related live shape: `CO-127`

## Summary
- Problem Statement: `CO STATUS` can currently render the same issue as both actively `Running` and queued in `Backoff` after an authoritative active-run rehydrate. The current code path restores the claim to `state: running` / `reason: provider_issue_rehydrated_active_run`, but stale retry metadata can survive on the same claim record, so the runtime/dashboard layers truthfully project both slices from inconsistent source-of-truth state.
- Desired Outcome: active-run rehydrate/upsert paths clear or supersede stale retry metadata once a claim is authoritatively running again, while real retry-owned and resumable flows continue to preserve Backoff semantics.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): finish the claim-state repair instead of adding renderer dedupe heuristics. When a live in-progress run rebinds to a claim, that claim should stop looking retry-queued unless it is still genuinely retry-owned, and the fix should preserve real resumable or handoff-failed retry behavior.
- Success criteria / acceptance:
  - a single issue cannot appear in both `Running` and `Backoff` after authoritative active-run rehydrate
  - rehydrated-running claim writes clear stale `retry_queued`, `retry_due_at`, and `retry_error`
  - real retry/resumable flows still render in `Backoff` correctly
  - focused regressions cover the `CO-127` stale-retry rehydrate shape
  - `CO STATUS` does not need special duplicate suppression for this case because the claim truth is correct upstream
- Constraints / non-goals:
  - do not reopen `CO-112` EVENT provenance work
  - do not reopen `CO-138` merge-closeout stale-claim cleanup
  - do not solve synthetic `linear-...` fallback rows in this lane
  - do not broaden the lane into generic queue-renderer dedupe heuristics

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `CO STATUS`
  - `clear stale retry state when active claims rehydrate`
  - `one issue cannot appear in both Running and Backoff`
  - `retry_queued`
  - `retry_due_at`
  - `retry error state`
  - `provider_issue_rehydrated_active_run`
  - `CO-127`
- Protected terms / exact artifact and surface names:
  - `Running`
  - `Backoff`
  - `providerIssueHandoff.ts`
  - `providerIntakeState.ts`
  - `retry_queued`
  - `retry_due_at`
  - `retry_error`
  - `resumable`
  - `handoff_failed`
- Nearby wrong interpretations to reject:
  - `fix this only by deduping rows in the UI`
  - `clear retry metadata for genuine retry-owned or resumable claims`
  - `reopen merge-closeout cleanup because merge_closeout and retry fields both exist on claims`
  - `treat synthetic fallback rows as part of this lane`

## Parity / Alignment Matrix
- Required for parity/alignment lanes; otherwise state `Not applicable`.
- Current truth:
  - `providerIssueHandoff.ts` already writes active rehydrate claims back to `state: running` with reason `provider_issue_rehydrated_active_run`
  - those rehydrate writes explicitly clear `merge_closeout`, but they can still preserve stale retry metadata on the same claim
  - `providerIntakeState.ts` clears retry fields automatically only under bounded state/default conditions; otherwise existing retry fields can persist
  - runtime/dashboard surfaces are mostly truthful because running state and backoff state currently key off different claim properties
- Reference truth:
  - once a claim is authoritatively rebound to an active run, retry metadata only remains when the claim is still genuinely retry-owned
  - renderer logic stays thin because claim truth is internally consistent
- Target truth / intended delta:
  - every active-run rehydrate/upsert path clears stale retry metadata unless the claim is intentionally retry-owned
  - real retry/resumable flows continue to preserve backoff semantics
  - status/rendering remains source-of-truth driven
- Explicitly out-of-scope differences:
  - renderer-level dedupe heuristics
  - fallback-row identity bugs
  - EVENT provenance or merge-closeout cleanup work beyond the stale retry seam

## Not Done If
- a rehydrated running claim can still keep `retry_queued: true` plus stale `retry_due_at` / `retry_error` without being genuinely retry-owned
- the same issue can still truthfully show up in both `Running` and `Backoff` after authoritative rehydrate
- the fix breaks real resumable or handoff-failed retry behavior

## Goals
- Clear stale retry metadata on authoritative active-run rehydrate/upsert paths.
- Preserve real retry/backoff semantics for genuinely retry-owned claims.
- Add focused regression coverage for the observed stale-retry rehydrate shape.
- Keep `CO STATUS` projection logic simple by fixing claim truth rather than patching output duplication.

## Non-Goals
- Reopening `CO-112`, `CO-138`, or synthetic fallback-row identity work.
- Adding generic UI duplicate-suppression logic for `Running` vs `Backoff`.
- Broad retry-system redesign outside the active-run rehydrate seam.

## Stakeholders
- Product: CO operators relying on truthful `CO STATUS` Running/Backoff sections
- Engineering: provider claim handoff, intake-state, and status/runtime maintainers
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - rehydrated running claims no longer remain queued in `Backoff`
  - true retry-owned claims still project to `Backoff`
  - focused tests capture both the regression and the preserved retry behavior
- Guardrails / Error Budgets:
  - keep the fix bounded to claim-state truth
  - avoid widening into renderer heuristics or unrelated claim cleanup
  - preserve current retry semantics for real resumable/handoff-failed flows

## User Experience
- Personas:
  - operator watching `CO STATUS`
  - reviewer validating claim-state correctness from tests/artifacts
- User Journeys:
  - the operator sees a running issue only in `Running` once the claim rehydrates onto a live run
  - a genuinely retry-owned issue still appears in `Backoff`
  - the reviewer can verify the seam from focused claim-state regressions without renderer-specific caveats

## Technical Considerations
- Architectural Notes:
  - `providerIssueHandoff.ts` owns the active-run rehydrate/write paths
  - `providerIntakeState.ts` owns claim upsert defaults and retry-field persistence behavior
  - runtime/dashboard layers already mostly reflect current claim truth, so the source-of-truth fix should stay upstream
  - the current shared-root intake artifact no longer reproduces the stale `CO-127` shape, so the rework branch treats focused regressions as the authoritative proof instead of overstating live local artifact coverage
- Dependencies / Integrations:
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/control/providerIntakeState.ts`
  - `orchestrator/tests/ProviderIssueHandoff.test.ts`
  - `orchestrator/tests/ProviderIntakeState.test.ts`
  - `orchestrator/tests/ControlRuntime.test.ts`

## Open Questions
- Should the stale-retry clear happen only in the rehydrate writers, or is there also one bounded intake-state default seam that should be tightened so future running upserts cannot accidentally preserve retry state?

## Approvals
- Product: Self-approved from the Linear issue scope
- Engineering: Audited `codex-orchestrator docs-review` child stream `docs-review-rework-rerun` passed `spec-guard`, `docs:check`, `docs:freshness`, and forced standalone review cleanly after the one-line `docs/TASKS.md` budget fix. Evidence: `.runs/linear-cb368f80-6d3e-4deb-b89b-4bd3577562cc-docs-review-rework-rerun/cli/2026-04-10T10-09-14-033Z-b783a0b7/manifest.json`, `.runs/linear-cb368f80-6d3e-4deb-b89b-4bd3577562cc-docs-review-rework-rerun/cli/2026-04-10T10-09-14-033Z-b783a0b7/run-summary.json`.
- Design: N/A
