# 1195 Next Slice Note

The next truthful seam is `1196-coordinator-symphony-aligned-orchestrator-status-shell-extraction`.

Why this is next:

- after `1195`, both public lifecycle entrypoints (`start()` and `resume()`) delegate their preparation shells before the shared control-plane lifecycle handoff
- the remaining cohesive public command-local orchestration inside `orchestrator.ts` is now the `status()` path plus its private payload/render helpers
- that status cluster is still bounded:
  - manifest load for a run id
  - runtime activity snapshot resolution
  - JSON payload assembly
  - human-readable status rendering

Keep out of scope for `1196`:

- `start()` or `resume()`
- `plan()`
- runtime-mode selection helpers
- run-lifecycle/control-plane orchestration
- broader status payload semantic changes
