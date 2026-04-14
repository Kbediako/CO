# Docs Freshness Cohorts

## Purpose
`docs:freshness` remains a repo-wide truthfulness gate. It must fail for missing registry rows, registry entries that point at missing files, invalid registry metadata, uncatalogued docs, stale public or active guidance, and stale cohorts that are no longer inside an explicit rolling window.

The rolling cohort policy exists for one narrower case: a large historical task/report cohort can age one or more days past cadence at a date boundary while unrelated feature lanes still have healthy current diffs. In that case, the stale rows must stay machine-visible and owned by a baseline issue instead of forcing every active feature worker to refresh unrelated historical packets.

## Policy
The machine-readable policy lives in `docs/docs-catalog.json` under `policies.rolling_freshness_cohorts`.

Current CO policy:

- Owner issue: `CO-175`
- Window: `7` days after the normal freshness cadence expires
- Maximum active rolling cohorts: `2`
- Maximum rolling rows: `300`
- Eligible doc classes: `Task Packet`, `Task Mirror`, and `Report Only`
- Declared baseline cohort: `co-175-apr-14-march-14-tasks-1164-1195`
- Ineligible docs: Front Door, Public Guide, Repository Guide, Agent Policy, Active Guide, shipped skills, companions, templates, and uncatalogued docs

Eligibility is not class-only. A stale row must match a declared baseline cohort by `last_review`, `cadence_days`, path family, and either task-number range or declared path prefix before it can move from blocking stale failures into rolling debt. This prevents a newly stale feature-lane packet from being hidden just because it is in an eligible doc class and still inside the rolling window.

When an eligible declared cohort is inside policy bounds, `docs:freshness` exits successfully for blocking validation but still writes:

- `totals.rolling_cohort_entries`
- `rolling_cohort_entries`
- `rolling_freshness_cohorts`

Those report fields are not waivers. They are the repo-wide freshness debt ledger for the owner issue.

`spec-guard` uses the same catalog policy for stale active specs under the docs catalog. When the only stale specs are eligible, owner-backed, in-window entries from a declared baseline cohort, `spec-guard` prints the rolling spec cohort and exits successfully. It still fails for stale specs when the policy is missing, invalid, over budget, expired, outside the declared baseline, or when the spec class is not eligible.

## Required Handling
A rolling cohort must be resolved before the window expires by one of these explicit outcomes:

- refresh the cohort after a real review
- archive completed historical packets through the repo archive policy
- reclassify docs only when their class is wrong
- file a new same-project owner issue with acceptance criteria and evidence when the debt is still intentionally deferred

Feature lanes may cite the owner issue for the rolling cohort, but they must still fix their own docs packet drift and any blocking freshness failures in their diff.

## Not Allowed
- Do not use rolling cohorts for public docs, agent policy, active guides, skills, templates, or missing/invalid registry drift.
- Do not silently bump `last_review` dates without a review rationale.
- Do not increase the rolling window or row cap to make an unrelated validation failure disappear.
- Do not configure empty or malformed eligible classes; invalid policy fields make rolling deferral fail closed.
- Do not omit or broaden `baseline_cohorts`; stale docs outside the declared baseline must remain blocking.
- Do not treat a green `docs:freshness` exit as proof that rolling freshness debt is zero; inspect the report totals.

## Apr 14 Baseline
CO-175 reproduced the Apr 14 baseline at `cac56ec89`:

- `221` stale entries
- `0` missing registry rows
- `0` missing-on-disk rows
- `0` invalid registry entries
- `0` uncatalogued docs
- one cohort: `last_review=2026-03-14`, `cadence_days=30`, `age_days=31`
- classes: Task Packet `157`, Task Mirror `32`, Report Only `32`
- lineage: `1164-1195`
- declared cohort identity: `co-175-apr-14-march-14-tasks-1164-1195`

The saved baseline report is `out/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8/manual/baseline-docs-freshness-report.json`, and the cohort classification is `out/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8/manual/baseline-cohort-classification.json`.
