# Spec Templates

Store TECH_SPECs for every task under this directory (canonical technical requirements). Suggested naming pattern: `0001-your-feature.md` with front matter including `last_review: YYYY-MM-DD` so `scripts/spec-guard.mjs` can enforce freshness.
Note: this README is informational and excluded from spec-guard freshness checks.

Recommended sections:
- Summary & scope
- Technical requirements
- Architecture / data notes
- Validation plan
- Risks & mitigations
- Review decisions (include approvers + dates)

Specs are required in this repo. PRD (intent) lives in `docs/PRD-*.md`, ACTION_PLAN (sequencing) lives in `docs/ACTION_PLAN-*.md`, and the task checklist lives in `tasks/tasks-*.md`.
