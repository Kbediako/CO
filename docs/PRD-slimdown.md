# PRD - Slimdown Audit (Task 0101-slimdown-audit)

## Problem Statement
- The repo carries multiple parallel wrappers, legacy scripts, and helper implementations that repeat the same behaviors (CLI entrypoints, atomic writes, ID sanitization, env path resolution).
- Duplicate pipelines and wrappers increase maintenance cost and allow subtle drift across tooling paths.
- Several scripts encode inconsistent task/run ID handling and environment variable names, making runs less repeatable.
- Documentation tooling (freshness, hygiene, archiving) reimplements the same doc-collection, task-key normalization, and date parsing logic across multiple scripts.
- One-line wrapper scripts still exist for CLI flags, adding extra entrypoints with no unique behavior.
- Mirror and design tooling duplicate optional dependency loading and compliance permit parsing.
- Guardrail/status/mirror scripts repeat the same CLI arg parsing and `.runs` manifest discovery logic.
- Pipeline definitions and adapters repeat stage/command blocks with minimal differences.
- Guardrail pipelines (docs-review, implementation-gate, tfgrpo-learning, design) still repeat delegation/spec-guard blocks instead of reusing stage sets.
- Slugify helpers diverge across design pipeline and orchestrator tooling.
- Adapter build/test definitions repeat identical evaluation defaults (fixture cwd + clean fixture enforcement).

## Target Outcomes
- Remove redundant wrappers and legacy runner scripts where the CLI already provides the same behavior.
- Consolidate duplicated helpers (atomic write, task/run ID sanitization, env path resolution) into single sources of truth.
- Reduce pipeline duplication by removing devtools variants that differ only by env toggles.
- Standardize task/run environment handling across orchestrator, scripts, and design tooling.
- Consolidate documentation tooling helpers (doc collection, task-key normalization, date parsing) into shared utilities.
- Retire wrapper scripts that only forward CLI flags, keeping one canonical invocation path.
- Consolidate CLI arg parsing + `.runs` discovery helpers used by guardrails, status UI, and review tooling.
- Share optional dependency loading + compliance permit evaluation between design and mirror tooling.
- Reduce pipeline and adapter duplication by sharing common stage/command definitions.
- Reuse guardrail stage sets for delegation/spec-guard across pipelines to avoid repeated command blocks.
- Reuse a configurable slugify helper across design pipeline and orchestrator tooling.
- Consolidate adapter evaluation defaults (fixture cwd + clean fixture enforcement) into shared helpers.

## Non-goals
- No behavior changes to pipeline sequencing, manifest schema, or core orchestrator logic.
- No new frameworks or major refactors in this task; scope is documentation plus removal of redundant wrapper scripts.
- No removal of required design or evaluation functionality without a replacement path.

## Success Metrics
- Net-negative diff across scripts and configs (delete more than add).
- Fewer distinct CLI/MCP entrypoints documented (single recommended path).
- One canonical implementation each for atomic JSON writes and task/run ID sanitization.
- Guardrails and tests remain green after each phase (build/lint/test/docs gates).
