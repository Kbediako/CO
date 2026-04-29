---
id: 20260428-linear-9e002e3b-2936-49e0-8a4a-2fa2bd360306
title: "CO-409 March 28 docs freshness cohort maintenance"
relates_to: docs/PRD-linear-9e002e3b-2936-49e0-8a4a-2fa2bd360306.md
risk: high
owners:
  - Codex
last_review: 2026-04-28
---

# TECH_SPEC - CO-409 March 28 docs freshness cohort maintenance

This mirror points to the canonical task spec at `tasks/specs/linear-9e002e3b-2936-49e0-8a4a-2fa2bd360306.md`.

## Implementation Summary
- Create the CO-409 docs-first packet and task mirror docs for the March 28 `task packet` / `task mirror` docs freshness cohort.
- Preserve protected terms: `docs:freshness`, `docs freshness`, `docs-freshness-registry.json`, `last_review`, `cadence_days`, `task packet`, `task mirror`, `March 28 cohort`, `docs:freshness:maintain`, and `CO-399`.
- Explicitly reject expanding CO-399 fallback-expiry repo guard scope, hiding the failure in CO-399 guard code, deleting stale docs, loosening `docs:freshness`, or bypassing validation.
- Keep reproduction, registry/catalog refresh, task registry/snapshot updates, Linear state, workpad, PR lifecycle, and final validation parent-owned.

## Parent-Owned Implementation Boundaries
- Reproduce the current `docs:freshness` failure shape.
- Run or inspect `docs:freshness:maintain` state as needed for the March 28 cohort.
- Review the March 28 `task packet` / `task mirror` docs before changing `last_review` or `cadence_days`.
- Refresh `docs/docs-freshness-registry.json` and `docs/docs-catalog.json` only after reproduction and review.
- Update `tasks/index.json` and `docs/TASKS.md` if parent docs-first registration requires it.
- Keep CO-399 guard code and fallback-expiry repo guard scope out of CO-409 unless the parent explicitly relaunches with widened ownership.

## Child Validation Contract
- Child lane:
  - bounded docs packet and task mirror patch only
  - trailing-whitespace check on the six scoped files
  - protected-term check across the six scoped files
  - no full repo validation suites
- Parent lane:
  - `npm run docs:freshness`
  - `npm run docs:freshness:maintain`
  - any required `docs:check`, spec guard, registry/catalog, PR, and review lifecycle validation after patch import
