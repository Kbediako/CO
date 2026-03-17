# Findings: 1254 MCP CLI Remaining Boundary Freeze Reassessment

- After `1253`, the local `mcp` pocket appears to be limited to shared parse/help gating plus a thin `mcp serve` adapter into `orchestrator/src/cli/mcp.ts`.
- The already-extracted `mcp enable` shell now owns the bespoke raw-token parser and apply-failure exit policy, so those contracts are no longer reasons to keep extracting the residual wrapper.
- The truthful next move is a freeze reassessment unless local inspection shows one more real mixed-ownership seam.
