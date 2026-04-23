# TECH_SPEC Mirror - CO-314 release workflow truth alignment

Canonical spec: `tasks/specs/linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md`

## Summary
- Align shipped-skill highlight guidance with the workflow’s actual promoted sections.
- Update prerelease docs to match dist-tag derivation from generic prerelease labels.
- Replace the former persistent .github/release-overview.md contract with a one-shot override sourced from the signed annotated tag body.

## Validation
- `docs-review` before implementation.
- Focused release-contract regression coverage.
- Required repo validation, standalone review, and elegance pass before handoff.
