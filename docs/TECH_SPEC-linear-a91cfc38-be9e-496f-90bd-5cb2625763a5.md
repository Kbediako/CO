---
id: 20260518-linear-a91cfc38-be9e-496f-90bd-5cb2625763a5
title: CO-555 exclude terminal retryable provider claims from active WIP
relates_to: docs/PRD-linear-a91cfc38-be9e-496f-90bd-5cb2625763a5.md
risk: high
owners:
  - Codex
last_review: 2026-05-18
related_action_plan: docs/ACTION_PLAN-linear-a91cfc38-be9e-496f-90bd-5cb2625763a5.md
task_checklists:
  - tasks/tasks-linear-a91cfc38-be9e-496f-90bd-5cb2625763a5.md
---

# TECH_SPEC Mirror - CO-555 exclude terminal retryable provider claims from active WIP

This mirror intentionally matches `tasks/specs/linear-a91cfc38-be9e-496f-90bd-5cb2625763a5.md` for docs-surface discoverability.

## Objective
Exclude terminal Linear issues from provider-intake active WIP and retry projections even when retained run metadata says `retry_queued=true`, `state=resumable`, or `provider_issue_rehydrated_resumable_run`.

## Scope
- provider-intake active and retry predicates
- provider issue rehydration release behavior
- selected-run and control runtime retry projections
- focused terminal and non-terminal retry regression coverage

## Key Requirements
- Terminal issue metadata must be evaluated before retry/resumable active-WIP logic.
- Terminal rehydration must preserve audit metadata but release/non-activate the claim.
- Non-terminal retry/resumable workers must remain active and retry-visible.
- No manual `provider-intake-state.json` edits or CO-512-specific branches.

## Fallback / Refactor Decision
This lane removes stale terminal retry/resumable active-WIP behavior while retaining inactive terminal audit evidence. A narrow fix is acceptable because terminal Linear issue truth becomes the single precedence rule and no new provider-intake authority is introduced.

- Large-refactor decision: not required; existing provider-intake predicates and rehydration paths already own the authority boundary.
- Minor-seam decision: acceptable because the retained path is inactive audit evidence only and focused tests cover both terminal and non-terminal paths.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Provider-intake retry/resumable WIP | Cached `retry_queued` or `resumable` metadata can mark a terminal Linear issue active before terminal issue-state exclusion. | `remove fallback` | CO-555 | Live issue metadata is terminal (`Done`/completed, canceled, duplicate, archived, or trashed) for a retry/resumable provider claim. | Observed 2026-05-18 | 2026-05-18 | This issue | Terminal issue metadata is checked before retry/resumable active-WIP and retry projections. | CO-512-shaped provider-intake and provider-handoff regressions plus full validation floor. |
| Retained terminal provider audit evidence | Historical retry/run metadata remains visible after terminal release. | `justify retaining fallback` | Provider-intake control-host | Terminal issue has retained provider run or retry metadata after release/non-active classification. | Existing provider-intake audit retention behavior | 2026-05-18 | Durable audit contract | Separate archival policy replaces retained provider-intake audit rows with equivalent source-labeled evidence. | Regression asserts retained terminal retry metadata is inactive while non-terminal retry remains active. |

- Contract name: provider-intake retained terminal audit evidence.
- Owning surface: provider-intake control-host claim persistence and status projection.
- Steady-state proof: terminal retry/run metadata is retained only as inactive source-labeled audit evidence and never consumes active WIP.
- Tests/docs: focused `ProviderIntakeState` and `ProviderIssueHandoff` regressions plus this CO-555 packet.
- Non-expiring rationale: retained audit evidence is durable operator traceability, not temporary compatibility debt; remove only after a reviewed archival replacement preserves equivalent evidence.

## Validation Plan
- Focused `ProviderIntakeState` terminal and non-terminal retry coverage.
- Focused `ProviderIssueHandoff` terminal queued/rehydration coverage.
- Full provider-worker validation floor after merge with `origin/main`.
- Manifest-backed standalone review, explicit elegance pass, and PR ready-review drain.
