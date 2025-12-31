---
id: 20251231-docs-freshness-systemization
title: Docs Freshness Systemization
relates_to: docs/PRD-docs-freshness-systemization.md
risk: medium
owners:
  - Codex (top-level agent)
  - Review agent
last_review: 2025-12-31
---

## Added by Bootstrap 2025-10-16

## Summary
- Objective: Systemize a docs freshness audit that runs after work completes and verifies coverage, ownership, and recency.
- Constraints:
  - Read-only checks; no auto-editing of doc content.
  - Must run non-interactively and integrate with existing guardrails.

## Proposed Changes
- Architecture / design adjustments:
  - Add `docs/docs-freshness-registry.json` to track docs coverage.
  - Add `scripts/docs-freshness.mjs` plus `npm run docs:freshness`.
  - Add `docs-freshness` stage to docs-review and implementation-gate pipelines.
- Data model updates:
  - New registry schema and `out/<task-id>/docs-freshness.json` report.
- External dependencies:
  - None (local filesystem only).

## Impact Assessment
- User impact: clearer freshness expectations and fewer stale docs.
- Operational risk: low to medium; new gate could fail until registry is seeded.
- Security / privacy: no new data flows.

## Rollout Plan
- Prerequisites:
  - Registry seeded for core docs.
  - Audit script validated in warn-only mode.
- Testing strategy:
  - Unit tests for schema + date logic.
  - Integration runs via docs-review and implementation-gate.
- Launch steps:
  - Switch audit to enforcement mode once coverage is complete.

## Open Questions
- Confirm the default freshness cadence for active docs (current assumption: 90 days).

## Approvals
- Reviewer:
- Date:
