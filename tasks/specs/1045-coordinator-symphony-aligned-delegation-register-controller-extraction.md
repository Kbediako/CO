---
id: 20260307-1045-coordinator-symphony-aligned-delegation-register-controller-extraction
title: Coordinator Symphony-Aligned Delegation Register Controller Extraction
relates_to: docs/PRD-coordinator-symphony-aligned-delegation-register-controller-extraction.md
risk: high
owners:
  - Codex
last_review: 2026-03-07
---

## Summary

- Objective: extract the `/delegation/register` controller policy into a dedicated helper without changing the current delegation-token registration behavior or response shape.
- Scope: delegation-register controller extraction plus regression/manual evidence.
- Constraints: keep auth ordering, broader control-plane policy, harder authority routes, and delegation-token storage semantics unchanged.

## Pre-Implementation Review Note

- Decision: approved for docs-first planning as the immediate next slice after `1044`.
- Reasoning: `1044` removed the standalone `/security/violation` branch from `controlServer.ts`, leaving `/delegation/register` as the next smallest cohesive route seam that can be extracted without widening into `/confirmations*` or `/control/action`.
- Initial review evidence: `out/1044-coordinator-symphony-aligned-security-violation-controller-extraction/manual/20260307T093117Z-closeout/14-next-slice-note.md`, `docs/findings/1045-delegation-register-controller-extraction-deliberation.md`.
- Delegation note: use a bounded read-only controller-boundary review stream before implementation so the delegation-register extraction stays minimal and contract-stable.
- Delegated boundary note: the next bounded seam keeps `controlServer.ts` responsible for top-level route ordering, auth/CSRF, broader control-plane policy, and the higher-risk `/confirmations*` + `/control/action` authority paths. Evidence: `docs/findings/1045-delegation-register-controller-extraction-deliberation.md`.
