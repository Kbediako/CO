# 1087 Deliberation - Control Server Seeded Runtime Bundle Boundary Tightening

## Decision

- Proceed with a bounded follow-on lane after `1086`.
- Scope the lane to:
  - shrinking the seeded-runtime return/constructor surface around one shared runtime bundle,
  - moving `LINEAR_ADVISORY_STATE_FILE` to a neutral owner,
  - refreshing only the focused tests needed for the new contract.

## Why this next

- `1086` removed seed-file I/O from `ControlServer.start()`, which exposed the next non-minimal surface more clearly: duplicated runtime pieces returned from `createControlServerSeededRuntimeAssembly(...)` and then re-stored by `ControlServer`.
- The neutral constant cleanup is small and belongs with this boundary tightening because it removes the one remaining read-side dependency on an assembly-owned path detail.

## Guardrails

- Do not change route/controller behavior.
- Do not reopen request-shell, bootstrap-lifecycle, or startup-sequence behavior.
- Keep the lane bounded to the seeded-runtime/startup boundary.

## Evidence

- `out/1086-coordinator-symphony-aligned-control-server-seed-loading-extraction/manual/20260309T114157Z-closeout/12-elegance-review.md`
- `out/1086-coordinator-symphony-aligned-control-server-seed-loading-extraction/manual/20260309T114157Z-closeout/14-next-slice-note.md`
