# PRD — Docs Freshness Date Validation (0923)

## Summary
- Problem Statement: `docs:freshness` accepts malformed `last_review` dates because JavaScript normalizes out-of-range dates (for example, `2025-02-30` becomes March 2). Invalid metadata can pass validation and hide stale or malformed entries.
- Desired Outcome: Enforce strict date validation for `last_review` values so malformed dates are flagged and surfaced in the audit report.

## Goals
- Reject invalid `last_review` dates (month/day rollover) during registry validation.
- Keep the audit deterministic and non-interactive.
- Document the stricter validation behavior in supporting docs.

## Non-Goals
- Changing registry schema fields or cadence policies.
- Adding new external dependencies for date parsing.
- Auto-correcting malformed registry values.

## Stakeholders
- Product: N/A
- Engineering: Codex (top-level agent)
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics: invalid `last_review` values produce an `invalid last_review` entry in the audit report and non-zero exit when `--warn` is not set.
- Guardrails / Error Budgets: no behavior change for valid dates in the existing registry.

## User Experience
- Personas: Repo maintainers and reviewers.
- User Journeys: run `npm run docs:freshness` and immediately see invalid date metadata flagged.

## Technical Considerations
- Architectural Notes: tighten `parseReviewDate` to verify UTC components match the parsed year/month/day.
- Dependencies / Integrations: none.

## Open Questions
- None.

## Approvals
- Product: Pending
- Engineering: Pending
- Design: N/A
