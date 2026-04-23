# Release SOP

## Added by RLM Orchestrator release 2026-01-05

1. Ensure the working tree is clean and `main` is up to date.
2. Decide the release tag (`vX.Y.Z` stable or `vX.Y.Z-<prerelease>` such as `vX.Y.Z-beta`, `vX.Y.Z-beta.1`, or `vX.Y.Z-rc.2`) and confirm it matches `package.json` version.
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
   - `git tag -s <tag> -m "<tag>"` for the default generated overview.
   - `git tag -s <tag> -m "<tag>" -m "<release overview override>"` when you need a one-shot overview override in the signed annotated tag body.
   - `git tag -s <tag> -F /tmp/tag-message.txt` only when that file starts with `<tag>`, then a blank line, then the overview override text so the override lands in the annotated tag body instead of the tag subject.
   - `git tag -v <tag>`
   - `git push origin <tag>`
   - Do not commit the former .github/release-overview.md override file; the workflow now reads only the signed annotated tag body for manual overview overrides, not the tag subject.
5.1. If using `gh release create` manually, require a pre-existing signed tag and pass `--verify-tag` to prevent auto-created unsigned tags.
6. Monitor the tag-driven workflow in `.github/workflows/release.yml`:
   - Confirms tag/version match, builds, runs pack audit/smoke, creates GitHub Release, and publishes to npm.
   - For manual dispatch, pass `inputs.tag=vX.Y.Z` (or prerelease tag) so workflow metadata resolves against a real tag.
   - Stable tags publish to `latest`; prerelease tags publish to the leading prerelease label (`alpha`, `beta`, `rc`, etc.) after lowercasing/sanitization, and fall back to `next` when that derived label is empty or starts with a digit. Any prerelease tag creates a prerelease.
   - Repository secrets must provide signer verification material for CI tag checks: `RELEASE_SIGNING_PUBLIC_KEYS` (GPG) or `RELEASE_SIGNING_ALLOWED_SIGNERS` (SSH).
   - Workflow blocks lightweight/unsigned tags before packaging/publish.
   - Confirm GitHub shows Verified for the tag/commit.
   - If `.github/release.yml` exists, verify only `Overview` and `Bug Fixes` are elevated into the top release sections; other categories remain in `Full Changelog`.
7. Record release status, workflow links, and any follow-ups in `/tasks` and docs checklists.

If the release workflow fails, fix the issue and re-tag after updating metadata; do not publish from non-release artifacts.
