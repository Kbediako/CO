---
id: 20260516-linear-c8f25aac-5bc5-4210-8fc5-a143d6b14df0
title: CO-544 release rehydrated blocked provider claims from active WIP
relates_to: docs/PRD-linear-c8f25aac-5bc5-4210-8fc5-a143d6b14df0.md
risk: high
owners:
  - Codex
last_review: 2026-05-16
related_action_plan: docs/ACTION_PLAN-linear-c8f25aac-5bc5-4210-8fc5-a143d6b14df0.md
task_checklists:
  - tasks/tasks-linear-c8f25aac-5bc5-4210-8fc5-a143d6b14df0.md
---

# TECH_SPEC Mirror - CO-544 release rehydrated blocked provider claims from active WIP

This mirror intentionally matches `tasks/specs/linear-c8f25aac-5bc5-4210-8fc5-a143d6b14df0.md` for docs-surface discoverability.

## Objective
Release or downgrade stale rehydrated accepted `provider_issue_rehydration_pending_revalidation` claims when live Linear state is non-runnable, without fail-opening when live issue evidence is unavailable.

## Scope
- provider-intake/control-host claim refresh and active-WIP classification
- `co-status` and `control-host freshness-gauge` classification for cached pending revalidation
- focused regression coverage for stale cached `In Progress` plus live `Blocked`

## Key Requirements
- Rehydrated accepted pending-revalidation claims must be revalidated against live Linear state when available.
- Live non-runnable states, including `Blocked`, handoff/review states, completed, canceled, backlog/unstarted, and other non-execution-eligible states, must not occupy active WIP.
- Missing or unavailable live issue evidence remains fail-closed and visible as cached pending revalidation.
- Status/freshness surfaces must distinguish cached pending revalidation from verified live active workers.
- No manual `provider-intake-state.json` edits, CO-510/CO-512 special cases, or CO-542 quota-hygiene widening.

## Fallback / Refactor Decision
This lane removes the stale active-WIP cache fallback for live non-runnable pending-revalidation claims and retains fail-closed pending revalidation only when live evidence is unavailable. A narrow fix is acceptable because live Linear remains final authority and cached metadata is not promoted to clean truth.

- Large-refactor decision: not required; the existing provider-intake refresh path remains the authority for release/downgrade and status classification.
- Minor-seam decision: acceptable because the retained cache state is only a fail-closed source-truth-loss contract, not a new launch path or WIP-capacity bypass.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Rehydrated accepted pending revalidation | Cached accepted row with stale runnable metadata can occupy active WIP before live revalidation releases it. | `remove fallback` | CO-544 | Live Linear state is non-runnable for a rehydrated accepted pending-revalidation claim. | 2026-05-16 | 2026-05-16 | This issue | Live non-runnable state releases/downgrades the claim and excludes it from active WIP. | Focused CO-510/CO-512-shaped regression. |
| Missing live issue evidence | Revalidation cache state stays fail-closed instead of assuming stale cache is clean. | `justify retaining fallback` | Provider-intake control-host | Linear issue evidence is unavailable, incomplete, or degraded. | Existing provider-intake rehydration behavior | 2026-05-16 | Durable safety contract | Separate issue-quality review proves fail-closed pending revalidation is no longer needed. | Regression coverage for unavailable evidence preserving pending/degraded classification. |

- Contract name: provider-intake revalidation fail-closed cache state.
- Owning surface: provider-intake control-host claim refresh.
- Steady-state proof: absent live issue evidence remains visible as degraded cache truth and never becomes clean active-worker truth.
- Tests/docs: focused `ProviderIssueHandoff` and freshness-gauge regressions plus this CO-544 packet.
- Non-expiring rationale: this is a durable source-truth-loss safety contract, not temporary compatibility debt; remove only after a reviewed replacement proves equivalent fail-closed behavior.

## Validation Plan
- Focused provider-intake/control-host regression for stale cached `In Progress` with live `Blocked`.
- Focused fail-closed regression for unavailable live evidence.
- Status/freshness-gauge classification assertions.
- Required repo gates scaled to touched source/test surface.
