# 1193 Next Slice Note

The next truthful seam is `1194-coordinator-symphony-aligned-orchestrator-start-preparation-shell-extraction`.

Why this is next:

- after `1193`, the remaining non-trivial public shell in `orchestrator.ts` is the `start()` preparation flow before the control-plane lifecycle handoff
- that preparation cluster is cohesive and bounded:
  - `prepareRun(...)`
  - `generateRunId()`
  - runtime-mode resolution
  - `bootstrapManifest(...)`
  - initial summary/runtime-mode application
  - `ManifestPersister` construction
- it can be extracted without reopening `resume()`, run-lifecycle orchestration, route execution, or control-plane service behavior

Keep out of scope for `1194`:

- `resume()` preparation and resume-token handling
- `performRunLifecycle(...)`
- control-plane lifecycle shell behavior from `1193`
- routing or execution-mode policy helpers
