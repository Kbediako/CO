# ACTION_PLAN - CO: restore current-main docs:freshness green baseline after CO-134 validation repair

## Added by Bootstrap 2026-04-10

## Summary
- Goal: restore the current mainline `docs:freshness` green baseline by refreshing the single March 10 packet cohort that aged out after CO-63's green result.
- Scope:
  - docs-first packet, registry mirrors, and saved workpad source
  - audited docs-review child stream
  - bounded stale-cohort audit and metadata refresh
  - validation proving the repaired tree advances beyond `docs:freshness`
- Assumptions:
  - the reproduced stale set is fully explained by time-based expiration of the March 10 packet cohort
  - refreshing review metadata after a bounded cohort audit is the smallest truthful fix on current main

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `docs:freshness`, `stale docs`, `CO-134`, `CO-63`, `implementation-gate`, `119 stale docs`
- Not done if:
  - `docs:freshness` still fails without a narrower blocker
  - the lane cannot explain why April 1 green drifted to April 10 red
  - the repair becomes a waiver instead of a metadata refresh
- Pre-implementation issue-quality review:
  - current repro shows no missing or invalid registry entries; all `119` failures come from one March 10 cohort with `cadence_days=30`, so the problem is bounded and auditable.

## Milestones & Sequencing
1. Draft the `CO-143` docs packet, registry mirrors, and local workpad source.
2. Run an audited `linear child-stream --pipeline docs-review` pass and record whether it fails only on the existing repo baseline.
3. Audit the reproduced stale cohort and refresh its review metadata consistently across packet surfaces.
4. Rerun `npm run docs:freshness` and the required follow-on validation to prove the blocker moved.
5. Run the required standalone review and elegance pass before any review handoff.

## Dependencies
- `scripts/docs-freshness.mjs`
- `docs/docs-freshness-registry.json`
- `tasks/index.json`
- `out/linear-a34ce3f3-8e78-40f7-aabd-9e510572323e/docs-freshness.json`

## Validation
- Checks / tests:
  - `linear child-stream --pipeline docs-review`
  - `npm run docs:freshness`
  - repo validation floor if the final diff is non-trivial
  - bounded implementation-gate proof or equivalent downstream blocker proof
- Rollback plan:
  - revert the cohort refresh if the rerun shows additional stale entries or the downstream blocker remains unchanged

## Risks & Mitigations
- Risk: the stale set includes more than the March 10 cohort.
  - Mitigation: classify from the saved repro report first, and stop if new cohorts appear.
- Risk: refreshing only registry metadata would drift from packet-local frontmatter or task index.
  - Mitigation: update the cohort consistently across registry rows, task index rows, and frontmatter where present.
- Risk: the lane drifts back into CO-134 validation debugging.
  - Mitigation: keep downstream proof focused on whether `docs:freshness` is no longer first to fail.

## Approvals
- Reviewer: docs-review child stream failed only on the pre-existing repo baseline; manual fallback accepted in `out/linear-d3f1af87-57da-46ab-901d-75a6cc60420e/manual/20260410T053642Z-docs-review-fallback.md`
- Date: 2026-04-10
