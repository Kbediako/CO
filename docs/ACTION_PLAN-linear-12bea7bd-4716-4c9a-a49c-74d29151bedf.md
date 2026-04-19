# ACTION_PLAN: CO-262 ready-review CodeRabbit rereview latch

## Goal

Implement and hand off a docs-first `CO-262` fix so `ready-review` clears stale `CodeRabbit rereview pending` from current-head `statusCheckRollup`, `CodeRabbit SUCCESS`, `unresolved review threads`, bot-feedback, and `mergeStateStatus CLEAN` evidence.

## Constraints

- Keep the implementation narrow to the `ready-review` watcher surfaces.
- Do not weaken CodeRabbit gating globally.
- Do not ignore `unresolved review threads` or current-head unacknowledged bot feedback.
- Keep `mergeStateStatus CLEAN` as a separate readiness gate, not a replacement for CodeRabbit/thread checks.
- Do not mutate `CO-223` or `CO-260` feature behavior.

## Source Evidence

Source anchor:

- `ctx:sha256:da19ec03e5c89cbe79e6e15120de3e9039ee81e75235ba564c59bb026184f5a2#chunk:c000001`

Declared source payload:

- `.runs/linear-12bea7bd-4716-4c9a-a49c-74d29151bedf-docs-packet/cli/2026-04-19T15-25-22-612Z-23c80dc9/memory/source-0/source.txt`

Child-lane caveat:

- The declared source payload is absent in this checkout, so the plan preserves the parent-provided issue description terms and read-only source paths.

`CO-223` / `PR #556` evidence paths:

- `origin/co-260-local-rollout-executor:docs/PRD-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md`
- `origin/co-260-local-rollout-executor:tasks/specs/linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md`
- `origin/co-260-local-rollout-executor:tasks/tasks-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md`

`CO-260` / `PR #555` evidence paths:

- `origin/co-260-local-rollout-executor:docs/PRD-CO-260-local-rollout-executor.md`
- `origin/co-260-local-rollout-executor:tasks/specs/CO-260-local-rollout-executor.md`
- `origin/co-260-local-rollout-executor:docs/ACTION_PLAN-CO-260-local-rollout-executor.md`
- `origin/co-260-local-rollout-executor:tasks/tasks-linear-c9e99e2c-bc48-48f1-a8ca-4bd2a9289be2.md`

## Plan

1. Accept and refine the docs-first packet files in the declared scope.
2. Register task mirrors in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
3. Preserve the protected terms exactly:
   - `ready-review`
   - `CodeRabbit rereview pending`
   - `statusCheckRollup`
   - `CodeRabbit SUCCESS`
   - `unresolved review threads`
   - `mergeStateStatus CLEAN`
   - `PR #556`
   - `PR #555`
   - `CO-223`
   - `CO-260`
4. Implement the readiness contract:
   - Clear the CodeRabbit rereview latch only for current-head `CodeRabbit SUCCESS`.
   - Keep `unresolved review threads`, current-head unacknowledged bot feedback, and merge-state blockers as hard readiness gates.
   - Fail closed for missing, pending, failed, or stale CodeRabbit status.
   - Emit diagnostics for raw pending bots, effective pending bots, cleared stale pending bots, and CodeRabbit current-head status rollup.
5. Add focused `tests/pr-watch-merge.spec.ts` coverage for stale latch cleanup, real pending CodeRabbit, unresolved threads, and diagnostic output.
6. Run focused validation first, then the required parent validation and review gates.

## Parent Integration Plan

Before review handoff, the parent lane should:

1. Refresh the Linear workpad with child-lane acceptance, implementation summary, and validation status.
2. Run manifest-backed standalone review and an explicit elegance/minimality pass.
3. Merge current `origin/main`, open/update and attach the PR, wait for green checks, and run the `pr ready-review` drain.
4. Transition to `In Review` only after the drain is clean or a blocker is explicitly handled.

## Exit Criteria For This Child Lane

- Docs packet and registry mirrors are current.
- The packet references `PR #556`, `PR #555`, `CO-223`, and `CO-260` source evidence paths.
- Focused tests prove stale CodeRabbit rereview latch cleanup and valid pending CodeRabbit blocking.
- Required validation and review gates complete or have explicit, justified blocker notes.
