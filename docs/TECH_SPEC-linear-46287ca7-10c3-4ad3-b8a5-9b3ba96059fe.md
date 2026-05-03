---
id: 20260503-linear-46287ca7-10c3-4ad3-b8a5-9b3ba96059fe
title: "CO-498 repo-wide spec-guard and docs freshness baseline debt"
relates_to: docs/PRD-linear-46287ca7-10c3-4ad3-b8a5-9b3ba96059fe.md
risk: high
owners:
  - Codex
last_review: 2026-05-03
---

# TECH_SPEC - CO-498 repo-wide spec-guard and docs freshness baseline debt

This mirror points to the canonical task spec at `tasks/specs/linear-46287ca7-10c3-4ad3-b8a5-9b3ba96059fe.md`.

## Implementation Summary
- Create the CO-498 docs-first packet and task mirror docs for repo-wide `spec-guard` / `docs:freshness` baseline debt classification.
- Preserve protected terms: `docs:freshness`, `spec-guard`, `last_review`, `rolling freshness cohort`, `CO-444`, `task specs`, and clean origin/main baseline.
- Explicitly reject provider child-lane behavior changes, validator weakening, historical packet deletion, and blind `last_review` bumps.
- Keep registry/catalog updates, task registry/snapshot updates, Linear state, workpad, PR lifecycle, clean-baseline repro, and final validation parent-owned.

## Parent-Owned Implementation Boundaries
- Run the active-branch reduced checks for `node scripts/spec-guard.mjs --dry-run`, `npm run docs:freshness`, and `npm run docs:freshness:maintain -- --format json`.
- Reproduce the reduced failing set on a clean origin/main baseline before assigning blame to the active diff.
- Preserve machine-readable owner evidence for `rolling freshness cohort` debt, especially CO-444 and `blocking_changed_paths=[]` when present.
- Review or live-verify source issue state before changing `last_review` or reclassifying `task specs`.
- Update `docs/docs-freshness-registry.json`, `docs/docs-catalog.json`, `tasks/index.json`, and `docs/TASKS.md` only from the parent lane if the parent imports this packet and widens ownership appropriately.

## Child Validation Contract
- Child lane:
  - bounded docs packet and task mirror patch only
  - trailing-whitespace check on the six scoped files
  - protected-term check across the six scoped files
  - changed-path scope check for the six declared files
  - no full repo validation suites
- Parent lane:
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:freshness`
  - `npm run docs:freshness:maintain -- --format json`
  - any required clean `origin/main` reproduction, registry/catalog, PR, review, and Linear lifecycle validation after patch import
