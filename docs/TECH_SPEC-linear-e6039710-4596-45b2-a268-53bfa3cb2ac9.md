---
id: 20260427-linear-e6039710-4596-45b2-a268-53bfa3cb2ac9
title: "CO-401 docs freshness maintenance owner verification"
relates_to: docs/PRD-linear-e6039710-4596-45b2-a268-53bfa3cb2ac9.md
risk: high
owners:
  - Codex
last_review: 2026-04-27
---

# TECH_SPEC - CO-401 docs freshness maintenance owner verification

This mirror points to the canonical task spec at `tasks/specs/linear-e6039710-4596-45b2-a268-53bfa3cb2ac9.md`.

## Implementation Summary
- Preserve CO-401 as a docs freshness maintenance lane covering both `docs:freshness` and `docs:freshness:maintain`.
- Keep the protected evidence intact: `last_review=2026-03-27`, `30 stale docs`, `blocking_changed_paths=[]`, `CO-343 owner verification failed`, and `docs:freshness:maintain canonical owner key`.
- Child-lane output was bounded to docs-first packet and task registration mirrors; parent rejected the stale-base patch and adapted the packet on current `origin/main`.
- Parent implementation owns reproducing the stale Mar 27 cohort, verifying the owner failure, reviewing the five affected packets, updating freshness metadata, and running validation.
- Do not weaken freshness policy, rename the canonical owner key, or broaden into CO-390 release-detector surfaces.

## Parent-Owned Implementation Boundaries
- Review and refresh the exact stale Mar 27 cohort only after evidence supports the refresh.
- Record owner verification for `docs:freshness:maintain` without changing the canonical owner key.
- Update `docs/docs-freshness-registry.json` only after the affected packet/mirror contents are reviewed.
- Keep scripts, tests, package files, and release-detector surfaces out of this lane.

## Validation Contract
- Child lane:
  - bounded docs packet and task registration mirror patch artifact only
  - JSON parse check for `tasks/index.json`
  - protected-term check for packet files
  - no full repo validation suites
- Parent lane:
  - `node scripts/spec-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:freshness`
  - `npm run docs:freshness:maintain -- --format json`
  - normal parent-owned validation and PR lifecycle after implementation
