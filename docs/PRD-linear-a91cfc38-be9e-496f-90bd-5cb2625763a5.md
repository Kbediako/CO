# PRD - CO-555 exclude terminal retryable provider claims from active WIP

## Traceability
- Linear issue: `CO-555` / `a91cfc38-be9e-496f-90bd-5cb2625763a5`
- Linear URL: https://linear.app/asabeko/issue/CO-555/co-exclude-terminal-retryable-provider-claims-from-active-wip
- Task registry id: `20260518-linear-a91cfc38-be9e-496f-90bd-5cb2625763a5`
- MCP Task ID: `linear-a91cfc38-be9e-496f-90bd-5cb2625763a5`
- Source evidence: live `linear issue-context` on 2026-05-18 plus parent-provided CO-512 control-host/provider-intake evidence after PR #829 merged.

## Summary
- Problem Statement: after CO-512 moved to Linear `Done` / completed, `provider-intake-state.json` could rehydrate the retained failed run as `state=resumable`, `reason=provider_issue_rehydrated_resumable_run`, and `retry_queued=true`, causing `co-status` and related provider-intake projections to count the terminal issue as active WIP.
- Desired Outcome: terminal Linear truth takes precedence over retry/resumable run metadata everywhere active WIP and retry selection are computed, while retained terminal run evidence remains visible only as audit evidence.

## User Request Translation
- User intent / needs: fix the root provider-intake/control-host logic so terminal retryable or resumable claims cannot appear in active WIP, retry counts, selected active issues, freshness-gauge, or quota-hygiene surfaces.
- Success criteria / acceptance:
  - Terminal Linear states such as `Done` / completed, canceled, duplicate, archived, or trashed override `retry_queued`, `resumable`, and historical resume eligibility.
  - Rehydration preserves audit evidence but releases or ignores terminal retry/resumable claims instead of queuing retry WIP.
  - `co-status`, freshness-gauge, and quota-hygiene surfaces exclude terminal retryable claims from active and retrying projections.
  - CO-512-shaped regression coverage proves Done/completed plus stale resume-eligible retry does not become active.
  - Non-terminal retry/resumable claims remain active and retry-visible.
  - No manual `provider-intake-state.json` edits.
- Constraints / non-goals:
  - Do not relaunch CO-512.
  - Do not hide retry state only in `co-status`.
  - Do not weaken active WIP/retry accounting for non-terminal workers.
  - Do not delete retained audit history.
  - Do not broaden into a control-host rewrite beyond the terminal retryable/resumable invariant.

## Intent Checksum
- Protected terms / exact artifact and surface names:
  - `provider-intake-state.json`
  - `provider_issue_rehydrated_resumable_run`
  - `retry_queued`
  - `resumable`
  - `issue_state=Done`
  - `issue_state_type=completed`
  - `active_issue_identifiers`
  - `isActiveProviderIntakeClaim`
  - terminal Linear truth
  - no manual state edits
- Nearby wrong interpretations to reject:
  - hand-editing or deleting `provider-intake-state.json`
  - relaunching CO-512
  - suppressing only one UI/status surface
  - treating cached run status as stronger than terminal live Linear state
  - dropping retained audit metadata entirely

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth | Target truth | Explicitly out-of-scope differences |
| --- | --- | --- | --- | --- |
| Active provider-intake claim selection | `retry_queued=true` or `state=resumable` can mark a claim active before terminal issue metadata is considered. | Live terminal Linear issue truth is stronger than retry/resume metadata. | Terminal issue metadata makes the claim non-active before retry/resumable checks. | Non-terminal retry workers and unrelated queue policy. |
| Rehydrated resume-eligible historical run | A terminal issue can be rehydrated as `provider_issue_rehydrated_resumable_run`. | Terminal live issue truth must release retry WIP while retaining audit evidence. | Rehydration writes a released/non-active audit row or ignores active retry queuing for terminal issues. | Manual state-file cleanup or issue-specific CO-512 branching. |
| Status/freshness/quota surfaces | Terminal retry metadata can inflate `retrying`, `active_issue_identifiers`, and selected active issue output. | Operator WIP surfaces should count only non-terminal active work. | Terminal retry metadata is surfaced as inactive retained audit evidence, not active/retrying WIP. | Dashboard redesign or unrelated quota-hygiene automation. |

## Not Done If
- A terminal Linear issue can still appear in `provider_intake.active_issue_identifiers` because `retry_queued` or `state=resumable` bypasses terminal issue-state exclusion.
- `nudge` can classify a terminal issue as ignored/non-active but a later rehydration restores an active retry claim.
- The fix only patches the current CO-512 row instead of the provider-intake/retry selection logic.
- Existing non-terminal retry/resumable workers stop appearing as active or retry-visible.

## Goals
- Make terminal Linear issue truth the first active-WIP predicate for provider-intake claims.
- Release terminal retry/resumable rehydration attempts while preserving audit evidence.
- Keep non-terminal retry/resumable claims active.
- Add focused CO-512-shaped regression coverage and broader provider-intake/handoff coverage for terminal queued/retry occupancy.

## Non-Goals
- No CO-512 relaunch.
- No manual intake-state mutation.
- No deletion of retained provider-intake audit history.
- No broad control-host status surface rewrite.
- No weakening of active WIP/retry accounting for non-terminal workers.

## Stakeholders
- Product: CO operators monitoring provider WIP and retry queues.
- Engineering: provider-intake/control-host maintainers and provider-worker reviewers.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics:
  - CO-512-shaped terminal retry fixture is non-active and not selected.
  - Rehydration of terminal resume-eligible runs releases retry WIP instead of starting/resuming.
  - Non-terminal retry/resumable regression remains active and retry-visible.
  - Full provider-worker validation floor remains green.
- Guardrails / Error Budgets:
  - zero manual `provider-intake-state.json` edits
  - zero issue-specific terminal issue branches
  - zero hiding-only UI fixes
  - zero active-WIP weakening for non-terminal workers

## Technical Considerations
- Architectural Notes:
  - The fix belongs in shared provider-intake active/retry predicates and rehydration release behavior, not only downstream display.
  - Terminal metadata includes issue state/type and archived/trashed indicators where available.
  - Retained terminal evidence remains source-labeled audit history but is not WIP capacity.
- Dependencies / Integrations:
  - provider-intake claim persistence
  - provider issue handoff rehydration
  - control runtime and selected-run projections
  - `co-status`, freshness-gauge, and quota-hygiene consumers

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- `remove fallback`: stale terminal retry/resumable metadata must not remain active WIP after terminal Linear truth is available.
- `justify retaining fallback`: retained terminal retry/run metadata remains supported audit evidence while inactive.
- Large-refactor check: not required; this lane removes stale active-WIP authority from existing provider-intake predicates and rehydration without introducing another source of truth.
- Minor-seam decision: acceptable because terminal issue truth becomes the single precedence rule, the change does not add a launch path, and focused tests protect activation and non-activation paths.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Provider-intake retry/resumable WIP | Cached `retry_queued` or `resumable` metadata can mark a terminal Linear issue active before terminal issue-state exclusion. | `remove fallback` | CO-555 | Live issue metadata is terminal (`Done`/completed, canceled, duplicate, archived, or trashed) for a retry/resumable provider claim. | Observed 2026-05-18 | 2026-05-18 | This issue | Terminal issue metadata is checked before retry/resumable active-WIP and retry projections. | CO-512-shaped provider-intake and provider-handoff regressions plus full validation floor. |
| Retained terminal provider audit evidence | Historical retry/run metadata remains visible after terminal release. | `justify retaining fallback` | Provider-intake control-host | Terminal issue has retained provider run or retry metadata after release/non-active classification. | Existing provider-intake audit retention behavior | 2026-05-18 | Durable audit contract | Separate archival policy replaces retained provider-intake audit rows with equivalent source-labeled evidence. | Regression asserts retained terminal retry metadata is inactive while non-terminal retry remains active. |

- Contract name: provider-intake retained terminal audit evidence.
- Owning surface: provider-intake control-host claim persistence and status projection.
- Steady-state proof: terminal retry/run metadata is retained only as inactive source-labeled audit evidence and never consumes active WIP.
- Tests/docs: focused `ProviderIntakeState` and `ProviderIssueHandoff` regressions plus this CO-555 packet.
- Non-expiring rationale: retained audit evidence is a durable operator traceability contract, not temporary compatibility debt; remove only after a reviewed archival replacement preserves equivalent evidence.

## Open Questions
- None remaining for implementation; review handoff depends on branch currency, validation, standalone review, and PR feedback drain.

## Approvals
- Product: live CO-555 issue acceptance criteria.
- Engineering: provider-worker lane issue-quality review on 2026-05-18.
- Design: N/A.
