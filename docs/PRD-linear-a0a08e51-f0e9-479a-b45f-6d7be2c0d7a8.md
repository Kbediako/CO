# PRD - CO workflow: add rolling docs:freshness cohort policy for Apr 14 stale baseline

## Summary
After the 2026-04-14 boundary, repo-wide `docs:freshness` fails on an owned historical task/report cohort even when active feature diffs are healthy. CO-175 should preserve the freshness gate while making the Apr 14 date-boundary stale cohort visible, owned, and time-boxed so CO-173, CO-174, and future lanes can cite this baseline owner instead of refreshing unrelated March 14 history.

## User Request Translation
- Reproduce and classify the Apr 14 stale baseline under `out/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8/`.
- Define rolling freshness cohorts that separate `per-PR diff health` from `repo-wide freshness debt`.
- Keep `docs:freshness` blocking for missing registry rows, missing files, invalid entries, uncatalogued docs, non-eligible stale docs, malformed policies, expired cohorts, and over-budget cohorts.
- Do not make CO-173 or CO-174 widen product scope.

## Intent Checksum
Protected terms: `docs:freshness`, `repo-wide freshness debt`, `per-PR diff health`, `date-boundary stale cohort`, `task packet freshness`, `docs registry drift`, `rolling freshness cohorts`, `machine-checkable evidence`.

Protected surfaces: `scripts/docs-freshness.mjs`, `scripts/spec-guard.mjs`, `docs/docs-catalog.json`, `docs/docs-freshness-registry.json`, baseline reports under `out/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8/manual/`.

Wrong interpretations to reject: global warning-only freshness, blind `last_review` date bumps, hidden stale docs, duplicated Apr 13 baseline work without explaining the Apr 14 cohort, and unrelated CO-173/CO-174 implementation changes.

## Parity / Alignment Matrix
- Current truth: clean main at `cac56ec89` has `221` stale rows, all `last_review=2026-03-14`, `cadence_days=30`, `age_days=31`, with `0` missing registry, missing disk, invalid registry, or uncatalogued drift.
- Reference truth: feature-lane validation should fail on branch-local docs drift, not on a newly rolled historical cohort with a repo-wide owner.
- Target truth: eligible task packet, task mirror, and report-only rows enter a short CO-175-owned rolling window; reports stay green for blocking validation while printing and saving the rolling debt count and expiry.
- Out of scope: review-wrapper behavior, child-lane behavior, broad archive automation redesign, public/active guide freshness relaxation, and permanent warning-only checks.

## Goals
- Save before/after JSON and markdown artifacts with exact counts and class breakdowns.
- Document the rolling cohort policy in repo docs and machine-readable catalog config.
- Keep CO-175 as the citation target for CO-173 and CO-174 baseline caveats.

## Non-Goals
- No global disabling of `docs:freshness`, `docs:check`, `spec-guard`, or provider-worker handoff policy.
- No mass refresh/archive of the March 14 cohort as the primary fix.

## Metrics & Guardrails
- Baseline stale count reproduced as `221`; post-change blocking stale count is `0`; post-change rolling cohort count remains `221`.
- Rolling policy is explicit, owner-backed, class-limited, budget-limited, and expiry-limited.
- Invalid config, expired candidates, non-eligible docs, and registry drift fail closed.

## Approvals
- Product: Linear issue CO-175.
- Engineering: docs-review and standalone-review evidence recorded in the workpad.
- Design: Not applicable.
