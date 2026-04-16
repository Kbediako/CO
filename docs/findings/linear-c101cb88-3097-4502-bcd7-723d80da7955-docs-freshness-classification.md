# CO-201 Apr 16 Docs Freshness Classification

## Source Artifacts
- Command: `node scripts/spec-guard.mjs`
- Preserved spec-guard log: `out/linear-c101cb88-3097-4502-bcd7-723d80da7955/before/spec-guard.log`
- Command: `npm run docs:freshness`
- Preserved freshness report: `out/linear-c101cb88-3097-4502-bcd7-723d80da7955/before/docs-freshness.json`
- Command: `BASE_SHA=origin/main npm run docs:freshness:maintain`
- Preserved maintenance report: `out/linear-c101cb88-3097-4502-bcd7-723d80da7955/before/docs-freshness-maintenance.json`
- Baseline ref: `origin/main` at `79cb4a193d99b08f989f5e9b51ebe79edaca8b0a`

## Gate Result Before Fix
- `spec-guard`: failed on `tasks/specs/1220-coordinator-symphony-aligned-standalone-review-run-review-orchestration-boundary-reassessment.md` because `last_review=2026-03-16` is 31 days old.
- `docs:freshness`: failed with `192` blocking stale rows and `221` CO-175 rolling rows.
- `docs:freshness:maintain`: failed with `freshness_decision=block_diff_local`; candidate policy capacity was over budget with `413` candidate rows and `10` candidate cohorts against `max_entries=300` and `max_cohorts=2`.

## Owner And Status
All `192` blocking stale rows are:

- owner: `Codex (top-level agent), Review agent`
- registry status: `active`
- historical packet classes only: Task Packet, Task Mirror, Report Only

No Front Door, Public Guide, Repository Guide, Agent Policy, Active Guide, shipped skill, shipped companion, seeded template, missing registry, missing-on-disk, invalid registry, or uncatalogued row is part of the blocking set.

## Class Breakdown
| Class | Count | Outcome |
| --- | ---: | --- |
| Task Packet | 137 | Refresh after this review |
| Task Mirror | 27 | Refresh after this review |
| Report Only | 28 | Refresh after this review |

## Path Family Breakdown
| Path family | Count | Outcome |
| --- | ---: | --- |
| `.agent/task` | 27 | Refresh |
| `docs/ACTION_PLAN-*` | 28 | Refresh |
| `docs/findings` | 28 | Refresh |
| `docs/PRD-*` | 28 | Refresh |
| `docs/TECH_SPEC-*` | 28 | Refresh |
| `tasks/specs` | 26 | Refresh |
| `tasks/tasks-*` | 27 | Refresh |

## Date Cohorts
| Last review / cadence | Count | Notes |
| --- | ---: | --- |
| `2026-01-15` / `90` days | 2 | Follow-up quick-wins mirror and task checklist for `0952` |
| `2026-03-16` / `30` days | 190 | March 16 standalone-review/delegation/control/RLM/doctor/shared-MCP/devtools/flow/setup packet surfaces |

## Lineage
- Parsed task-number set: `0952`, then `1220` through `1250` with gaps where a local task/spec/mirror surface is not present in the stale report.
- Numbered stale task surfaces: `0952`, `1220`-`1228`, `1230`-`1242`, `1245`-`1246`, `1247`-`1250`.
- PRD / TECH_SPEC / ACTION_PLAN rows are represented by slug paths instead of the leading task-number token in the report.

## Representative Sample Paths
- `.agent/task/0952-delegation-rlm-quick-wins-followup.md`
- `tasks/tasks-0952-delegation-rlm-quick-wins-followup.md`
- `.agent/task/1220-coordinator-symphony-aligned-standalone-review-run-review-orchestration-boundary-reassessment.md`
- `docs/findings/1220-standalone-review-run-review-orchestration-boundary-reassessment-deliberation.md`
- `tasks/specs/1220-coordinator-symphony-aligned-standalone-review-run-review-orchestration-boundary-reassessment.md`
- `tasks/tasks-1220-coordinator-symphony-aligned-standalone-review-run-review-orchestration-boundary-reassessment.md`
- `docs/PRD-coordinator-symphony-aligned-standalone-review-run-review-orchestration-boundary-reassessment.md`
- `docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-run-review-orchestration-boundary-reassessment.md`
- `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-run-review-orchestration-boundary-reassessment.md`

## Decision
Outcome: refresh the `192` blocking stale historical rows in `docs/docs-freshness-registry.json` to `last_review=2026-04-16`.

Rationale:

- Rolling deferral is not available without exceeding policy capacity. CO-175 already owns `221` rolling entries; treating the Apr 16 rows as another rolling set would create `413` candidate rows and `10` candidate cohorts against caps of `300` rows and `2` cohorts.
- Reclassification is not appropriate because the catalog classes match the documents.
- Archiving the whole set is broader than this baseline owner lane: the rows are historical packet/mirror/report records, and this issue is about restoring the Apr 16 validation baseline rather than changing archive eligibility or retention policy.
- Refreshing after this explicit review restores the baseline while keeping public/active docs fail-closed and leaving CO-175 provenance intact.

## CO-175 Preservation
The CO-175 cohort remains:

- owner issue: `CO-175`
- cohort id: `co-175-apr-14-march-14-tasks-1164-1195`
- rolling entries: `221`
- row cap: `300`
- cohort cap: `2`
- window: `7` days

This CO-201 refresh does not change CO-175 owner, cap, window, eligible classes, or baseline cohort.
