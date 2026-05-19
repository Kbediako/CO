---
id: 20260418-linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c
title: Control host reconcile resumed provider-worker retry acceptance and CO STATUS truth after a failed prior attempt
status: in_progress
relates_to: docs/PRD-linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c.md
risk: high
owners:
  - Codex
last_review: 2026-05-18
review_notes:
  - 2026-05-18: CO-522 active-spec audit found 10 unchecked task checklist items, so this spec remains active and was reviewed for current lifecycle ownership rather than archived. Evidence: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/spec-preexpiry-local-classification.json`.
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c.md`
- PRD: `docs/PRD-linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c.md`
- Task checklist: `tasks/tasks-linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c.md`

## Traceability
- Linear issue: `CO-222` / `8f8b9b94-41fe-46c3-93fc-0a2c28efc58c`
- Source anchor: `ctx:sha256:6c2fdaf4cabe0fb0a183c2574b434ee4b063ceab0a04e0e592aad4c44d81b205#chunk:c000001`
- Docs packet child lane: `.runs/linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c-co222-docs-packet/cli/2026-04-17T16-32-33-651Z-8f6278d1/manifest.json`
- Shared source note: the expected shared source payload is absent in this child checkout, so the packet is anchored on the bounded lane prompt and current repo seam names only.

## Summary
- Objective: make resumed provider-worker runs authoritative after a failed prior attempt so retry acceptance, control-host refresh failure history, control-host intake, manifest/proof/summary truth reconciliation, and `CO STATUS` stop disagreeing about which attempt is current.
- Scope:
  - docs-first packet and registry/checklist mirrors for `CO-222`
  - one parent-owned precedence/reconciliation seam
  - focused parent validation only
- Constraints:
  - preserve exact issue wording
  - preserve failed prior attempt evidence as audit history
  - do not widen into redesign work

## Issue-Shaping Contract
- User-request translation carried forward: this lane is about reconciling current resumed-run truth after a failed prior attempt, not about generic retry or `CO STATUS` redesign.
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
  - retry redesign without current-truth reconciliation
  - refresh-history cleanup without retry-acceptance consequences
  - `CO STATUS` presentation-only cleanup
  - deleting failed-attempt evidence instead of reconciling it
- Explicit non-goals carried forward:
  - no broad retry-queue redesign
  - no control-host intake redesign
  - no `CO STATUS` UI/layout redesign
  - no deletion of failed prior attempt manifest/proof/summary evidence as the fix
  - no code or test edits in this docs child lane

## Parity / Alignment Matrix
- Current truth:
  - resumed provider-worker runs can coexist with stale failed-attempt authority on retry acceptance or reporting surfaces
  - control-host refresh failure history and control-host intake can remain stale long enough to conflict with current resumed-run truth
  - manifest/proof/summary truth reconciliation and `CO STATUS` can choose different current attempts
- Reference truth:
  - once current control-host intake plus current run evidence prove the resumed attempt is real, that resumed run should be the authoritative current attempt
  - failed prior attempt evidence should remain retained as audit history only
  - retry acceptance and `CO STATUS` should both consume the same authoritative attempt
- Target truth / intended delta:
  - one shared precedence rule decides current resumed-run truth versus stale failed-attempt residue
  - retry acceptance, control-host intake, manifest/proof/summary truth reconciliation, and `CO STATUS` all use that same rule
  - failed prior attempt evidence remains retained and inspectable without overriding current truth
- Explicitly out-of-scope differences:
  - retry-queue redesign
  - control-host intake redesign
  - `CO STATUS` visual redesign
  - unrelated refresh-history or merge-closeout work

## Readiness Gate
- Not done if:
  - resumed provider-worker runs are still rejected or misclassified because a failed prior attempt remains authoritative
  - retry acceptance still follows stale failed-attempt residue rather than current intake plus current run evidence
  - control-host refresh failure history still outranks current resumed-run truth
  - manifest/proof/summary truth reconciliation still leaves the stale failed attempt dominant
  - `CO STATUS` still reports the failed prior attempt instead of the current resumed provider-worker run
- Pre-implementation issue-quality review evidence:
  - 2026-04-18: the bounded handoff wording makes `CO-222` a multi-surface current-truth contract, not a narrower retry-only or status-only lane. The packet therefore preserves exact wording across retry acceptance, control-host intake, refresh failure history, manifest/proof/summary truth, and `CO STATUS`.
  - 2026-04-18: the micro-task path is ineligible because correctness depends on exact wording, explicit non-goals, explicit not-done-if conditions, and the parity matrix current/reference/target contract before implementation starts.
- Safeguard ownership split:
  - child lane owns only the declared docs/checklist/registry files
  - parent lane owns source/test inspection, implementation, docs-review, validation, Linear/workpad reconciliation, PR lifecycle, and merge

## Technical Requirements
- Functional requirements:
  1. Create the docs-first packet and registry/checklist mirrors for `CO-222`.
  2. Define one authoritative precedence rule between current resumed-run truth and stale failed prior attempt evidence.
  3. Apply that precedence rule to retry acceptance and control-host intake reconciliation.
  4. Apply that same precedence rule to manifest/proof/summary truth reconciliation and `CO STATUS`.
  5. Preserve failed prior attempt evidence as retained audit history rather than deleting it.
  6. Keep the parity matrix current/reference/target contract explicit through implementation handoff.
- Non-functional requirements:
  - deterministic cross-surface precedence
  - additive only; no destructive evidence cleanup
  - smallest shared seam, not surface-specific patches
- Interfaces / contracts:
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/src/cli/control/providerIssueObservability.ts`
  - `orchestrator/src/cli/control/selectedRunProjection.ts`
  - `orchestrator/src/cli/control/controlRuntime.ts`

## Architecture & Data
- Architecture / design adjustments:
  - introduce or reuse one shared helper that decides whether current resumed-run truth supersedes stale failed-attempt residue
  - keep failed-attempt artifacts retained but demoted from current authority
  - make `CO STATUS` a consumer of the same current-attempt rule as retry acceptance and intake
- Required artifact/content expectations:
  - control-host intake carries enough freshness or precedence data to distinguish current resumed-run truth from stale failed-attempt residue
  - `provider-linear-worker-proof.json` and summary surfaces do not outvote newer authoritative current truth
  - manifest/proof/summary truth reconciliation exposes a single current attempt and preserved historical evidence
- Data model changes / migrations:
  - additive metadata or freshness comparisons are acceptable
  - no destructive cleanup of failed prior attempt artifacts
- External dependencies / integrations:
  - no Linear mutation from this child lane
  - parent lane may reuse existing proof/intake/read-model helpers instead of introducing new artifacts if one shared precedence seam is sufficient

## Current Truth
- `providerIssueHandoff.ts` already owns retry acceptance, resume/start decisions, and control-host intake claim updates.
- `providerLinearWorkerRunner.ts` writes provider-worker proof and summary artifacts that can later influence read models.
- `selectedRunProjection.ts`, `providerIssueObservability.ts`, and `controlRuntime.ts` already shape current-attempt read models and `CO STATUS`.
- Without one shared precedence rule, a failed prior attempt can keep surfacing as the current truth on one surface while a resumed run is current on another.

## Proposed Design
- Add or reuse one shared predicate/helper that decides when current resumed-run truth supersedes stale failed-attempt residue.
- Consume that predicate in:
  - retry acceptance and control-host intake reconciliation
  - manifest/proof/summary truth reconciliation
  - `CO STATUS` / read-model projection
- Retain failed prior attempt evidence as historical context while ensuring it no longer dominates current authority once the resumed run is current.

## Protected Expectations
- Preserve exact issue wording around `resumed provider-worker runs`, `failed prior attempt`, `retry acceptance`, `control-host refresh failure history`, `control-host intake`, `CO STATUS`, and `manifest/proof/summary truth reconciliation`.
- Preserve historical failed-attempt evidence for audit/debug.
- Prefer one bounded precedence rule over multiple ad hoc overrides.
- Keep current/reference/target parity explicit through handoff.

## Reject These Wrong Interpretations
- `This is only a retry queue or retry backoff issue.`
- `This is only a CO STATUS presentation issue.`
- `Delete the stale failed attempt artifacts and call it fixed.`
- `Refresh failure history can remain authoritative even after a resumed run is current.`
- `Each surface can choose its own precedence rule.`

## Validation Plan
- Child-lane checks:
  - JSON parse of `tasks/index.json`
  - protected-term grep across the six packet/mirror files
  - `git diff --check` over the declared docs scope
- Parent-lane checks:
  - focused `ProviderIssueHandoffRefreshSerialization.test.ts` and/or `ProviderIssueHandoff.test.ts` coverage for retry acceptance and intake reconciliation
  - focused `ProviderLinearWorkerRunner.test.ts`, `SelectedRunProjection.test.ts`, `ProviderIssueObservability.test.ts`, `CompatibilityIssuePresenter.test.ts`, and `ControlRuntime.test.ts` coverage for manifest/proof/summary truth reconciliation and `CO STATUS`
  - parent docs-review before implementation
  - parent-selected scoped validation after source edits

## Approvals
- Reviewer: pending parent docs-review / implementation
- Date: 2026-04-18
