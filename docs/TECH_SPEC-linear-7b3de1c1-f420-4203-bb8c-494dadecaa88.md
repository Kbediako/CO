---
id: 20260423-linear-7b3de1c1-f420-4203-bb8c-494dadecaa88
title: "CO: recreate live owner for remaining Mar 23 docs-freshness task-checklist cohort"
relates_to: docs/PRD-linear-7b3de1c1-f420-4203-bb8c-494dadecaa88.md
risk: high
owners:
  - Codex
last_review: 2026-04-23
canonical_owner_marker: codex-orchestrator:canonical-owner-key=docs_freshness_candidate|doc_class:task_packet|path_family:tasks/tasks-*|last_review:2026-03-23|cadence_days:30
follow_up_issue: CO-320
---

# TECH_SPEC - CO: recreate live owner for remaining Mar 23 docs-freshness task-checklist cohort

This mirror points to the canonical task spec at `tasks/specs/linear-7b3de1c1-f420-4203-bb8c-494dadecaa88.md`.

## Implementation Summary
- Preserve the exact canonical owner key `docs_freshness_candidate|doc_class:task_packet|path_family:tasks/tasks-*|last_review:2026-03-23|cadence_days:30`.
- Preserve the exact marker `codex-orchestrator:canonical-owner-key=docs_freshness_candidate|doc_class:task_packet|path_family:tasks/tasks-*|last_review:2026-03-23|cadence_days:30`.
- Preserve the CO-318 maintenance evidence path and values that showed `owner_issue=CO-300`, `reason=configured_owner_terminal`, and lineage `1319-1321`.
- Record recreated live owner `CO-320` and keep the scope limited to owner recreation plus packet/mirror updates.
- Record the invalidated child-lane attempt truthfully without relying on its patch.

## Canonical Artifacts
- Preserved maintenance report: `/Users/kbediako/Code/CO/.workspaces/linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be/out/linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be/docs-freshness-maintenance.json`
- Workpad comment: `0b3a3dbe-8698-4914-8b95-76d9a452b6d4`
- Follow-up owner issue: `CO-320`
- Invalidated child-lane manifest: `.runs/linear-7b3de1c1-f420-4203-bb8c-494dadecaa88-docs-packet-core/cli/2026-04-23T01-32-43-084Z-6b522b42/manifest.json`

## Validation Contract
- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- `npm run docs:freshness:maintain`
- `npm run repo:stewardship`
- `node scripts/diff-budget.mjs`
- docs-review child stream or truthful fallback
- manifest-backed `codex-orchestrator review` / `npm run review` before review handoff when the final diff remains non-trivial
