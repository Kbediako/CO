# TECH_SPEC - ChatGPT-Login-First Runtime Provider Migration (0981)

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/0981-chatgpt-login-first-runtime-provider-migration.md`
- PRD: `docs/PRD-chatgpt-login-first-runtime-provider-migration.md`
- ACTION_PLAN: `docs/ACTION_PLAN-chatgpt-login-first-runtime-provider-migration.md`
- Task checklist: `tasks/tasks-0981-chatgpt-login-first-runtime-provider-migration.md`

## Snapshot
- Scope: add `runtimeMode=cli|appserver` provider architecture while preserving `executionMode=mcp|cloud` semantics.
- Compatibility: `runtimeMode=cli` remains default until parity/canary evidence explicitly justifies flip.
- Observability: manifest/status/run-summary include runtime provider selection and deterministic fallback metadata.
- Rollout: W0-W6 sequencing from docs-first through migration and guarded default-flip decision.
