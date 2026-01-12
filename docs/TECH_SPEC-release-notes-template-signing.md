# Tech Spec - Release Notes Template + Signed Tags (Task 0943)

## Overview
This spec defines the release notes template structure and the signing requirements for release commits/tags. The release notes template file is added as part of this task.

## Proposed Release Notes Template (Design)
- File: .github/release.yml (to be added in a follow-up PR).
- Changelog categories (example):
  - Overview: `release`, `feature`, `enhancement`
  - Bug Fixes: `bug`, `fix`, `regression`
  - Dependencies: `deps`, `dependencies`
  - Documentation: `docs`
  - Other Changes (catch-all): `*`
- Notes:
  - The repo must align label names before enabling the template.
  - Use a catch-all category so unlabeled PRs still appear in release notes.
  - Keep `gh release create --generate-notes` so GitHub applies the template.

## Label Taxonomy Contract
- Every PR should carry at least one of: `feature`, `enhancement`, `bug`, `fix`, `regression`, `docs` (or legacy `documentation`), `deps`/`dependencies`, `chore`.
- Prefer `docs` going forward; keep `documentation` as a legacy alias until all workflows are updated.
- If multiple labels match multiple categories, the first category in the template wins; maintainers should align labels when conflicts arise.
- Ownership: the release maintainer owns label hygiene during release prep.

## Signing Requirements
- Release commits (version bumps) must be signed using GPG or SSH.
- Release tags must be signed and annotated.
- Verification steps are required:
  - Local: `git tag -v vX.Y.Z` before pushing.
  - Remote: confirm GitHub displays Verified for the tag/commit after push.
- Expected commands (example):
  - `git commit -S -m "Prepare vX.Y.Z"`
  - `git tag -s vX.Y.Z -m "vX.Y.Z"`
  - `git tag -v vX.Y.Z`
  - `git push origin vX.Y.Z`
- Guardrail: if using `gh release create` manually, require `--verify-tag` and never allow it to create tags.
- This requirement is cryptographic signing (not DCO sign-off).
- Single maintainer model: releases are blocked if signing is not configured on the release machine.

## Release Workflow Impact
- No workflow changes in this pass.
- The SOP update will require signature verification before tagging.
- The template file is added; label alignment + dry-run validation remain outstanding.

## Acceptance Criteria
- `.agent/SOPs/release.md` updated to require signed commits/tags plus verification steps and `--verify-tag` guardrail.
- .github/release.yml added with category structure + catch-all.
- PRD + ACTION_PLAN include the release notes template plan, label taxonomy contract, and catch-all category.
- Task mirrors include evidence for doc updates and approvals.

## Risks & Mitigations
- Risk: Missing or inconsistent labels prevent release template sections.
  - Mitigation: audit labels before implementing .github/release.yml.
- Risk: Manual `gh release create` could auto-create an unsigned tag.
  - Mitigation: require pre-created signed tag + `--verify-tag`.
- Risk: Signing keys unavailable on maintainer machines.
  - Mitigation: document signing setup and verify before release tagging.

## Dependencies
- GitHub release notes template support.
- Maintainer signing keys configured (GPG or SSH).
