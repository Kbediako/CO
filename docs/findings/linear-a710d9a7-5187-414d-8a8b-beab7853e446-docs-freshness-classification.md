# CO-239 Apr 18 Docs Freshness Classification

## Source Artifacts
- Command: `npm run docs:freshness -- --report out/linear-a710d9a7-5187-414d-8a8b-beab7853e446/before/docs-freshness.json --summary-markdown out/linear-a710d9a7-5187-414d-8a8b-beab7853e446/before/docs-freshness.md`
- Preserved freshness report: `out/linear-a710d9a7-5187-414d-8a8b-beab7853e446/before/docs-freshness.json`
- Command: `npm run docs:freshness:maintain -- --freshness-report out/linear-a710d9a7-5187-414d-8a8b-beab7853e446/before/docs-freshness-maintain-input.json --summary-markdown out/linear-a710d9a7-5187-414d-8a8b-beab7853e446/before/docs-freshness-maintain-input.md --report out/linear-a710d9a7-5187-414d-8a8b-beab7853e446/before/docs-freshness-maintenance.json --base origin/main --format json`
- Preserved maintenance report: `out/linear-a710d9a7-5187-414d-8a8b-beab7853e446/before/docs-freshness-maintenance.json`
- Baseline ref: `origin/main` at `b678ce4e41ccc17b8715d65fb6a48cc0ed389059`
- Docs packet manifest: `.runs/linear-a710d9a7-5187-414d-8a8b-beab7853e446-docs-packet/cli/2026-04-18T04-39-54-760Z-8c9db8b8/manifest.json`

## Gate Result Before Fix
- `docs:freshness`: failed with `70` blocking stale rows and `221` CO-175 rolling rows.
- `docs:freshness:maintain`: failed with `freshness_decision=block_policy_over_budget`.
- `blocking_changed_paths`: `0`; the current CO-239 packet and registry-owner diff was not itself part of the stale blocker.
- Policy capacity: `291` candidate rows and `8` candidate cohorts against caps of `300` rows and `2` cohorts.
- Missing/invalid drift: `0` missing registry rows, `0` missing-on-disk rows, `0` invalid registry entries, and `0` uncatalogued docs.
- Reproduced report totals on current `origin/main` are `4077` docs and `4080` registry entries at `b678ce4e41ccc17b8715d65fb6a48cc0ed389059`. The issue description cited `4071` docs and `4074` registry entries from earlier verification, but the preserved Apr 18 blocker shape is unchanged: the same Mar 18 `1289-1298` cohort still contributes `70` blocking rows while CO-175 still owns the visible `221` rolling rows.

## Owner And Status
All `70` Apr 18 blocking stale rows are:

- owner: `Codex (top-level agent), Review agent`
- registry status: `active`
- `last_review=2026-03-18`
- `cadence_days=30`
- `age_days=31`
- `overdue_days=1`
- historical packet classes only: Task Packet, Task Mirror, Report Only

No Front Door, Public Guide, Repository Guide, Agent Policy, Active Guide, shipped skill, shipped companion, seeded template, missing registry, missing-on-disk, invalid registry, or uncatalogued row is part of the blocking set.

## Class Breakdown

| Class | Count | Outcome |
| --- | ---: | --- |
| Task Packet | 50 | Refresh after this review |
| Task Mirror | 10 | Refresh after this review |
| Report Only | 10 | Refresh after this review |

## Path Family Breakdown

| Path family | Count | Outcome |
| --- | ---: | --- |
| `.agent/task` | 10 | Refresh |
| `docs/ACTION_PLAN-*` | 10 | Refresh |
| `docs/findings` | 10 | Refresh |
| `docs/PRD-*` | 10 | Refresh |
| `docs/TECH_SPEC-*` | 10 | Refresh |
| `tasks/specs` | 10 | Refresh |
| `tasks/tasks-*` | 10 | Refresh |

## Date Cohorts

| Last review / cadence | Count | Notes |
| --- | ---: | --- |
| `2026-03-18` / `30` days | 70 | March 18 coordinator-symphony start/flow/rlm/frontend-test task packet, mirror, and deliberation/report rows |

## Exact Refresh Verification
- The exact before-stale path set from `out/linear-a710d9a7-5187-414d-8a8b-beab7853e446/before/docs-freshness.json` contains `70` rows; all `70` are present in `docs/docs-freshness-registry.json` with `last_review=2026-04-18` and `cadence_days=30`.
- Numeric task-id path matching only finds `40` rows because the `docs/ACTION_PLAN-*`, `docs/PRD-*`, and `docs/TECH_SPEC-*` packet rows are slug-only paths; exact-path verification is the authoritative cohort count for this repair.

## Lineage
- Numbered stale task surfaces: `1289` through `1298`.
- PRD / TECH_SPEC / ACTION_PLAN rows are slug paths rather than leading task-number paths in the report, but they belong to the same March 18 coordinator-symphony task packet family.
- The existing CO-175 rolling cohort remains separate: `co-175-apr-14-march-14-tasks-1164-1195`, `221` rows, `last_review=2026-03-14`, and `overdue_days=5` inside the seven-day rolling window.

## Representative Sample Paths
- `.agent/task/1289-coordinator-symphony-aligned-start-cli-request-shell-extraction.md`
- `.agent/task/1290-coordinator-symphony-aligned-start-cli-remaining-boundary-freeze-reassessment.md`
- `docs/ACTION_PLAN-coordinator-symphony-aligned-flow-cli-boundary-reassessment-revisit.md`
- `docs/findings/1294-rlm-cli-boundary-reassessment-revisit-deliberation.md`
- `docs/PRD-coordinator-symphony-aligned-start-cli-request-shell-extraction.md`
- `docs/TECH_SPEC-coordinator-symphony-aligned-frontend-test-cli-request-shell-extraction.md`
- `tasks/specs/1298-coordinator-symphony-aligned-frontend-test-cli-request-shell-extraction.md`
- `tasks/tasks-1297-coordinator-symphony-aligned-frontend-test-cli-boundary-reassessment-revisit.md`

## Decision
Outcome: refresh the `70` blocking stale historical rows in `docs/docs-freshness-registry.json` to `last_review=2026-04-18`, and register the CO-239 packet and classification docs as current active owner evidence.

Rationale:

- Rolling deferral is not available without exceeding policy capacity. CO-175 already owns `221` rolling entries; treating the Apr 18 rows as another rolling set would create `291` candidate rows and `8` candidate cohorts. That stays within `max_entries=300` but exceeds `max_cohorts=2`, so the policy still fails closed.
- Reclassification is not appropriate because the catalog classes match the documents: Task Packet, Task Mirror, and Report Only.
- Archiving the whole set is broader than this baseline owner lane: the rows are historical packet, mirror, and report records, and this issue is about restoring the Apr 18 validation baseline rather than changing archive eligibility or retention policy.
- Refreshing after this explicit review restores the baseline while keeping public and active docs fail-closed and leaving CO-175 provenance intact.

## CO-175 Preservation
The CO-175 cohort remains:

- owner issue: `CO-175`
- cohort id: `co-175-apr-14-march-14-tasks-1164-1195`
- rolling entries: `221`
- row cap: `300`
- cohort cap: `2`
- window: `7` days

This CO-239 refresh does not change CO-175 owner, cap, window, eligible classes, or baseline cohort.
