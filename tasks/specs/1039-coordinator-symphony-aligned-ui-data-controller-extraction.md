---
id: 20260307-1039-coordinator-symphony-aligned-ui-data-controller-extraction
title: Coordinator Symphony-Aligned UI Data Controller Extraction
relates_to: docs/PRD-coordinator-symphony-aligned-ui-data-controller-extraction.md
risk: high
owners:
  - Codex
last_review: 2026-03-07
---

## Summary

- Objective: extract the `/ui/data.json` controller policy into a dedicated helper without changing selected-run dataset behavior.
- Scope: UI data controller extraction plus regression/manual evidence.
- Constraints: keep `selectedRunPresenter.ts` as the dataset builder; avoid `/api/v1/*`, auth, webhook, authority, or provider-ingestion changes.

## Pre-Implementation Review Note

- Decision: approved for docs-first planning as the immediate next slice after `1038`.
- Reasoning: `1038` removed the inline `/api/v1/*` controller tree, leaving the standalone `/ui/data.json` route in `controlServer.ts` as the next smallest Symphony-aligned controller seam to extract without broadening into auth, transport, or control refactors.
- Initial review evidence: `out/1038-coordinator-symphony-aligned-observability-api-controller-extraction/manual/20260307T045306Z-closeout/14-next-slice-note.md`, `docs/findings/1039-ui-data-controller-extraction-deliberation.md`.
- Delegation note: use a bounded read-only controller-boundary review stream before implementation so the UI route extraction stays minimal and contract-stable.
