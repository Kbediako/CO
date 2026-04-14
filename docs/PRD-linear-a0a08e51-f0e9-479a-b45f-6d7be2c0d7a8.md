# PRD - CO workflow: add rolling docs:freshness cohort policy for Apr 14 stale baseline

## Summary
- Problem Statement: After the 2026-04-14 date boundary, repo-wide `docs:freshness` fails on a coherent historical task/report cohort even when active feature-lane diffs are otherwise healthy. CO-173 and CO-174 should not need to refresh unrelated March 14 packet history to complete their own validation.
- Desired Outcome: preserve `docs:freshness` as a blocking guard for current docs drift while introducing an explicit rolling freshness cohort policy for repo-wide date-boundary debt that is owned by a baseline lane, machine-visible in reports, and bounded by an expiry window.

## User Request Translation (Context Anchor)
- User intent / needs: Reproduce and classify the Apr 14 stale baseline, define a rolling cohort policy, land the smallest tooling/docs change that separates per-PR diff health from repo-wide freshness debt, and leave CO-173/CO-174 with a clear citation path to this owner issue.
- Success criteria / acceptance:
  - baseline failure artifacts are saved under `out/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8/`
  - the stale set is classified by cohort, class, path family, and lineage
  - `docs:freshness` reports rolling cohort debt explicitly instead of hiding it
  - unrelated feature lanes no longer fail solely because the owned rolling cohort is one day over cadence
  - non-eligible stale docs, missing registry rows, invalid entries, and expired cohorts still fail closed
- Constraints / non-goals:
  - no CO-173 review-wrapper implementation changes
  - no CO-174 child-lane runtime changes
  - no global disabling of `docs:freshness`, `docs:check`, spec guard, or provider-worker handoff policy
  - no blind `last_review` date bump across the March 14 cohort

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `docs:freshness`
  - `repo-wide freshness debt`
  - `per-PR diff health`
  - `date-boundary stale cohort`
  - `task packet freshness`
  - `docs registry drift`
  - `rolling freshness cohorts`
  - `machine-checkable evidence`
- Protected terms / exact artifact and surface names:
  - `out/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8/manual/baseline-docs-freshness-report.json`
  - `out/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8/manual/baseline-cohort-classification.json`
  - `docs/docs-catalog.json`
  - `scripts/docs-freshness.mjs`
  - `docs/docs-freshness-registry.json`
- Nearby wrong interpretations to reject:
  - make CO-173, CO-174, or every future feature lane refresh unrelated historical cohorts
  - weaken or remove `docs:freshness`
  - silently date-bump stale docs without a review rationale
  - duplicate already-closed Apr 13 CO-166/CO-167/CO-170 work without explaining why Apr 14 is a new cohort

## Parity / Alignment Matrix
- Current truth: `docs:freshness` fails with `221` stale rows, all `last_review=2026-03-14`, `cadence_days=30`, `age_days=31`, with `0` missing registry, missing disk, invalid entry, or uncatalogued drift.
- Reference truth: repo-wide stale cohorts should have explicit owners and reports, while per-PR diff health should still fail for missing/invalid/current docs drift.
- Target truth / intended delta: eligible task packet, task mirror, and report-only cohorts can enter a short rolling window owned by CO-175; the report stays green for blocking validation only while surfacing the rolling debt count and expiry.
- Explicitly out-of-scope differences: product/runtime work in CO-173 or CO-174, broad historical archive cleanup, public guide freshness relaxation, and permanent warning-only freshness checks.

## Not Done If
- `npm run docs:freshness` remains red on current main with no explicit reviewed cohort policy.
- The fix is only a blind `last_review` date bump across the March 14 cohort.
- Active issue lanes still need bespoke stale-baseline caveats for this Apr 14 rollover.
- Non-task stale docs or missing/invalid registry drift can hide inside the rolling policy.

## Goals
- Define a durable rolling cohort policy in repo docs and machine-readable catalog configuration.
- Update `docs:freshness` reports so rolling debt is explicit, bounded, and separate from blocking stale failures.
- Save before/after evidence with exact stale counts and class breakdowns.
- Leave CO-173 and CO-174 able to cite CO-175 as the repo-wide freshness owner.

## Non-Goals
- Change CO-173 review-wrapper behavior.
- Change CO-174 same-issue child-lane behavior.
- Remove freshness enforcement from validation.
- Refresh or archive the entire March 14 cohort as this lane's primary fix.

## Stakeholders
- Product: CO operators using Linear issue lanes for review handoff.
- Engineering: CO maintainers responsible for repo-wide validation gates and docs registry integrity.
- Design: Not applicable.

## Metrics & Guardrails
- Primary Success Metrics:
  - baseline stale count reproduced as `221`
  - post-change blocking stale count is `0`
  - post-change rolling cohort debt remains reported as `221`
  - missing/invalid/uncatalogued counts remain `0`
- Guardrails / Error Budgets:
  - rolling window is short and explicit
  - only configured task/report classes are eligible
  - expired rolling cohorts fail closed
  - non-eligible stale classes fail closed

## User Experience
- Personas: provider workers, top-level maintainers, and review agents.
- User Journeys: a feature lane runs `docs:freshness`; if only an eligible rolling cohort exists, the command succeeds while printing and saving the owned rolling debt so the feature lane can cite CO-175 instead of widening scope.

## Technical Considerations
- Architectural Notes: The policy belongs in `docs/docs-catalog.json`; `scripts/docs-freshness.mjs` should keep raw rolling cohort entries in the JSON report and remove only policy-covered rows from the blocking stale failure set.
- Dependencies / Integrations: `docs/docs-freshness-registry.json`, `docs/docs-catalog.json`, `tests/docs-freshness.spec.ts`, Linear CO-173/CO-174 evidence.

## Open Questions
- None for this slice; any broader archive automation improvements should be filed as follow-up issues with their own parity matrix.

## Approvals
- Product: Linear issue CO-175.
- Engineering: pending docs-review / standalone review.
- Design: Not applicable.
