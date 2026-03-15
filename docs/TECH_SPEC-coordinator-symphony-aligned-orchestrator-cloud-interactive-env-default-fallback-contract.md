# TECH_SPEC: Coordinator Symphony-Aligned Orchestrator Cloud Interactive Env Default Fallback Contract

## Problem Statement

The cloud executor request builder currently forwards blank interactive env strings instead of treating them as unset. That breaks the intended fallback contract for `CODEX_NON_INTERACTIVE`, `CODEX_NO_INTERACTIVE`, and `CODEX_INTERACTIVE`.

## Scope

- patch only the interactive env fallback logic in `orchestrator/src/cli/services/orchestratorCloudTargetExecutor.ts`
- add deterministic coverage in `orchestrator/tests/OrchestratorCloudTargetExecutor.test.ts`
- preserve current precedence between explicit env overrides, process env, and defaults, except that blank strings must behave like unset values

## Out of Scope

- cloud preflight behavior
- feature-toggle parsing
- prompt assembly
- branch or environment-id resolution
- broader request-shaping refactors

## Current Hypothesis

The truthful fix is a small local normalization helper or reuse of the existing string-normalization pattern for the three interactive env flags only. The test should set blank parent env values explicitly so the regression is reproducible without depending on the caller shell.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- focused `vitest` for `OrchestratorCloudTargetExecutor.test.ts`
- `npm run review`
