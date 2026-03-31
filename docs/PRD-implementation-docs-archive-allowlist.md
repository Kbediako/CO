# PRD — Implementation Docs Archive Allowlist (0927)

## Summary
- Problem Statement: The implementation-docs archiver has no allowlist, so critical long-running task docs can be archived by retention or line-count thresholds without a simple opt-out.
- Desired Outcome: Add an allowlist to the archive policy so specific task keys or document paths are exempt from archiving while keeping automation and auditability intact.

## Goals
- Introduce an allowlist in the policy for task keys and doc paths.
- Ensure the archiver skips allowlisted docs and reports the skip reason.
- Keep the archive workflow, stubs, and registry updates unchanged for non-allowlisted docs.

## Non-Goals
- Changing archive branch behavior or PR automation.
- Altering docs-freshness cadence defaults.
- Adding new doc categories beyond the existing policy patterns.

## Stakeholders
- Product: N/A
- Engineering: Codex (top-level agent), Review agent
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics: allowlisted docs remain on main regardless of retention or line thresholds; archive runs still generate payloads and stubs for non-allowlisted docs.
- Guardrails / Error Budgets: no data loss; stubs remain linked; registry remains consistent.

## User Experience
- Personas: Repo maintainers and reviewers.
- User Journeys: maintainers add allowlist entries in policy; archive runs skip allowlisted docs and note it in reports.

## Technical Considerations
- Architectural Notes: extend policy parsing + archive selection to honor allowlist entries (task keys and path patterns).
- Dependencies / Integrations: none beyond the existing archiver workflow.

## Open Questions
- None.

## Approvals
- Product: Pending
- Engineering: Pending
- Design: N/A
