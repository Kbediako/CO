# Findings: 1253 MCP Enable CLI Shell Extraction

- The top-level `mcp enable` branch still owns bespoke flag parsing, duplicate detection, `--yes` coercion, `--format` validation, `--servers` CSV normalization, output shaping, and apply-failure exit behavior.
- The underlying engine already lives in `orchestrator/src/cli/mcpEnable.ts`, so the truthful next move is a bounded shell extraction rather than a broader `mcp` refactor.
- `mcp serve` remains out of scope for this lane.
