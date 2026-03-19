---
id: 20260307-1038-coordinator-symphony-aligned-observability-api-controller-extraction
title: Coordinator Symphony-Aligned Observability API Controller Extraction
relates_to: docs/PRD-coordinator-symphony-aligned-observability-api-controller-extraction.md
risk: high
owners:
  - Codex
last_review: 2026-03-07
---

## Summary

- Objective: extract the `/api/v1/*` observability controller policy into a dedicated helper without changing compatibility route or dispatch behavior.
- Scope: observability API controller extraction plus regression/manual evidence.
- Constraints: keep presenter/read-model behavior stable; avoid auth, webhook, authority, or provider-ingestion expansion.

## Pre-Implementation Review Note

- Decision: approved for docs-first planning as the immediate next slice after `1037`.
- Reasoning: `1036` and `1037` isolated presenter policy, leaving the inline `/api/v1/*` controller tree in `controlServer.ts` as the next smallest Symphony-aligned seam to extract without broadening into `/ui/data.json`, auth, or transport refactors.
- Initial review evidence: `out/1037-coordinator-symphony-aligned-selected-run-presenter-extraction/manual/20260307T042627Z-closeout/14-next-slice-note.md`, `docs/findings/1038-observability-api-controller-extraction-deliberation.md`.
- Delegation note: use a bounded Symphony-alignment review stream before implementation so the API controller extraction boundary stays minimal and route-stable.
