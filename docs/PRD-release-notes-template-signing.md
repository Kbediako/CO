# PRD - Release Notes Template + Signed Tags (Task 0943)

## Summary
- Problem Statement: Recent releases rely on auto-generated GitHub notes that list PRs only, leaving no labeled Overview/Bug Fixes groupings. Release tags/commits are created locally without signatures, so the GitHub UI does not display a verified signature line.
- Desired Outcome: Define and implement a structured, label-driven release notes template (Overview/Bug Fixes groupings) and require signed tags/commits for releases, while keeping the release workflow unchanged.

## Goals
- Plan a release notes template (GitHub release notes config) that yields Overview/Bug Fixes groupings based on labels.
- Update the release SOP to require signed release commits/tags, verification steps, and a guardrail against unsigned tag creation.
- Capture tasks, risks, and rollout sequencing in PRD/TECH_SPEC/ACTION_PLAN.

## Non-Goals
- Enforce label taxonomy or signing rules via GitHub rulesets in this pass.
- Change the current release workflow behavior beyond SOP updates and the release notes template file.

## Stakeholders
- Release: Maintainers
- Engineering: Orchestrator Core
- Product: Codex Orchestrator Platform

## Success Metrics
- Release SOP explicitly requires signed release commits/tags and includes verification steps.
- Release notes template file is added with catch-all category and label taxonomy contract documented.
- Task mirrors show evidence for doc updates and approvals.

## Current Gaps
- Label taxonomy is aligned in the repo, but enforcement is manual (no ruleset automation yet).

## Scope Notes
- Single maintainer model: the release maintainer must have signing configured on their machine; releases are blocked without signing.

## Approvals
- Product: Approved (2026-01-12)
- Engineering: Approved (2026-01-12)
- Release: Approved (2026-01-12)

## Open Questions
- Decide on the exact label taxonomy for release note categories (Overview/Bug Fixes/Other) before implementing the template.
