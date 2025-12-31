# Action Plan — Docs Freshness Systemization (Task 0922)

## Status Snapshot
- Current Phase: Complete
- Run Manifest Link (pre-change): `.runs/0922-docs-freshness-systemization/cli/2025-12-31T00-42-33-187Z-aad19fd0/manifest.json`
- Run Manifest Link (post-change): `.runs/0922-docs-freshness-systemization/cli/2025-12-31T00-55-04-017Z-96c4de4c/manifest.json`
- Run Manifest Link (pre-implementation docs-review): `.runs/0922-docs-freshness-systemization/cli/2025-12-31T01-19-09-402Z-2a0217a3/manifest.json`
- Run Manifest Link (implementation-gate): `.runs/0922-docs-freshness-systemization/cli/2025-12-31T01-47-16-423Z-a744a2c1/manifest.json`
- Approvals / Escalations: record in `tasks/index.json`

## Evidence Notes
- `metrics.json` is NDJSON (one JSON object per line; parse line-by-line).
- `out/<task-id>/docs-freshness.json` stores the audit report output.
- Diff budget override applied for the registry baseline; recorded in the implementation-gate manifest.

## Milestones & Tasks
1. Planning + collateral
   - Draft PRD, tech spec, action plan, checklist, and mini-spec.
   - Update `tasks/index.json` and `docs/TASKS.md` mirrors.
   - Capture docs-review manifest (pre-change).
2. Registry + audit tooling
   - Add `docs/docs-freshness-registry.json` and seed initial coverage.
   - Implement `scripts/docs-freshness.mjs` + `npm run docs:freshness`.
   - Emit `out/<task-id>/docs-freshness.json` report.
3. Pipeline integration
   - Add `docs-freshness` stage to `docs-review` and `implementation-gate` pipelines.
   - Update agent docs and task checklists to reference the new audit.
4. Validation + handoff
   - Run implementation-gate and record manifest evidence.
   - Update mirrors and evidence paths.

## Risks & Mitigations
- Risk: Registry coverage is time-consuming to seed.
  - Mitigation: start with core doc roots and iterate by cadence; use warn-only mode in Phase 1.
- Risk: Freshness thresholds block legitimate work.
  - Mitigation: allow per-doc cadence overrides and `archived` status.

## Next Review
- Date: Not scheduled
- Agenda: confirm registry schema, audit thresholds, and pipeline placement.
