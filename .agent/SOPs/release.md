# Release SOP

Reviewed 2026-06-17: local smoke on Codex CLI `0.140.0` did not change the signed-tag release contract below. This note is not a posture promotion; the canonical current posture remains governed by `docs/guides/codex-version-policy.md`. The release validation floor still intentionally requires docs freshness, manifest-backed review, pack audit, and pack smoke before tagging or publishing.

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
   - `npm run repo:stewardship`
   - `node scripts/diff-budget.mjs`
   - `NOTES="Goal: ... | Summary: ... | Risks: ... | Questions (optional): ..." npm run review`
   - `npm run pack:audit`
   - `npm run pack:smoke`
   - Note: release/RC should run the full matrix (`npm run build:all`, `npm run test:adapters`, `npm run test:evaluation`, `npm run eval:test` when fixtures/optional deps exist) per docs policy.
   - `npm run build:all` runs the production build, pattern build, and the CO-471 root strict typecheck baseline guard. Use `npm run typecheck:root` to reproduce the current raw root `tsconfig.json` strict test type debt; update `tasks/baselines/build-all-strict-typecheck-debt.json` only from the `build-all-strict-test-typecheck-debt` owner lane after reviewing diagnostic drift.
4. Validate the package artifact:
   - `npm run clean:dist && npm run build`
   - `npm run pack:audit` (release workflow reruns this before publish)
   - `npm run pack:smoke` (release workflow installs the pinned marketplace-capable Codex CLI before this smoke)
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
   - Repository secrets must provide exactly one signer verification material family for CI tag checks: `RELEASE_SIGNING_PUBLIC_KEYS` (GPG) or `RELEASE_SIGNING_ALLOWED_SIGNERS` (SSH).
   - Workflow blocks lightweight/unsigned tags before packaging/publish.
   - Publish prefers npm trusted publishing (OIDC with `--provenance`) and only falls back to `secrets.NPM_TOKEN` when OIDC fails.
   - If `secrets.NPM_TOKEN` fallback is needed, it must be an npm automation token, not an OTP-gated token.
   - Confirm GitHub shows Verified for the tag/commit.
   - In `.github/workflows/release.yml`, verify generated `Overview` and `Bug Fixes` sections render once as top-level release-note sections and remaining generated sections stay under `Full Changelog`.
   - The workflow reads an optional one-shot overview override from the signed annotated tag body. It does not read .github/release-overview.md, so stale committed overview text cannot shape a later release.
   - Escalation: if signing verification, packaging, or npm publish fails after one retry, stop re-tagging and escalate in the active Linear release task to the release maintainer named there plus the repo owner before retrying publication.
   - Evidence location: record the GitHub Actions workflow run URL, failing job name, release tag, and any `.runs/<task-id>/.../manifest.json` path in `/tasks` and the mirrored release checklist before re-tagging.
7. Record release status, workflow links, and any follow-ups in `/tasks` and docs checklists.

If the release workflow fails, fix the issue and re-tag after updating metadata; do not publish from non-release artifacts.
