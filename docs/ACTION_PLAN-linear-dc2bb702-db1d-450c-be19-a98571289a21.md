# ACTION_PLAN - CO-428 own March 30 active-spec spec-guard baseline cohort

## Summary
- Goal: clear the current-main March 30 active-spec `spec-guard` blocker for twelve completed CO lanes.
- Scope: docs-first packet, task spec status, task index status, docs freshness registry status, validation, review, PR handoff, and CO-427 blocker-clear evidence.
- Assumptions:
  - live Linear `Done` state is authoritative for completed-lane classification
  - `spec-guard` should continue failing active stale specs
  - archive-status registry rows are the supported way to keep historical implementation docs out of active 30-day freshness blocking

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `spec-guard`
  - `node scripts/spec-guard.mjs`
  - `tasks/specs/*`
  - `last_review: 2026-03-30`
  - current-main baseline debt
  - GitHub `Core Lane`
  - PR #727
  - clean `origin/main` reproduction
  - `spec-guard:active-specs:last_review=2026-03-30`
- Not done if:
  - `node scripts/spec-guard.mjs` still fails on the March 30 cohort
  - the repair is a date-only bump or policy weakening
  - CO-427 or CO-330 metadata/behavior is changed
  - task spec status, `tasks/index.json`, and registry status disagree
- Pre-implementation issue-quality review:
  - 2026-04-30: current `origin/main` reproduction showed the issue is real and narrow.
  - 2026-04-30: live Linear reads confirmed all twelve source issues are terminal `Done`.
- Fallback / refactor decision: Not applicable; this lane does not add, retain, or touch fallback/seam behavior.
- Durable retention evidence: Not applicable.
- Large-refactor check: Not applicable; this is a narrow metadata lifecycle reconciliation.

## Milestones & Sequencing
1. Create the CO-428 docs-first packet and task registration mirrors.
2. Reproduce the current-main `spec-guard` failure and capture the twelve failing files.
3. Audit live Linear state for all twelve source issues.
4. Update task specs, `tasks/index.json`, and the exact March 30 registry rows.
5. Integrate the dependent CO-429 six-row CO-41 registry residue repair and CO-430 live `docs:freshness:maintain` owner re-home into the CO-428-led branch.
6. Run focused validation: JSON parse, `spec-guard`, docs freshness, and docs freshness maintenance owner verification.
7. Run standalone review and elegance/minimality pass.
8. Open or update PR, attach it to CO-428, run ready-review drain, and hand off to `In Review` only after checks are green.
9. Keep CO-427 blocker notes truthful after this gate is demonstrably clear.

## Dependencies
- Linear issue CO-428.
- Source blocker CO-427 / PR #727 Core Lane.
- Dependent owner lanes CO-429 and CO-430, integrated only for their metadata repairs.
- `scripts/spec-guard.mjs`.
- `scripts/docs-freshness.mjs`.
- `tasks/index.json`.
- `docs/docs-freshness-registry.json`.

## Validation
- Checks / tests:
  - `node scripts/spec-guard.mjs`
  - JSON parse for `tasks/index.json` and `docs/docs-freshness-registry.json`
  - `npm run docs:freshness`
  - `npm run docs:freshness:maintain -- --format json`
  - repo validation floor appropriate for a metadata-only docs diff
  - manifest-backed standalone review
  - explicit elegance review
- Rollback plan:
  - revert only the CO-428 packet and completed-lane metadata changes if validation proves any source issue is not terminal or the registry classification is wrong

## Risks & Mitigations
- Risk: accidentally widening into CO-427 docs-freshness owner work.
  - Mitigation: update only the listed March 30 source spec/docs rows and keep CO-427 metadata untouched.
- Risk: hiding stale specs by changing dates.
  - Mitigation: reclassify completed source lanes inactive with explicit Linear evidence.
- Risk: historical docs are deleted or prematurely stubbed.
  - Mitigation: preserve all files and use registry status only.

## Approvals
- Provider-worker issue-quality review: 2026-04-30.
- Standalone review: 2026-04-30 bounded-success telemetry at `.runs/linear-dc2bb702-db1d-450c-be19-a98571289a21/cli/2026-04-30T02-32-01-176Z-5bcaed8b/review/telemetry.json`; explicit elegance pass at `out/linear-dc2bb702-db1d-450c-be19-a98571289a21/manual/elegance-review.md`.
