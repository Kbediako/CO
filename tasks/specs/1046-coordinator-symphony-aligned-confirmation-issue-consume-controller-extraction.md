---
id: 20260307-1046-coordinator-symphony-aligned-confirmation-issue-consume-controller-extraction
title: Coordinator Symphony-Aligned Confirmation Issue Consume Controller Extraction
relates_to: docs/PRD-coordinator-symphony-aligned-confirmation-issue-consume-controller-extraction.md
risk: high
owners:
  - Codex
last_review: 2026-03-07
---

## Summary

- Objective: extract the `/confirmations/issue` and `/confirmations/consume` controller policy into a dedicated helper without changing the current confirmation nonce issuance behavior or response shape.
- Scope: confirmation issue and consume controller extraction plus regression and manual evidence.
- Constraints: keep auth ordering, broader control-plane policy, `/confirmations/validate`, `/control/action`, and confirmation-store semantics unchanged.

## Pre-Implementation Review Note

- Decision: approved for docs-first planning as the immediate next slice after `1045`.
- Reasoning: `1045` removed the standalone `/delegation/register` branch from `controlServer.ts`, leaving confirmation issue and consume as the next smallest cohesive nonce-issuance seam that can be extracted without widening into `/confirmations/validate` or `/control/action`.
