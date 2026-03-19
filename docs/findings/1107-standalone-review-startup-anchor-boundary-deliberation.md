# Findings - 1107 Standalone Review Startup-Anchor Boundary

- The `1106` live review log shows diff-mode review reading the Codex memory registry and other off-task review surfaces before it inspects the touched diff paths.
- A direct local probe against `ReviewExecutionState` showed that the shell-wrapped memory `rg` command shape already classifies as `codex-memories`, so raw shell-payload parsing is not the remaining defect.
- The corresponding `review/telemetry.json` still ends at `metaSurfaceSignals: 0` because later nearby-code inspection evicts those early meta-surface samples from the recent rolling window.
- The smallest next fix is therefore a startup-anchor boundary for diff mode, not shell-payload parser parity and not a native-review rewrite.
