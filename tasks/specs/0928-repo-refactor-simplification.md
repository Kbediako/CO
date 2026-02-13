---
id: 20251231-0928-repo-refactor-simplification
title: Repo Refactor Simplification
relates_to: Task 0928 - docs/PRD-repo-refactor-simplification.md
risk: low
owners:
  - Codex (top-level agent)
  - Review agent
last_review: 2026-02-13
---

## Summary
- Objective: Consolidate pipeline definitions and simplify pipeline resolution while preserving behavior.
- Constraints: No pipeline ID changes; no manifest schema changes; maintain optional spec-guard behavior.

## Proposed Changes
- Architecture / design adjustments: use codex.orchestrator.json as the canonical pipeline definition; remove redundant TS pipelines.
- Data model updates: add optional `source` metadata to `UserConfig`.
- External dependencies: none; add codex.orchestrator.json to package files.

## Impact Assessment
- User impact: none expected; pipeline usage remains the same.
- Operational risk: low; changes are isolated to config loading and pipeline resolution.
- Security / privacy: no change.

## Rollout Plan
- Prerequisites: docs-review run captured pre-change.
- Testing strategy: implementation-gate after changes.
- Launch steps: update checklists and mirrors with manifest evidence.

## Open Questions
- Is package-root config fallback acceptable as the default pipeline source?
- Should docs-review/implementation-gate spec-guard remain strict?

## Approvals
- Reviewer: Pending
- Date: TBD
