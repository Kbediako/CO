# Repo-wide Refactor Plan

## Goals
- Reduce redundant sources of truth (pipelines, instructions, checklists) without changing behavior.
- Simplify module boundaries so contributors can navigate the runtime and tooling quickly.
- Trim legacy surfaces and optional features that inflate the baseline footprint.
- Preserve auditability: manifests, metrics, and checklist evidence remain intact.

## Non-goals
- No functional changes to production runtime or manifest schema in the first phase.
- No removal of downstream project code under `packages/` without a deprecation window.
- No breaking changes to CLI commands or task evidence paths without compatibility shims.

## Architecture overview

### Major subsystems
- CLI entrypoint and pipelines: `bin/codex-orchestrator.ts`, `codex.orchestrator.json`, `orchestrator/src/cli/pipelines/*`.
- Orchestrator core runtime: `orchestrator/src/**` (manager, persistence, control-plane, scheduler, learning, sync).
- Shared packages: `packages/orchestrator/**`, `packages/shared/**`, `packages/control-plane-schemas/**`.
- Tooling and helpers: `scripts/**`, `patterns/**`, `eslint-plugin-patterns/**`, `evaluation/**`.
- Docs and task control plane: `tasks/**`, `docs/**`, `.agent/**`.
- Run artifacts: `.runs/**`, `out/**`.

### Data flow (task -> pipeline -> evidence)
1. Task id is set via `MCP_RUNNER_TASK_ID` (or `--task <task-id>`).
2. CLI executes the selected pipeline stages.
3. Manifests are written under `.runs/<task-id>/cli/<run-id>/manifest.json` with summaries in `out/<task-id>/`.
4. Humans mirror outcomes into `tasks/tasks-*.md`, `docs/TASKS.md`, and `.agent/task/*.md`.

## Over-engineered or redundant areas (with evidence)
- Duplicate pipeline definitions and stage repetition: pipelines live in `codex.orchestrator.json` and also in `orchestrator/src/cli/pipelines/*`, while `diagnostics`, `implementation-gate`, `implementation-gate-devtools`, and `docs-review` repeat the same stage lists in `codex.orchestrator.json`.
- Triple instruction layers with overlapping content: `AGENTS.md`, `docs/AGENTS.md`, `.agent/AGENTS.md` are concatenated per `docs/guides/instructions.md`.
- Manual checklist mirroring across three locations: `tasks/tasks-*.md`, `docs/TASKS.md`, `.agent/task/*.md` (documented in `.agent/system/architecture.md` and `.agent/system/conventions.md`).
- Legacy MCP runner shims removed in favor of the CLI `codex-orchestrator mcp serve`, leaving legacy handling in `scripts/mcp-runner-migrate.js` and `scripts/status-ui-build.mjs`.
- Overlapping orchestration layers: `orchestrator/src/**` plus `packages/orchestrator/**` and `packages/shared/**` add multiple internal layers for a single runtime surface (see `.agent/system/architecture.md`).
- Optional features embedded in core: `orchestrator/src/control-plane`, `orchestrator/src/scheduler`, `orchestrator/src/sync`, `orchestrator/src/learning` are optional (README notes cloud sync is not wired) but enlarge the default runtime surface.

## Proposed refactors

### Quick wins (low risk, shorter horizon)
- Pipeline DRY pass: introduce shared stage definitions or pipeline templates so `diagnostics`/`implementation-gate`/`docs-review` reuse a single stage list in `codex.orchestrator.json`.
  - Impact: medium (less duplication, easier updates).
  - Effort: low to medium.
- Checklist auto-sync: extend `scripts/docs-hygiene.ts` (or add a small generator) to produce `docs/TASKS.md` and `.agent/task/*.md` from `tasks/tasks-*.md` and `tasks/index.json`.
  - Impact: high (removes manual mirroring work).
  - Effort: medium.
- Legacy MCP wrapper cleanup: remove redundant wrapper scripts now that the CLI is the sole entrypoint.
  - Impact: medium (reduces surface area, fewer entrypoints).
  - Effort: low.
- Mirror tooling aggregation: fold `scripts/mirror-*.mjs` into a single CLI namespace (for example, `codex-orchestrator mirror ...`) and keep script aliases temporarily.
  - Impact: medium (simplifies tooling surface).
  - Effort: medium.
- Instruction doc normalization: generate the three AGENTS layers from a canonical source so updates happen once and output remains identical.
  - Impact: medium (less duplication, fewer drift bugs).
  - Effort: medium.

### Deeper refactors (higher effort, staged rollouts)
- Package boundary simplification: merge `packages/orchestrator` into `orchestrator` (or rename to avoid two "orchestrator" roots) and collapse `packages/shared` where it is only consumed internally.
  - Impact: high (clearer ownership, fewer layers).
  - Effort: high.
- Optional feature modularization: move `control-plane`, `scheduler`, `sync`, and `learning` to optional packages or dynamic imports, keeping the default runtime lean.
  - Impact: high (smaller baseline, faster mental model).
  - Effort: high.
- Artifact reduction: rationalize manifest and summary outputs to reduce duplicate artifacts while preserving compatibility (dual-write during migration).
  - Impact: medium to high (less storage and confusion).
  - Effort: high.

## Risks and regression-prone areas
- CLI pipeline execution and manifest writing (`orchestrator/src/cli/**`, `.runs/**`) are critical; changes can break evidence capture.
- Legacy shims removal can break older onboarding docs or downstream automation that still call shell scripts.
- Task and checklist syncing must preserve existing evidence paths to avoid audit gaps.
- Optional feature extraction (control-plane, scheduler, sync, learning) risks breaking integrations that rely on side effects.

## Test plan and validation steps per phase

### Phase 0: Discovery and baselining
- Run `diagnostics` to capture baseline manifests and failure points.
- Record current pipeline usage and entrypoints in a short inventory note.

### Phase 1: Quick wins
- For doc-only changes: run `docs-review` (spec-guard + docs:check + docs:freshness + review).
- For script/tooling changes: run `diagnostics` plus targeted script smoke tests (`npm run docs:check`, `npm run docs:freshness`, `node scripts/*` as needed).

### Phase 2: Structural consolidation
- Run `implementation-gate` for each tranche (spec-guard, build, lint, test, docs:check, docs:freshness, diff-budget, review).
- Add targeted unit tests for pipeline resolution, instruction loader, and checklist sync tooling.

### Phase 3: Optional feature modularization
- Expand tests for control-plane and scheduler flows (`orchestrator/tests/ControlPlaneValidator.test.ts`, `orchestrator/tests/SchedulerPlan.test.ts`).
- Run full `implementation-gate` and validate sample runs that touch optional modules.

## Phased rollout plan with acceptance criteria

### Phase 0: Inventory and baseline (1-2 days)
- Acceptance: baseline manifests captured; inventory of duplicate entrypoints and pipelines documented; no code changes.

### Phase 1: Quick wins (1-2 weeks)
- Acceptance: duplicated pipeline stage lists reduced; checklist mirrors auto-generated; legacy MCP wrappers consolidated with deprecation notices.

### Phase 2: Structural consolidation (2-4 weeks)
- Acceptance: package boundaries simplified; pipeline definitions have a single source of truth; all guardrails pass.

### Phase 3: Optional feature modularization (4+ weeks)
- Acceptance: optional modules are behind feature flags or dynamic imports; default runtime remains fully functional; compatibility shims in place for one release.

## Open Questions (for review agent)
- Which legacy MCP shell scripts are still required by downstream automation, and what is the deprecation window?
- Should `packages/orchestrator` be merged into `orchestrator`, or renamed to clarify responsibilities?
- Is it acceptable to generate checklist mirrors automatically, or do reviewers require manual edits as a control point?
- Which optional modules (control-plane, scheduler, sync, learning) are actively used in current workflows?

## Assumptions
- Legacy shims can be kept for at least one release while new entrypoints are adopted.
- Checklist mirrors are acceptable to auto-generate as long as evidence paths remain unchanged.
- Optional modules are not required for the default `diagnostics` pipeline.
