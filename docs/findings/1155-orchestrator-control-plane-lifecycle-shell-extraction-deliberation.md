# Findings: 1155 Orchestrator Control Plane Lifecycle Shell Extraction

- Date: 2026-03-13
- Task: `1155-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction`

## Summary

After `1154`, the next truthful Symphony-aligned seam is no longer inside `ControlServer`. The highest-leverage remaining duplication is the coordinator run-entry control-plane lifecycle in `orchestrator.ts`, where both `start()` and `resume()` repeat the same event-stream / effective-config / control-server / adapter-attachment / teardown shell.

## Evidence

- Local read-only inspection of `orchestrator/src/cli/orchestrator.ts` shows duplicated lifecycle wiring across `start()` and `resume()`.
- Delegated scout agreed that the next bounded seam is an orchestrator-owned control-plane lifecycle shell rather than more `ControlServer` micro-extraction.

Delegated evidence:
- `.runs/1154-coordinator-symphony-aligned-control-server-public-lifecycle-shell-extraction-research/cli/2026-03-13T09-48-47-658Z-57e66b45/manifest.json`

## Decision

- Proceed docs-first with `1155` as an orchestrator-level control-plane lifecycle shell extraction.
- Keep `ControlServer`, Telegram internals, route/controller seams, and already-extracted bootstrap helpers out of scope.
