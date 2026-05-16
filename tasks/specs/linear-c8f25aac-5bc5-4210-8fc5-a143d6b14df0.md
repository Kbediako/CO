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

# TECH_SPEC - CO-544 release rehydrated blocked provider claims from active WIP

## Canonical Reference
- PRD: `docs/PRD-linear-c8f25aac-5bc5-4210-8fc5-a143d6b14df0.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-c8f25aac-5bc5-4210-8fc5-a143d6b14df0.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-c8f25aac-5bc5-4210-8fc5-a143d6b14df0.md`
- Task checklist: `tasks/tasks-linear-c8f25aac-5bc5-4210-8fc5-a143d6b14df0.md`
- Linear issue: `CO-544` / `c8f25aac-5bc5-4210-8fc5-a143d6b14df0`

## Summary
- Objective: release or downgrade stale rehydrated accepted `provider_issue_rehydration_pending_revalidation` claims when live Linear state is non-runnable, without fail-opening when live issue evidence is unavailable.
- Scope:
  - provider-intake/control-host claim refresh and active-WIP classification
  - `co-status` and `control-host freshness-gauge` classification for cached pending revalidation
  - focused regression coverage for stale cached `In Progress` plus live `Blocked`
- Constraints:
  - no manual `provider-intake-state.json` edits
  - no CO-510/CO-512 relaunch
  - no broad CO-542 quota-hygiene automation
  - no weakening for genuinely live worker claims

## Issue-Shaping Contract
- User-request translation carried forward: repair the root provider-intake/control-host stale accepted rehydration path so blocked CO-510/CO-512-style rows stop consuming active WIP while missing live evidence remains fail-closed.
- Protected terms / exact artifact and surface names: `provider_issue_rehydration_pending_revalidation`, `provider-intake-state.json`, `CO-510`, `CO-512`, `Blocked`, `issue_state=In Progress`, `co-status`, `control-host freshness-gauge`, active WIP.
- Nearby wrong interpretations to reject: manual intake cleanup, stale-cache fail-open, UI-only suppression, CO-510/CO-512 relaunch, quota-hygiene expansion.
- Explicit non-goals carried forward: no active worker WIP weakening, no broad queue-cap redesign, no CO-542 absorption.

## Parity / Alignment Matrix
- Current truth: accepted pending-revalidation rows can retain cached runnable metadata and active WIP classification after live Linear moves the issue to `Blocked`.
- Reference truth: live Linear state is the authority for execution eligibility when available; missing live evidence must remain fail-closed.
- Target truth / intended delta: live non-runnable evidence releases or downgrades the claim out of active WIP; missing live evidence remains explicit cached pending revalidation.
- Explicitly out-of-scope differences: manual state-file edits, special-case issue identifiers, unrelated quota hygiene, or broad dashboard redesign.

## Readiness Gate
- Not done if:
  - live `Blocked` / handoff / terminal state does not release or downgrade a rehydrated accepted pending-revalidation claim
  - unavailable live evidence silently releases the stale claim
  - status/freshness surfaces still conflate cached pending revalidation with live workers
- Pre-implementation issue-quality review evidence:
  - live `linear issue-context` read on 2026-05-16 confirmed CO-544 is `In Progress` with no attached PR and acceptance criteria match the parent incident evidence.
  - single workpad created and serial parallelization decision recorded before implementation.
- Safeguard ownership split:
  - parent orchestration owns live queue/PR/control-host monitoring
  - this lane owns supported provider-intake/control-host source and focused tests

## Technical Requirements
- Functional requirements:
  - Identify rehydrated accepted claims whose reason is `provider_issue_rehydration_pending_revalidation`.
  - Revalidate the issue state through live Linear evidence when available.
  - Treat `Blocked`, review/handoff, completed, canceled, backlog/unstarted, and other non-execution-eligible states as non-runnable for active WIP.
  - Release or downgrade non-runnable pending-revalidation claims without counting them as live active worker claims.
  - Preserve cached/degraded pending-revalidation classification when live issue evidence cannot be read.
  - Expose status/freshness-gauge distinctions between cached pending revalidation and live active workers.
- Non-functional requirements:
  - fail closed on missing or ambiguous live issue evidence
  - avoid issue-specific branches for CO-510/CO-512
  - keep claim history/audit fields useful for operator diagnosis
- Interfaces / contracts:
  - provider-intake claim records
  - control-host refresh loop
  - co-status active issue projection
  - freshness-gauge artifact classification

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- Required decision table:

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Rehydrated accepted pending revalidation | Cached accepted row with stale runnable metadata can occupy active WIP before live revalidation releases it. | `remove fallback` | CO-544 | Live Linear state is non-runnable for a rehydrated accepted pending-revalidation claim. | 2026-05-16 | 2026-05-16 | This issue | Live non-runnable state releases/downgrades the claim and excludes it from active WIP. | Focused CO-510/CO-512-shaped regression. |
| Missing live issue evidence | Pending revalidation fails closed instead of assuming stale cache is clean. | `justify retaining fallback` | Provider-intake control-host | Linear issue evidence is unavailable, incomplete, or degraded. | Existing provider-intake rehydration behavior | 2026-05-16 | Durable safety contract | Separate issue-quality review proves fail-closed pending revalidation is no longer needed. | Regression coverage for unavailable evidence preserving pending/degraded classification. |

- Contract name: Fail-closed pending revalidation.
- Owning surface: Provider-intake control-host claim refresh.
- Steady-state proof: unavailable live issue evidence remains visible as pending/degraded cache truth rather than clean active-worker truth.
- Tests/docs: focused control-host/provider-intake regression and this CO-544 packet.
- Large-refactor check: a narrow fix is acceptable because the lane removes one stale active-WIP cache failure while preserving the existing provider-intake authority boundary.

## Architecture & Data
- Architecture / design adjustments:
  - Prefer a shared classification helper for pending-revalidation cache vs live-active worker truth when both co-status and freshness-gauge need the same distinction.
  - Keep live issue state as final authority for releasing/downgrading; cached fields may trigger revalidation but must not be final clean truth.
- Data model changes / migrations:
  - No schema migration expected; any new reason/classification fields must be backward-compatible and optional.
- External dependencies / integrations:
  - Linear issue state metadata and provider-intake persisted claim records.

## Validation Plan
- Tests / checks:
  - focused regression for stale cached `In Progress` accepted pending-revalidation claim plus live `Blocked`
  - focused regression for unavailable live issue evidence preserving fail-closed pending/degraded classification
  - status/freshness-gauge assertions separating cached pending revalidation from live active workers
  - `node scripts/spec-guard.mjs --dry-run`
  - focused `npm run test:core -- <touched tests>`
  - broader build/lint/test/docs gates as required by touched surface
- Rollout verification:
  - parent can rerun `co-status` and `control-host freshness-gauge` against live control-host after merge/handoff.
- Monitoring / alerts:
  - status/freshness-gauge output should identify cached pending revalidation explicitly for operator triage.

## Open Questions
- Exact source seam and test file selection will be finalized after reading `ProviderIssueHandoff`, `ControlRuntime`, and `providerControlHostFreshnessGauge`.

## Approvals
- Reviewer: provider-worker parent lane.
- Date: 2026-05-16.
