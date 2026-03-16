# 1242 Deliberation: Devtools Shared MCP Entry Detector Adoption

- Risk stays below the full-deliberation threshold because the lane is a bounded helper-adoption change with no intended user-visible behavior change.
- `1241` already established the shared owner for the MCP entry-detection contract, so the next truthful step is to remove the remaining specialized copy in `devtools.ts`.
- The key risk is widening into a broader devtools refactor instead of keeping this slice on the config-entry detector only.
