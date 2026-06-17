---
id: 20260418-linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd
title: CO: reclaim / reclassify / re-admit plain released/not_active issues across Backlog -> Ready with a free slot
status: in_progress
relates_to: docs/PRD-linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd.md
risk: high
owners:
  - Codex
last_review: 2026-06-17
review_notes:
  - 2026-06-17: CO-579 pre-expiry review kept this spec active-current; no verified terminal/archive evidence was established in this stream, CO-579 is the live non-terminal docs-freshness owner, and docs/spec gates remain unchanged.
  - 2026-05-18: CO-522 active-spec audit found 10 unchecked task checklist items, so this spec remains active and was reviewed for current lifecycle ownership rather than archived. Evidence: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/spec-preexpiry-local-classification.json`.
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd.md`
- PRD: `docs/PRD-linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd.md`
- Task checklist: `tasks/tasks-linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd.md`
- `.agent` mirror: `.agent/task/linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd.md`

## Traceability
- Linear issue: `CO-240` / `ddb81c93-87b2-4dff-b69b-33d7ae3c91cd`
- Shared source 0 anchor: `ctx:sha256:d9365323dac6ad108d41e8fa814e4db0b1289afd27b99792772cc415b42c5567#chunk:c000001`
- Source object id: `sha256:d9365323dac6ad108d41e8fa814e4db0b1289afd27b99792772cc415b42c5567`
- Context dir: `.runs/linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd/cli/2026-04-18T05-17-55-861Z-bc7da941/memory/source-0`
- Source payload: `.runs/linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd/cli/2026-04-18T05-17-55-861Z-bc7da941/memory/source-0/source.txt`
- Origin manifest: `.runs/linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd/cli/2026-04-18T05-17-55-861Z-bc7da941/manifest.json`

## Summary
- Objective: reclaim / reclassify / re-admit an issue whose live truth moves across `Backlog` and `Ready` while `provider-intake-state.json` still retains plain `provider_issue_released:not_active` residue.
- Scope:
  - parent-owned reclaim/admission classification inside existing control-host seams
  - parent-owned focused regression coverage for one free slot / `max_allowed=3`
  - preservation of the adjacent `CO-236` contract and earlier reclaim lanes
  - retention of audit/debug evidence instead of manual cleanup
- Constraints:
  - child lane stays docs-only
  - shared registries remain parent-owned
  - reject `max-concurrency`, `manual-launch`, `stale-Blocked-only`, and generic `refresh-loop` reinterpretations

## Issue-Shaping Contract
- User-request translation carried forward: use the issue body verbatim for the protected terms `CO-236`, `Ready`, `Backlog`, `provider_issue_released:not_active`, `provider-intake-state.json`, free slot / `max_allowed=3`, and reclaim / reclassify / re-admit, then express the smallest truthful reclaim fix that preserves those terms.
- Protected terms / exact artifact and surface names:
  - `CO-236`
  - `Ready`
  - `Backlog`
  - `provider_issue_released:not_active`
  - `provider-intake-state.json`
  - free slot / `max_allowed=3`
  - reclaim / reclassify / re-admit
  - `fresh_discovery`
  - `providerIssueHandoff.ts`
  - `providerLinearWorkflowStates.ts`
  - `co-status --format json`
- Nearby wrong interpretations to reject:
  - `max-concurrency`
  - `manual-launch`
  - `stale-Blocked-only`
  - generic `refresh-loop`
  - manual deletion of retained claim rows
  - reframing the issue as generic queue shepherding or label/filter repair
- Explicit non-goals carried forward:
  - no generic capacity redesign
  - no manual-launch workflow
  - no stale-Blocked-only narrowing
  - no lifecycle-health rewrite
  - no child-lane implementation/test edits or Linear mutations

## Parity / Alignment Matrix
- Current truth:
  - plain `provider_issue_released:not_active` residue can remain in `provider-intake-state.json`
  - live issue truth can move across `Backlog` and `Ready`
  - one free slot / `max_allowed=3` can exist while the issue still is not re-admitted
  - adjacent reclaim lanes already cover stale `Blocked`, missing retained run identity, completed blockers, and unrelated free-slot fairness
- Reference truth:
  - live `Ready` truth should be enough to reopen admission when no preserved blocker or same-issue worker veto applies
  - retained released/not-active rows should stay auditable rather than being deleted
  - one free slot / `max_allowed=3` should allow re-admit without a generic capacity rewrite
  - `CO-236` remains an explicit protected neighbor, not an implied catch-all
- Target truth / intended delta:
  - stale plain released/not-active residue is reclassified against current `Backlog` / `Ready` truth
  - eligible issues are reclaimed / re-admitted through the normal control-host path
  - free slot / `max_allowed=3` becomes sufficient evidence for admission in the focused shape
  - prior reclaim lanes remain intact and distinguishable
- Explicitly out-of-scope differences:
  - broad provider-capacity redesign
  - operator-only manual launch/restart workflows
  - label/filter or queue-policy rewrites
  - generic refresh-lifecycle/stuck-loop remediation

## Readiness Gate
- Not done if:
  - a live issue returns from `Backlog` to `Ready` and still remains suppressed behind plain released/not-active residue
  - one free slot / `max_allowed=3` exists and the issue still is not reclaimed / reclassified / re-admitted
  - the proposed fix requires `manual-launch`
  - the parent fix only covers stale `Blocked` metadata and misses `Backlog` / `Ready`
  - the result blurs `CO-236` or the other reclaim lanes without explicit evidence
- Pre-implementation issue-quality review evidence:
  - 2026-04-18: this docs-first packet explicitly keeps the lane on reclaim / reclassify / re-admit across `Backlog` and `Ready`. The micro-task path is ineligible because correctness depends on protected naming, adjacent reclaim boundaries, and the exact free-slot evidence term.
- Safeguard ownership split:
  - child lane owns only the six packet files
  - parent lane owns shared registries, implementation, focused regressions, validation, review, PR lifecycle, and Linear/workpad state

## Technical Requirements
- Functional requirements:
  - preserve the exact issue-body framing around `CO-236`, `Ready`, `Backlog`, `provider_issue_released:not_active`, and free slot / `max_allowed=3`
  - recognize when live issue truth has moved from `Backlog` back to `Ready`
  - reclassify stale plain released/not-active residue against that refreshed live truth
  - reclaim / re-admit through the normal control-host path without `manual-launch`
  - keep retained claim evidence present in `provider-intake-state.json`
  - preserve adjacent reclaim/fair-admission behaviors from `CO-202`, `CO-203`, `CO-212`, and `CO-181`
- Non-functional requirements:
  - keep the implementation localized to existing reclaim/admission seams
  - avoid broad capacity or lifecycle redesign
  - maintain audit/debug readability in `provider-intake-state.json` and related status surfaces
  - keep the child-lane docs truthful about parent-owned integration work
- Interfaces / contracts:
  - `provider-intake-state.json`
  - `providerIssueHandoff.ts`
  - `providerLinearWorkflowStates.ts`
  - `fresh_discovery`
  - `co-status --format json`

## Architecture & Data
- Architecture / design adjustments:
  - the parent likely needs a narrow reclaim classification update rather than a new scheduler or generic capacity rule
  - if `Backlog` -> `Ready` needs same-cycle visibility, the parent should reuse an existing refetch/update seam instead of inventing a new workflow mutation path
  - the parent should keep reclaim truth and status/debug truth aligned so reclassified issues do not remain stranded in operator-facing state
- Data model changes / migrations:
  - no migration expected from this packet
  - retained plain released/not-active rows should remain present for audit
  - refreshed `Ready` truth should overwrite stale suppression state only through existing persisted claim fields/reasons
- External dependencies / integrations:
  - live tracked-issue state in the parent reclaim flow
  - existing provider capacity accounting
  - adjacent reclaim/fair-admission regressions already in the repo

## Acceptance Criteria
1. A focused regression seeds plain `provider_issue_released:not_active` residue and a live issue that moved from `Backlog` to `Ready`.
2. The reproduction includes one free slot / `max_allowed=3`.
3. Refresh / reclaim / `fresh_discovery` reclassifies the issue against live `Ready` truth and re-admits it through the normal control-host path.
4. The fix does not rely on `manual-launch`.
5. The fix is broader than `stale-Blocked-only` and explicitly covers the `Backlog` / `Ready` path.
6. The fix preserves `CO-236` adjacency plus earlier reclaim/fair-admission lanes.

## Validation Plan
- Tests / checks:
  - child lane runs only scoped docs checks over the packet files
  - parent-owned focused regression for plain released/not-active `Backlog` -> `Ready` reclaim / re-admit
  - parent-owned focused regression for one free slot / `max_allowed=3`
  - parent-owned adjacent-lane regression review for `CO-202`, `CO-203`, `CO-212`, and `CO-181` if touched by the chosen seam
  - parent-owned docs-review / spec-guard after patch import
- Rollout verification:
  - parent confirms live `Ready` truth appears in persisted claim/debug state after reclassification
  - parent confirms the issue is admitted without `manual-launch`
  - parent confirms retained claim evidence remains inspectable in `provider-intake-state.json`
- Monitoring / alerts:
  - no new alerting required from this docs slice
  - operator-facing verification stays on `provider-intake-state.json` and existing status/debug surfaces

## Open Questions
- Is the parent fix entirely inside `providerIssueHandoff.ts`, or does `Backlog` / `Ready` truth need a reusable helper in `providerLinearWorkflowStates.ts`?
- Does the parent need a dedicated reclassified/re-admitted reason string, or will refreshed `Ready` metadata plus existing launch/reclaim reasons remain sufficiently explicit?
- If `CO-236` implies an additional adjacent invariant beyond the prior reclaim lanes, does the parent need one more focused regression before merge?

## Approvals
- Reviewer: pending parent lane acceptance, docs-review, and implementation validation
- Date: 2026-04-18
