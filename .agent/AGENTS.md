# Agent Enablement

## Added by Bootstrap 2025-10-16

### Overview
- Languages: confirm the active stacks before committing changes (common defaults include TypeScript/JavaScript, Python, and SQL).
- Package managers: expect `npm` or `yarn` for JS apps and `pip` for Python utilities; verify per-service.
- Build targets: support `dev`, `prod`, and `ci` workflows via service-specific scripts documented in `/tasks` once established.
- Tests: maintain coverage across unit, integration, and e2e layers; align with the active `/tasks/tasks-*.md` checklist before merging.
- Deployment: coordinate through the deployment SOPs under `.agent/SOPs/` once environments are defined.

### Read First Order
1. `.agent/system/architecture.md`
2. `.agent/system/services.md`
3. `.agent/system/api-surface.md`
4. `.agent/system/conventions.md`
5. `.agent/system/database.md`
6. `.agent/SOPs/specs-and-research.md`
7. `.agent/SOPs/db-migration.md`

### Workflow Pointers
- Always start by reviewing the relevant PRD in `/tasks` and its mirrored snapshot in `/docs`.
- Use templates in `.agent/task/templates/` to draft PRDs, task lists, mini-specs, and research notes.
- Run `scripts/spec-guard.sh` before opening reviews to ensure specs stay in sync with code changes.

### Database Safety Safeguards
- Treat production data as immutable; require read-only replicas or sanitized fixtures for testing.
- Follow `.agent/SOPs/db-migration.md` for expand/contract rollouts with backups and verification gates.
- Gate schema changes behind peer review plus sign-off recorded in `/tasks` manifests.
