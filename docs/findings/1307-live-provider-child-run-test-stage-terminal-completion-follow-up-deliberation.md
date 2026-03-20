# Findings - 1307 Live Provider Child-Run Test-Stage Terminal Completion Follow-Up

## Scope
- Reviewed the post-`1306` current-tree `npm run test` non-return evidence, the CLI subprocess command-surface suite, and the runtime-selection path those subprocesses inherit.

## Findings
1. The strongest current blocker signal is in the CLI subprocess command-surface suite, not the provider contract. [`tests/cli-command-surface.spec.ts`](../../tests/cli-command-surface.spec.ts) launches real `start`/`flow` subprocesses via `runCli(...)`, and those subprocesses inherit the ambient default runtime-selection path from [`orchestrator/src/cli/runtime/provider.ts`](../../orchestrator/src/cli/runtime/provider.ts).
2. Ambient runtime selection materially inflates the isolated flow tail. The matching `flow-target` case takes about `66s` under the current tree, but about `27.5s` when the same isolated run is forced to `runtimeMode=cli`, which is strong evidence that ordinary CLI command-surface coverage is doing work it does not actually need.
3. Dedicated runtime-provider coverage already exists elsewhere. [`orchestrator/tests/RuntimeProvider.test.ts`](../../orchestrator/tests/RuntimeProvider.test.ts) and related runtime-shell tests already exercise appserver preflight and fallback semantics, so pinning ordinary CLI subprocess coverage to CLI runtime does not remove the only runtime-provider coverage.
4. The next lane should start with the hermetic test-harness fix, then re-evaluate. If a fresh full-suite rerun still hangs after that change, the next likely cleanup candidate is subprocess/log-stream teardown in [`orchestrator/src/cli/services/commandRunner.ts`](../../orchestrator/src/cli/services/commandRunner.ts).

## Decision
- Proceed with a narrow `1307` implementation lane focused on:
  - deterministic CLI runtime env defaults inside the CLI subprocess test helper
  - preserving explicit per-test override ability for runtime-specific cases
  - rerunning the full validation floor and the live provider child-run path
