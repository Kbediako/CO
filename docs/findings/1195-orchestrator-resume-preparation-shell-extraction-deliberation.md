# 1195 Deliberation - Orchestrator Resume Preparation Shell Extraction

## Decision

Open `1195-coordinator-symphony-aligned-orchestrator-resume-preparation-shell-extraction` as the next bounded Symphony-aligned lane after `1194`.

## Why This Seam

After `1194`, `start()` is reduced to a thin preparation-shell handoff. The remaining public bootstrap surface in `orchestrator.ts` is the inline `resume()` preparation cluster before the already-extracted control-plane lifecycle shell.

That cluster is cohesive and bounded:

- manifest load and task-environment override
- repo/user config resolution plus resume pipeline selection
- resume-token validation and resume event/reset/heartbeat mutation
- `prepareRun(...)` for resume
- config-notice append-if-missing
- manifest-preferred runtime-mode resolution
- `plan_target_id` refresh
- `ManifestPersister` construction and initial `schedule(...)`

## Keep Out of Scope

- the `start()` preparation shell from `1194`
- `runOrchestratorControlPlaneLifecycleShell(...)`
- the inline `onStartFailure` resume pre-start persistence contract
- `performRunLifecycle(...)`
- `status()` or `plan()`
- broader runtime-policy or manifest-persistence semantic changes

## Test Focus

- dedicated resume-preparation helper coverage for resume-token validation handoff, manifest-preferred runtime-mode resolution, config-notice append-if-missing, plan-target refresh, and initial persister scheduling
- adjacent public resume-path coverage in `tests/cli-orchestrator.spec.ts` that proves the resume pre-start failure contract remains unchanged
