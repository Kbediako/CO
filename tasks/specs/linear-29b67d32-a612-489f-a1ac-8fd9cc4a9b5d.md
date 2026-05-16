---
id: 20260516-linear-29b67d32-a612-489f-a1ac-8fd9cc4a9b5d
title: CO-546 attach live Linear state to rehydrated pending-claim revalidation
relates_to: docs/PRD-linear-29b67d32-a612-489f-a1ac-8fd9cc4a9b5d.md
risk: high
owners:
  - Codex
last_review: 2026-05-16
related_action_plan: docs/ACTION_PLAN-linear-29b67d32-a612-489f-a1ac-8fd9cc4a9b5d.md
task_checklists:
  - tasks/tasks-linear-29b67d32-a612-489f-a1ac-8fd9cc4a9b5d.md
---

# TECH_SPEC - CO-546 attach live Linear state to rehydrated pending-claim revalidation

## Canonical Reference
- PRD: `docs/PRD-linear-29b67d32-a612-489f-a1ac-8fd9cc4a9b5d.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-29b67d32-a612-489f-a1ac-8fd9cc4a9b5d.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-29b67d32-a612-489f-a1ac-8fd9cc4a9b5d.md`
- Task checklist: `tasks/tasks-linear-29b67d32-a612-489f-a1ac-8fd9cc4a9b5d.md`
- Linear issue: `CO-546` / `29b67d32-a612-489f-a1ac-8fd9cc4a9b5d`

## Summary
- Objective: attach fresh Linear issue metadata to rehydrated `provider_issue_rehydration_pending_revalidation` claims before preserving them as accepted pending state, so live non-runnable issues release out of active WIP while unavailable evidence remains fail-closed.
- Scope:
  - `ProviderIssueHandoff` rehydrate logic
  - focused pending-revalidation regression coverage
  - docs/task registry mirrors for CO-546
- Constraints:
  - no manual `provider-intake-state.json` edits
  - no CO-510/CO-512 special cases
  - no relaunch of blocked issues
  - no broad CO-542 quota automation changes

## Issue-Shaping Contract
- User-request translation carried forward: fix the root provider-intake/control-host behavior that left CO-510/CO-512 accepted pending-revalidation rows with stale `issue_state=In Progress` and no live Linear state after CO-544 merged.
- Protected terms / exact artifact and surface names: `provider_issue_rehydration_pending_revalidation`, `provider-intake-state.json`, `CO-510`, `CO-512`, `Blocked`, `issue_state=In Progress`, `live_linear_state=null`, `ProviderIssueHandoff`, `rehydrateNow`, `resolveFreshTrackedIssueForActiveClaim`.
- Nearby wrong interpretations to reject: manual intake cleanup, UI-only hiding, stale-cache fail-open, issue-specific branches, relaunching blocked work.
- Explicit non-goals: quota-hygiene automation, dashboard redesign, and weakening live worker WIP accounting.

## Technical Requirements
- Rehydrated accepted pending-revalidation claims must call the live tracked issue refresh path when fresh metadata is requested or resolver support is available.
- If live issue evidence is non-runnable, the claim must persist release/downgrade fields from the live issue and stop occupying active WIP.
- If live issue evidence is runnable but handoff-owned, the pending claim must release rather than relaunch from stale cache.
- If live issue evidence is unavailable, the claim must remain accepted pending-revalidation with explicit fail-closed cached truth.
- Running or resumable stale claims that otherwise demote to accepted pending-revalidation must apply the same live-state release path before preserving stale cache.
- The implementation must reuse existing live issue resolution and release semantics instead of adding a competing eligibility classifier.

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Accepted pending-revalidation rehydrate | Cached accepted row can be preserved without live Linear metadata. | `remove fallback` | CO-546 | Rehydrate sees accepted `provider_issue_rehydration_pending_revalidation` with no matching run. | Existing provider-intake rehydrate behavior | 2026-05-16 | This issue | Live non-runnable Linear state attaches and releases/downgrades the claim. | Focused CO-510/CO-512-shaped regression. |
| Missing live issue evidence | Claim remains pending instead of treating cache as clean. | `justify retaining fallback` | Provider-intake control-host | Linear issue lookup is unavailable, skipped, or degraded. | Existing provider-intake safety contract | 2026-05-16 | Durable safety contract | Separate reviewed replacement proves equivalent source-truth-loss behavior. | Regression preserves fail-closed pending state on unavailable evidence. |

- Large-refactor check: not required; the existing `resolveFreshTrackedIssueForActiveClaim` path already owns live Linear issue refresh, eligibility, and release fields.
- Minor-seam decision: acceptable because this removes stale active cache authority and retains only the explicit fail-closed source-truth-loss state.

## Validation Plan
- Add focused `ProviderIssueHandoff` tests for:
  - accepted pending-revalidation cached `In Progress` plus live `Blocked` release
  - stale running/resumable demotion applying the same live release path
  - unavailable live evidence preserving fail-closed pending revalidation
- Run `git diff --check`.
- Run focused test command for `ProviderIssueHandoff`.
- Run required docs/spec/build gates scaled to touched surfaces.
