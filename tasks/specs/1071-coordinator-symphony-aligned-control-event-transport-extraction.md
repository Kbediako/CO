---
id: 20260308-1071-coordinator-symphony-aligned-control-event-transport-extraction
title: Coordinator Symphony-Aligned Control Event Transport Extraction
relates_to: docs/PRD-coordinator-symphony-aligned-control-event-transport-extraction.md
risk: high
owners:
  - Codex
last_review: 2026-03-08
---

# Spec Mirror - 1071 Coordinator Symphony-Aligned Control Event Transport Extraction

- Task ID: `1071-coordinator-symphony-aligned-control-event-transport-extraction`
- Canonical PRD: `docs/PRD-coordinator-symphony-aligned-control-event-transport-extraction.md`
- Canonical TECH_SPEC: `docs/TECH_SPEC-coordinator-symphony-aligned-control-event-transport-extraction.md`
- Canonical ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-event-transport-extraction.md`

## Summary

- Extract the remaining control-event transport cluster out of `controlServer.ts`.
- Move event append plus shared SSE/runtime fan-out behind a dedicated transport seam.
- Preserve event append semantics, SSE framing, dead-client pruning, and runtime publish-on-broadcast behavior.

## Review Approval

- 2026-03-08: Approved for docs-first registration as the next bounded Symphony-aligned slice after `1070`. Evidence: `docs/findings/1071-control-event-transport-extraction-deliberation.md`, `out/1070-coordinator-symphony-aligned-control-server-bootstrap-and-telegram-bridge-lifecycle-extraction/manual/20260308T145422Z-closeout/14-next-slice-note.md`.
