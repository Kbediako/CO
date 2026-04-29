# ACTION_PLAN - CO-422 refresh Mar 29 active spec-guard cohort

## Summary
- Goal: clear the current-main Mar 29 active-spec `spec-guard` blocker for completed CO-14, CO-30, and CO-34 lanes.
- Scope: docs-first packet, task spec status, task index status, docs freshness registry status, validation, review, PR handoff, and CO-409 / PR #719 blocker-note follow-through.
- Assumptions:
  - live Linear `Done` state is authoritative for completed-lane classification
  - `spec-guard` should continue failing active stale specs
  - archive-status registry rows are the supported way to keep historical implementation docs out of active freshness blocking

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `spec-guard`
  - `active spec`
  - `last_review`
  - `2026-03-29`
  - `CO-14`
  - `CO-30`
  - `CO-34`
  - `PR #719`
  - `Core Lane`
  - `tasks/specs`
  - `docs/docs-freshness-registry.json`
  - `tasks/index.json`
  - `spec-guard:active-spec-last-review:2026-03-29`
- Not done if:
  - `node scripts/spec-guard.mjs` still fails on the three Mar 29 task specs
  - task spec status, `tasks/index.json`, and registry status disagree
  - this becomes a date-only bump, policy weakening, or historical doc deletion
  - CO-409 is still blocked by the same Core Lane failure after this owner lands
- Pre-implementation issue-quality review:
  - 2026-04-29: current-main `node scripts/spec-guard.mjs` reproduced the exact three-file failure.
  - 2026-04-29: live Linear reads confirmed CO-14, CO-30, and CO-34 are terminal `Done`.
- Fallback / refactor decision: Not applicable; this lane does not add, retain, or touch fallback/seam behavior.
- Durable retention evidence: Not applicable.
- Large-refactor check: Not applicable; this is a narrow metadata lifecycle reconciliation.

## Milestones & Sequencing
1. Create the CO-422 docs-first packet and task registration mirrors.
2. Reproduce the current-main `spec-guard` failure and capture the three failing files.
3. Audit live Linear state for CO-14, CO-30, and CO-34.
4. Update the three task specs, `tasks/index.json`, and the exact Mar 29 registry rows.
5. Run focused validation: JSON parse, `spec-guard`, and docs freshness.
6. Run standalone review and elegance/minimality pass.
7. Open or update PR, attach it to CO-422, run ready-review drain, and hand off to `In Review` only after checks are green.
8. Update CO-409 / PR #719 blocker notes after the gate is demonstrably clear.

## Dependencies
- Linear issue CO-422.
- Source blocker CO-409 / PR #719 Core Lane.
- `scripts/spec-guard.mjs`.
- `scripts/docs-freshness.mjs`.
- `tasks/index.json`.
- `docs/docs-freshness-registry.json`.

## Validation
- Checks / tests:
  - `node scripts/spec-guard.mjs`
  - JSON parse for `tasks/index.json` and `docs/docs-freshness-registry.json`
  - `npm run docs:freshness`
  - repo validation floor appropriate for a metadata-only docs diff
  - manifest-backed standalone review
  - explicit elegance review
- Rollback plan:
  - revert only the CO-422 packet and completed-lane metadata changes if validation proves any source issue is not terminal or the registry classification is wrong

## Risks & Mitigations
- Risk: accidentally widening into the Mar 28 rolling freshness cohort.
  - Mitigation: update only the Mar 29 stale rows and leave CO-420 / Mar 28 cohort metadata unchanged.
- Risk: hiding stale specs by changing dates.
  - Mitigation: do not bump `last_review` on the completed source specs; use inactive spec status with review notes.
- Risk: historical docs are deleted or prematurely stubbed.
  - Mitigation: preserve all files and use registry status only.

## Approvals
- Provider-worker issue-quality review: 2026-04-29.
- Standalone review: pending final diff.
