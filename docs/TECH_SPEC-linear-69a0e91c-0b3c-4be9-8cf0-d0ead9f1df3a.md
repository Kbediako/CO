---
id: 20260429-linear-69a0e91c-0b3c-4be9-8cf0-d0ead9f1df3a
title: CO-422 refresh Mar 29 active spec-guard cohort
relates_to: docs/PRD-linear-69a0e91c-0b3c-4be9-8cf0-d0ead9f1df3a.md
risk: high
owners:
  - Codex
last_review: 2026-04-29
---

# TECH_SPEC - CO-422 refresh Mar 29 active spec-guard cohort

This mirror points to the canonical task spec at `tasks/specs/linear-69a0e91c-0b3c-4be9-8cf0-d0ead9f1df3a.md`.

## Implementation Summary
- CO-422 repairs `spec-guard:active-spec-last-review:2026-03-29`, the Mar 29 active-spec cohort blocking CO-409 / PR #719 Core Lane.
- Live Linear reads confirmed CO-14, CO-30, and CO-34 are `Done`.
- The repair reclassifies the completed-lane task specs and their Mar 29 registry rows as inactive/archive-status metadata rather than bumping dates or deleting historical docs.
- `scripts/spec-guard.mjs` and active-spec freshness policy stay unchanged.
- CO-409's Mar 28 docs-freshness cohort and PR #719 content remain out of scope until validation clears this owner.

## Validation Contract
- Baseline reproduction: `node scripts/spec-guard.mjs` fails on the three Mar 29 specs before edits.
- Final local proof: `node scripts/spec-guard.mjs` passes after the metadata repair.
- Registry proof: `npm run docs:freshness` no longer reports the Mar 29 completed-lane rows as active stale blockers.
- Handoff proof: standalone review, elegance review, PR checks, and `pr ready-review` drain complete before Linear review handoff.
