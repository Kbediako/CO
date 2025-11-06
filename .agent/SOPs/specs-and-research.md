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

### APPROVAL LOGGING & MODE POLICY — Added 2025-10-16
- Record the execution mode (`mcp` vs `cloud`) and approval rationale inside the run manifest before implementation begins.
- Safe approval profile (`read/edit/run/network`) is mandatory; escalations require reviewer/human acknowledgement captured under `approvals` in the manifest.
- Run `node scripts/spec-guard.mjs --dry-run` prior to code changes touching `src/**` or migrations; a failure means halt work, update the relevant spec, and capture the refreshed `last_review` date.

## Added by Governance 2025-10-16
- G1 — PRD approval must be recorded in `tasks/0001-prd-codex-orchestrator.md#approval-log-2025-10-16` with a safe approval mode run ID before downstream work starts.
- G2 — Update `tasks/index.json` gate metadata after each approval so task owners can verify status and log anchors without opening every artifact.
- G3 — Spec authors reference the gate log link above; do not progress to implementation while any related `gate.status` remains `pending`.
- Logging: mirror the canonical approval log in `docs/PRD.md#governance-update-2025-10-16` and capture follow-up notes inside the task list under Relevant Files.
