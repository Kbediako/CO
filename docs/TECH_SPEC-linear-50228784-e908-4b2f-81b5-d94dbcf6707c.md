---
id: 20260331-linear-50228784-e908-4b2f-81b5-d94dbcf6707c
title: CO Machine-verify phase-scoped child-lane acceptance
relates_to: docs/PRD-linear-50228784-e908-4b2f-81b5-d94dbcf6707c.md
risk: high
owners:
  - Codex
last_review: 2026-03-31
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-50228784-e908-4b2f-81b5-d94dbcf6707c.md`
- PRD: `docs/PRD-linear-50228784-e908-4b2f-81b5-d94dbcf6707c.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-50228784-e908-4b2f-81b5-d94dbcf6707c.md`
- Task checklist: `tasks/tasks-linear-50228784-e908-4b2f-81b5-d94dbcf6707c.md`

## Traceability
- Linear issue: `CO-52` / `50228784-e908-4b2f-81b5-d94dbcf6707c`
- Linear URL: https://linear.app/asabeko/issue/CO-52/co-machine-verify-phase-scoped-child-lane-acceptance

## Summary
- Objective: extend the child-lane trust boundary so phase-scoped lanes are machine-verifiable bounded helpers instead of descriptive-only records that fail closed.
- Scope:
  - docs-first registration for `CO-52`
  - repo-local phase-to-path selector contract
  - child-lane scope, proof, and ledger extensions
  - parent launch and acceptance updates for phase-only lanes
  - focused regressions for valid, out-of-phase, and tampered or stale cases
- Constraints:
  - preserve parent-owned issue lifecycle authority
  - keep file-scoped lanes compatible
  - fail closed on unknown or mismatched phase contract data

## Issue-Shaping Contract
- User-request translation carried forward:
  - keep the current same-issue child-lane runtime and close the missing machine-verification gap for phase scope
- Protected terms / exact artifact and surface names:
  - `provider-linear-child-lane`
  - `ProviderLinearWorkerChildLaneScope`
  - `ProviderLinearChildLaneProof`
  - `git apply`
- Nearby wrong interpretations to reject:
  - removing phase scope instead of verifying it
  - manual or ad hoc reviewer-only phase acceptance
  - broad scheduler or ownership redesign
- Explicit non-goals carried forward:
  - generic queueing
  - remote authority changes
  - unrelated provider-worker refactors

## Parity / Alignment Matrix
- Current truth:
  - file-scoped acceptance is machine-checked, phase-scoped acceptance is not
- Reference truth:
  - accepted child-lane patches should always be machine-checked before apply
- Target truth / intended delta:
  - phase-scoped lanes carry persisted selector data that the parent recomputes and verifies before apply
- Explicitly out-of-scope differences:
  - broader issue workflow changes outside the child-lane scope contract

## Readiness Gate
- Not done if:
  - phase-only lanes still cannot launch or accept due to missing contract data
  - parent acceptance trusts persisted selector data without recomputation
  - focused regressions do not cover valid, out-of-phase, and tampered or stale cases
- Pre-implementation issue-quality review evidence:
  - `providerLinearChildLaneShell.ts` still requires file scope at launch and rejects phase-only acceptance, so the lane must land real contract data instead of wording-only changes
- Safeguard ownership split:
  - one shared phase-contract helper defines selectors
  - launch and runner persist the same contract shape
  - acceptance verifies both ledger and proof data before apply

## Technical Requirements
- Functional requirements:
  - support phase-only launch for declared phases covered by the supported contract
  - persist `phase_contract_version` and `allowed_path_selectors` alongside raw scope
  - recompute and compare expected selector data during acceptance
  - reject patches that escape the allowed selector union
- Non-functional requirements (performance, reliability, security):
  - deterministic repo-local selector expansion
  - fail closed on unknown phases or mismatched persisted selector data
  - no filesystem-dependent glob discovery at acceptance time
- Interfaces / contracts:
  - `orchestrator/src/cli/providerLinearChildLaneShell.ts`
  - `orchestrator/src/cli/providerLinearChildLaneRunner.ts`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/src/cli/linearCliShell.ts`

## Architecture & Data
- Architecture / design adjustments:
  - add one phase-contract helper used by shell, runner, and ledger normalization
  - compare patch paths against a union of explicit file selectors plus resolved phase selectors
- Data model changes / migrations:
  - extend `ProviderLinearWorkerChildLaneScope` with contract metadata fields
  - preserve raw `files` and `phases` for recomputation and auditability
- External dependencies / integrations:
  - no external service changes; all contract data remains repo-local and manifest-based

## Validation Plan
- Tests / checks:
  - docs-review child stream
  - focused child-lane or CLI regressions
  - required repo validation floor
- Rollout verification:
  - prove a phase-scoped lane can launch and accept only when patch targets stay inside the resolved contract
- Monitoring / alerts:
  - keep phase-contract failures explicit in child-lane error codes and workpad notes

## Open Questions
- Should future lanes add richer selector kinds beyond repo path exact or prefix matching?

## Approvals
- Reviewer: Pending docs-review and implementation validation
- Date: 2026-03-31
