# TECH_SPEC: Coordinator Symphony-Aligned Orchestrator Resume Preparation Shell Extraction

- Date: 2026-03-14
- Owner: Codex (top-level agent)
- Task: `1195-coordinator-symphony-aligned-orchestrator-resume-preparation-shell-extraction`
- Status: Draft

## Background

`1193` extracted the control-plane lifecycle shell and `1194` extracted the `start()` preparation shell. The largest remaining cohesive bootstrap shell in `orchestrator.ts` is now the `resume()` preparation cluster before control-plane lifecycle delegation.

## Scope

- extract the `resume()` preparation cluster from `orchestrator.ts` into one bounded helper under `orchestrator/src/cli/services/`
- move or delegate:
  - manifest load and task-environment override
  - repo/user config resolution plus resume pipeline selection
  - resume-token validation and resume event/reset/heartbeat mutation
  - `prepareRun(...)` for resume
  - config-notice append-if-missing
  - runtime-mode resolution with manifest preference
  - `plan_target_id` refresh
  - `ManifestPersister` construction and initial schedule
- preserve the exact inputs that are handed into the existing control-plane lifecycle shell

## Out of Scope

- `start()` preparation shell from `1194`
- `runOrchestratorControlPlaneLifecycleShell(...)`
- the inline `onStartFailure` resume pre-start persistence contract
- `performRunLifecycle(...)`
- `status()` or `plan()`
- broader runtime-policy or manifest-persistence semantic changes

## Proposed Approach

1. Introduce one bounded resume-preparation helper under `orchestrator/src/cli/services/`.
2. Move the inline `resume()` bootstrap cluster into that helper.
3. Keep `orchestrator.ts` as the public entrypoint while delegating only the resume preparation shell.
4. Preserve current resume token, manifest mutation, runtime-mode, and persistence wiring exactly.
5. Add or adapt focused tests around resume bootstrap, pre-start persistence, and lifecycle handoff wiring.

## Validation

- standard docs-first guards before implementation
- focused resume-preparation regressions during implementation:
  - `tests/cli-orchestrator.spec.ts`
  - one new resume-preparation shell test to pin resume-token validation handoff, config-notice append-if-missing, manifest-preferred runtime-mode resolution, plan-target refresh, and initial persister schedule
  - existing lifecycle-handoff coverage that stays adjacent to the extracted boundary
- standard lane gate bundle plus explicit elegance review before closeout

## Risks

- changing resume-token validation or resume-event mutation ordering would create subtle resume regressions
- changing manifest-preferred runtime-mode application would skew downstream lifecycle behavior
- widening into `start()` or broader public lifecycle ownership would break the bounded seam
