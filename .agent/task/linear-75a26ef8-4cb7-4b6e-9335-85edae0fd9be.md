# Task Mirror - CO-318

- Issue: current `origin/main` fails `node scripts/spec-guard.mjs` because six active task specs still have `last_review: 2026-03-23`.
- Scope: create the packet, preserve current-main evidence, re-review and refresh only the exact six stale specs, and prove the unblock.
- Non-goals: `spec-guard` weakening, `CO-314` release-workflow edits, and broad docs-freshness cleanup.

## Status
- [x] Docs-first packet exists and preserves the protected terms.
- [x] Accepted bounded child-lane evidence note is present in the parent workspace.
- [x] Pre-implementation docs-review fallback is recorded.
- [x] The six stale specs are refreshed and validated.
