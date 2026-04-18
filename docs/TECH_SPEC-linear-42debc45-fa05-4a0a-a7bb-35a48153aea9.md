---
id: 20260419-linear-42debc45-fa05-4a0a-a7bb-35a48153aea9
title: Run artifact truth reconcile orphaned active manifests and child-lane placeholders after release invalidation
relates_to: docs/PRD-linear-42debc45-fa05-4a0a-a7bb-35a48153aea9.md
risk: high
owners:
  - Codex
last_review: 2026-04-19
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-42debc45-fa05-4a0a-a7bb-35a48153aea9-run-artifact-truth.md`
- PRD: `docs/PRD-linear-42debc45-fa05-4a0a-a7bb-35a48153aea9.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-42debc45-fa05-4a0a-a7bb-35a48153aea9.md`
- Task checklist: `tasks/tasks-linear-42debc45-fa05-4a0a-a7bb-35a48153aea9.md`

## Traceability
- Linear issue: `CO-241` / `42debc45-fa05-4a0a-a7bb-35a48153aea9`
- Source anchor: `ctx:sha256:63b0749832e8a186a955a92d8fd3c5f60eb8d06d28e3a02f3006b2838e802175#chunk:c000001`
- Docs packet child lane: `.runs/linear-42debc45-fa05-4a0a-a7bb-35a48153aea9-docs-packet/cli/2026-04-18T15-12-30-748Z-ea3efd2f/manifest.json`
- Shared source note: the expected shared source text is absent in this child checkout, so the packet preserves the protected parent prompt wording plus current repo seam names only.

## Summary
- Objective: reconcile orphaned active-looking `.runs/**/manifest.json` records and child-lane placeholders with `provider-intake-state.json` release/removal truth and child-lane invalidation/rejection truth.
- Scope:
  - docs-first packet and `tasks/index.json` registry entry for `CO-241`
  - parent-owned reconciliation between file-based audit truth and active-work projection
  - parent-owned reconciliation between child-lane ledger truth and retained child run artifacts
- Constraints:
  - preserve historical artifacts
  - keep `provider-intake-state.json` as lifecycle evidence
  - keep child-lane ledger truth distinct from file-based audit truth
  - do not run implementation validation in this child docs lane

## Issue-Shaping Contract
- User-request translation carried forward: this lane is about run artifact truth after release or invalidation, not about deleting artifacts, changing Linear state, or widening scheduler policy.
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
  - deleting retained `.runs/**/manifest.json` history
  - assuming active-looking manifest status always means active operator work
  - treating `provider-intake-state.json` cleanup as the primary fix
  - letting `invalidated` or `rejected` child lanes remain live just because a file exists
  - solving with Linear mutation or generic scheduler redesign
- Explicit non-goals:
  - no implementation or test edits in this child lane
  - no historical artifact deletion
  - no destructive `provider-intake-state.json` rewrite
  - no generic provider admission or dashboard redesign

## Parity / Alignment Matrix
- Current truth:
  - `.runs/**/manifest.json` can retain `status=in_progress` or `status=launching` after the run is no longer active.
  - `provider-intake-state.json` can mark provider claims `released` or `removed`.
  - child-lane ledger truth can mark output `invalidated` or `rejected`, or retain a reservation placeholder.
  - file-based audit truth and active-work projection can drift.
- Reference truth:
  - retained artifacts are audit evidence, not automatically active work.
  - `released` and `removed` are terminal enough for provider-intake active occupancy.
  - `invalidated` and `rejected` are terminal enough for parent acceptance state.
  - child-lane ledger truth should decide child-lane activity, not manifest presence alone.
- Target truth / intended delta:
  - parent implementation classifies orphaned active-looking manifests without deleting them.
  - active projections use `provider-intake-state.json` lifecycle truth and child-lane ledger truth before counting active work.
  - status surfaces can explain why file-based audit truth is retained but no longer active.
- Explicitly out-of-scope differences:
  - scheduler/concurrency policy
  - Linear state transitions
  - artifact pruning
  - broad status renderer redesign

## Readiness Gate
- Not done if:
  - `status=in_progress` or `status=launching` manifests remain counted as live after `released`, `removed`, `invalidated`, or `rejected` truth is known
  - stale child-lane placeholders still block capacity after parent invalidation or child-run reconciliation
  - the fix deletes `.runs/**/manifest.json` history instead of preserving file-based audit truth
  - the fix treats `provider-intake-state.json` as disposable cleanup state rather than lifecycle evidence
- Pre-implementation issue-quality review evidence:
  - 2026-04-19: the parent prompt names exact protected surfaces and makes the micro-task path ineligible because correctness depends on exact artifact names, lifecycle vocabulary, non-goals, and a current/reference/target parity contract.
  - 2026-04-19: the expected shared source payload path is absent in this child checkout, so implementation must refresh current live evidence before coding.
- Safeguard ownership split:
  - child lane owns only the declared docs/task files and `tasks/index.json`
  - parent lane owns implementation, focused tests, docs-review, Linear/workpad reconciliation, PR lifecycle, and merge

## Technical Requirements
- Functional requirements:
  1. Preserve docs-first packet and registry evidence for `CO-241`.
  2. Detect or classify `.runs/**/manifest.json` records with `status=in_progress` or `status=launching` that are orphaned by newer lifecycle truth.
  3. Use `provider-intake-state.json` `released` / `removed` evidence to avoid counting stale provider-owned manifests as active work.
  4. Use child-lane ledger truth so `invalidated` / `rejected` child lanes and stale placeholders do not remain active.
  5. Preserve file-based audit truth and historical artifacts.
  6. Keep genuine live runs with `status=in_progress` or `status=launching` visible.
- Non-functional requirements:
  - deterministic, machine-checkable classification
  - backward-compatible retained artifacts
  - minimal parent-owned change in existing manifest, provider worker, and child-lane seams
  - no destructive cleanup as the default repair
- Interfaces / contracts:
  - `.runs/**/manifest.json`
  - `provider-intake-state.json`
  - `providerLinearWorkerRunner.ts`
  - `providerLinearChildLaneShell.ts`
  - `providerLinearChildLaneRunner.ts`
  - `scripts/lib/run-manifests.js`

## Architecture & Data
- Architecture / design adjustments:
  - parent should define a single active-vs-audit classifier for manifest records that can consult provider lifecycle and child-lane decision state
  - child-lane placeholders should have an explicit retirement or orphaned-placeholder path after invalidation/rejection/reconciliation
  - status projection should not rely on manifest `status` alone when newer ledger truth exists
- Required artifact/content expectations:
  - `.runs/**/manifest.json` remains on disk
  - file-based audit truth remains inspectable
  - child-lane ledger truth remains authoritative for accepted/rejected/invalidated decisions
  - `provider-intake-state.json` remains authoritative for provider release/removal lifecycle
- Data model changes / migrations:
  - no migration is required for this docs phase
  - additive classification fields or reason strings are acceptable if parent needs them
  - destructive artifact cleanup is out of scope
- External dependencies / integrations:
  - no Linear mutation from this child lane
  - parent must refresh current live evidence because this child checkout lacks the shared source payload

## Current Truth
- Child-lane reservation logic can create placeholder records with `status=launching`.
- Child-lane decision logic supports `invalidated` and `rejected` decisions.
- Provider and run projection paths can inspect retained manifests under `.runs/**/manifest.json`.
- `provider-intake-state.json` can retain provider lifecycle evidence after claims are `released` or `removed`.

## Proposed Design
- Add or clarify one reconciliation contract that:
  - starts from file-based audit truth but does not equate retained active-looking manifest status with live work
  - checks `provider-intake-state.json` for `released` / `removed` lifecycle truth
  - checks child-lane ledger truth for `invalidated` / `rejected` decisions and stale placeholders
  - emits an explicit orphaned or retired classification instead of deleting artifacts

## Protected Expectations
- Preserve `.runs/**/manifest.json`, `status=in_progress`, `status=launching`, `provider-intake-state.json`, `orphaned / released / removed / invalidated / rejected`, file-based audit truth, and child-lane ledger truth.
- Preserve historical artifacts.
- Preserve genuinely live active runs.
- Keep the fix bounded to artifact and ledger truth reconciliation.

## Reject These Wrong Interpretations
- `Delete the old manifests so status looks clean.`
- `All status=in_progress and status=launching files are live active work.`
- `provider-intake-state.json is just cache and can be rewritten to match manifests.`
- `invalidated or rejected child lanes should still count until their patch files are removed.`
- `This is really a Linear state transition or scheduler capacity problem.`

## Validation Plan
- Child-lane checks:
  - JSON parse of `tasks/index.json`
  - protected-term grep across the touched packet files
  - `git diff --check` over the declared docs scope
- Parent-lane checks:
  - focused `ProviderLinearChildLaneShell.test.ts` coverage for stale `status=launching` placeholder retirement after invalidation/rejection
  - focused `ProviderLinearWorkerRunner.test.ts` or nearby projection coverage for orphaned `status=in_progress` / `status=launching` manifests after provider `released` / `removed`
  - focused status/read-model coverage proving active rows remain for genuinely live runs and disappear only for reconciled orphaned artifacts
  - parent docs-review before implementation

## Approvals
- Reviewer: pending parent docs-review / implementation
- Date: 2026-04-19
