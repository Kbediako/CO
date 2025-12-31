# Technical Spec - Repo Refactor Simplification (Task 0928)

Source of truth for requirements: `tasks/0928-prd-repo-refactor-simplification.md`.

## Overview
- Objective: Simplify pipeline resolution by eliminating duplicate pipeline definitions and making pipeline commands portable across repo/package contexts.
- In Scope:
  - codex.orchestrator.json updates for portable dist paths.
  - Package-root fallback config loading.
  - Removal of redundant TS pipeline definitions.
  - Minimal diagnostics fallback if configs are missing.
- Out of Scope:
  - Pipeline ID changes or stage reordering.
  - Manifest schema changes or evidence path changes.

## Current State
- Built-in pipelines in `orchestrator/src/cli/pipelines/*.ts` duplicate codex.orchestrator.json.
- loadUserConfig only reads `codex.orchestrator.json` from repoRoot.
- Dist-based commands in codex.orchestrator.json assume cwd is repo root.

## Proposed Changes

### 1) Pipeline config portability
- Replace `node dist/...` commands with `node "$CODEX_ORCHESTRATOR_PACKAGE_ROOT/dist/..."` in codex.orchestrator.json.
- Use `specGuardRunner.js` for optional spec-guard stages in diagnostics/design pipelines to preserve current behavior when scripts are missing.

### 2) Config loading + source labeling
- Extend `UserConfig` with an optional `source` field (`repo` | `package`).
- loadUserConfig reads repoRoot config first; if missing, read package-root config via `findPackageRoot()` and set `source: 'package'`.

### 3) Pipeline resolution simplification
- Remove `defaultDiagnostics.ts`, `designReference.ts`, and `hiFiDesignToolkit.ts`.
- Keep a minimal diagnostics fallback in `resolvePipeline` for cases where no config exists.
- Map `config.source === 'package'` to `pipeline.source = 'default'` to preserve manifest semantics.

### 4) Packaging
- Include `codex.orchestrator.json` in `package.json` `files` so package-root fallback is available in published artifacts.

## Data Persistence / State Impact
- No changes to manifest schema or run artifact locations.
- `pipeline_source` remains `default` for package fallback and `user` for repo config.

## Risks & Mitigations
- Pipeline source labeling drift.
  - Mitigation: explicitly map package config to `default` source.
- Portable command paths differ from current config.
  - Mitigation: use env var path already set in command runner.
- External repos may see additional pipelines.
  - Mitigation: pipelines remain opt-in via explicit IDs.

## Testing Strategy
- Run `implementation-gate` after changes.
- Existing PipelineResolver tests cover design pipeline resolution in non-repo roots.

## Documentation & Evidence
- PRD: `docs/PRD-repo-refactor-simplification.md`
- Action Plan: `docs/ACTION_PLAN-repo-refactor-simplification.md`
- Task checklist: `tasks/tasks-0928-repo-refactor-simplification.md`
- Mini-spec: `tasks/specs/0928-repo-refactor-simplification.md`

## Open Questions (for review agent)
- Is package-root config fallback acceptable for default pipeline resolution?
- Should docs-review/implementation-gate spec-guard stay strict or move to specGuardRunner?

## Approvals
- Engineering: Pending
- Reviewer: Pending
