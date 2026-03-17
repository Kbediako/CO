# 1270 Docs-First Summary

`1270` is registered docs-first as a bounded extraction of the binary-facing `exec` shell above `orchestrator/src/cli/exec/command.ts`.

The current-tree expectation is `go`: `handleExec(...)` still owns empty-command validation, output-mode resolution, environment normalization with optional task override, invocation shaping above `executeExecCommand(...)`, local exit-code mapping, and the interactive adoption-hint follow-on.

The deterministic docs-first gates are green on the registered tree:

- `node scripts/spec-guard.mjs --dry-run`: completed and surfaced only the existing repo-global stale-spec warnings.
- `npm run docs:check`: passed.
- `npm run docs:freshness`: passed.

This packet records those docs gates and an explicit docs-review override rather than claiming a manifest-backed docs-review approval that was not run.
