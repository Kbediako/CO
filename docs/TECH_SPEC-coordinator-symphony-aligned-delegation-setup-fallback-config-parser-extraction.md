# TECH_SPEC: Coordinator Symphony-Aligned Delegation Setup Fallback Config Parser Extraction

## Context

`delegationSetup.ts` still mixes setup orchestration with fallback TOML parsing helpers. The parser cluster is cohesive enough to move behind a dedicated utility without widening scope.

## Requirements

1. Extract the fallback parser cluster from `orchestrator/src/cli/delegationSetup.ts` into one dedicated utility adjacent to the CLI helpers.
2. Keep `runDelegationSetup(...)` and readiness/orchestration ownership in `delegationSetup.ts`.
3. Preserve current parsing behavior for:
   - dedicated `[mcp_servers.delegation]` section args extraction
   - `[mcp_servers.delegation.env]` env extraction
   - pinned `--repo` detection based on parsed args
4. Add focused regression coverage for the extracted parser contract and the setup fallback call site.
5. Keep the lane bounded; do not widen into doctor or broader delegation policy work.

## Validation Plan

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- focused delegation setup parser tests
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`

## Exit Conditions

- `go`: fallback parser ownership is extracted cleanly and focused regressions prove parity
- `no-go`: the parser cannot be extracted without widening into broader setup/policy changes
