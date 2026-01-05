# Release SOP

## Added by RLM Orchestrator release 2026-01-05

1. Ensure the working tree is clean and `main` is up to date.
2. Decide the release tag (`vX.Y.Z` stable or `vX.Y.Z-alpha.N`) and confirm it matches `package.json` version.
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
5. Create and push the release tag:
   - `git tag vX.Y.Z` (or `vX.Y.Z-alpha.N`)
   - `git push origin vX.Y.Z`
6. Monitor the tag-driven workflow in `.github/workflows/release.yml`:
   - Confirms tag/version match, builds, runs pack audit/smoke, creates GitHub Release, and publishes to npm.
   - Stable tags publish to `latest`; alpha tags publish to `alpha` and create a prerelease.
7. Record release status, workflow links, and any follow-ups in `/tasks` and docs checklists.

If the release workflow fails, fix the issue and re-tag after updating metadata; do not publish from non-release artifacts.
