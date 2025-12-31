---
id: 20251218-diff-budget-followups
title: Diff Budget + Review Handoff Follow-ups
relates_to: Task 0908 (diff-budget-followups)
risk: medium
owners:
  - Codex (top-level agent)
  - Review agent
last_review: 2025-12-18
---

## Summary
- Add an explicit CI override path for diff-budget (label + required reason) without weakening the default gate.
- Add automated tests for `scripts/diff-budget.mjs` covering critical modes and failure cases.
- Document diff-budget expectations and the recommended `NOTES="<goal + summary + risks>" npm run review` invocation in `README.md`.

## Invariants
- The default diff-budget gate must remain strict in CI unless an explicit override signal is present.
- Overrides must be auditable: a non-empty reason is required and is surfaced in CI logs (and/or step summary).
- Tests should be deterministic and not depend on network services.
- Documentation must match implemented behavior and be compatible with `npm run docs:check`.

## Proposed Changes

### CI override wiring
- Add PR label detection to `.github/workflows/core-lane.yml` and set `DIFF_BUDGET_OVERRIDE_REASON` only when:
  - the explicit label is present, and
  - an override reason is present (source to be standardized).
- Ensure CI prints whether an override was used and the reason text.

### Diff-budget tests
- Add test coverage for:
  - commit-scoped mode (`node scripts/diff-budget.mjs --commit <sha>`)
  - untracked-too-large measurement issue handling
  - ignore list behavior (`package-lock.json`, `.runs/`, `out/`, etc.)
  - override reason behavior (`DIFF_BUDGET_OVERRIDE_REASON` bypasses non-zero exit)

### README updates
- Add a section describing diff-budget:
  - when it runs (CI + local)
  - how it selects its base (`BASE_SHA` in CI)
  - how to run locally (`--base`, `--commit`)
  - how to use the override (expectation: rare + justified)
- Document recommended review handoff invocation:
  - `NOTES="<goal + summary + risks>" npm run review`

## Validation
- CI wiring:
  - PR without override label fails when diff budget is exceeded.
  - PR with override label + reason passes, and logs show the override reason.
- Tests:
  - new tests fail against a known-broken baseline (where applicable) and pass after implementation.
  - `npm run test` includes and runs the diff-budget tests.
- Docs:
  - `npm run docs:check` passes after README updates.

