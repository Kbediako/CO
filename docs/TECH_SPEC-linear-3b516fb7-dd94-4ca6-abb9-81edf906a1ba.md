---
id: 20260427-linear-3b516fb7-dd94-4ca6-abb9-81edf906a1ba
title: "CO-397 docs freshness owned fallback expiry"
relates_to: docs/PRD-linear-3b516fb7-dd94-4ca6-abb9-81edf906a1ba.md
risk: high
owners:
  - Codex
last_review: 2026-04-27
---

# TECH_SPEC - CO-397 docs freshness owned fallback expiry

This mirror points to the canonical task spec at `tasks/specs/linear-3b516fb7-dd94-4ca6-abb9-81edf906a1ba.md`.

## Implementation Summary
- Preserve CO-397 as the CO-382 follow-up for `docs freshness ownership`.
- Apply `fallback expiry` to owned rolling freshness debt by requiring `rolling_freshness_cohorts.owner_issue` to verify as a live same-project non-terminal owner before owned debt is usable.
- Remove the unsafe fallback where configured owner metadata alone can make rolling debt usable.
- Preserve `docs:freshness:maintain` as the canonical ownership recovery key when the configured owner is terminal, canceled, duplicate, out-of-project, or unverifiable.
- Parent implementation owns `scripts/docs-freshness-maintain.mjs`, tests, `docs/docs-catalog.json`, and `docs/guides/docs-freshness-cohorts.md` updates after this packet exists.

## Parent-Owned Implementation Boundaries
- Verify configured owner issue context before `pass_with_owned_rolling_debt`.
- Treat `configured_owner_terminal` and equivalent invalid-owner states as fail-closed.
- Require a same-project live owner before owned rolling debt can pass.
- Reuse or create the canonical `docs:freshness:maintain` owner and intentionally re-home `docs/docs-catalog.json` owner guidance when the configured owner is invalid.
- Do not widen rolling windows, rolling budgets, or eligible classes to hide stale debt.

## Fallback / Refactor Contract
- `expire fallback`: eligible historical rolling debt remains temporary and expires through `expires_after`, `window_days`, and owner review.
- `remove fallback`: configured `rolling_freshness_cohorts.owner_issue` strings are not usable without live same-project non-terminal verification.
- `justify retaining fallback`: canonical `docs:freshness:maintain` owner recovery remains a durable ownership contract.
- `large refactor`: not required for the packet or intended narrow owner-verification implementation unless parent adds another cached owner-status source or splits owner authority across lifecycle phases.
- `minor seam`: acceptable only as a tightening of the existing docs freshness ownership path with focused tests.

## Validation Contract
- Worker lane:
  - JSON parse checks for `tasks/index.json` and `docs/docs-freshness-registry.json`
  - protected-term scan for `docs freshness ownership`, `fallback expiry`, `large refactor`, `minor seam`, `remove fallback`, `expire fallback`, `justify retaining fallback`, `docs:freshness:maintain`, `rolling_freshness_cohorts.owner_issue`, `configured_owner_terminal`, and `same-project live owner`
  - `npm run docs:check`
  - `npm run docs:freshness`
- Parent lane:
  - docs-review before implementation
  - focused `docs-freshness-maintain` tests for terminal, canceled, duplicate, out-of-project, unverifiable, and same-project live owner cases
  - `npm run docs:freshness`
  - `npm run docs:freshness:maintain -- --format json`
  - normal validation, standalone review, elegance pass, PR lifecycle, and Linear state handling
