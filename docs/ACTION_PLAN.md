# Action Plan — Codex Orchestrator CLI Migration (Task 0101)

## Status Snapshot
- **Canonical sources:** `docs/PRD.md`, `docs/TECH_SPEC.md`, `/tasks/0101-prd-cli-migration.md`, `.agent/task/0101-cli-migration.md`
- **Run evidence:** `.runs/0101/cli/2025-10-31T13-09-10-303Z-ed11132f/manifest.json` (metrics in `.runs/0101/metrics.json`).
- **Open follow-up:**
  - Evaluate moving metrics summarization logic fully into the CLI package to eliminate script duplication.
  - Gather reviewer feedback on the new guardrail summary line and extend coverage if additional guardrail commands are introduced.

## Milestone Outline

### Milestone M1 — Planning & Scaffolding
- Objective: Establish task 0101 artifacts, choose pipeline defaults, and align stakeholders on scope.
- Tasks:
  1. Docs — Replace templates in PRD/Spec/Action Plan with task-specific content; Acceptance: reviewer sign-off on docs; Risks: doc drift.
  2. Ops — Update `/tasks`, `.agent/`, and `docs/TASKS.md` checklists; Acceptance: mirrored `[ ]` items; Risks: inconsistent status tracking.

### Milestone M2 — CLI Architecture & Implementation
- Objective: Deliver the new CLI with TaskManager integration, manifest persistence, and compatibility shims.
- Tasks:
  1. Dev — Implement `orchestrator/src/cli/**` modules, `bin/codex-orchestrator.ts`, and shims; Acceptance: unit/integration tests covering start/resume/status/plan plus manifest validation helper; Risks: regression in metrics pipeline.
  2. DevOps — Ensure `.runs/0101/cli/` artifacts, compatibility pointers, and task state snapshots are produced; Acceptance: metrics JSONL appended and guardrail summaries emitted; Risks: lock contention in TaskStateStore.

### Milestone M3 — Guardrails & Rollout
- Objective: Validate pipelines, update automation, and document migration steps.
- Tasks:
  1. QA — Run `scripts/spec-guard.sh --dry-run`, `npm run lint`, `npm run test`, and `npm run review` through the CLI; Acceptance: manifests linked in checklists; Risks: flakey tests.
  2. Enablement — Update `.agent/AGENTS.md`, `docs/TASKS.md`, and shims documentation; Acceptance: reviewers can follow instructions without MCP references; Risks: stale run manifest pointers.

## Next Review
- Target reviewer sync once Milestone M2 tests are green and manifests are published (est. 2025-11-05).
