---
id: 20260307-1044-coordinator-symphony-aligned-security-violation-controller-extraction
title: Coordinator Symphony-Aligned Security Violation Controller Extraction
relates_to: docs/PRD-coordinator-symphony-aligned-security-violation-controller-extraction.md
risk: high
owners:
  - Codex
last_review: 2026-03-07
---

## Summary

- Objective: extract the `/security/violation` controller policy into a dedicated helper without changing the current redacted audit event behavior or response shape.
- Scope: security-violation controller extraction plus regression/manual evidence.
- Constraints: keep auth ordering, broader control-plane policy, harder authority routes, and shared runtime/event hooks unchanged.

## Pre-Implementation Review Note

- Decision: approved for docs-first planning as the immediate next slice after `1043`.
- Reasoning: `1043` removed the standalone `/questions*` branch from `controlServer.ts`, leaving `/security/violation` as the next smallest cohesive route seam that can be extracted without widening into `/delegation/register`, `/confirmations*`, or `/control/action`.
- Initial review evidence: `out/1043-coordinator-symphony-aligned-question-queue-controller-extraction/manual/20260307T091200Z-closeout/14-next-slice-note.md`, `docs/findings/1044-security-violation-controller-extraction-deliberation.md`.
- Delegation note: use a bounded read-only controller-boundary review stream before implementation so the security-violation extraction stays minimal and contract-stable.
- Delegated boundary note: the read-only seam review confirmed `/security/violation` as the next smallest Symphony-aligned extraction target after `1043`, with `controlServer.ts` retaining top-level route ordering, auth/CSRF, broader control-plane policy, and the harder authority-bearing routes. Evidence: `docs/findings/1044-security-violation-controller-extraction-deliberation.md`.
