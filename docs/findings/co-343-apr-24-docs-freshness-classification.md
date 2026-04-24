# CO-343 Apr 24 Docs Freshness Classification

## Baseline Evidence
- Observed during CO-341 validation on 2026-04-24.
- `node scripts/spec-guard.mjs --dry-run` printed five stale active-spec failures while exiting zero.
- Non-dry-run `node scripts/spec-guard.mjs` exits non-zero on the same five specs.
- `npm run docs:freshness` reported 24 stale docs, with no missing registry rows, missing-on-disk rows, invalid entries, or uncatalogued docs.
- `npm run docs:freshness:maintain` reported terminal owner `CO-324` and required a new live owner path; `CO-343` is that owner.

## Reviewed Active Specs
- `tasks/specs/0909-orchestrator-run-reporting-consistency.md`
- `tasks/specs/0977-shipped-feature-adoption-guidance.md`
- `tasks/specs/1322-coordinator-live-linear-snapshot-only-retry-assignee-identity-fallback.md`
- `tasks/specs/linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514.md`
- `tasks/specs/linear-41f54a87-705b-467d-9e88-f49c6315f0dc.md`

## Reviewed Docs-Freshness Rows
- `linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514` packet and mirror rows: PRD, TECH_SPEC, ACTION_PLAN, task spec, task checklist, and `.agent` mirror.
- `1322-coordinator-live-linear-snapshot-only-retry-assignee-identity-fallback` packet and mirror rows: PRD, TECH_SPEC, ACTION_PLAN, task spec, task checklist, and `.agent` mirror.
- `linear-41f54a87-705b-467d-9e88-f49c6315f0dc` packet and mirror rows: PRD, TECH_SPEC, ACTION_PLAN, task spec, task checklist, and `.agent` mirror.
- `0956-subagents-skill-codex-cli-refresh` packet and mirror rows: PRD, TECH_SPEC, ACTION_PLAN, task spec, task checklist, and `.agent` mirror.

## Disposition
- The five stale active specs remain valid active historical/operator surfaces. Refresh their frontmatter `last_review` to `2026-04-24`.
- The 24 docs-freshness rows remain valid active packet/mirror surfaces. Refresh registry `last_review` to `2026-04-24`.
- `CO-343` becomes the live owner for the Apr 24 maintenance pass. `CO-324` remains terminal historical evidence and is not reused.
- CO-341 records the observed dry-run failures as a blocker that CO-343 resolved, not as a clean spec-guard pass.

## Non-Goals Confirmed
- No rolling freshness window/cap expansion.
- No archive/reclassification because the rows remain active evidence surfaces.
- No CO-341 posture implementation change.
- No change to `spec-guard --dry-run` exit semantics.
