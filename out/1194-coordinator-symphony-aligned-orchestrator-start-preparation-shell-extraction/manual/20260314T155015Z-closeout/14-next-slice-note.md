# 1194 Next Slice Note

The next truthful seam is `1195-coordinator-symphony-aligned-orchestrator-resume-preparation-shell-extraction`.

Why this is next:

- after `1194`, `start()` is reduced to the prepared-shell handoff plus the existing control-plane lifecycle boundary
- the remaining non-trivial public bootstrap shell in `orchestrator.ts` is now the `resume()` preparation flow before the same control-plane lifecycle handoff
- that `resume()` preparation cluster is still cohesive and bounded:
  - manifest load and task-environment override
  - repo/user config resolution plus resume pipeline selection
  - resume-token validation and resume-event/reset/heartbeat mutation
  - `prepareRun(...)` for resume
  - config-notice append-if-missing
  - runtime-mode resolution with manifest preference
  - `plan_target_id` refresh
  - `ManifestPersister` construction and initial schedule

Keep out of scope for `1195`:

- `runOrchestratorControlPlaneLifecycleShell(...)`
- `performRunLifecycle(...)`
- `status()` or `plan()`
- broader runtime-policy or manifest-persistence semantic changes
