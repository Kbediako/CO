# ACTION_PLAN - CO-314 release workflow truth alignment

## Goal
- Remove the release workflow truth drift around promoted release-note sections, prerelease dist-tag docs, and overview override behavior.

## Steps
1. Land the docs-first packet and run `docs-review`.
2. Change `.github/workflows/release.yml` so the overview override comes from the signed annotated tag body instead of the former .github/release-overview.md file contract.
3. Align the three release-facing docs files with the final workflow contract.
4. Add focused release-contract regression coverage and run the required validation/review loop.

## Validation
- `docs-review` child stream before implementation.
- Focused release-contract regression test.
- Required repo validation, standalone review, and elegance pass before handoff.

## Boundaries
- No broad release-pipeline redesign.
- No signing-policy or publish-transport changes.
- No new persistent release override file.
