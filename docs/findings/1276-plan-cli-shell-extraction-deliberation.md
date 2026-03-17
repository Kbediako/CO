# Findings: 1276 Plan CLI Shell Extraction Deliberation

- Candidate seam: `handlePlan(...)` in `bin/codex-orchestrator.ts`.
- Reason to proceed: unlike `1275`'s residual `status` pocket, `plan` still owns an inline `orchestrator.plan(...)` call plus JSON/text output emission and `formatPlanPreview(...)` rendering.
- Expected helper boundary: binary keeps parse/help/repo-policy/task-stage resolution, extracted helper owns the bounded plan handoff and output emission.
