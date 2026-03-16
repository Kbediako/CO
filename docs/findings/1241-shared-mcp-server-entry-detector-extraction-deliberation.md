# 1241 Deliberation: Shared MCP Server Entry Detector Extraction

- Risk stays below the full-deliberation threshold because the lane is a bounded internal extraction with no intended user-visible behavior change.
- `1240` already ruled out a broad doctor-family split; the truthful remaining work is the duplicated MCP entry detector shared by doctor delegation readiness and delegation setup fallback.
- The key risk is over-generalizing this into a larger TOML parser abstraction instead of extracting only the proven duplicated contract.
- The implementation should stay narrow and pair the helper extraction with focused parser parity tests.
