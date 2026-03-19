---
id: 20260307-1037-coordinator-symphony-aligned-selected-run-presenter-extraction
title: Coordinator Symphony-Aligned Selected-Run Presenter Extraction
relates_to: docs/PRD-coordinator-symphony-aligned-selected-run-presenter-extraction.md
risk: high
owners:
  - Codex
last_review: 2026-03-07
---

## Summary

- Objective: extract the selected-run presenter policy into a dedicated helper without changing `/ui/data.json`, Telegram behavior, or dispatch behavior.
- Scope: selected-run presenter extraction plus regression/manual evidence.
- Constraints: keep runtime caching and compatibility behavior stable; avoid authority, scheduler, or provider-ingestion expansion.

## Pre-Implementation Review Note

- Decision: approved for docs-first planning as the immediate next slice after `1036`.
- Reasoning: `1036` cleaned up the compatibility presenter, leaving selected-run payload helpers and UI assembly as the next smallest concentrated presentation seam to extract without changing runtime authority boundaries or broadening into a Telegram refactor.
- Initial review evidence: `out/1036-coordinator-symphony-aligned-compatibility-issue-index-extraction/manual/20260307T035705Z-closeout/14-next-slice-note.md`, `docs/findings/1037-selected-run-presenter-extraction-deliberation.md`.
- Delegation note: use a bounded Symphony-alignment review stream before implementation so the extraction boundary stays minimal and route-stable.
