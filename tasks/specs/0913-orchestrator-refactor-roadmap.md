---
id: 20251226-0913-orchestrator-refactor-roadmap
title: Orchestrator Refactor Roadmap (Robustness + Performance)
relates_to: Task 0913 — docs/PRD-orchestrator-refactor-roadmap.md
risk: medium
owners:
  - Codex (top-level agent)
  - Review agent
last_review: 2026-02-13
---

## Added by Bootstrap 2025-10-16

## Summary
- Objective: Provide an implementation-guarded, incremental plan to simplify orchestrator execution/persistence and reduce runtime cost while preserving public behavior.
- Constraints:
  - No breaking changes to manifest schema or CLI contracts.
  - Prefer deletion/flattening over new abstraction.
  - Add/strengthen regression tests before changing behavior-adjacent code paths.

## Proposed Changes
- Architecture / design adjustments:
  - Make manifest updates deterministic on error paths and remove stale-reference hazards in command entry updates.
  - Reduce redundant manifest writes by routing persistence through a single coalescing path.
  - Add bounded exec event capture (opt-in first) to avoid retaining unbounded chunk histories in memory.
  - Consolidate execution-mode parsing behind one helper while preserving current call-site semantics initially.
- Data model updates:
  - Keep existing schema stable; any additions must be optional and backward compatible.
  - Prefer referencing existing log artifacts (runner/per-command/handle logs) rather than embedding large arrays in metrics.
- External dependencies: None planned.

## Impact Assessment
- User impact: None expected; changes are internal hardening/refactors with behavior preserved by tests.
- Operational risk: Medium due to touching persistence and execution hot paths; mitigated by phased rollout and opt-in flags.
- Security / privacy: No new data exposure; ensure privacy guard behavior remains unchanged.

## Rollout Plan
- Prerequisites:
  - Docs-review evidence captured for collateral.
  - Targeted regression tests added before each refactor phase.
- Testing strategy:
  - Add unit tests for failure finalization, atomic write uniqueness, and bounded event capture invariants.
  - Run core lane validations for implementation PRs (spec-guard → build → lint → test → docs:check → diff-budget → review).
- Launch steps:
  1. Land Phase 1 with tests + manifest/atomic-write correctness fixes.
  2. Land Phase 2 with single-writer persistence, keeping output identical.
  3. Land Phase 3 with bounded event capture as opt-in; validate in real runs, then decide on default.
  4. Land Phase 4–5 consolidation/hygiene PRs once earlier phases are stable.

## Open Questions
- What downstream consumers (if any) depend on full `ToolRunRecord.events` chunk history today?
- Do we want a strict policy (lint/test) that forbids direct `saveManifest` calls outside the persister?

## Approvals
- Reviewer: pending
- Date: pending

