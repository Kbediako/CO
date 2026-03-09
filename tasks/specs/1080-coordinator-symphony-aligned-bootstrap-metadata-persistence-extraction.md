---
id: 20260309-1080-coordinator-symphony-aligned-bootstrap-metadata-persistence-extraction
title: Coordinator Symphony-Aligned Bootstrap Metadata Persistence Extraction
status: draft
owners:
  - Codex
created: 2026-03-09
last_review: 2026-03-09
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-bootstrap-metadata-persistence-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-bootstrap-metadata-persistence-extraction.md
related_tasks:
  - tasks/tasks-1080-coordinator-symphony-aligned-bootstrap-metadata-persistence-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Bootstrap Metadata Persistence Extraction

## Summary

Extract the bootstrap metadata persistence phase from `controlServerBootstrapLifecycle.ts` into one dedicated control-local helper so the lifecycle keeps ordered startup ownership while the low-level auth/endpoint persistence mechanics move behind a narrower seam.

## Scope

- Add one helper that owns bootstrap metadata persistence for `control-auth.json`, `control-endpoint.json`, chmod hardening, and initial control snapshot flush.
- Delegate that persistence phase in `controlServerBootstrapLifecycle.ts` to the extracted helper.
- Preserve payloads, permission tightening, and startup ordering exactly.

## Out of Scope

- Telegram bridge runtime, polling, subscription, or teardown logic.
- Expiry lifecycle ownership changes.
- `controlServer.ts` bind/listen/start ownership changes unless a tiny import-site touch is forced.
- Authenticated/API route changes.

## Notes

- 2026-03-09: Approved for docs-first registration as the next bounded Symphony-aligned slice after `1079`. Evidence: `out/1079-coordinator-symphony-aligned-telegram-bridge-bootstrap-handoff-extraction/manual/20260309T054759Z-closeout/14-next-slice-note.md`, `docs/findings/1080-bootstrap-metadata-persistence-extraction-deliberation.md`.
