---
id: 20260423-linear-3c52bf66-f805-4537-8671-ad1dec2f4623
title: "CO: maintain docs freshness after terminal CO-300 owner"
relates_to: docs/PRD-linear-3c52bf66-f805-4537-8671-ad1dec2f4623.md
risk: high
owners:
  - Codex
last_review: 2026-04-23
canonical_owner_marker: codex-orchestrator:canonical-owner-key=docs:freshness:maintain
---

# TECH_SPEC - CO: maintain docs freshness after terminal CO-300 owner

This mirror points to the canonical task spec at `tasks/specs/linear-3c52bf66-f805-4537-8671-ad1dec2f4623.md`.

## Implementation Summary
- Replace terminal live owner `CO-300` with live same-project owner `CO-324` for `docs:freshness:maintain`.
- Preserve `CO-300` as historical terminal-owner evidence: `Done`, `completed`, `is_terminal=true`, `usable=false`.
- Review and refresh the current-main stale docs from the parent baseline: 27 historical task/report rows plus 4 hard-stale active/reference rows.
- Keep `CO-321` and its refreshed `tasks/specs` cohort out of scope.

## Canonical Artifacts
- Parent baseline maintenance report: `out/linear-3c52bf66-f805-4537-8671-ad1dec2f4623/docs-freshness-maintenance-baseline.json`
- Reviewed classification: `docs/findings/linear-3c52bf66-f805-4537-8671-ad1dec2f4623-docs-freshness-classification.md`
- Child baseline manifest: `.runs/linear-3c52bf66-f805-4537-8671-ad1dec2f4623-freshness-baseline/cli/2026-04-23T03-37-54-576Z-8c07866a/manifest.json`
- Workpad comment: `9cfc5a8d-818a-4360-8505-207ac88fcfef`

## Validation Contract
- `npm run docs:freshness`
- `npm run docs:freshness:maintain`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run repo:stewardship`
- `node scripts/diff-budget.mjs`
- manifest-backed standalone review plus explicit elegance review before review handoff if the final diff remains non-trivial
