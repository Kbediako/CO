# PRD — Docs Freshness Systemization (Task 0922)

## Summary
- Problem Statement: Docs drift persists even with docs-hygiene linting because content relevance and freshness are not systematically reviewed after work completes.
- Desired Outcome: Every task completion includes a deterministic docs freshness audit that verifies coverage, ownership, and review recency across all doc sources, with a clear report and actionable failures.

## Goals
- Establish a single docs registry covering `.agent/**`, `.ai-dev-tasks/**`, `docs/**`, and `tasks/**`.
- Require explicit ownership and last review metadata for active docs.
- Provide a deterministic docs freshness audit (`docs:freshness`) that fails when docs are stale or unowned.
- Integrate the audit into post-work validation (implementation-gate and docs-review pipelines).
- Emit a report artifact for each task completion (`out/<task-id>/docs-freshness.json`).

## Non-Goals
- Auto-rewriting or summarizing docs content.
- Replacing human review; this is a structured checklist + audit.
- Running network-dependent tooling in CI.

## Stakeholders
- Product: Platform Enablement (unassigned)
- Engineering: Orchestrator maintainers (unassigned)
- Design: N/A

## Metrics & Guardrails
- 100% of doc files in scope are represented in the registry.
- 0 active docs exceed the freshness window (default 90 days, configurable).
- Every task completion includes a docs freshness report artifact.
- Guardrails: audit is read-only; it never edits content automatically.

## User Experience
- Personas:
  - Orchestrator maintainers and reviewers who need a reliable “docs are current” signal.
  - Contributors updating docs as part of feature work.
- User Journeys:
  - After completing work, the implementation-gate pipeline runs `docs:freshness` and produces a report; failures list stale or missing docs with owners.
  - A contributor updates doc metadata in the registry (owner, last_review) to satisfy the audit before review handoff.

## Technical Considerations
- Add a docs registry file (`docs/docs-freshness-registry.json`) with per-doc metadata.
- Add `scripts/docs-freshness.mjs` plus an npm script (`npm run docs:freshness`) for local runs.
- Add a `docs-freshness` stage to `docs-review` and `implementation-gate` pipelines.

## Assumptions
- Default freshness cadence for active docs is 90 days.
- Archived docs are excluded from freshness enforcement.
- Deprecated docs follow the per-entry cadence when used (seeded at 180 days).

## Open Questions (for review agent)
- Confirm the default freshness cadence for active docs (current assumption: 90 days).
- Confirm whether archived docs should remain excluded from freshness enforcement.

## Approvals
- Product: Pending
- Engineering: Pending
- Design: N/A
