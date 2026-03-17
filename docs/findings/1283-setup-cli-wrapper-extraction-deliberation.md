# Deliberation Findings - 1283 Setup CLI Wrapper Extraction

- `1282` closed as a truthful freeze and exhausted the local `self-check` pocket.
- The next truthful nearby binary-facing seam is the `setup` wrapper still inline in `handleSetup(...)`: local help text, `--format json` plus `--yes` incompatibility guarding, repo flag/default resolution, and the handoff into `runSetupBootstrapShell(...)`.
- Shared parser ownership and top-level command dispatch should remain in `bin/codex-orchestrator.ts`; the lower setup bootstrap shell stays out of scope.
