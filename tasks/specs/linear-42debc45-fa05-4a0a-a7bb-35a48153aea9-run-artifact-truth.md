---
id: 20260419-linear-42debc45-fa05-4a0a-a7bb-35a48153aea9
title: Run artifact truth reconcile orphaned active manifests and child-lane placeholders after release invalidation
status: done
relates_to: docs/PRD-linear-42debc45-fa05-4a0a-a7bb-35a48153aea9.md
risk: high
owners:
  - Codex
last_review: 2026-05-18
review_notes:
  - 2026-05-18: CO-522 spec lifecycle audit found the linked task checklist has zero unchecked items (28 checked), so this spec is terminal and eligible for implementation-docs archive. Evidence: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/spec-preexpiry-local-classification.json`.
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-42debc45-fa05-4a0a-a7bb-35a48153aea9-run-artifact-truth.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-42debc45-fa05-4a0a-a7bb-35a48153aea9.md`
- PRD: `docs/PRD-linear-42debc45-fa05-4a0a-a7bb-35a48153aea9.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-42debc45-fa05-4a0a-a7bb-35a48153aea9.md`
- Task checklist: `tasks/tasks-linear-42debc45-fa05-4a0a-a7bb-35a48153aea9.md`

## Traceability
- Linear issue: `CO-241` / `42debc45-fa05-4a0a-a7bb-35a48153aea9`
- Source anchor: `ctx:sha256:63b0749832e8a186a955a92d8fd3c5f60eb8d06d28e3a02f3006b2838e802175#chunk:c000001`
- Docs packet child lane: `.runs/linear-42debc45-fa05-4a0a-a7bb-35a48153aea9-docs-packet/cli/2026-04-18T15-12-30-748Z-ea3efd2f/manifest.json`
- Shared source note: the expected shared source text is absent in this child checkout, so the packet preserves the protected parent prompt wording plus current repo seam names only.

## Summary
- Objective: reconcile `.runs/**/manifest.json` file-based audit truth with active-work truth after provider release/removal or child-lane invalidation/rejection.
- Scope:
  - docs-first packet and registry entry for `CO-241`
  - parent-owned classification of orphaned `status=in_progress` / `status=launching` manifests
  - parent-owned classification of stale child-lane placeholders after `invalidated` or `rejected` decisions
- Constraints:
  - preserve historical files
  - do not mutate Linear from this child lane
  - keep implementation and validation parent-owned

## Issue-Shaping Contract
- User-request translation carried forward: `CO-241` is about run artifact truth, file-based audit truth, and child-lane ledger truth after `orphaned / released / removed / invalidated / rejected` outcomes.
- Protected terms / exact artifact and surface names:
  - `.runs/**/manifest.json`
  - `status=in_progress`
  - `status=launching`
  - `provider-intake-state.json`
  - `orphaned`
  - `released`
  - `removed`
  - `invalidated`
  - `rejected`
  - `file-based audit truth`
  - `child-lane ledger truth`
  - `providerLinearWorkerRunner.ts`
  - `providerLinearChildLaneShell.ts`
  - `providerLinearChildLaneRunner.ts`
  - `run-manifests.js`
- Nearby wrong interpretations to reject:
  - artifact deletion as repair
  - destructive `provider-intake-state.json` cleanup
  - treating every active-looking manifest as live
  - treating child-lane patch presence as stronger than `invalidated` / `rejected` ledger truth
  - widening into Linear workflow mutation or provider scheduling
- Explicit non-goals:
  - no source/test edits in this child lane
  - no historical artifact deletion
  - no scheduler/admission redesign
  - no broad dashboard redesign

## Parity / Alignment Matrix
- Current truth:
  - retained `.runs/**/manifest.json` files may still say `status=in_progress` or `status=launching`
  - `provider-intake-state.json` may say a claim is `released` or `removed`
  - child-lane ledger truth may say a lane is `invalidated` or `rejected`
  - stale child-lane placeholders may look active without current child output
- Reference truth:
  - file-based audit truth must remain durable
  - active-work truth must use newer lifecycle and decision evidence
  - child-lane ledger truth governs child-lane acceptance and retirement
- Target truth / intended delta:
  - active projections no longer count orphaned active-looking manifests after `released`, `removed`, `invalidated`, or `rejected` truth is present
  - stale `status=launching` placeholders are repaired, retired, or explicitly classified
  - historical artifacts remain inspectable
- Explicitly out-of-scope differences:
  - deleting `.runs/**/manifest.json`
  - deleting child-lane patch artifacts
  - mutating live Linear issue state
  - changing provider admission policy

## Readiness Gate
- Not done if:
  - retained `status=in_progress` or `status=launching` artifacts still inflate active work after parent-known terminal truth
  - `provider-intake-state.json` `released` / `removed` truth is ignored
  - `invalidated` / `rejected` child-lane ledger truth is ignored
  - stale placeholders still block child-lane capacity with no repair or classification path
- Pre-implementation issue-quality review evidence:
  - 2026-04-19: protected terms and non-goals are explicit in the parent prompt.
  - 2026-04-19: the source payload path is absent in this child checkout, so parent must refresh live evidence before implementation.
- Safeguard ownership split:
  - child lane owns only declared docs/task files and `tasks/index.json`
  - parent lane owns implementation, validation, Linear/workpad reconciliation, PR lifecycle, and merge

## Technical Requirements
- Functional requirements:
  1. Preserve docs-first packet and task registry evidence.
  2. Classify orphaned `.runs/**/manifest.json` records with `status=in_progress` or `status=launching`.
  3. Consult `provider-intake-state.json` before counting provider-run artifacts as active.
  4. Consult child-lane ledger truth before counting child-lane placeholders or outputs as active.
  5. Preserve file-based audit truth and historical artifacts.
  6. Preserve genuine active runs.
- Non-functional requirements:
  - deterministic classification
  - auditable reason strings or status fields where needed
  - backward-compatible file retention
  - minimal changes in parent-owned seams
- Interfaces / contracts:
  - `.runs/**/manifest.json`
  - `provider-intake-state.json`
  - child-lane ledger records
  - status/read-model active projection

## Architecture & Data
- Architecture / design adjustments:
  - define one parent-owned reconciliation helper or equivalent contract
  - ensure manifest status alone is not enough to establish active truth when lifecycle/ledger truth is newer
  - ensure stale placeholder records can be repaired or retired without losing audit evidence
- Data model changes / migrations:
  - no migration required for docs phase
  - additive classification/reason output acceptable if parent needs it
  - destructive cleanup out of scope
- External dependencies / integrations:
  - none from this child lane
  - parent may use current control-host and run artifact evidence when it refreshes the issue

## Validation Plan
- Child-lane checks:
  - JSON parse of `tasks/index.json`
  - protected-term grep across the touched packet files
  - `git diff --check` over the declared docs scope
- Parent-lane checks:
  - focused child-lane shell coverage for stale `status=launching` placeholders and `invalidated` / `rejected` decisions
  - focused provider-worker/run-manifest coverage for orphaned `status=in_progress` and `status=launching` files after `released` / `removed`
  - focused status/read-model coverage proving file-based audit truth is retained while active-work truth is corrected

## Approvals
- Reviewer: pending parent docs-review / implementation
- Date: 2026-04-19
