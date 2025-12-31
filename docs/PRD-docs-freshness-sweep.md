# PRD - Documentation Freshness Sweep (0921-docs-freshness-sweep)

## Summary
- Problem Statement: Documentation can drift after refactors and tooling changes, leaving stale references and spec timestamps.
- Desired Outcome: A repo-wide docs audit that updates outdated references, refreshes spec review dates, and keeps docs-check/spec-guard green.

## Goals
- Validate and refresh documentation references to scripts, pipelines, and paths.
- Update spec review metadata where required by guardrails.
- Keep docs-check and spec-guard passing after updates.
- Record evidence and mirror status across task checklists.

## Non-Goals
- No production/runtime code changes beyond doc-related adjustments.
- No manifest schema changes.
- No behavior changes to pipelines or tooling.

## Stakeholders
- Product: Orchestrator program leads
- Engineering: Orchestrator maintainers, tooling owners
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - docs:check passes with zero missing path/script/pipeline references.
  - spec-guard passes without stale spec warnings.
  - Updated docs reflect current file paths and CLI usage.
- Guardrails / Error Budgets:
  - Avoid changes to runtime behavior.
  - Preserve existing evidence paths in docs.

## User Experience
- Personas:
  - Contributors relying on docs for workflows.
  - Reviewers auditing manifests and evidence.
- User Journeys:
  - Contributors see current paths/commands with minimal drift.
  - Reviewers can trust docs-check/spec-guard signals.

## Technical Considerations
- Use docs-hygiene to detect broken references.
- Use ripgrep to locate stale path mentions (e.g., moved modules).
- Keep spec metadata up to date.

## Documentation & Evidence
- Tech Spec: `docs/TECH_SPEC-docs-freshness-sweep.md`
- Action Plan: `docs/ACTION_PLAN-docs-freshness-sweep.md`
- Task checklist: `tasks/tasks-0921-docs-freshness-sweep.md`
- Mini-spec: `tasks/specs/0921-docs-freshness-sweep.md`

## Open Questions
- None

## Approvals
- Product: Pending
- Engineering: Pending
- Design: N/A
