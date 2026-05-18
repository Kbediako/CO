# ACTION_PLAN - CO-555 exclude terminal retryable provider claims from active WIP

## Summary
- Goal: stop terminal retryable/resumable provider-intake claims from consuming active WIP or retry capacity after live Linear truth is terminal.
- Scope: provider-intake active/retry classification, provider issue rehydration release, runtime/selected-run projections, focused tests, docs packet, review, and PR handoff.
- Assumptions:
  - CO-512 is an incident exemplar, not an identifier to special-case.
  - Terminal issue metadata attached to claims is authoritative when present.
  - Retained terminal run metadata remains useful audit evidence but must be inactive.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `provider-intake-state.json`
  - `provider_issue_rehydrated_resumable_run`
  - `retry_queued`
  - `resumable`
  - `issue_state=Done`
  - `issue_state_type=completed`
  - `active_issue_identifiers`
  - terminal Linear truth
  - no manual state edits
- Not done if:
  - terminal retryable/resumable claims remain in active WIP or retry counts
  - rehydration restores terminal issues as active retry claims
  - only a single projection hides the row
  - non-terminal retry/resumable workers stop counting as active
- Pre-implementation issue-quality review:
  - CO-555 is a provider-intake root-cause fix, not manual state cleanup.
  - The micro-task path is unavailable because stale/cache/retry precedence defines correctness.
- Fallback / refactor decision:
  - `remove fallback`: stale terminal retry/resumable active-WIP occupancy.
  - `justify retaining fallback`: inactive retained terminal audit evidence.
- Durable retention evidence:
  - Retained terminal audit evidence is a provider-intake traceability contract and does not confer active WIP authority.
- Large-refactor check: not required because the implementation centralizes terminal precedence in existing predicates and rehydration helpers without adding another authority source.
- Minor-seam decision: acceptable only because terminal Linear truth wins before retry/resumable metadata and non-terminal retry behavior remains covered.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Provider-intake retry/resumable WIP | Cached `retry_queued` or `resumable` metadata can mark a terminal Linear issue active before terminal issue-state exclusion. | `remove fallback` | CO-555 | Live issue metadata is terminal (`Done`/completed, canceled, duplicate, archived, or trashed) for a retry/resumable provider claim. | Observed 2026-05-18 | 2026-05-18 | This issue | Terminal issue metadata is checked before retry/resumable active-WIP and retry projections. | CO-512-shaped provider-intake and provider-handoff regressions plus full validation floor. |
| Retained terminal provider audit evidence | Historical retry/run metadata remains visible after terminal release. | `justify retaining fallback` | Provider-intake control-host | Terminal issue has retained provider run or retry metadata after release/non-active classification. | Existing provider-intake audit retention behavior | 2026-05-18 | Durable audit contract | Separate archival policy replaces retained provider-intake audit rows with equivalent source-labeled evidence. | Regression asserts retained terminal retry metadata is inactive while non-terminal retry remains active. |

- Contract name: provider-intake retained terminal audit evidence.
- Owning surface: provider-intake control-host claim persistence and status projection.
- Steady-state proof: terminal retry/run metadata is retained only as inactive source-labeled audit evidence and never consumes active WIP.
- Tests/docs: focused `ProviderIntakeState` and `ProviderIssueHandoff` regressions plus this CO-555 packet.
- Non-expiring rationale: retained audit evidence is durable operator traceability, not temporary compatibility debt; remove only after a reviewed archival replacement preserves equivalent evidence.

## Milestones & Sequencing
1. Read live CO-555 issue-context, move Ready to In Progress, create/update exactly one workpad, and record one parallelization decision.
2. Launch bounded same-issue tests child lane and keep parent source implementation ownership.
3. Inspect provider-intake active/retry predicates, rehydration, runtime, and selected-run projections.
4. Add CO-512-shaped terminal retry regression and non-terminal retry guard coverage.
5. Implement terminal issue-state precedence and terminal rehydration release behavior.
6. Run focused tests, full provider-worker validation floor, standalone review, and explicit elegance pass.
7. Merge latest `origin/main`, rerun required gates after the merge, push, and reopen/update the PR.
8. Attach PR, run `pr ready-review`, refresh workpad, and move to `In Review` only after clean evidence.

## Dependencies
- Live CO-555 issue context.
- Provider-intake claim persistence and rehydration code.
- Runtime/selected-run projection helpers.
- GitHub PR checks and bot feedback.

## Validation
- Checks / tests:
  - focused provider-intake and provider-handoff terminal retry regressions
  - full `ProviderIssueHandoff` coverage after review feedback
  - delegation guard, spec guard, build, lint, test, docs gates, repo stewardship, diff budget, pack smoke
  - manifest-backed standalone review and explicit elegance pass
  - `pr ready-review` drain
- Rollback plan:
  - Revert provider-intake/control-host source, tests, and docs packet if terminal precedence or non-terminal retry accounting regresses.

## Risks & Mitigations
- Risk: terminal suppression also hides non-terminal retries.
  - Mitigation: explicit non-terminal retry/resumable active and retry-visible regression.
- Risk: rehydration loses audit evidence.
  - Mitigation: released/non-active terminal claim preserves run metadata while clearing retry WIP fields.
- Risk: one projection is fixed while another still counts retry WIP.
  - Mitigation: shared terminal predicate reused by active/retry, runtime, selected-run, and handoff paths.

## Approvals
- Reviewer: provider-worker parent lane.
- Date: 2026-05-18.
