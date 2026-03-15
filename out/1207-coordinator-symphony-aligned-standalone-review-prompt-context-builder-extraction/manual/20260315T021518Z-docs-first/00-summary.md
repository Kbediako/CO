# 1207 Docs-First Summary

- Registered `1207` as the remaining standalone-review prompt/context support seam in `scripts/run-review.ts`.
- Scope is limited to task-context lookup, active closeout provenance resolution, NOTES fallback, and prompt scaffolding for diff, audit, and architecture surfaces.
- The intended extraction keeps `scripts/run-review.ts` as the runtime/monitor shell and moves prompt/context ownership into a dedicated helper under `scripts/lib/`.
- Runtime selection, `ReviewExecutionState`, scope-path parsing, and telemetry/termination boundaries stay explicitly out of scope.
