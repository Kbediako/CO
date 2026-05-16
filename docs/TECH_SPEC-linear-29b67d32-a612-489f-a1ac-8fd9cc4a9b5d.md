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

# TECH_SPEC Mirror - CO-546 attach live Linear state to rehydrated pending-claim revalidation

This mirror intentionally matches `tasks/specs/linear-29b67d32-a612-489f-a1ac-8fd9cc4a9b5d.md` for docs-surface discoverability.

## Objective
Attach fresh Linear issue metadata to accepted `provider_issue_rehydration_pending_revalidation` claims during rehydrate/revalidation, release live non-runnable claims out of active WIP, and preserve explicit fail-closed pending state when live issue evidence is unavailable.

## Scope
- `ProviderIssueHandoff` rehydrate path for accepted, running, and resumable stale claims.
- Focused `ProviderIssueHandoff` regression coverage for cached `In Progress` with live `Blocked`.
- Docs-first packet and task registry mirrors for CO-546.

## Key Requirements
- Live Linear issue state must be attached before preserving a rehydrated pending-revalidation claim when fresh metadata resolution is available.
- Live `Blocked` or otherwise non-runnable state must release/downgrade the stale claim without relaunching.
- Missing live issue evidence must remain fail-closed and visible as pending revalidation.
- The fix must not special-case CO-510/CO-512 or hand-edit `provider-intake-state.json`.

## Fallback / Refactor Decision
This lane removes stale cached active-WIP authority for rehydrated pending-revalidation claims while retaining the durable source-truth-loss pending state only when live Linear evidence is unavailable. Reuse `resolveFreshTrackedIssueForActiveClaim`; do not create a second eligibility classifier.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Accepted pending-revalidation rehydrate | Cached accepted row can be preserved without live Linear metadata. | `remove fallback` | CO-546 | Rehydrate sees accepted `provider_issue_rehydration_pending_revalidation` with no matching run. | Existing provider-intake rehydrate behavior | 2026-05-16 | This issue | Live non-runnable Linear state attaches and releases/downgrades the claim. | Focused CO-510/CO-512-shaped regression. |
| Missing live issue evidence | Claim remains pending instead of treating cache as clean. | `justify retaining fallback` | Provider-intake control-host | Linear issue lookup is unavailable, skipped, or degraded. | Existing provider-intake safety contract | 2026-05-16 | Durable safety contract | Separate reviewed replacement proves equivalent source-truth-loss behavior. | Regression preserves fail-closed pending state on unavailable evidence. |

## Validation Plan
- Focused `ProviderIssueHandoff` regressions.
- `git diff --check`.
- JSON parse for `tasks/index.json` and `docs/docs-freshness-registry.json`.
- Spec guard, build/lint/test/docs gates as required by touched surfaces.
