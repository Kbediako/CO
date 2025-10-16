# Agent Enablement

## Added by Bootstrap 2025-10-16

### Overview
- Languages: confirm the active stacks before committing changes (common defaults include TypeScript/JavaScript, Python, and SQL).
- Package managers: expect `npm` or `yarn` for JS apps and `pip` for Python utilities; verify per-service.
- Build targets: support `dev`, `prod`, and `ci` workflows via service-specific scripts documented in `/tasks` once established.
- Tests: maintain coverage across unit, integration, and e2e layers; align with the active `/tasks/tasks-*.md` checklist before merging.
- Deployment: coordinate through the deployment SOPs under `.agent/SOPs/` once environments are defined.

### Execution Modes & Approvals
- Default run mode is `mcp`; switch to cloud only when the canonical task list flags `execution.parallel=true` and the reviewer records the override in the run manifest.
- Honor the safe `read/edit/run/network` approval profile. Capture escalations in the manifest `approvals` array with reviewer justification and timestamp.
- Run `bash scripts/spec-guard.sh --dry-run` prior to requesting review; a failing guard requires refreshing relevant specs (see `.agent/SOPs/specs-and-research.md`).

### Build & Test Quick Reference
- `npm run lint` — Executes `npm run build:patterns` before linting orchestrator, adapter, and evaluation sources.
- `npm run test` — Complete Vitest suite (manager, agents, persistence, adapters).
- `npm run eval:test` — Exercises evaluation harness scenarios; depends on local `python3` for cross-language fixtures.
- `npm run build:patterns` — Compile codemods/linters/templates; run whenever `patterns/**` changes.
- `node --loader ts-node/esm evaluation/harness/run-all.ts --mode=mcp` — Manual sweep to generate scenario artifacts for manifests.

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
