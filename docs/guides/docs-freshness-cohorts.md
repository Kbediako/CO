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

## Maintenance Decision
`npm run docs:freshness:maintain` is the provider-gate maintenance entrypoint. It runs `docs:freshness`, runs `spec-guard`, computes the current git diff, and writes `out/<task-id>/docs-freshness-maintenance.json`.

The maintenance report is the machine-readable decision future workers should cite instead of manually reclassifying date-boundary cohorts. It includes:

- `freshness_decision`
- `owner_issue`
- `owner_issue_action`
- `candidate_cohorts`
- `blocking_changed_paths`
- `diff_status`
- `policy_capacity_status`
- `expires_after`
- `recommended_action`
- sample paths for changed blockers, candidate rows, and hard stale rows

Provider-worker gates use this decision in `docs-review` and `implementation-gate`. They may pass with `pass_with_owned_rolling_debt` only when the debt is in an eligible historical class, the policy owner issue is present, the rows are still inside the rolling window and caps, `spec-guard` is clean, and the current diff/task packet has no blocking freshness paths. The underlying `docs:freshness` JSON still preserves the raw stale and rolling row evidence.

Blocking decisions are fail-closed:

- `block_missing_or_invalid_registry`: missing registry rows, registry references to missing files, invalid registry metadata, or uncatalogued docs.
- `block_diff_local`: current diff/task-packet freshness drift, a hard `spec-guard` failure, or an unavailable git base that prevents proving the current diff is clean.
- `block_policy_expired`: eligible historical rows are past the rolling window.
- `block_policy_over_budget`: eligible in-window historical rows exceed `max_entries` or `max_cohorts`.
- `block_unowned_repo_debt`: stale rows need direct owner action before provider-worker gates may pass.

The scheduled docs truthfulness maintenance workflow runs near UTC date rollover with `--warn`, uploads the maintenance JSON, and records the owner/action evidence in the workflow summary. It does not silently bump `last_review`; it either reports a pass-with-owned-debt decision or a hard blocker that the owner issue must resolve through review, archive, or reclassification.

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

## Apr 15 Reviewed Refresh
CO-184 reproduced the Apr 15 baseline failure in `out/linear-237c874c-c05f-4947-949a-573043fc575f/pre-fix-docs-freshness.json`:

- `173` blocking stale entries outside the CO-175 rolling cohort
- `221` CO-175 rolling cohort entries still visible
- `0` missing registry rows
- `0` missing-on-disk rows
- `0` invalid registry entries
- `0` uncatalogued docs
- blocking classes: Task Packet `124`, Task Mirror `25`, Report Only `24`
- blocking path families: `.agent/task` `25`, `tasks/specs` `24`, `tasks/tasks-*` `25`, `docs/findings` `24`, `docs/PRD-*` `25`, `docs/TECH_SPEC-*` `25`, `docs/ACTION_PLAN-*` `25`

The Apr 15 blocking cohort was reviewed in `docs/findings/linear-237c874c-c05f-4947-949a-573043fc575f-docs-freshness-classification.md` and refreshed instead of added to rolling deferral. Adding the `173` rows beside the existing CO-175 `221` rows would exceed `max_entries=300`, so CO-184 keeps the rolling policy unchanged and updates only the reviewed historical packet rows to `last_review=2026-04-15`.

## Apr 16 Reviewed Refresh
CO-201 reproduced the Apr 16 baseline failure in `out/linear-c101cb88-3097-4502-bcd7-723d80da7955/before/docs-freshness.json`:

- `192` blocking stale entries outside the CO-175 rolling cohort
- `221` CO-175 rolling cohort entries still visible
- `0` missing registry rows
- `0` missing-on-disk rows
- `0` invalid registry entries
- `0` uncatalogued docs
- blocking classes: Task Packet `137`, Task Mirror `27`, Report Only `28`
- blocking path families: `.agent/task` `27`, `docs/findings` `28`, `tasks/specs` `26`, `tasks/tasks-*` `27`, `docs/PRD-*` `28`, `docs/TECH_SPEC-*` `28`, `docs/ACTION_PLAN-*` `28`
- date cohorts: `2026-01-15` / `90` days (`2` rows) and `2026-03-16` / `30` days (`190` rows)

The Apr 16 blocking cohort was reviewed in `docs/findings/linear-c101cb88-3097-4502-bcd7-723d80da7955-docs-freshness-classification.md` and refreshed instead of added to rolling deferral. Adding the `192` rows beside the existing CO-175 `221` rows would create `413` candidate rows and `10` candidate cohorts, exceeding both `max_entries=300` and `max_cohorts=2`, so CO-201 keeps the rolling policy unchanged and updates only the reviewed historical packet rows to `last_review=2026-04-16`.

CO-209 reproduced the Apr 17 baseline failure in `out/linear-901cd944-fc0c-4372-92ce-65bb8bb411c0/before/docs-freshness.json`:

- `263` blocking stale entries outside the CO-175 rolling cohort
- `221` CO-175 rolling cohort entries still visible
- `0` missing registry rows
- `0` missing-on-disk rows
- `0` invalid registry entries
- `0` uncatalogued docs
- blocking classes: Task Packet `187`, Task Mirror `38`, Report Only `38`
- blocking path families: `.agent/task` `38`, `docs/findings` `38`, `tasks/specs` `38`, `tasks/tasks-*` `38`, `docs/PRD-*` `37`, `docs/TECH_SPEC-*` `37`, `docs/ACTION_PLAN-*` `37`
- date cohort: `2026-03-17` / `30` days (`263` rows)

The Apr 17 blocking cohort was reviewed in `docs/findings/linear-901cd944-fc0c-4372-92ce-65bb8bb411c0-docs-freshness-classification.md` and refreshed instead of added to rolling deferral. Adding the `263` rows beside the existing CO-175 `221` rows would create `484` candidate rows and `8` candidate cohorts, exceeding both `max_entries=300` and `max_cohorts=2`, so CO-209 keeps the rolling policy unchanged and updates only the reviewed historical packet rows to `last_review=2026-04-17`.
