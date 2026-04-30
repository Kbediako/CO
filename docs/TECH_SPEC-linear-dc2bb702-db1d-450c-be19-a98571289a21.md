---
id: 20260430-linear-dc2bb702-db1d-450c-be19-a98571289a21
title: CO-428 own March 30 active-spec spec-guard baseline cohort
relates_to: docs/PRD-linear-dc2bb702-db1d-450c-be19-a98571289a21.md
risk: high
owners:
  - Codex
last_review: 2026-04-30
---

# TECH_SPEC - CO-428 own March 30 active-spec spec-guard baseline cohort

This mirror points to the canonical task spec at `tasks/specs/linear-dc2bb702-db1d-450c-be19-a98571289a21.md`.

## Implementation Summary
- CO-428 owns `spec-guard:active-specs:last_review=2026-03-30`, the current-main March 30 active-spec cohort blocking CO-427 / PR #727 Core Lane.
- Current branch baseline reproduced the exact twelve-file `node scripts/spec-guard.mjs` failure from clean `origin/main` at `aad50900d`.
- Live Linear reads on 2026-04-30 confirmed every source issue in the cohort is `Done`.
- The repair reclassifies completed-lane task specs and registry rows as inactive/archive-status metadata rather than changing `scripts/spec-guard.mjs` or bumping dates as still-active work.
- CO-428 is also the promoted integration owner for the dependent CO-429 CO-41 registry residue repair and CO-430 live `docs:freshness:maintain` owner re-home; those imports remain metadata-only and do not widen CO-428 into product behavior.

## Validation Contract
- Baseline reproduction: `node scripts/spec-guard.mjs` fails on the twelve March 30 specs before edits.
- Final local proof: `node scripts/spec-guard.mjs` passes after completed-lane metadata repair.
- Registry proof: `npm run docs:freshness` no longer reports the March 30 completed-lane rows as active stale blockers.
- Owner proof: `npm run docs:freshness:maintain -- --format json` verifies live non-terminal owner `CO-430` with `blocking_changed_paths=[]`.
- Handoff proof: standalone review, elegance review, PR checks, and `pr ready-review` drain complete before Linear review handoff.
