# PRD - Repo Refactor Simplification (0928-repo-refactor-simplification)

## Summary
- Problem Statement: Pipeline definitions and configuration loading are duplicated across TypeScript and codex.orchestrator.json, creating drift and extra maintenance.
- Desired Outcome: A single, portable pipeline source of truth with simplified resolution and reduced code, without behavior changes.

## Goals
- Remove redundant built-in pipeline definitions in TS and rely on codex.orchestrator.json for defaults.
- Add package-root fallback config loading so pipelines resolve when repo config is missing.
- Make dist-based pipeline commands portable via $CODEX_ORCHESTRATOR_PACKAGE_ROOT.
- Preserve pipeline IDs, stage order, and manifest evidence paths.

## Non-Goals
- No changes to pipeline IDs, stage ordering, or CLI flags.
- No manifest schema changes or evidence path changes.
- No refactors outside pipeline configuration and resolution.

## Stakeholders
- Product: Codex (top-level agent), Review agent
- Engineering: Codex (top-level agent), Review agent
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics: redundant pipeline source files removed; fewer duplicated pipeline definitions; diagnostics/docs-review/implementation-gate behavior unchanged.
- Guardrails / Error Budgets: optional spec-guard behavior preserved for diagnostics/design pipelines; no regressions in implementation-gate.

## User Experience
- Personas: contributors running pipelines; reviewers auditing manifests.
- User Journeys: pipelines resolve from a single config source with portable command paths across repo/package contexts.

## Technical Considerations
- codex.orchestrator.json becomes the canonical pipeline definition.
- loadUserConfig gains fallback to package-root config when repo config is missing.
- Built-in pipeline TS files are removed; a minimal diagnostics fallback remains only if all configs are missing.

## Open Questions (for review agent)
- Is it acceptable to treat package-root codex.orchestrator.json as the default pipeline source when repo config is missing?
- Should docs-review/implementation-gate use specGuardRunner or remain strict?

## Approvals
- Product: Pending
- Engineering: Pending
- Design: N/A
