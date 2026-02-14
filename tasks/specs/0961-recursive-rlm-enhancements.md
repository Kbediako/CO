---
id: 20260214-0961-recursive-rlm-enhancements
title: Recursive RLM Enhancements
relates_to: docs/PRD-recursive-rlm-enhancements.md
risk: medium
owners:
  - Codex
last_review: 2026-02-14
---

## Summary
- Objective: Deliver a recursive RLM improvement that shifts symbolic subcall carry-forward data from raw text toward stable references and explicit variable handoff contracts.
- Scope: Introduce `subcall:` pointer references, pointer-aware snippet resolution, recursion lineage metadata, `output_var`/`final_var` support, and test coverage updates.
- Constraints: Keep compatibility with existing symbolic loop semantics and budget guards.

## Technical Requirements
- Functional requirements:
  - Add support for prior subcall reference pointers (`subcall:<iteration>:<subcall_id>`) in symbolic planner/subcall flow.
  - Permit snippet resolution from subcall pointers in addition to `ctx:` pointers.
  - Store recursion lineage metadata per subcall entry (phase-1: parent-pointer field capture and persistence).
  - Support optional `output_var` in subcalls; record variable bindings from subcall outputs.
  - Support optional `final_var` in final planner intent; resolve it via variable bindings when `final_answer` is omitted.
  - Keep `intent=final` gating behavior and existing plan validation constraints intact.
- Non-functional requirements (performance, reliability, security):
  - Planner prompt growth remains bounded by existing planner prompt budget.
  - Pointer resolution failures remain deterministic (`plan_validation_error` path).
  - No new network or secret handling paths introduced.
- Interfaces / contracts:
  - `RlmSymbolicSnippet` accepts pointer values that can be `ctx:` or `subcall:`.
  - `RlmSymbolicSubcall` records a stable output pointer for downstream use.
  - Planner schema allows `subcalls[].output_var` and `intent=final` with `final_var`.

## Architecture and Data
- Architecture / design adjustments:
  - Add a subcall pointer store in symbolic loop runtime and inject pointer summaries into planner prompt construction.
  - Extend plan validation pointer checks to recognize/validate `subcall:` references against the in-run pointer store.
  - Add variable-binding store and final-resolution logic for `final_var`.
- Data model changes / migrations:
  - Extend symbolic iteration/subcall structures with optional pointer/lineage metadata.
  - No persisted schema migration outside run artifacts.
- External dependencies / integrations:
  - None.

## Validation Plan
- Tests / checks:
  - Update `orchestrator/tests/RlmSymbolic.test.ts` with:
    - pointer-reuse test (`subcall:` reference in a later iteration).
    - prompt-context assertion proving pointer summary inclusion and bounded prior-output verbosity.
    - variable handoff test (`output_var` capture + `final_var` resolution).
  - Run required guardrail checks per AGENTS.
  - Manifest evidence for this task:
    - docs-review: `.runs/0961-recursive-rlm-enhancements/cli/2026-02-14T10-04-42-551Z-3102e10d/manifest.json`
    - implementation-gate: `.runs/0961-recursive-rlm-enhancements/cli/2026-02-14T10-05-13-113Z-975d57f0/manifest.json`
    - delegation scout: `.runs/0961-recursive-rlm-enhancements-scout/cli/2026-02-14T09-35-29-030Z-6cd6fe7a/manifest.json`
- Rollout verification:
  - Manual symbolic run confirms state/artifact pointer fields appear as expected.
- Monitoring / alerts:
  - Inspect the implementation manifest for this task: `.runs/0961-recursive-rlm-enhancements/cli/2026-02-14T10-05-13-113Z-975d57f0/manifest.json`.
  - For symbolic runtime audits, inspect the per-run symbolic state artifact at `.runs/0961-recursive-rlm-enhancements/cli/<run-id>/rlm/state.json` and related subcall artifacts under `.runs/0961-recursive-rlm-enhancements/cli/<run-id>/rlm/subcalls/`.

## Open Questions
- None blocking.

## Approvals
- Reviewer: Codex (self)
- Date: 2026-02-14
