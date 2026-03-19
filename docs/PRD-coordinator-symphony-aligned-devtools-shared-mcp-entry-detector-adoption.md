# PRD: Coordinator Symphony-Aligned Devtools Shared MCP Entry Detector Adoption

## Summary

`1241` extracted the shared TOML MCP server-entry detector. The next truthful bounded follow-on is to adopt that helper inside the remaining specialized devtools readiness parser.

## Problem

`orchestrator/src/cli/utils/devtools.ts` still carries its own specialized MCP entry-detection logic (`hasDevtoolsConfigEntry(...)` plus adjacent comment/table parsing) even though the underlying contract is now owned by the shared helper introduced in `1241`.

That duplication leaves one more local copy of the same MCP config detection rules:

- table forms like `[mcp_servers.chrome-devtools]`
- quoted table names
- dotted entry syntax
- comment stripping before matching

## Goal

Adopt the shared MCP server-entry detector in the devtools readiness path and remove the remaining specialized copy without changing user-visible devtools readiness behavior.

## Non-Goals

- broad refactors of devtools setup or config override handling
- changing devtools messaging, install guidance, or command previews
- widening into unrelated doctor-family or delegation-family behavior

## Success Criteria

- `devtools.ts` consumes the shared MCP entry detector
- the local specialized detector copy is removed
- focused readiness coverage protects the expected devtools config forms
