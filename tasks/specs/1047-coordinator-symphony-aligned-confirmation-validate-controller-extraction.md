---
id: 20260307-1047-coordinator-symphony-aligned-confirmation-validate-controller-extraction
title: Coordinator Symphony-Aligned Confirmation Validate Controller Extraction
relates_to: docs/PRD-coordinator-symphony-aligned-confirmation-validate-controller-extraction.md
risk: high
owners:
  - Codex
last_review: 2026-03-07
---

## Summary

- Objective: extract the `/confirmations/validate` controller policy into a dedicated helper without changing the current confirmation nonce validation behavior, event emission, or response shape.
- Scope: confirmation validate controller extraction plus regression and manual evidence.
- Constraints: keep auth ordering, broader control-plane policy, `/confirmations/approve`, `/control/action`, and confirmation-store semantics unchanged.

## Pre-Implementation Review Note

- Decision: approved for docs-first planning as the immediate next slice after `1046`.
- Reasoning: `1046` removed the standalone `/confirmations/issue` and `/confirmations/consume` branches from `controlServer.ts`, leaving `/confirmations/validate` as the next smallest cohesive nonce-validation seam that can be extracted without widening into `/confirmations/approve` or `/control/action`.
