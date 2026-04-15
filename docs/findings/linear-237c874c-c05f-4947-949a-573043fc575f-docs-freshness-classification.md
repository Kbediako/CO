# CO-184 Apr 15 Docs Freshness Classification

## Source Artifact
- Command: `npm run docs:freshness`
- Preserved pre-fix report: `out/linear-237c874c-c05f-4947-949a-573043fc575f/pre-fix-docs-freshness.json`
- Generated at: `2026-04-15T00:24:08.897Z`
- Note: the initial live reproduction at `2026-04-15T00:10:17.410Z` reported the same `173` stale rows and `221` rolling rows before the CO-184 packet files were added; the preserved report reruns the pre-fix registry snapshot against the current CO-184 packet-aware tree so the mutable post-fix report path can remain the passing closeout artifact.

## Gate Result Before Fix
- Docs scanned: `3861`
- Registry entries: `3864`
- Blocking stale entries: `173`
- Rolling freshness cohort entries: `221`
- Missing registry rows: `0`
- Missing-on-disk rows: `0`
- Invalid registry entries: `0`
- Uncatalogued docs: `0`

## Owner And Status
All `173` blocking stale rows are:

- owner: `Codex (top-level agent), Review agent`
- registry status: `active`
- eligible historical packet classes only: Task Packet, Task Mirror, Report Only

No public guide, repository guide, agent policy, active guide, shipped skill, shipped companion, seeded template, missing, invalid, or uncatalogued row is part of this blocking set.

## Class Breakdown

| Class | Count | Outcome |
| --- | ---: | --- |
| Task Packet | 124 | Refresh after this review |
| Task Mirror | 25 | Refresh after this review |
| Report Only | 24 | Refresh after this review |

## Path Family Breakdown

| Path family | Count | Outcome |
| --- | ---: | --- |
| `.agent/task` | 25 | Refresh |
| `docs/ACTION_PLAN-*` | 25 | Refresh |
| `docs/findings` | 24 | Refresh |
| `docs/PRD-*` | 25 | Refresh |
| `docs/TECH_SPEC-*` | 25 | Refresh |
| `tasks/specs` | 24 | Refresh |
| `tasks/tasks-*` | 25 | Refresh |

## Date Cohorts

| Last review / cadence | Count | Notes |
| --- | ---: | --- |
| `2026-01-14` / `90` days | 5 | January quick-wins packet surface, including `.agent/task/0951-delegation-rlm-quick-wins.md` and its task mirror |
| `2026-03-15` / `30` days | 168 | March 15 task/report packet cohort beginning at `1196` |

## Lineage
- Parsed task-number range: `0951`, then `1196` through `1219`
- Parsed task count: `25`
- Additional unparsed task-packet rows: `75` PRD / TECH_SPEC / ACTION_PLAN rows for the March 15 cohort, whose task number is represented in the slug rather than the leading filename token

## Representative Sample Paths
- `.agent/task/0951-delegation-rlm-quick-wins.md`
- `tasks/tasks-0951-delegation-rlm-quick-wins.md`
- `.agent/task/1196-coordinator-symphony-aligned-orchestrator-status-shell-extraction.md`
- `docs/findings/1196-orchestrator-status-shell-extraction-deliberation.md`
- `tasks/specs/1196-coordinator-symphony-aligned-orchestrator-status-shell-extraction.md`
- `tasks/tasks-1196-coordinator-symphony-aligned-orchestrator-status-shell-extraction.md`
- `docs/PRD-coordinator-symphony-aligned-orchestrator-status-shell-extraction.md`
- `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-status-shell-extraction.md`
- `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-status-shell-extraction.md`

## Decision
Outcome: refresh the `173` blocking stale historical rows in `docs/docs-freshness-registry.json` to `last_review=2026-04-15`.

Rationale:

- Rolling deferral is not available without exceeding policy capacity: CO-175 already owns `221` rolling entries and the cap is `max_entries=300`; adding this `173` row set would total `394`.
- Archiving the whole packet set is broader than necessary for this issue and would make nearby March 15 extraction/review traceability harder to audit.
- Reclassification is not appropriate because the catalog classes match the documents.
- Refreshing after this explicit review restores the baseline while keeping public/active docs fail-closed and leaving CO-175 provenance intact.

## CO-175 Preservation
The CO-175 cohort remains:

- owner issue: `CO-175`
- cohort id: `co-175-apr-14-march-14-tasks-1164-1195`
- rolling entries: `221`
- row cap: `300`
- window: `7` days

This CO-184 refresh does not change CO-175 owner, cap, window, eligible classes, or baseline cohort.
