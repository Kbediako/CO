# PRD: Coordinator Symphony-Aligned Shared MCP Server Entry Detector Extraction

## Summary

`1240` confirmed that the broader doctor command family is mostly truthful orchestration and that the smallest real remaining seam is the duplicated TOML MCP server-entry detector shared by doctor delegation readiness and delegation setup fallback.

## Problem

The same MCP server-entry detector logic is currently duplicated across:

- `orchestrator/src/cli/doctor.ts`
- `orchestrator/src/cli/delegationSetup.ts`

Both sites need to answer the same question: does `config.toml` declare an MCP server entry for a given name, accounting for table syntax, dotted-entry syntax, quoted names, and comments. Keeping that parser stack duplicated increases drift risk for future edits and leaves a small but real mixed-ownership contract split across two CLI families.

## Goal

Extract the shared MCP server-entry detector into one bounded utility and rewire both doctor delegation readiness and delegation setup fallback to use it without changing observable behavior.

## Non-Goals

- changing doctor output formatting or delegation setup behavior
- widening into broader doctor-family or delegation setup refactors
- reopening already-frozen control, delegation-server, or RLM command families
- changing unrelated TOML parsing beyond the shared MCP entry-detection contract

## Success Criteria

- one shared helper owns the TOML MCP server-entry detection contract
- `doctor.ts` and `delegationSetup.ts` both consume the shared helper
- behavior remains identical for quoted names, dotted entries, table entries, and comment handling
- focused regression coverage protects the shared helper and both call sites
