# PRD: Coordinator Symphony-Aligned MCP CLI Remaining Boundary Freeze Reassessment

## Summary

After `1253` extracted the `mcp enable` shell into a dedicated module, the remaining nearby `mcp` command pocket needs a truthful freeze check instead of a forced follow-on extraction.

## Problem

`handleMcp(...)` in `bin/codex-orchestrator.ts` still has nearby MCP code, but the residual surface now appears to be:

- shared top-level parse/help gating
- a thin `mcp serve` adapter into the already-owned `serveMcp(...)` implementation
- shared help text for the `mcp` command family

If that is the complete remaining surface, the right result is a no-op freeze rather than another symmetry-driven extraction.

## Goal

Confirm whether any real post-`1253` MCP-boundary extraction remains. If not, close the pocket explicitly as frozen.

## Non-Goals

- forcing a new `mcp serve` shell extraction for symmetry
- widening into shared top-level CLI parser/help helpers
- reopening the already-extracted `mcp enable` shell or its engine

## Success Criteria

- docs-first artifacts record whether the post-`1253` MCP pocket is truly exhausted
- the result explicitly says `freeze` or identifies one bounded follow-on seam
- no implementation work is started unless reassessment finds a real remaining boundary
