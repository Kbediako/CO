# Deploy SOP

## Added by Bootstrap 2025-10-16

1. Confirm PRD (`docs/PRD-<slug>.md`), TECH_SPEC (`tasks/specs/<id>-<slug>.md`), ACTION_PLAN (`docs/ACTION_PLAN-<slug>.md`), and the task checklist (`tasks/tasks-<id>-<slug>.md`) are up to date.
2. Verify automated tests and spec guard pass in CI.
3. Announce deployment window and assigned operator in `/tasks` or the runbook.
4. Execute rollout using the documented toolchain with monitoring enabled.
5. Record status, follow-up actions, and links to logs in `/tasks`.
