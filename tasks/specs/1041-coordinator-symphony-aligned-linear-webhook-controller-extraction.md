---
id: 20260307-1041-coordinator-symphony-aligned-linear-webhook-controller-extraction
title: Coordinator Symphony-Aligned Linear Webhook Controller Extraction
relates_to: docs/PRD-coordinator-symphony-aligned-linear-webhook-controller-extraction.md
risk: high
owners:
  - Codex
last_review: 2026-03-07
---

## Summary

- Objective: extract the `/integrations/linear/webhook` controller policy into a dedicated helper without changing webhook validation or advisory behavior.
- Scope: Linear webhook controller extraction plus regression/manual evidence.
- Constraints: keep UI assets, `/auth/session`, auth ordering, event streaming, `/api/v1/*`, and mutating control behavior unchanged.

## Pre-Implementation Review Note

- Decision: approved for docs-first planning as the immediate next slice after `1040`.
- Reasoning: `1040` removed the standalone `/auth/session` branch from `controlServer.ts`, leaving `/integrations/linear/webhook` as the next smallest standalone pre-auth controller seam that can be extracted without widening into general auth/control behavior.
- Initial review evidence: `out/1040-coordinator-symphony-aligned-ui-session-controller-extraction/manual/20260307T063037Z-closeout/14-next-slice-note.md`, `docs/findings/1041-linear-webhook-controller-extraction-deliberation.md`.
- Delegation note: use a bounded read-only controller-boundary review stream before implementation so the webhook extraction stays minimal and contract-stable.
- Boundary approval: local read-only boundary review plus the delegated diagnostics boundary-run both found no blocking seam issue. The bounded extraction should move only the webhook route-local validation, advisory-state recording, audit emission, runtime publish call, and provider response writing, while `controlServer.ts` keeps route ordering, UI assets, `/auth/session`, auth/CSRF gates, `/api/v1/*`, event streaming, and mutating control behavior. Evidence: `.runs/1041-coordinator-symphony-aligned-linear-webhook-controller-extraction-boundary-review/cli/2026-03-07T07-02-47-409Z-366b9eb0/manifest.json`, `docs/findings/1041-linear-webhook-controller-extraction-deliberation.md`.
