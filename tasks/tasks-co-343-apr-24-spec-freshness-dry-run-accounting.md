# Task Checklist - CO-343 Apr 24 Spec Freshness and Dry-Run Accounting

- Linear Issue: `CO-343`
- MCP Task ID: `co-343-apr-24-spec-freshness-dry-run-accounting`
- Primary PRD: `docs/PRD-co-343-apr-24-spec-freshness-dry-run-accounting.md`
- TECH_SPEC: `docs/TECH_SPEC-co-343-apr-24-spec-freshness-dry-run-accounting.md`
- Task spec: `tasks/specs/co-343-apr-24-spec-freshness-dry-run-accounting.md`
- ACTION_PLAN: `docs/ACTION_PLAN-co-343-apr-24-spec-freshness-dry-run-accounting.md`

## Checklist
- [x] Linear issue created as live owner for the Apr 24 freshness blocker. Evidence: `CO-343`.
- [x] Docs-first packet created and registered. Evidence: PRD, TECH_SPEC, ACTION_PLAN, task spec, checklist, `.agent` mirror, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- [x] Stale active specs reproduced and classified. Evidence: `docs/findings/co-343-apr-24-docs-freshness-classification.md`.
- [x] Reviewed stale specs and docs-freshness rows refreshed. Evidence: exact paths listed in the finding.
- [x] `node scripts/spec-guard.mjs`. Evidence: passed with `Spec guard: OK` after refreshing the five active specs.
- [x] `MCP_RUNNER_TASK_ID=linear-4a684a5e-64b0-47fb-835a-d792eba29071 npm run docs:freshness`. Evidence: passed with `4600` docs and `4603` registry entries.
- [x] `MCP_RUNNER_TASK_ID=linear-4a684a5e-64b0-47fb-835a-d792eba29071 npm run docs:freshness:maintain`. Evidence: passed with decision `clean`, owner issue `CO-343`, and `blocking changed paths: 0`.
- [x] CO-341 checklist corrected to avoid counting the failing dry-run output as clean validation evidence. Evidence: `tasks/tasks-linear-4a684a5e-64b0-47fb-835a-d792eba29071.md`.
- [ ] Linear closeout comment added and issue moved to Done. Evidence: pending.
