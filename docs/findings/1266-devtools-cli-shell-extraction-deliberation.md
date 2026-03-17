# Findings: 1266 Devtools CLI Shell Extraction Deliberation

- `handleDevtools(...)` still owns a bounded binary-facing shell above `orchestrator/src/cli/devtoolsSetup.ts`.
- The mixed responsibilities are local to the wrapper: subcommand validation, JSON-vs-text shaping, the `--yes` plus `--format json` incompatibility guard, and summary emission.
- The deeper devtools readiness/install logic already lives in `devtoolsSetup.ts` and stays out of scope.
- The previously frozen `1243` devtools readiness reassessment applies to the internal readiness family, not to this remaining top-level binary wrapper seam.
