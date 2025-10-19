# Spec Templates

last_review: 2099-01-01

Create mini-specs for your project under this directory. Suggested naming pattern: `0001-your-feature.md` with front matter including `last_review: YYYY-MM-DD` so `scripts/spec-guard.sh` can enforce freshness.

Recommended sections:
- Summary & scope
- Acceptance criteria
- Risks & mitigations
- Review decisions (include approvers + dates)

Add or remove files as needed. Until you create a spec, `spec-guard` will treat this directory as empty and skip freshness checks.
