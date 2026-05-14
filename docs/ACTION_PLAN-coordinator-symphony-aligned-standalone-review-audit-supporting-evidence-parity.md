# ACTION_PLAN - Coordinator Symphony-Aligned Standalone Review Audit Supporting-Evidence Parity

## Phase 1 - Docs and registration

- Register `1095` across PRD / TECH_SPEC / ACTION_PLAN / task checklist / `.agent` mirror / `tasks/index.json` / `docs/TASKS.md` / docs freshness registry.
- Capture the current post-`1094` evidence that the next bounded review gap is audit supporting-evidence parity, not another `diff`-mode pass.

## Phase 2 - Bounded implementation

- Expand the audit-mode allowed meta-surface kinds to include `run-runner-log`.
- Keep the broader meta-surface guard unchanged for unrelated audit drift.
- Update operator docs to describe the explicit manifest + runner-log audit evidence boundary.

## Phase 3 - Validation and closeout

- Add focused audit regression coverage in `tests/run-review.spec.ts`.
- Run the standard validation lane plus pack-smoke.
- Re-run the live wrapper only as needed to confirm audit-mode evidence no longer conflicts with the guard, then resume the next authenticated-route Symphony seam.
