# TECH_SPEC: Coordinator Symphony-Aligned Orchestrator Run Lifecycle Orchestration Shell Extraction

- Date: 2026-03-14
- Owner: Codex (top-level agent)
- Task: `1190-coordinator-symphony-aligned-orchestrator-run-lifecycle-orchestration-shell-extraction`
- Status: Draft

## Background

`1163` extracted the guard/planning helper, `1187` through `1189` progressively removed local task-manager and tracker composition, and `orchestrator.ts` is now left with the run-lifecycle orchestration envelope itself. The next bounded Symphony-aligned seam is the lifecycle shell around planning, execution, and completion/error ordering.

## Scope

- extract the orchestration owned by `performRunLifecycle(...)` into one bounded helper under `orchestrator/src/cli/services/`
- move or delegate the current `runLifecycleGuardAndPlanning(...)` and `executeRunLifecycleTask(...)` through that shell without changing their behavior
- preserve:
  - `getPrivacyGuard().reset()` once per lifecycle invocation
  - guard short-circuit behavior before scheduler planning
  - `runError` payload shape and emission ordering
  - completion/finalization ordering
- reuse `createOrchestratorRunLifecycleTaskManager(...)` as the task-manager composition input

## Out of Scope

- public `start()` / `resume()` lifecycle behavior
- task-manager composition behavior
- route-decision, routing-policy, or cloud/local route shells
- control-plane or scheduler implementation changes
- broader orchestrator redesign

## Proposed Approach

1. Introduce one bounded lifecycle shell helper under `orchestrator/src/cli/services/`.
2. Move the `performRunLifecycle(...)` orchestration envelope into that helper.
3. Keep `CodexOrchestrator` as the public lifecycle owner, but have it delegate the orchestration shell through the new helper.
4. Preserve existing helper boundaries instead of reopening registration/task-manager ownership.
5. Add or adapt focused tests around guard/planning ordering, error-path behavior, and completion semantics.

## Validation

- standard docs-first guards before implementation
- focused lifecycle regressions during implementation
- standard lane gate bundle plus explicit elegance review before closeout

## Risks

- moving too little strands the now-obvious lifecycle envelope in `orchestrator.ts`
- moving too much would reopen already-extracted task-manager or routing boundaries
- error-path ordering is easy to regress if the shell is widened carelessly
