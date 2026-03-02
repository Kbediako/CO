# TECH_SPEC - Codex Review Quota + Merge Waiver Guardrails

- Canonical TECH_SPEC: `tasks/specs/0987-codex-review-quota-waiver-guardrails.md`.
- Owner: Codex.
- Last Reviewed: 2026-03-02.

## Summary
- Add minimal policy text to prevent repeated Codex re-review pings on unchanged PR heads and document a bounded merge waiver when Codex quota is exhausted.

## Requirements
- Update `AGENTS.md`:
  - one manual `@codex` ping per PR head SHA,
  - explicit waiver conditions when Codex review is unavailable due quota.
- Mirror the same guidance in `docs/AGENTS.md`.
- Update `docs/guides/codex-version-policy.md` to:
  - document quota-aware manual review requests,
  - classify quota exhaustion as operational availability, not prerelease promotion signal.
- Update task/docs mirrors and index registration.

## Acceptance
- Policy is present and aligned in both handbook files.
- Version policy guide includes quota-aware review behavior and waiver linkage.
- Task mirrors/index are current and guardrail checks pass.

## Evidence & Artifacts
- Checklists:
  - `tasks/tasks-0987-codex-review-quota-waiver-guardrails.md`
  - `.agent/task/0987-codex-review-quota-waiver-guardrails.md`
  - `docs/TASKS.md`
  - `tasks/index.json`
- Validation logs:
  - `out/0987-codex-review-quota-waiver-guardrails/manual/`
