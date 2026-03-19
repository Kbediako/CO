# PRD: Coordinator Symphony-Aligned Delegation Setup Fallback Config Parser Extraction

## Goal

Extract the fallback delegation-config parser from `orchestrator/src/cli/delegationSetup.ts` so setup orchestration no longer owns TOML parsing details inline.

## Context

`1241` extracted the shared MCP server-entry detector, but `delegationSetup.ts` still owns a second, narrower parsing cluster:

- fallback config loading
- section-local `args` extraction
- section-local `env` extraction
- pinned-repo interpretation built on that parsed shape

That logic is parser ownership rather than setup-shell orchestration.

## Product Requirement

Move the fallback delegation-config parser into one bounded helper adjacent to `delegationSetup.ts` while preserving current setup behavior and keeping the lane tightly scoped.

## Non-Goals

- No change to delegation setup CLI behavior beyond parser ownership
- No widening into doctor-family refactors
- No attempt to solve broader inline-table recovery beyond what the extracted parser truthfully supports in this slice
