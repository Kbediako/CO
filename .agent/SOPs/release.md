# Release SOP

## Added by RLM Orchestrator release 2026-01-05

1. Ensure the working tree is clean and `main` is up to date.
2. Decide the release tag (`vX.Y.Z` stable or `vX.Y.Z-<prerelease>`, for example `vX.Y.Z-alpha.N`, `vX.Y.Z-beta.N`, or `vX.Y.Z-rc.N`) and confirm it matches `package.json` version.
2.1. Confirm signing is configured for release commits and tags (GPG or SSH):
   - Prefer `git config commit.gpgsign true` and `git config tag.gpgSign true`.
   - Alternatively use `git commit -S` and `git tag -s` per release.
   - This requirement is cryptographic signing (not DCO sign-off).
   - Single maintainer model: release is blocked if signing is not configured on the release machine.
3. Run the release validation gate sequence (non-interactive):
   - `node scripts/delegation-guard.mjs`
   - `node scripts/spec-guard.mjs --dry-run`
   - `npm run build`
   - `npm run lint`
   - `npm run test`
   - `npm run docs:check`
   - `npm run docs:freshness`
   - `node scripts/diff-budget.mjs`
   - `NOTES="Goal: ... | Summary: ... | Risks: ... | Questions (optional): ..." npm run review`
   - Note: release/RC should run the full matrix (`npm run build:all`, `npm run test:adapters`, `npm run test:evaluation`, `npm run eval:test` when fixtures/optional deps exist) per docs policy.
4. Validate the package artifact:
   - `npm run clean:dist && npm run build`
   - `npm run pack:audit`
   - `npm run pack:smoke`
5. Create and verify the signed release tag:
   - `git tag -s vX.Y.Z -m "vX.Y.Z"` (or `vX.Y.Z-<prerelease>`)
   - Optional one-shot release overview override: include the release-specific narrative in the signed annotated tag body, for example `git tag -s vX.Y.Z -m "vX.Y.Z" -m "Release overview text..."`. For a file-based tag message, ensure the first line is the tag name, followed by a blank line and the overview body.
   - `git tag -v <tag>`
   - `git push origin <tag>`
5.1. If using `gh release create` manually, require a pre-existing signed tag and pass `--verify-tag` to prevent auto-created unsigned tags.
6. Monitor the tag-driven workflow in `.github/workflows/release.yml`:
   - Confirms tag/version match, builds, runs pack audit/smoke, creates GitHub Release, and publishes to npm.
   - For manual dispatch, pass `inputs.tag=vX.Y.Z` or `inputs.tag=vX.Y.Z-<prerelease>` so workflow metadata resolves against a real tag.
   - Stable tags publish to `latest`; prerelease tags derive the npm dist-tag from the leading prerelease label before the first `.` or `-`, lowercased and sanitized. Examples: `alpha.1` -> `alpha`, `beta.1` -> `beta`, `rc.1` -> `rc`; empty or numeric-leading labels fall back to `next`. All prerelease tags create a GitHub prerelease.
   - Repository secrets must provide signer verification material for CI tag checks: `RELEASE_SIGNING_PUBLIC_KEYS` (GPG) or `RELEASE_SIGNING_ALLOWED_SIGNERS` (SSH).
   - Workflow blocks lightweight/unsigned tags before packaging/publish.
   - Confirm GitHub shows Verified for the tag/commit.
   - In `.github/workflows/release.yml`, verify generated `Overview` and `Bug Fixes` sections render once as top-level release-note sections and remaining generated sections stay under `Full Changelog`.
   - The workflow reads an optional one-shot overview override from the signed annotated tag body. It does not read .github/release-overview.md, so stale committed overview text cannot shape a later release.
7. Record release status, workflow links, and any follow-ups in `/tasks` and docs checklists.

If the release workflow fails, fix the issue and re-tag after updating metadata; do not publish from non-release artifacts.
