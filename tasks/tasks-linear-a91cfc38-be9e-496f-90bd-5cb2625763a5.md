# Task Checklist - linear-a91cfc38-be9e-496f-90bd-5cb2625763a5

- Linear Issue: `CO-555` / `a91cfc38-be9e-496f-90bd-5cb2625763a5`
- Task registry id: `20260518-linear-a91cfc38-be9e-496f-90bd-5cb2625763a5`
- MCP Task ID: `linear-a91cfc38-be9e-496f-90bd-5cb2625763a5`
- Primary PRD: `docs/PRD-linear-a91cfc38-be9e-496f-90bd-5cb2625763a5.md`
- TECH_SPEC: `tasks/specs/linear-a91cfc38-be9e-496f-90bd-5cb2625763a5.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-a91cfc38-be9e-496f-90bd-5cb2625763a5.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-a91cfc38-be9e-496f-90bd-5cb2625763a5.md`
- Linear workpad: `b7f6b317-12bc-4a87-aab7-cfb0b7fc41bb`

## Docs-First
- [x] Live issue-context read before implementation. Evidence: `codex-orchestrator linear issue-context --issue-id a91cfc38-be9e-496f-90bd-5cb2625763a5 --format json` reported `Ready`, UUID `a91cfc38-be9e-496f-90bd-5cb2625763a5`, and no attached PR.
- [x] Issue moved to the team's active state before coding. Evidence: CO-555 moved `Ready` -> `In Progress`.
- [x] Workpad created and maintained as a single active comment. Evidence: Linear workpad `b7f6b317-12bc-4a87-aab7-cfb0b7fc41bb`.
- [x] Exactly one `linear parallelization` decision recorded. Evidence: `parallelize_now` / `independent_scope_available`; same-issue child lane `terminal-retry-tests` completed successfully before parent invalidated stale patch metadata and reimplemented final tests.
- [x] PRD created with live CO-555 issue contract, protected terms, non-goals, Not Done If, and fallback/refactor decisions. Evidence: `docs/PRD-linear-a91cfc38-be9e-496f-90bd-5cb2625763a5.md`.
- [x] TECH_SPEC created with root-cause design boundaries and validation plan. Evidence: `tasks/specs/linear-a91cfc38-be9e-496f-90bd-5cb2625763a5.md`, `docs/TECH_SPEC-linear-a91cfc38-be9e-496f-90bd-5cb2625763a5.md`.
- [x] ACTION_PLAN created for implementation, validation, review, PR drain, and handoff sequencing. Evidence: `docs/ACTION_PLAN-linear-a91cfc38-be9e-496f-90bd-5cb2625763a5.md`.
- [x] Checklist mirrored to `.agent/task`. Evidence: `.agent/task/linear-a91cfc38-be9e-496f-90bd-5cb2625763a5.md`.
- [x] Task registration updated in canonical `tasks/index.json` `items[]` shape. Evidence: `tasks/index.json`.

## Acceptance Criteria
- [x] Terminal Linear states (`Done`/completed, canceled/cancelled, duplicate, archived/trashed where surfaced) take precedence over `retry_queued`, `resumable`, and resume-eligible historical run status for active WIP accounting. Evidence: shared terminal predicate now gates active/retry helpers and projection retry state.
- [x] Rehydration paths that find resume-eligible runs for terminal issues preserve audit evidence but downgrade/release/ignore the active claim instead of queuing retry WIP. Evidence: provider issue handoff rehydration releases terminal retry/resumable claims and clears retry WIP fields.
- [x] `co-status`, freshness-gauge, and quota-hygiene surfaces no longer count terminal retryable/resumable claims as active or retrying, while still surfacing retained terminal audit evidence. Evidence: runtime and selected-run retry projections use terminal-aware helpers and retained retry metadata reports inactive.
- [x] Regression coverage includes a CO-512-shaped fixture: live issue Done/completed plus stale failed/resume-eligible run plus `retry_queued=true` must not produce an active claim or selected active issue. Evidence: `ProviderIntakeState.test.ts` and `ProviderIssueHandoff.test.ts` CO-512-shaped tests.
- [x] Regression coverage includes the CO-554-shaped completed-retry fixture: cached `state=completed`, `reason=provider_issue_rehydrated_completed_run`, `retry_queued=true`, cached `issue_state=In Progress`/`started`, fresh live `Done`/`completed`, expected retry cleared/inactive and no start/resume/requeue. Evidence: `ProviderIssueHandoff.test.ts` exact CO-554-shaped rehydrate test plus `ControlRuntime.test.ts` terminal selected-retry clearing projection test.
- [x] Existing non-terminal retry/resumable workers remain active and retry-visible. Evidence: non-terminal retry-resumable provider-intake regression.
- [x] No manual `provider-intake-state.json` edits are required. Evidence: no state files changed; supported control-host logic converges the stale claim.

## Protected Issue Terms
- [x] `provider-intake-state.json`
- [x] `provider_issue_rehydrated_resumable_run`
- [x] `retry_queued`
- [x] `resumable`
- [x] `issue_state=Done`
- [x] `issue_state_type=completed`
- [x] `active_issue_identifiers`
- [x] `isActiveProviderIntakeClaim`
- [x] terminal Linear truth
- [x] no manual state edits

## Fallback Decision Table
- Large-refactor decision: not required; this lane removes stale terminal active-WIP authority from existing provider-intake predicates and rehydration without splitting source authority.
- Minor-seam decision: acceptable because terminal Linear truth wins before retry/resumable metadata and retained terminal evidence is inactive audit evidence only.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Provider-intake retry/resumable WIP | Cached `retry_queued` or `resumable` metadata can mark a terminal Linear issue active before terminal issue-state exclusion. | `remove fallback` | CO-555 | Live issue metadata is terminal (`Done`/completed, canceled, duplicate, archived, or trashed) for a retry/resumable provider claim. | Observed 2026-05-18 | 2026-05-18 | This issue | Terminal issue metadata is checked before retry/resumable active-WIP and retry projections. | CO-512-shaped provider-intake and provider-handoff regressions plus full validation floor. |
| Retained terminal provider audit evidence | Historical retry/run metadata remains visible after terminal release. | `justify retaining fallback` | Provider-intake control-host | Terminal issue has retained provider run or retry metadata after release/non-active classification. | Existing provider-intake audit retention behavior | 2026-05-18 | Durable audit contract | Separate archival policy replaces retained provider-intake audit rows with equivalent source-labeled evidence. | Regression asserts retained terminal retry metadata is inactive while non-terminal retry remains active. |

- Contract name: provider-intake retained terminal audit evidence.
- Owning surface: provider-intake control-host claim persistence and status projection.
- Steady-state proof: terminal retry/run metadata is retained only as inactive source-labeled audit evidence and never consumes active WIP.
- Tests/docs: focused `ProviderIntakeState` and `ProviderIssueHandoff` regressions plus this CO-555 packet.
- Non-expiring rationale: retained audit evidence is durable operator traceability, not temporary compatibility debt; remove only after a reviewed archival replacement preserves equivalent evidence.

## Implementation
- [x] Inspect provider-intake active claim and retry selection. Evidence: root cause isolated to retry/resumable checks occurring before terminal issue-state exclusion.
- [x] Implement terminal-aware active/retry predicates. Evidence: `providerIntakeState.ts` exports terminal issue-state predicate and `hasQueuedProviderIntakeRetry` ignores terminal issues.
- [x] Implement terminal-aware rehydration release and capacity helpers. Evidence: `providerIssueHandoff.ts` releases terminal retry/resumable claims and excludes terminal queued claims from poll/admission occupancy.
- [x] Update runtime and selected-run retry projections. Evidence: `controlRuntime.ts` and `selectedRunProjection.ts` suppress terminal retry state.
- [x] Add focused regression coverage. Evidence: `ProviderIntakeState.test.ts`, `ProviderIssueHandoff.test.ts`, and `ControlRuntime.test.ts`.

## Validation
- [x] Same-issue child lane. Evidence: `terminal-retry-tests` run `2026-05-18T19-23-32-870Z-f45dcca5` completed successfully; parent invalidated stale patch metadata and reimplemented final tests directly.
- [x] Focused provider-intake/handoff regression. Evidence: full `ProviderIssueHandoff.test.ts` passed after review feedback, including terminal release side effects after an earlier pending claim and the exact CO-554 completed-retry rehydrate fixture.
- [x] Full provider-worker validation floor. Evidence: delegation guard, spec guard dry-run, git diff check, build, lint, full test, docs:check, docs:freshness, repo:stewardship, diff-budget, and pack:smoke passed after current-main merge and review-feedback fixes.
- [x] Manifest-backed standalone review. Evidence: latest enforced review completed with `review_verdict=clean`, `contract_validation.status=valid`, `contract_overall_verdict=clean`, and zero findings after the side-effect short-circuit fix.
- [x] Explicit elegance/minimality pass. Evidence: manual post-review checklist found no avoidable abstraction; retained one shared terminal predicate plus local rehydration release side-effect helper and narrow projection clearing.
- [ ] PR ready-review drain. Evidence: pending after post-merge validation and branch push.

## Progress Log
- 2026-05-18: Live issue-context read confirmed CO-555 was `Ready`, then moved to `In Progress`.
- 2026-05-18: Workpad created, decomposition matrix recorded, and `parallelize_now` decision launched `terminal-retry-tests`.
- 2026-05-18: Implemented terminal-aware provider-intake active/retry and rehydration release behavior.
- 2026-05-18: Validation floor passed before the PR opened; standalone review rerun returned clean after fixing terminal poll occupancy.
- 2026-05-18: PR #834 opened and attached; ready-review stopped because the branch was behind `main`; current-main merge applied cleanly and post-merge validation is underway.

## Notes
- Parent orchestration remains responsible for PR feedback drain, Linear state handoff, and final workpad closeout.
