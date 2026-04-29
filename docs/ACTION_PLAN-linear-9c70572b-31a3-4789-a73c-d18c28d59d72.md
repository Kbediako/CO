# ACTION_PLAN - CO-425 re-home docs:freshness:maintain owner after terminal CO-423

## Summary
- Goal: re-home the `docs:freshness:maintain` rolling-freshness owner from terminal `CO-423` to live same-project issue `CO-425`.
- Scope: docs-first packet, `docs/docs-catalog.json`, `docs/guides/docs-freshness-cohorts.md`, task mirrors, and validation evidence.
- Assumptions:
  - CO-425 is the open, stamped owner for canonical owner key `docs:freshness:maintain`.
  - Terminal owner metadata must remain fail-closed evidence, not a usable live owner.
  - The retained March 28 cohort stays intact: `co-420-apr-28-march-28-task-packet-mirror`, 33 rows, 28 Task Packet and 5 Task Mirror, expires after `2026-05-04`.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `docs:freshness:maintain`
  - `docs:freshness`
  - `docs/docs-catalog.json`
  - `docs/guides/docs-freshness-cohorts.md`
  - `CO-423`
  - `configured_owner_terminal`
  - `co-420-apr-28-march-28-task-packet-mirror`
  - `blocking_changed_paths=[]`
  - `codex-orchestrator:canonical-owner-key=docs:freshness:maintain`
- Not done if:
  - `docs:freshness:maintain` still reports `configured_owner_terminal`
  - `owner_issue` remains terminal `CO-423`
  - retained cohort rows are deleted, hidden, reclassified, or blindly refreshed
  - freshness policy, caps, scripts, or registry validation are weakened
- Pre-implementation issue-quality review:
  - 2026-04-29: CO-425 is an owner re-home lane, not a stale-doc cleanup lane.
  - 2026-04-29: the micro-task path is unavailable because correctness depends on exact protected terms, exact surfaces, canonical owner marker compatibility, and retained fallback metadata.
  - 2026-04-29: parent owns the live reproduction, owner metadata mutation, validation, PR lifecycle, and Linear handoff.
- Fallback / refactor decision: retain the existing rolling cohort as an `expire fallback` under live owner `CO-425`; do not extend expiry or add a new fallback seam.

## Milestones & Sequencing
1. Read live Linear context and refresh the single workpad.
2. Record the required decomposition matrix and parallelization decision.
3. Reproduce `docs:freshness:maintain -- --format json` with terminal `CO-423`, `configured_owner_terminal`, and `blocking_changed_paths=[]`.
4. Update `docs/docs-catalog.json` owner metadata from `CO-423` to `CO-425`.
5. Update `docs/guides/docs-freshness-cohorts.md` to name `CO-425` as the current live owner while preserving terminal `CO-423` lineage.
6. Validate `npm run docs:freshness:maintain -- --format json` and `npm run docs:freshness`.
7. Refresh task packet, checklist, registry/task snapshots, and workpad with the actual validation evidence.
8. Run required repo gates, standalone review, elegance review, PR attach, and ready-review drain before `In Review`.

## Dependencies
- Linear issue `CO-425` / `9c70572b-31a3-4789-a73c-d18c28d59d72`.
- `docs:freshness`.
- `docs:freshness:maintain`.
- `docs/docs-catalog.json`.
- `docs/guides/docs-freshness-cohorts.md`.
- `tasks/index.json`.
- `docs/TASKS.md`.
- `docs/docs-freshness-registry.json`.

## Validation
- Required focused validation:
  - `npm run docs:freshness:maintain -- --format json`
  - `npm run docs:freshness`
- Required pre-review validation:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - manifest-backed standalone review
  - explicit elegance/minimality pass
- Rollback plan:
  - revert only the CO-425 owner metadata change in `docs/docs-catalog.json`, the matching cohort-guide section, and CO-425 packet evidence if validation proves the live owner is not usable.

## Risks & Mitigations
- Risk: terminal `CO-423` remains configured owner.
  - Mitigation: rerun `docs:freshness:maintain -- --format json` and require `owner_issue=CO-425`, `state_type=started`, and `pass_with_owned_rolling_debt`.
- Risk: row churn hides the March 28 cohort.
  - Mitigation: keep the existing cohort id, `last_review`, row count, class split, and expiry unchanged.
- Risk: duplicate owner issue.
  - Mitigation: reuse the current open, stamped issue `CO-425`.

## Approvals
- Docs-first packet worker: 2026-04-29
- Parent owner re-home / implementation approval: in progress
