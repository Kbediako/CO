# TECH_SPEC - Recursive RLM Enhancements (0961)

## Summary
- Objective: Add pointer-first recursive scaffolding plus explicit variable handoff (`FINAL_VAR`) support so prior subcall outputs are carried as stable references and deterministic variable bindings.
- Scope: symbolic loop/types updates, pointer resolution extension, variable registry/final resolution, planner prompt summary tuning, and focused test coverage.
- Constraints: incremental patch; no broad refactor.

## Technical Requirements
- Functional requirements:
  - Register subcall outputs under stable `subcall:` references.
  - Allow planner-requested snippets to resolve from `subcall:` references.
  - Persist lineage metadata (`parent_pointer`) and output pointer metadata in state artifacts.
  - Support optional `output_var` on subcalls and persist binding metadata.
  - Support optional `final_var` on final planner intent and resolve output deterministically.
- Non-functional requirements:
  - Keep planner prompt under `maxPlannerPromptBytes` with existing truncation safeguards.
  - Maintain deterministic validation and error handling.
- Interfaces / contracts:
  - Extend symbolic types to represent output pointers and lineage metadata.
  - Extend planner schema parsing/validation for `output_var` + `final_var`.
  - Keep existing symbolic planner schema backwards-compatible.

## Architecture and Data
- Architecture / design adjustments:
  - Implement a runtime pointer registry keyed by subcall pointer IDs.
  - Build planner prompt sections around pointer references plus bounded previews.
- Data model changes / migrations:
  - Add optional fields in symbolic iteration subcall records; no external migrations.
- External dependencies / integrations:
  - None.

## Validation Plan
- Tests / checks:
  - `orchestrator/tests/RlmSymbolic.test.ts` updates for subcall pointer chaining and prompt behavior.
  - Full guardrail command chain (delegation/spec guards, build, lint, tests, docs checks, diff budget, review).
- Rollout verification:
  - Symbolic run artifacts confirm pointer fields and lineage capture.
- Monitoring / alerts:
  - Existing `.runs/<task>/.../rlm/state.json` and manifests.

## Approvals
- Reviewer: Codex (self)
- Date: 2026-02-14
