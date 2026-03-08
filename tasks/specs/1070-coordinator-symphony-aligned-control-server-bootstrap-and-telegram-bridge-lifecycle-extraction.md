---
id: 20260308-1070-coordinator-symphony-aligned-control-server-bootstrap-and-telegram-bridge-lifecycle-extraction
title: Coordinator Symphony-Aligned Control Server Bootstrap and Telegram Bridge Lifecycle Extraction
relates_to: docs/PRD-coordinator-symphony-aligned-control-server-bootstrap-and-telegram-bridge-lifecycle-extraction.md
risk: high
owners:
  - Codex
last_review: 2026-03-08
---

# Spec Mirror - 1070 Coordinator Symphony-Aligned Control Server Bootstrap and Telegram Bridge Lifecycle Extraction

- Task ID: `1070-coordinator-symphony-aligned-control-server-bootstrap-and-telegram-bridge-lifecycle-extraction`
- Canonical PRD: `docs/PRD-coordinator-symphony-aligned-control-server-bootstrap-and-telegram-bridge-lifecycle-extraction.md`
- Canonical TECH_SPEC: `docs/TECH_SPEC-coordinator-symphony-aligned-control-server-bootstrap-and-telegram-bridge-lifecycle-extraction.md`
- Canonical ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-bootstrap-and-telegram-bridge-lifecycle-extraction.md`

## Summary

- Extract the remaining post-bind startup/teardown ownership cluster out of `controlServer.ts`.
- Move auth/endpoint bootstrap, initial control-state persistence, and Telegram bridge lifecycle wiring behind a dedicated lifecycle seam.
- Preserve startup ordering, cleanup behavior, runtime subscription semantics, and non-fatal Telegram bridge startup handling.

## Review Approval

- 2026-03-08: Approved for docs-first registration as the next bounded Symphony-aligned slice after `1069`. Evidence: `docs/findings/1070-control-server-bootstrap-and-telegram-bridge-lifecycle-extraction-deliberation.md`, `out/1069-coordinator-symphony-aligned-expiry-cycle-and-timer-ownership-extraction/manual/20260308T141237Z-closeout/14-next-slice-note.md`, `out/1070-coordinator-symphony-aligned-control-server-bootstrap-and-telegram-bridge-lifecycle-extraction/manual/20260308T143833Z-docs-first/04-scout.md`.
