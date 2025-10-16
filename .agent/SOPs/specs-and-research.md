# Specs and Research SOP

## Added by Bootstrap 2025-10-16

### WHEN TO WRITE A MINI-SPEC
- Cross-service or multi-module change.
- Database or schema migration, backfill, or data transform.
- Security, permissions, secrets, or PII handling update.
- External API integration or contract change.
- Performance or SLO risk including indexes, caching, or fan-out.
- Novel or first-time pattern introduced into the codebase.

### PROCESS HOOKS
- Phase A (PRD): create a stub `tasks/specs/<id>-<slug>.md` when any trigger applies and link it from the PRD.
- Phase B (Tasks): for each parent task with a spec, add a first subtask "Write/Update mini-spec and obtain approval" before implementation work.
- Processing: if a subtask touches `src/**` or `migrations/**` and the required spec is missing or stale, STOP and request "APPROVE SPEC" before coding.

### STALENESS RULE
Ensure every significant spec has `last_review` ≤ 30 days; refresh or re-approve stale specs before executing related work.
