# TECH_SPEC: Coordinator Symphony-Aligned MCP Enable CLI Shell Extraction

## Scope

Bounded extraction of the `mcp enable` command shell that still lives inline in `bin/codex-orchestrator.ts`.

## In-Scope Files

- `bin/codex-orchestrator.ts`
- a new dedicated MCP enable shell/helper module under the orchestrator CLI sources
- `tests/cli-command-surface.spec.ts`
- adjacent focused tests only if parity coverage needs to move with the seam

## Requirements

1. Extract the `mcp enable` shell without changing user-facing behavior.
2. Preserve current flag parsing, duplicate detection, `--yes` boolean coercion, `--format` validation, `--servers` CSV parsing, output shaping, and apply-failure exit-code behavior.
3. Keep `runMcpEnable(...)` and `formatMcpEnableSummary(...)` in `orchestrator/src/cli/mcpEnable.ts`.
4. Keep `mcp serve` and unrelated sibling handlers unchanged except for import rewiring.

## Validation Plan

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- focused MCP enable coverage in `tests/cli-command-surface.spec.ts`
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke`

## Exit Conditions

- `done`: the MCP enable shell is extracted behind a dedicated boundary with parity-backed coverage
- `abort`: current-tree inspection shows the candidate seam is only same-owner wrapper glue
