# Action Plan — Codex Orchestrator Wrapper

## Status Snapshot
- **Canonical sources:** `docs/PRD.md`, `docs/TECH_SPEC.md`, `/tasks/<task-id>-<slug>.md`, `.agent/task/<task-id>-<slug>.md` for each onboarded project.
- **Run evidence:** `.runs/<task-id>/cli/<timestamp>/manifest.json` with metrics in `.runs/<task-id>/metrics.json`; attach the exact manifest path when updating checklists.
- **Open follow-up:**
  - Confirm every downstream project maps to a task id and `packages/<project>` (or agreed alt) directory.
  - Review guardrail coverage across projects; extend pipelines if team-specific checks are missing.

## Milestone Outline

### Milestone M1 — Wrapper Scaffolding
- Objective: Stand up the shared orchestrator wrapper and document how multiple projects plug into it.
- Tasks:
  1. Docs — Refresh PRD/Spec/Action Plan templates with multi-project guidance; Acceptance: reviewers see manifest placeholders for each project and linked evidence; Risks: stale template fragments.
  2. Ops — Align `/tasks`, `.agent/`, and `docs/TASKS.md` checklist conventions on mirroring status with manifest links per project; Risks: out-of-sync checklists.

### Milestone M2 — Project Onboarding
- Objective: Wire the orchestrator to downstream codebases and establish per-project pipelines.
- Tasks:
  1. Dev — Configure `packages/<project>` scaffolding, ensure `MCP_RUNNER_TASK_ID` routes runs to `.runs/<task-id>/cli/`; Acceptance: first diagnostics manifest linked in project checklist; Risks: run data written to the wrong task directory.
  2. DevOps — Capture compatibility pointers, metrics, and state snapshots (`out/<task-id>/state.json`) for each project; Acceptance: manifests and metrics paths referenced in docs; Risks: missing guardrail evidence.

### Milestone M3 — Guardrails & Rollout
- Objective: Validate guardrails and hand off to reviewers with project-aware documentation.
- Tasks:
  1. QA — Execute `scripts/spec-guard.sh --dry-run`, `npm run lint`, `npm run test`, and any project-specific pipelines; Acceptance: manifests attached to checklist updates; Risks: pipeline drift between projects.
  2. Enablement — Update `.agent/AGENTS.md`, `docs/TASKS.md`, and project SOPs so reviewers can navigate manifests and approvals per project; Risks: missing manifest pointers in enablement docs.

## Next Review
- Schedule reviewer sync once the first downstream project records a passing diagnostics manifest and documentation links to `.runs/<task-id>/cli/<run-id>/manifest.json`.
