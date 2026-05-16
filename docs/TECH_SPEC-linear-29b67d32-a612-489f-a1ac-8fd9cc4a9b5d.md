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
Attach fresh Linear issue metadata to accepted `provider_issue_rehydration_pending_revalidation` claims during rehydrate/revalidation, release live non-runnable claims out of active WIP, and preserve explicit fail-closed pending state when live issue evidence is unavailable. Post-PR #820 rework narrows the remaining root cause to source binding: existing-claim revalidation must use the configured live Linear source binding even when broad `dispatch_pilot.enabled` admission is disabled.

## Scope
- `ProviderIssueHandoff` rehydrate path for accepted, running, and resumable stale claims.
- Focused `ProviderIssueHandoff` regression coverage for cached `In Progress` with live `Blocked`.
- Docs-first packet and task registry mirrors for CO-546.

## Key Requirements
- Live Linear issue state must be attached before preserving a rehydrated pending-revalidation claim when fresh metadata resolution is available.
- Existing-claim issue-by-id revalidation must not be blocked by `dispatch_source_disabled` when the live Linear source binding is otherwise configured.
- The fix must keep broad dispatch-pilot admission/webhook queue selection disabled unless explicitly enabled elsewhere.
- Live `Blocked` or otherwise non-runnable state must release/downgrade the stale claim without relaunching.
- Missing live issue evidence must remain fail-closed and visible as pending revalidation.
- The fix must not special-case CO-510/CO-512 or hand-edit `provider-intake-state.json`.

## Fallback / Refactor Decision
This lane removes stale cached active-WIP authority for rehydrated pending-revalidation claims while retaining the durable source-truth-loss pending state only when live Linear evidence is unavailable. Reuse `resolveFreshTrackedIssueForActiveClaim`; do not create a second eligibility classifier.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Accepted pending-revalidation rehydrate | Cached accepted row can be preserved without live Linear metadata. | `remove fallback` | CO-546 | Rehydrate sees accepted `provider_issue_rehydration_pending_revalidation` with no matching run. | Existing provider-intake rehydrate behavior | 2026-05-16 | This issue | Live non-runnable Linear state attaches and releases/downgrades the claim. | Focused CO-510/CO-512-shaped regression. |
| Existing-claim source binding | Direct issue-by-id refresh is tied to broad `dispatch_pilot.enabled` admission state. | `remove fallback` | CO-546 | Control-host revalidation needs live issue metadata for an existing claim while dispatch pilot is disabled. | Existing dispatch-source setup sharing | 2026-05-16 | This issue | Existing-claim revalidation can use configured Linear source binding without enabling dispatch. | Regression with disabled dispatch pilot and configured live Linear source binding. |
| Missing live issue evidence | Claim remains pending instead of treating cache as clean. | `justify retaining fallback` | Provider-intake control-host | Linear issue lookup is unavailable, skipped, or degraded. | Existing provider-intake safety contract | 2026-05-16 | Durable safety contract | Separate reviewed replacement proves equivalent source-truth-loss behavior. | Regression preserves fail-closed pending state on unavailable evidence. |

- Contract name: provider-intake revalidation fail-closed cache state.
- Owning surface: provider-intake control-host claim refresh.
- Steady-state proof: absent live Linear issue evidence remains visible as accepted pending revalidation and never becomes clean active-worker truth.
- Tests/docs: focused ProviderIssueHandoff regressions plus CO-546 docs packet/checklist.
- Non-expiring rationale: durable source-truth-loss safety contract; remove only after a reviewed replacement proves equivalent fail-closed behavior.

## Validation Plan
- Focused `ProviderIssueHandoff` regressions.
- Focused disabled-dispatch-pilot source-binding regression.
- `git diff --check`.
- JSON parse for `tasks/index.json` and `docs/docs-freshness-registry.json`.
- Spec guard, build/lint/test/docs gates as required by touched surfaces.
