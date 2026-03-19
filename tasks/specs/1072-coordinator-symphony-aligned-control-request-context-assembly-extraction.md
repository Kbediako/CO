---
id: 20260308-1072-coordinator-symphony-aligned-control-request-context-assembly-extraction
title: Coordinator Symphony-Aligned Control Request Context Assembly Extraction
relates_to: docs/PRD-coordinator-symphony-aligned-control-request-context-assembly-extraction.md
risk: high
owners:
  - Codex
last_review: 2026-03-08
---

# Spec Mirror - 1072 Coordinator Symphony-Aligned Control Request Context Assembly Extraction

- Task ID: `1072-coordinator-symphony-aligned-control-request-context-assembly-extraction`
- Canonical PRD: `docs/PRD-coordinator-symphony-aligned-control-request-context-assembly-extraction.md`
- Canonical TECH_SPEC: `docs/TECH_SPEC-coordinator-symphony-aligned-control-request-context-assembly-extraction.md`
- Canonical ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-request-context-assembly-extraction.md`

## Summary

- Extract the remaining request-context assembly cluster out of `controlServer.ts`.
- Move shared request-context and internal-context composition behind a dedicated builder seam.
- Preserve current request/helper call patterns, internal-context behavior, and presenter/runtime snapshot composition behavior.

## Review Approval

- 2026-03-08: Approved for docs-first registration as the next bounded Symphony-aligned slice after `1071`. Evidence: `docs/findings/1072-control-request-context-assembly-extraction-deliberation.md`, `out/1071-coordinator-symphony-aligned-control-event-transport-extraction/manual/20260308T152650Z-closeout/14-next-slice-note.md`.
