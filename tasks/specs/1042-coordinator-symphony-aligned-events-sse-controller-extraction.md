---
id: 20260307-1042-coordinator-symphony-aligned-events-sse-controller-extraction
title: Coordinator Symphony-Aligned Events SSE Controller Extraction
relates_to: docs/PRD-coordinator-symphony-aligned-events-sse-controller-extraction.md
risk: high
owners:
  - Codex
last_review: 2026-03-07
---

## Summary

- Objective: extract the `/events` SSE controller policy into a dedicated helper without changing stream bootstrap or connected-client behavior.
- Scope: events SSE controller extraction plus regression/manual evidence.
- Constraints: keep auth ordering, runner-only gating, shared event fanout, webhook handling, `/api/v1/*`, and mutating control behavior unchanged.

## Pre-Implementation Review Note

- Decision: approved for docs-first planning as the immediate next slice after `1041`.
- Reasoning: `1041` removed the standalone Linear webhook branch from `controlServer.ts`, leaving `/events` as the next smallest transport-specific controller seam that can be extracted without widening into auth/control-command behavior.
- Initial review evidence: `out/1041-coordinator-symphony-aligned-linear-webhook-controller-extraction/manual/20260307T073238Z-closeout/14-next-slice-note.md`, `docs/findings/1042-events-sse-controller-extraction-deliberation.md`.
- Delegation note: use a bounded read-only controller-boundary review stream before implementation so the SSE route extraction stays minimal and contract-stable.
- Delegated boundary note: the read-only seam review confirmed `/events` as the next smallest standalone controller target after `1041`, with route selection/security gates staying in `controlServer.ts` and the SSE contract remaining the key regression surface. Evidence: `docs/findings/1042-events-sse-controller-extraction-deliberation.md`.
