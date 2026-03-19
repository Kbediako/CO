---
id: 20260308-1073-coordinator-symphony-aligned-question-child-resolution-adapter-extraction
title: Coordinator Symphony-Aligned Question Child-Resolution Adapter Extraction
status: draft
owners:
  - Codex
created: 2026-03-08
last_review: 2026-03-09
review_cadence_days: 30
relates_to: docs/PRD-coordinator-symphony-aligned-question-child-resolution-adapter-extraction.md
---

# Spec Snapshot

- Task ID: `1073-coordinator-symphony-aligned-question-child-resolution-adapter-extraction`
- Canonical PRD: `docs/PRD-coordinator-symphony-aligned-question-child-resolution-adapter-extraction.md`
- Canonical TECH_SPEC: `docs/TECH_SPEC-coordinator-symphony-aligned-question-child-resolution-adapter-extraction.md`
- Canonical ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-question-child-resolution-adapter-extraction.md`

## Scope

- Extract the child-run question-resolution adapter assembly plus fallback event wiring from `controlServer.ts` into a dedicated control-local module.
- Preserve current route/helper behavior.

## Notes

- 2026-03-08: Approved for docs-first registration as the next bounded Symphony-aligned slice after `1072`. Evidence: `docs/findings/1073-question-child-resolution-adapter-extraction-deliberation.md`, `out/1072-coordinator-symphony-aligned-control-request-context-assembly-extraction/manual/20260308T220352Z-closeout/14-next-slice-note.md`.
- 2026-03-09: Completed with the extracted `controlQuestionChildResolution.ts` seam, direct answered/expired fallback regressions, and closeout evidence in `out/1073-coordinator-symphony-aligned-question-child-resolution-adapter-extraction/manual/20260309T010648Z-closeout/`.
