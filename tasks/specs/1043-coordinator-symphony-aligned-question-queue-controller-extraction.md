---
id: 20260307-1043-coordinator-symphony-aligned-question-queue-controller-extraction
title: Coordinator Symphony-Aligned Question Queue Controller Extraction
relates_to: docs/PRD-coordinator-symphony-aligned-question-queue-controller-extraction.md
risk: high
owners:
  - Codex
last_review: 2026-03-07
---

## Summary

- Objective: extract the `/questions*` controller policy into a dedicated helper without changing question queue behavior or payload shapes.
- Scope: questions controller extraction plus regression/manual evidence.
- Constraints: keep auth ordering, runner-only gating, expiry/background helpers, runtime publish hooks, Telegram projection signaling, and non-question control behavior unchanged.

## Pre-Implementation Review Note

- Decision: approved for docs-first planning as the immediate next slice after `1042`.
- Reasoning: `1042` removed the standalone `/events` branch from `controlServer.ts`, leaving the `/questions*` cluster as the next smallest cohesive controller seam that can be extracted without widening into `/control/action`.
- Initial review evidence: `out/1042-coordinator-symphony-aligned-events-sse-controller-extraction/manual/20260307T084357Z-closeout/14-next-slice-note.md`, `docs/findings/1043-question-queue-controller-extraction-deliberation.md`.
- Delegation note: use a bounded read-only controller-boundary review stream before implementation so the questions-route extraction stays minimal and contract-stable.
- Delegated boundary note: the read-only seam review confirmed `/questions*` as the next smallest standalone controller target after `1042`, with `controlServer.ts` retaining top-level route ordering, auth/CSRF, expiry helpers, and existing runtime-side hooks. Evidence: `docs/findings/1043-question-queue-controller-extraction-deliberation.md`.
