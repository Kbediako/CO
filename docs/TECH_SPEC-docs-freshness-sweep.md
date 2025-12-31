# Technical Spec - Documentation Freshness Sweep (Task 0921)

Source of truth for requirements: `tasks/0921-prd-docs-freshness-sweep.md`.

## Overview
- Objective: Ensure codebase documentation remains accurate after recent refactors and tooling changes.
- In Scope:
  - Run docs-hygiene and spec-guard across the repo.
  - Update stale references (paths, scripts, pipelines, CLI usage).
  - Refresh spec review dates when guardrails demand it.
- Out of Scope:
  - Runtime behavior changes.
  - Pipeline behavior changes outside doc references.

## Architecture & Design

### Current State
- Docs are spread across `docs/`, `tasks/`, and `.agent/`.
- docs-hygiene enforces script/pipeline/path references.
- spec-guard enforces spec freshness windows.

### Proposed Changes
- Audit and update documentation references for recently moved paths (for example stdio tracker relocation and lazy-loading notes).
- Normalize references to current CLI and pipeline definitions.
- Update spec metadata when required by spec-guard.

## Data Persistence / State Impact
- None (docs-only updates).

## External Dependencies
- Node 20 runtime, Codex CLI, existing docs-hygiene/spec-guard scripts.

## Operational Considerations
- Failure Modes:
  - docs:check fails on missing paths or scripts.
  - spec-guard fails on stale specs.
- Observability:
  - Use docs-review manifests as evidence.

## Testing Strategy
- Run `docs-review` before and after updates (spec-guard + docs:check + review).

## Documentation & Evidence
- PRD: `docs/PRD-docs-freshness-sweep.md`
- Action Plan: `docs/ACTION_PLAN-docs-freshness-sweep.md`
- Task checklist: `tasks/tasks-0921-docs-freshness-sweep.md`

## Open Questions (for review agent)
- Confirm whether to replace remaining `owners: - TBD` entries in `tasks/specs/*.md` with named owners or leave them as placeholders.

## Approvals
- Engineering: Pending
- Reviewer: Pending
