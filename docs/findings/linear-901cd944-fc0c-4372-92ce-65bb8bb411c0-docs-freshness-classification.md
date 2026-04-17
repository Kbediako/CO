# CO-209 Apr 17 Docs Freshness Classification

## Source Artifacts
- Command: `npm run docs:freshness -- --report out/linear-901cd944-fc0c-4372-92ce-65bb8bb411c0/before/docs-freshness.json --summary-markdown out/linear-901cd944-fc0c-4372-92ce-65bb8bb411c0/before/docs-freshness.md`
- Preserved freshness report: `out/linear-901cd944-fc0c-4372-92ce-65bb8bb411c0/before/docs-freshness.json`
- Command: `npm run docs:freshness:maintain -- --freshness-report out/linear-901cd944-fc0c-4372-92ce-65bb8bb411c0/before/docs-freshness-maintain-input.json --summary-markdown out/linear-901cd944-fc0c-4372-92ce-65bb8bb411c0/before/docs-freshness-maintain-input.md --report out/linear-901cd944-fc0c-4372-92ce-65bb8bb411c0/before/docs-freshness-maintenance.json --base origin/main --format json`
- Preserved maintenance report: `out/linear-901cd944-fc0c-4372-92ce-65bb8bb411c0/before/docs-freshness-maintenance.json`
- Baseline ref: `origin/main` at `04741497f1bb0f30801a1f4459836ef721e85ec5`
- Pre-implementation docs-review manifest: `.runs/linear-901cd944-fc0c-4372-92ce-65bb8bb411c0-docs-review/cli/2026-04-17T00-48-00-977Z-d429f7b5/manifest.json`

## Gate Result Before Fix
- `docs:freshness`: failed with `263` blocking stale rows and `221` CO-175 rolling rows.
- `docs:freshness:maintain`: failed with `freshness_decision=block_policy_over_budget`.
- `blocking_changed_paths`: `0`; the current CO-209 packet/registry diff was not part of the stale blocker.
- Policy capacity: `484` candidate rows and `8` candidate cohorts against caps of `300` rows and `2` cohorts.
- Missing/invalid drift: `0` missing registry rows, `0` missing-on-disk rows, `0` invalid registry entries, and `0` uncatalogued docs.
- `spec-guard`: succeeded inside the maintenance report.

## Owner And Status
All `263` Apr 17 blocking stale rows are:

- owner: `Codex (top-level agent), Review agent`
- registry status: `active`
- `last_review=2026-03-17`
- `cadence_days=30`
- `age_days=31`
- `overdue_days=1`
- historical packet classes only: Task Packet, Task Mirror, Report Only

No Front Door, Public Guide, Repository Guide, Agent Policy, Active Guide, shipped skill, shipped companion, seeded template, missing registry, missing-on-disk, invalid registry, or uncatalogued row is part of the blocking set.

## Class Breakdown
| Class | Count | Outcome |
| --- | ---: | --- |
| Task Packet | 187 | Refresh after this review |
| Task Mirror | 38 | Refresh after this review |
| Report Only | 38 | Refresh after this review |

## Path Family Breakdown
| Path family | Count | Outcome |
| --- | ---: | --- |
| `.agent/task` | 38 | Refresh |
| `docs/ACTION_PLAN-*` | 37 | Refresh |
| `docs/findings` | 38 | Refresh |
| `docs/PRD-*` | 37 | Refresh |
| `docs/TECH_SPEC-*` | 37 | Refresh |
| `tasks/specs` | 38 | Refresh |
| `tasks/tasks-*` | 38 | Refresh |

## Date Cohorts
| Last review / cadence | Count | Notes |
| --- | ---: | --- |
| `2026-03-17` / `30` days | 263 | March 17 coordinator-symphony CLI and control-surface task packet, mirror, and deliberation/report rows |

## Lineage
- Numbered stale task surfaces: `1251` through `1288`.
- PRD / TECH_SPEC / ACTION_PLAN rows are slug paths rather than leading task-number paths in the report, but they belong to the same March 17 coordinator-symphony task packet cluster.
- The existing CO-175 rolling cohort remains separate: `co-175-apr-14-march-14-tasks-1164-1195`, `221` rows, `last_review=2026-03-14`, and `overdue_days=4` inside the seven-day rolling window.

## Representative Sample Paths
- `.agent/task/1251-coordinator-symphony-aligned-doctor-cli-shell-extraction.md`
- `.agent/task/1288-coordinator-symphony-aligned-start-cli-boundary-reassessment-revisit.md`
- `tasks/specs/1251-coordinator-symphony-aligned-doctor-cli-shell-extraction.md`
- `tasks/tasks-1288-coordinator-symphony-aligned-start-cli-boundary-reassessment-revisit.md`
- `docs/findings/1251-doctor-cli-shell-extraction-deliberation.md`
- `docs/PRD-coordinator-symphony-aligned-doctor-cli-remaining-boundary-freeze-reassessment.md`
- `docs/TECH_SPEC-coordinator-symphony-aligned-start-cli-boundary-reassessment-revisit.md`
- `docs/ACTION_PLAN-coordinator-symphony-aligned-start-cli-boundary-reassessment-revisit.md`

## Decision
Outcome: refresh the `263` Apr 17 blocking stale historical rows in `docs/docs-freshness-registry.json` to `last_review=2026-04-17`.

Rationale:

- Rolling deferral is not available without exceeding policy capacity. CO-175 already owns `221` rolling entries; treating the Apr 17 rows as another rolling set would create `484` candidate rows and `8` candidate cohorts against caps of `300` rows and `2` cohorts.
- Reclassification is not appropriate because the catalog classes match the documents: Task Packet, Task Mirror, and Report Only.
- Archiving the whole set is broader than this baseline owner lane: the rows are historical packet/mirror/report records, and this issue is about restoring the Apr 17 validation baseline rather than changing archive eligibility or retention policy.
- Refreshing after this explicit review restores the baseline while keeping public/active docs fail-closed and leaving CO-175 provenance intact.

## CO-175 Preservation
The CO-175 cohort remains:

- owner issue: `CO-175`
- cohort id: `co-175-apr-14-march-14-tasks-1164-1195`
- rolling entries: `221`
- row cap: `300`
- cohort cap: `2`
- window: `7` days

This CO-209 refresh does not change CO-175 owner, cap, window, eligible classes, or baseline cohort.
