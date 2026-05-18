---
id: 20260421-linear-d2306cf9-2c2f-4242-bbaa-2e86456221a6
title: Control host refresh retained released/not_active claim metadata
status: in_progress
relates_to: docs/PRD-linear-d2306cf9-2c2f-4242-bbaa-2e86456221a6.md
risk: high
owners:
  - Codex
last_review: 2026-05-18
review_notes:
  - 2026-05-18: CO-522 active-spec audit found 1 unchecked task checklist item, so this spec remains active and was reviewed for current lifecycle ownership rather than archived. Evidence: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/spec-preexpiry-local-classification.json`.
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-d2306cf9-2c2f-4242-bbaa-2e86456221a6-control-host-refresh-retained-released-not-active-claim-metadata.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-d2306cf9-2c2f-4242-bbaa-2e86456221a6.md`
- PRD: `docs/PRD-linear-d2306cf9-2c2f-4242-bbaa-2e86456221a6.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-d2306cf9-2c2f-4242-bbaa-2e86456221a6.md`
- Task checklist: `tasks/tasks-linear-d2306cf9-2c2f-4242-bbaa-2e86456221a6.md`
- `.agent` mirror: `.agent/task/linear-d2306cf9-2c2f-4242-bbaa-2e86456221a6.md`

## Traceability
- Linear issue: `CO-292` / `d2306cf9-2c2f-4242-bbaa-2e86456221a6`
- Shared source 0 anchor: `ctx:sha256:5574aa4af60d136430e7ea00cd74f65b764189a922ceb18aa44debc230b470c9#chunk:c000001`
- Source payload: `.runs/linear-d2306cf9-2c2f-4242-bbaa-2e86456221a6/cli/2026-04-21T08-38-59-755Z-468836b9/memory/source-0/source.txt`
- Origin manifest: `.runs/linear-d2306cf9-2c2f-4242-bbaa-2e86456221a6/cli/2026-04-21T08-38-59-755Z-468836b9/manifest.json`
- Child checkout note: docs child-lane evidence remains `.runs/linear-d2306cf9-2c2f-4242-bbaa-2e86456221a6-docs-packet/cli/2026-04-21T08-42-08-368Z-fc919095/manifest.json`; parent verified and corrected the source anchor to the worker prompt payload before implementation.

## Summary
- Objective: refresh metadata on retained `provider-intake-state.json` rows with `state=released` and `reason=provider_issue_released:not_active` when newer live same-issue Linear truth exists, even when the live state remains non-active.
- Scope: docs-first packet, parent-owned source diagnosis in `providerIssueHandoff.ts` or existing helper seams, focused metadata-only implementation, and focused regression coverage.
- Constraints: no active-claim refresh, no Ready reclaim/admission, no restart recovery, no destructive cleanup, and no unbounded direct issue-by-id reads over retained released residue.

## Issue-Shaping Contract
- User-request translation carried forward: retained `provider-intake-state.json` rows with `state=released` and `reason=provider_issue_released:not_active` must refresh `issue_state`, `issue_state_type`, and `issue_updated_at` when live Linear truth for that same issue is newer, even when it remains non-active.
- Protected terms / exact artifact and surface names: `provider-intake-state.json`, `providerIssueHandoff.ts`, `released/not_active`, `provider_issue_released:not_active`, `issue_state`, `issue_state_type`, `issue_updated_at`, `Blocked -> Rework`, dependent blocker snapshots, `CO-276`, `CO-64`, `CO-202`, `CO-212`, `CO-248`, `CO-41`.
- Nearby wrong interpretations to reject: active-claim metadata refresh, Ready reclaim/admission, refresh-stuck restart recovery, destructive cleanup of retained rows, unbounded direct issue-by-id reads over retained released residue, and generic docs/archive cleanup.
- Explicit non-goals carried forward: no implementation or tests in this child lane, no manual Linear mutation, no retained-row deletion, no provider scheduler redesign, and no broad polling increase.

## Current / Reference / Target Parity Matrix

| Contract | Current | Reference | Target |
| --- | --- | --- | --- |
| Retained released/not_active metadata | A retained released row can preserve older `issue_state`, `issue_state_type`, and `issue_updated_at` after the live issue changes state. | `CO-64` preserves historical claim usefulness; released/not_active rows are retained audit evidence. | The row stays retained and released, but the three cached issue metadata fields advance to newer live same-issue truth. |
| Non-active live transition | `Blocked -> Rework` can remain non-active, so admission-oriented code paths may skip the row and leave stale Blocked metadata. | `CO-202` and `CO-212` are Ready reclaim/admission lanes, not metadata-only non-active refresh. | Non-active state changes refresh metadata without implying Ready eligibility or active ownership. |
| Dependent blocker snapshots | Dependent blocker snapshots can carry newer state for the same issue while `provider-intake-state.json` still shows stale metadata. | Blocker snapshots are current dependency truth and should not be contradicted by stale retained claim cache. | The retained claim metadata aligns with newer dependent blocker snapshot truth for the same issue. |
| Refresh lifecycle boundaries | Stale retained metadata can look related to refresh starvation or restart recovery. | `CO-41` and `CO-248` cover lifecycle stalls, stuck refresh, and admission starvation classes. | CO-292 remains metadata freshness only and does not change lifecycle health or restart behavior. |
| Request budget | A direct issue-by-id sweep over all retained released residue would be simple but too broad. | Existing no-burn/fail-closed release-row contracts avoid unbounded direct reads. | The implementation uses live truth already hydrated by the refresh/dependency flow, or a bounded same-issue update, and avoids unbounded direct reads. |

## Readiness Gate
- Not done if:
  - a retained `provider_issue_released:not_active` row keeps stale `issue_state`, `issue_state_type`, or `issue_updated_at` after newer same-issue live truth is available
  - `Blocked -> Rework` only appears in dependent blocker snapshots while retained claim metadata remains stale
  - the solution becomes Ready reclaim/admission, active-claim refresh, lifecycle restart recovery, or destructive cleanup
  - the implementation adds unbounded direct issue-by-id reads over retained released residue
- Pre-implementation issue-quality review evidence:
  - 2026-04-21: this docs child lane shaped CO-292 as a metadata-only retained released/not_active refresh lane. The micro-task path is ineligible because correctness depends on protected field names, exact issue-family boundaries, and parity between retained claim metadata and dependent blocker snapshots.
- Safeguard ownership split:
  - child lane owns docs packet and registry mirrors only
  - parent owns source implementation, tests, Linear state, workpad, docs-review, validation, PR lifecycle, and merge

## Technical Requirements
- Functional requirements:
  - detect retained rows with `state=released` and `reason=provider_issue_released:not_active`
  - compare cached `issue_updated_at` with newer live same-issue Linear truth before updating metadata
  - update only `issue_state`, `issue_state_type`, and `issue_updated_at` for the retained row
  - preserve `state=released`, `reason=provider_issue_released:not_active`, run identifiers, claim history, and audit fields
  - accept live non-active transitions such as `Blocked -> Rework` as metadata refresh candidates
  - keep dependent blocker snapshots and retained claim metadata coherent when they describe the same issue
  - keep Ready reclaim/admission behavior unchanged
  - keep active-claim metadata handling unchanged
  - avoid unbounded direct issue-by-id reads over retained released residue
- Non-functional requirements:
  - localize the change to `providerIssueHandoff.ts` or existing provider refresh helper seams
  - fail closed when live truth is missing, older, or not clearly same-issue
  - retain local audit evidence in `provider-intake-state.json`
  - preserve existing request-budget and lifecycle-stall diagnostics
- Interfaces / contracts:
  - `provider-intake-state.json`
  - `providerIssueHandoff.ts`
  - `provider_issue_released:not_active`
  - `issue_state`
  - `issue_state_type`
  - `issue_updated_at`
  - dependent blocker snapshots

## Architecture & Data
- Architecture / design adjustments:
  - inspect where `providerIssueHandoff.ts` already receives refreshed Linear issue data and dependent blocker snapshots
  - add or reuse a narrow helper that can merge newer same-issue metadata into retained released/not_active rows
  - keep the helper metadata-only, with no claim-state transition and no admission side effect
  - prefer a single comparison predicate for "newer same-issue truth" so dependent blocker snapshot updates and direct tracked issue updates agree
- Data model changes / migrations:
  - no schema migration
  - no new required field
  - no destructive cleanup or row pruning
  - optional diagnostic notes may be added only if parent implementation finds an existing field intended for metadata refresh provenance
- External dependencies / integrations:
  - Linear live issue state and workflow state type
  - existing provider refresh/dependency hydration paths
  - existing local claim persistence in `provider-intake-state.json`

## Validation Plan
- Child-lane docs validation:
  - parse `tasks/index.json`
  - run `git diff --check` over touched packet files
  - grep packet files for protected terms and wrong-interpretation boundaries
- Parent implementation validation:
  - focused regression with retained `state=released`, `reason=provider_issue_released:not_active`, stale `issue_state=Blocked`, older `issue_updated_at`, and newer live `Blocked -> Rework` truth
  - assert only `issue_state`, `issue_state_type`, and `issue_updated_at` change on the retained row
  - assert no Ready reclaim/admission, active-claim refresh, retained-row deletion, or unbounded direct issue-by-id read occurs
  - adjacent no-regression checks for `CO-202`, `CO-212`, `CO-248`, `CO-41`, `CO-64`, and `CO-276` boundaries where touched
  - parent-owned validation and review gates before PR handoff

## Open Questions
- Is the newer same-issue truth always present in the dependent blocker snapshot path, or must parent wire the same comparison through tracked issue refresh data as well?
- Should the parent add a small fixture builder for retained released/not_active metadata refresh to keep future `CO-202` / `CO-212` Ready reclaim tests separate?

## Approvals
- Docs-first packet: bounded same-issue docs child lane
- Parent implementation/review/PR lifecycle: follow-up patch after the first review is complete; targeted regressions, build, lint, full test (`4482` tests), pack smoke, clean standalone review rerun, explicit elegance pass, and final docs/repo gate reruns are complete; PR/review handoff execution remains pending.
- Date: 2026-04-21
