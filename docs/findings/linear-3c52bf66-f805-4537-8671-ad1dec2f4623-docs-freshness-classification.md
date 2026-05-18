# CO-324 Docs Freshness Classification

## Baseline Evidence
- Task id: `linear-3c52bf66-f805-4537-8671-ad1dec2f4623`
- Baseline `docs:freshness`: `out/linear-3c52bf66-f805-4537-8671-ad1dec2f4623/docs-freshness-baseline.json`
- Baseline `docs:freshness:maintain`: `out/linear-3c52bf66-f805-4537-8671-ad1dec2f4623/docs-freshness-maintenance-baseline.json`
- Child baseline manifest: `.runs/linear-3c52bf66-f805-4537-8671-ad1dec2f4623-freshness-baseline/cli/2026-04-23T03-37-54-576Z-8c07866a/manifest.json`

The current-main parent baseline reproduced the issue blocker:

- `freshness_decision=block_unowned_repo_debt`
- `owner_issue=CO-300`
- `owner_issue_action.mode=create_required`
- `reason=configured_owner_terminal`
- `issue_state=Done`
- `issue_state_type=completed`
- `is_terminal=true`
- `usable=false`
- `blocking_changed_paths=[]`

## Reviewed Rows
The parent baseline reported 31 stale rows:

- 27 eligible historical task/report rows from:
  - `0955` collab orchestrator integration (`.agent/task`, task packet docs, `tasks/specs`, `tasks/tasks-*`, and `docs/findings/0955-collab-evals-2026-01-22.md`)
  - `1319` through `1321` adjacent task packet/mirror rows
  - `linear-856c1318-524f-4db3-8d4a-b357ec51c304` adjacent task packet/mirror rows
- 4 hard-stale Active Guide/reference rows:
  - `docs/guides/collab-vs-mcp.md`
  - `docs/guides/evaluation-playbook.md`
  - `docs/reference/metrics-collab-context-rot.md`
  - `docs/release-notes-template-addendum.md`

## Disposition
- `CO-324` becomes the live same-project owner for canonical key `docs:freshness:maintain`.
- `CO-300` remains historical terminal-owner evidence and is not reused.
- The 27 historical task/report rows remain valid historical planning and evidence surfaces; they are refreshed to `last_review=2026-04-23` after this review rather than moved into rolling deferral.
- The 4 hard-stale guide/reference rows remain accurate for current CO behavior after spot review against the current instructions and CLI policy; they are refreshed to `last_review=2026-04-23` and are not treated as rolling debt.
- No `CO-321` packet or `tasks/specs` cohort is modified.

## Non-Goals Confirmed
- No `docs:freshness` or `docs:freshness:maintain` policy weakening.
- No increase to rolling window, `max_entries`, `max_cohorts`, or eligible classes.
- No archive/reclassification for rows that still serve as active historical or operator-facing references.
