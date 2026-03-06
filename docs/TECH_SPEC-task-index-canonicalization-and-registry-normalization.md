# TECH_SPEC - Task Index Canonicalization + Registry Normalization (1006)

- Canonical TECH_SPEC: `tasks/specs/1006-task-index-canonicalization-and-registry-normalization.md`.
- Owner: Codex.
- Last Reviewed: 2026-03-05.

## Summary
- Technical objective: migrate `tasks/index.json` from split-state registry (`items[]` + `tasks[]`) to canonical `items[]` only.
- Safety objective: preserve current tooling behavior during migration and validate with docs/guardrail checks.
- Current stage: docs-first lane complete before any runtime implementation edits.

## Requirements
- Functional:
  - Define canonical registry contract as top-level `items[]` for task discovery.
  - Define safe retirement path for legacy top-level `tasks[]`.
  - Identify and align all docs/tooling references to canonical contract.
- Non-functional:
  - Keep migration minimal and auditable.
  - Preserve existing task-id normalization and delegation guard assumptions.
  - No unrelated refactors.

## Expected Implementation Touch Scope (for follow-on stream)
- `tasks/index.json` canonicalization changes.
- Tooling/docs references that assume or mention split-state.
- Tests/guards that enforce registry presence and structure.

## Validation Gate (Docs Lane)
- Docs-review manifest captured for `1006`.
- `npm run docs:check` pass.
- `npm run docs:freshness` pass.
- Standalone review checkpoint recorded.
- Explicit elegance/minimality pass recorded.

## Constraints
- CO remains current execution authority boundaries; this slice is registry/docs normalization only.
- No scheduler ownership transfer.
- No language/runtime rewrite.
