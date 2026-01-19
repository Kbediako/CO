# Specs and Research SOP

## Added by Bootstrap 2025-10-16

### SPEC-FIRST REQUIREMENT (Always)
- Before any repo edits (code, scripts, config, or docs), create or refresh the relevant implementation docs.
- Required docs for every task:
  - PRD (intent, user needs, success criteria) — `docs/PRD-<slug>.md`
  - TECH_SPEC (technical requirements) — `tasks/specs/<id>-<slug>.md`
  - ACTION_PLAN (sequence + milestones) — `docs/ACTION_PLAN-<slug>.md`
  - Task checklist with validation — `tasks/tasks-<id>-<slug>.md` + mirrors
- Capture the user request translation in the PRD so intent survives context compaction.
- Update PRD/TECH_SPEC/ACTION_PLAN as new constraints or scope changes are discovered during implementation.

### WHEN TO DEEPEN DETAIL (Docs are still required)
- Cross-service or multi-module change.
- Database or schema migration, backfill, or data transform.
- Security, permissions, secrets, or PII handling update.
- External API integration or contract change.
- Performance or SLO risk including indexes, caching, or fan-out.
- Novel or first-time pattern introduced into the codebase.
- Note: legacy docs may mention “mini-spec”; treat that as the TECH_SPEC.

### DOCS-FIRST REQUIREMENT (Added 2026-01-18)
- For any task, PRD/TECH_SPEC/ACTION_PLAN are required before edits (depth scales with scope).
- If docs are missing or stale, STOP and request approval before touching files.

### PROCESS HOOKS
- Phase A (PRD): capture user intent, success criteria, and constraints; link the TECH_SPEC and ACTION_PLAN.
- Phase B (Tasks): first subtask is "Write/Update PRD + TECH_SPEC + ACTION_PLAN + tasks checklist and obtain approval."
- Processing: if a subtask touches `src/**` or `migrations/**` and any required doc is missing or stale, STOP and request "APPROVE SPECS" before coding.

### STALENESS RULE
Ensure every significant spec has `last_review` ≤ 30 days; refresh or re-approve stale specs before executing related work.

### APPROVAL LOGGING & MODE POLICY — Added 2025-10-16
- Record the execution mode (`mcp` vs `cloud`) and approval rationale inside the run manifest before implementation begins.
- Safe approval profile (`read/edit/run/network`) is mandatory; escalations require reviewer/human acknowledgement captured under `approvals` in the manifest.
- Run `node scripts/spec-guard.mjs --dry-run` prior to code changes touching `src/**` or migrations; a failure means halt work, update the relevant spec, and capture the refreshed `last_review` date.

## Added by Governance 2025-10-16
- G1 — Pre-implementation approval must be recorded in `tasks/index.json` under the task’s `gate` metadata (phase/status/log/run_id). For standalone reviews without a manifest, set `gate.log` to the spec/task notes; for docs-review/implementation runs, set `gate.run_id` to the manifest run ID.
- G2 — Update `tasks/index.json` gate metadata after each approval so task owners can verify evidence (notes or manifest) without opening every artifact.
- G3 — Spec authors reference the gate log link above; do not progress to implementation while any related `gate.status` remains `pending`.
- Logging: record approvals in the task PRD (`docs/PRD-<slug>.md` under Approvals) and capture follow-up notes inside the task checklist under Relevant Files. If a shared governance log exists, link it from the PRD.
