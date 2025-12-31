# Technical Spec — Docs Freshness Date Validation (Task 0923)

Source of truth for requirements: `tasks/0923-prd-docs-freshness-date-validation.md`.

## Objective
Ensure `docs:freshness` rejects malformed `last_review` dates by enforcing strict UTC component validation (no month/day rollover).

## Scope
### In scope
- Tighten `parseReviewDate` to validate that parsed year/month/day match the constructed UTC date.
- Keep the existing registry schema and report structure unchanged.
- Document the stricter validation behavior in task collateral.

### Out of scope
- New registry fields or cadence policies.
- External date parsing libraries.
- Auto-correcting malformed registry entries.

## Design

### Strict date validation
- Parse `last_review` with the existing `YYYY-MM-DD` regex.
- Construct `Date.UTC(year, month, day)`.
- Reject the date unless all of the following match:
  - `date.getUTCFullYear() === year`
  - `date.getUTCMonth() === month`
  - `date.getUTCDate() === day`
- Continue to treat non-matching dates as `invalid last_review` in the report.

## Testing Strategy
- Run `npm run docs:freshness` and confirm no regression on existing valid entries.
- Guardrails via `implementation-gate` (spec-guard/build/lint/test/docs:check/docs:freshness/diff-budget/review).

## Documentation & Evidence
- PRD: `docs/PRD-docs-freshness-date-validation.md`
- Action Plan: `docs/ACTION_PLAN-docs-freshness-date-validation.md`
- Task checklist: `tasks/tasks-0923-docs-freshness-date-validation.md`
- Mini-spec: `tasks/specs/0923-docs-freshness-date-validation.md`

## Assumptions
- Existing registry dates are valid and should continue to pass after strict checks.

## Open Questions (for review agent)
- None.

## Approvals
- Engineering: Pending
- Reviewer: Pending
