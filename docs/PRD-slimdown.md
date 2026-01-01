# PRD - Slimdown Audit (Task 0101-slimdown-audit)

## Problem Statement
- The repo carries multiple parallel wrappers, legacy scripts, and helper implementations that repeat the same behaviors (CLI entrypoints, atomic writes, ID sanitization, env path resolution).
- Duplicate pipelines and wrappers increase maintenance cost and allow subtle drift across tooling paths.
- Several scripts encode inconsistent task/run ID handling and environment variable names, making runs less repeatable.

## Target Outcomes
- Remove redundant wrappers and legacy runner scripts where the CLI already provides the same behavior.
- Consolidate duplicated helpers (atomic write, task/run ID sanitization, env path resolution) into single sources of truth.
- Reduce pipeline duplication by removing devtools variants that differ only by env toggles.
- Standardize task/run environment handling across orchestrator, scripts, and design tooling.

## Non-goals
- No behavior changes to pipeline sequencing, manifest schema, or core orchestrator logic.
- No new frameworks or major refactors in this task; scope is documentation plus removal of redundant wrapper scripts.
- No removal of required design or evaluation functionality without a replacement path.

## Success Metrics
- Net-negative diff across scripts and configs (delete more than add).
- Fewer distinct CLI/MCP entrypoints documented (single recommended path).
- One canonical implementation each for atomic JSON writes and task/run ID sanitization.
- Guardrails and tests remain green after each phase (build/lint/test/docs gates).
