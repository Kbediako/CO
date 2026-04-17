---
id: 20260418-linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c
title: Control host reconcile resumed provider-worker retry acceptance and CO STATUS truth after a failed prior attempt
relates_to: docs/PRD-linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c.md
risk: high
owners:
  - Codex
last_review: 2026-04-18
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c.md`
- PRD: `docs/PRD-linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c.md`
- Task checklist: `tasks/tasks-linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c.md`

## Traceability
- Linear issue: `CO-222` / `8f8b9b94-41fe-46c3-93fc-0a2c28efc58c`
- Source anchor: `ctx:sha256:6c2fdaf4cabe0fb0a183c2574b434ee4b063ceab0a04e0e592aad4c44d81b205#chunk:c000001`
- Docs packet child lane manifest: `.runs/linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c-co222-docs-packet/cli/2026-04-17T16-32-33-651Z-8f6278d1/manifest.json`
- Source payload note: expected shared source text is absent in this child checkout; the packet therefore preserves only the protected issue wording supplied in the bounded handoff plus current repo seam names.

## Summary
- Objective: define the narrow reconciliation contract for resumed provider-worker runs after a failed prior attempt so retry acceptance, control-host refresh failure history, control-host intake, manifest/proof/summary truth reconciliation, and `CO STATUS` all prefer the same current authoritative attempt.
- Scope:
  - docs-first packet and registry/checklist mirrors
  - parent-owned precedence and reconciliation implementation
  - parent-owned focused validation only
- Constraints:
  - keep exact protected issue wording
  - do not widen into generic retry redesign, control-host intake redesign, or `CO STATUS` redesign
  - keep this child lane docs-only

## Issue-Shaping Contract
- User-request translation carried forward: this is a resumed provider-worker truth-reconciliation lane after a failed prior attempt, not a generic retry or status lane.
- Protected terms / exact artifact and surface names:
  - `resumed provider-worker runs`
  - `failed prior attempt`
  - `retry acceptance`
  - `control-host refresh failure history`
  - `control-host intake`
  - `CO STATUS`
  - `manifest/proof/summary truth reconciliation`
  - `provider-intake-state.json`
  - `provider-linear-worker-proof.json`
  - `providerIssueHandoff.ts`
  - `providerLinearWorkerRunner.ts`
  - `providerIssueObservability.ts`
  - `selectedRunProjection.ts`
  - `controlRuntime.ts`
- Nearby wrong interpretations to reject:
  - generic retry redesign
  - control-host intake architecture rewrite
  - `CO STATUS` presentation-only cleanup
  - deleting failed-attempt evidence instead of reconciling it
- Explicit non-goals carried forward:
  - no broad retry-queue redesign
  - no control-host intake redesign
  - no `CO STATUS` visual/layout redesign
  - no deletion of failed prior attempt evidence as the fix
  - no code or test edits in this child lane

## Parity / Alignment Matrix
- Current truth:
  - failed prior attempt evidence can continue to dominate acceptance or reporting after a resumed run exists
  - control-host refresh failure history and control-host intake can compete with current resumed-run truth
  - manifest/proof/summary truth reconciliation and `CO STATUS` can disagree on which attempt is current
- Reference truth:
  - current resumed-run truth should become authoritative once current intake plus current run evidence prove the resumed attempt is real
  - failed prior attempt evidence should stay visible for audit without dominating current truth
  - retry acceptance and `CO STATUS` should follow the same authoritative attempt
- Target truth / intended delta:
  - one precedence rule decides current resumed-run truth versus stale failed-attempt residue
  - retry acceptance, control-host intake, manifest/proof/summary truth reconciliation, and `CO STATUS` all share that precedence rule
  - failed prior attempt evidence remains inspectable as history, not current authority
- Explicitly out-of-scope differences:
  - retry-queue redesign
  - control-host intake redesign
  - `CO STATUS` UI redesign
  - unrelated refresh-history cleanup or merge-closeout work

## Readiness Gate
- Not done if:
  - resumed provider-worker runs are still rejected or misclassified because a failed prior attempt stays authoritative
  - retry acceptance still follows stale failed-attempt residue instead of current control-host intake plus current run evidence
  - control-host refresh failure history still outranks current resumed-run truth
  - manifest/proof/summary truth reconciliation still leaves the stale failed attempt dominant
  - `CO STATUS` still reports the failed prior attempt instead of the authoritative resumed run
- Pre-implementation issue-quality review evidence:
  - 2026-04-18: this child lane accepted the wider reconciliation framing from the bounded handoff because correctness depends on exact protected wording across retry acceptance, control-host intake, refresh history, manifest/proof/summary truth, and `CO STATUS`. The issue is not plausibly narrower than a shared precedence contract, and the micro-task path is ineligible because exact wording and parity contract are part of the requested deliverable.
- Safeguard ownership split:
  - child lane owns only the declared docs/checklist/registry files
  - parent lane owns source/test inspection, implementation, validation, Linear/workpad reconciliation, PR lifecycle, and patch integration

## Technical Requirements
- Functional requirements:
  - preserve the exact protected issue wording in the docs-first packet
  - define one authoritative precedence rule between current resumed-run truth and stale failed-attempt residue
  - ensure retry acceptance, control-host intake, manifest/proof/summary truth reconciliation, and `CO STATUS` use that same rule
  - preserve failed prior attempt evidence as audit history
- Non-functional requirements:
  - minimal shared reconciliation seam
  - deterministic precedence across write-side and read-side surfaces
  - additive only; no destructive cleanup of historical artifacts
- Interfaces / contracts:
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/src/cli/control/providerIssueObservability.ts`
  - `orchestrator/src/cli/control/selectedRunProjection.ts`
  - `orchestrator/src/cli/control/controlRuntime.ts`

## Architecture & Data
- Architecture / design adjustments:
  - prefer one shared current-attempt precedence helper rather than scattered overrides
  - keep failed prior attempt evidence retained but demoted when current resumed-run truth is proven
  - keep `CO STATUS` aligned with write-side truth instead of compensating visually for stale data
- Data model changes / migrations:
  - additive precedence metadata or freshness comparison is acceptable
  - no destructive purge of failed attempt manifests, proofs, or summaries
- External dependencies / integrations:
  - no Linear mutation from this child lane
  - no parent implementation details are changed here

## Validation Plan
- Child-lane checks:
  - JSON parse of `tasks/index.json`
  - protected-term grep across the touched packet files
  - `git diff --check` over the declared docs scope
- Parent-lane checks:
  - focused regression coverage in `ProviderIssueHandoffRefreshSerialization.test.ts`, `ProviderIssueHandoff.test.ts`, `ProviderLinearWorkerRunner.test.ts`, `SelectedRunProjection.test.ts`, `ProviderIssueObservability.test.ts`, `CompatibilityIssuePresenter.test.ts`, and `ControlRuntime.test.ts` as selected by the final seam choice
  - parent docs-review before implementation
  - parent-selected scoped validation after implementation

## Approvals
- Reviewer: pending parent docs-review / implementation
- Date: 2026-04-18
