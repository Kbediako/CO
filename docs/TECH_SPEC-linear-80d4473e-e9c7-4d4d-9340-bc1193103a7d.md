# TECH_SPEC Mirror - CO: route docs-freshness owner reuse by canonical cohort without broadening CO-320

Canonical spec: `tasks/specs/linear-80d4473e-e9c7-4d4d-9340-bc1193103a7d.md`

## Summary
- `docs:freshness:maintain` must stop relying on a single global `policies.rolling_freshness_cohorts.owner_issue` value as the live owner for every stale candidate cohort.
- `CO-320` may be surfaced only for the exact stamped canonical owner key `docs_freshness_candidate|doc_class:task_packet|path_family:tasks/tasks-*|last_review:2026-03-23|cadence_days:30`.
- Terminal owner metadata such as `CO-300` remains evidence only and cannot become the live owner path.

## Contract
- Do not repoint `docs/docs-catalog.json` `policies.rolling_freshness_cohorts.owner_issue` to `CO-320`.
- Route live stamped owner reuse by exact `canonical_owner_key`.
- Preserve duplicate prevention so future lanes reuse the exact stamped live owner instead of creating another owner issue for the same cohort.
- Keep unrelated Jan 22 and adjacent Mar 23 candidate cohorts from inheriting `CO-320`.

## Validation Targets
- A focused maintenance-output regression should prove the exact Mar 23 `tasks/tasks-*` canonical key resolves to `CO-320`.
- A negative regression should prove unrelated candidate cohorts do not report `owner_issue=CO-320`.
- A terminal-owner regression should prove `CO-300` is evidence only and does not clear the live owner path.
