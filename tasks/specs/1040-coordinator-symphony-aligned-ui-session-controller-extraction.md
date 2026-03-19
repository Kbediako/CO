---
id: 20260307-1040-coordinator-symphony-aligned-ui-session-controller-extraction
title: Coordinator Symphony-Aligned UI Session Controller Extraction
relates_to: docs/PRD-coordinator-symphony-aligned-ui-session-controller-extraction.md
risk: high
owners:
  - Codex
last_review: 2026-03-07
---

## Summary

- Objective: extract the `/auth/session` controller policy into a dedicated helper without changing session issuance or request validation behavior.
- Scope: UI session controller extraction plus regression/manual evidence.
- Constraints: keep auth ordering, webhook handling, event streaming, `/api/v1/*`, and mutating control behavior unchanged.

## Pre-Implementation Review Note

- Decision: approved for docs-first planning as the immediate next slice after `1039`.
- Reasoning: `1039` removed the standalone `/ui/data.json` route from `controlServer.ts`, leaving `/auth/session` as the next smallest UI-adjacent controller seam that can be extracted without widening into general auth/session or provider behavior.
- Initial review evidence: `out/1039-coordinator-symphony-aligned-ui-data-controller-extraction/manual/20260307T055059Z-closeout/14-next-slice-note.md`, `docs/findings/1040-ui-session-controller-extraction-deliberation.md`.
- Delegation note: use a bounded read-only controller-boundary review stream before implementation so the session route extraction stays minimal and contract-stable.
- Delegated boundary approval: the bounded read-only seam review completed with no blocking issue and approved extracting only the `/auth/session` route-local controller logic while preserving route ordering, shared host-normalization helpers, session-token restrictions, and non-`GET`/`POST` fallthrough behavior. Evidence: `.runs/1040-coordinator-symphony-aligned-ui-session-controller-extraction-boundary-review/cli/2026-03-07T06-14-56-301Z-72103429/manifest.json`, `docs/findings/1040-ui-session-controller-extraction-deliberation.md`.
