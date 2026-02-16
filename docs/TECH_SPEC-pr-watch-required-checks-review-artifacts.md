# TECH_SPEC - PR Watch Required-Checks Gate + Review Artifacts Guide (0967)

## Summary
- Change `scripts/lib/pr-watch-merge.js` to gate on required checks where available, falling back to current behavior only when required-check data is unavailable.
- Add `docs/guides/review-artifacts.md` and link it from discoverable docs/help locations.

## Design

### PR Monitor Required-Checks Gating
- Add a required-check snapshot fetch using `gh pr checks <pr> --required --json name,state,link,bucket`.
- Derive a `requiredChecks` summary (`successCount`, `pending`, `failed`, `total`) from `bucket` values.
- Use `requiredChecks` as the primary merge gate for check status when available.
- Preserve the last successful `requiredChecks` snapshot across transient `gh` fetch failures so optional pending checks do not briefly re-block readiness; invalidate that cache when PR head OID changes.
- Preserve current gates:
  - PR open + non-draft
  - no `do-not-merge` label
  - merge state in allowed set
  - no blocked review decision
  - no unresolved review threads
- Keep all-check rollup data for observability in status logs.

### Review Artifacts Guide
- Add `docs/guides/review-artifacts.md` describing:
  - `review/prompt.txt` and `review/output.log` locations
  - run-directory resolution from manifest / `CODEX_ORCHESTRATOR_RUN_DIR`
  - quick commands to inspect artifacts
- Link the guide from README and CLI help notes.

## Validation
- Automated:
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
- Manual:
  - run `codex-orchestrator pr watch-merge --dry-run` on a PR with optional pending check and confirm required-check gating behavior.
