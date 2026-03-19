# Findings: 1261 Delegation Setup CLI Shell Extraction

- After `1260`, the delegation-server local pocket is explicitly frozen.
- The next nearby real shell boundary is `handleDelegation(...)` in `bin/codex-orchestrator.ts`.
- That wrapper still owns `delegation` subcommand validation, `--format json` plus `--yes` compatibility enforcement, repo-root resolution, `runDelegationSetup(...)` invocation, and JSON/text summary formatting.
- Result: register a bounded `delegation setup` CLI shell extraction lane.
