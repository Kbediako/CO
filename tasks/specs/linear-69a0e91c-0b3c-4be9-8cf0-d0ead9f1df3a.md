---
id: 20260429-linear-69a0e91c-0b3c-4be9-8cf0-d0ead9f1df3a
title: CO-422 refresh Mar 29 active spec-guard cohort
status: in_progress
owner: Codex
created: 2026-04-29
last_review: 2026-04-29
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-69a0e91c-0b3c-4be9-8cf0-d0ead9f1df3a.md
related_action_plan: docs/ACTION_PLAN-linear-69a0e91c-0b3c-4be9-8cf0-d0ead9f1df3a.md
related_tasks:
  - tasks/tasks-linear-69a0e91c-0b3c-4be9-8cf0-d0ead9f1df3a.md
review_notes:
  - 2026-04-29: Provider-worker live Linear reads confirmed CO-14, CO-30, and CO-34 are all `Done`; current main reproduced the exact `node scripts/spec-guard.mjs` failure on their Mar 29 task specs before edits.
---

# TECH_SPEC - CO-422 refresh Mar 29 active spec-guard cohort

## Summary
- Objective: repair the Mar 29 active-spec metadata cohort blocking CO-409 / PR #719 Core Lane.
- Scope: CO-422 docs-first packet, the three completed-lane task specs, `tasks/index.json`, `docs/docs-freshness-registry.json`, workpad/Linear state, validation, review, PR, and blocker-note follow-through.
- Constraints:
  - no `scripts/spec-guard.mjs` weakening
  - no date-only bumps
  - no CO-409 Mar 28 docs-freshness cohort edits
  - no reopening completed CO-14, CO-30, or CO-34 implementation scope

## Issue-Shaping Contract
- User-request translation carried forward: CO-422 owns `spec-guard:active-spec-last-review:2026-03-29`, where completed CO-14, CO-30, and CO-34 specs remained active and crossed the 30-day freshness cadence on 2026-04-29.
- Protected terms / exact artifact and surface names:
  - `spec-guard`
  - `active spec`
  - `last_review`
  - `2026-03-29`
  - `CO-14`
  - `CO-30`
  - `CO-34`
  - `PR #719`
  - `Core Lane`
  - `tasks/specs`
  - `docs/docs-freshness-registry.json`
  - `tasks/index.json`
  - `spec-guard:active-spec-last-review:2026-03-29`
- Nearby wrong interpretations to reject:
  - this is CO-409's Mar 28 docs-freshness cohort
  - `spec-guard` should be weakened or skipped
  - stale `last_review` can be fixed by a bare date bump
  - terminal Linear issues should be reopened just to refresh specs
  - historical specs should be deleted
- Explicit non-goals carried forward:
  - no CO-409 implementation or CodeRabbit response changes before validation
  - no CO-420 / Mar 28 rolling cohort changes
  - no broad archive automation or docs-freshness policy work

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| `spec-guard` | Fails on three Mar 29 specs whose frontmatter still says `status: in_progress`. | Inactive statuses are skipped; active specs must be within 30 days. | Terminal lanes use an inactive status and stop failing active-spec freshness. | Guard weakening or date-only refresh. |
| Linear lifecycle | CO-14, CO-30, and CO-34 live reads return `Done`. | Linear terminal state is the lifecycle authority for issue-lane completion. | Repo mirrors classify those issue docs as completed/historical. | Reopening finished work. |
| Registry freshness | Fifteen Mar 29 registry rows remain `active` for completed-lane packet/mirror docs. | Docs freshness applies to active or deprecated docs, not archive-status historical rows. | Only those Mar 29 completed-lane rows move to archive-status freshness metadata. | Mar 28 rolling rows and unrelated stale docs. |
| Handoff blocker | CO-409 / PR #719 Core Lane is blocked by this external owner. | Blocker notes must reflect actual validation state. | Update blocker notes after green local proof and PR handoff. | CO-409 content changes. |

## Readiness Gate
- Not done if:
  - `node scripts/spec-guard.mjs` still reports any of the three Mar 29 files
  - `tasks/index.json`, registry status, and task-spec status disagree
  - the patch weakens validation or hides history
  - CO-409 remains blocked by the same Core Lane failure after this owner lands
- Pre-implementation issue-quality review evidence:
  - 2026-04-29: current-main reproduction showed the issue is real and narrow.
  - 2026-04-29: live Linear reads showed completed-lane truth for all three source issues.
- Safeguard ownership split:
  - parent provider worker owns all repo metadata, validation, Linear workpad, PR, and blocker-note updates.
  - no same-issue child lane is used because the repair is a single atomic metadata classification across shared mirrors.

## Technical Requirements
- Functional requirements:
  - Add the CO-422 docs-first packet and task mirrors.
  - Change the three task spec frontmatter statuses from `in_progress` to an inactive status aligned with live Linear `Done`.
  - Add per-spec review notes documenting the 2026-04-29 live Linear audit and no-date-bump rationale.
  - Mark the exact Mar 29 completed-lane registry rows as archive-status so docs freshness no longer reports them as active blockers.
  - Add completed status to the three `tasks/index.json` entries and register CO-422.
- Non-functional requirements:
  - keep the diff reviewable and metadata-only
  - preserve historical specs and evidence links
  - avoid unrelated Mar 28 rolling cohort edits
- Interfaces / contracts:
  - `tasks/index.json` remains valid JSON.
  - `docs/docs-freshness-registry.json` remains valid JSON and uses only supported status values.
  - `spec-guard` active-spec semantics remain unchanged.

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? No.
- Required decision table: not applicable.
- Large-refactor check: not applicable; this uses existing inactive spec and registry status semantics.

## Architecture & Data
- Architecture / design adjustments: none.
- Data model changes / migrations: none.
- External dependencies / integrations: Linear issue reads, GitHub PR blocker notes, and existing validation scripts.

## Validation Plan
- Tests / checks:
  - baseline `node scripts/spec-guard.mjs` failure before edits
  - live `linear issue-context` reads for CO-14, CO-30, and CO-34
  - JSON parse for `tasks/index.json` and `docs/docs-freshness-registry.json`
  - `node scripts/spec-guard.mjs`
  - `npm run docs:freshness`
  - minimal Core Lane-equivalent checks needed by this metadata-only diff
  - manifest-backed standalone review and explicit elegance pass before review handoff
- Rollout verification:
  - PR #719 blocker note updated only after validation proves the gate clear.
- Monitoring / alerts:
  - watch PR checks and `pr ready-review` drain before Linear review handoff.

## Open Questions
- None.

## Approvals
- Reviewer: provider-worker self-review before implementation, standalone review before handoff.
- Date: 2026-04-29.
