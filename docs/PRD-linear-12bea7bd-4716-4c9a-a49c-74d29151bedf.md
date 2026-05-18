# PRD: CO-262 ready-review CodeRabbit rereview latch

## Traceability

- Linear issue: `CO-262`
- Task id: `linear-12bea7bd-4716-4c9a-a49c-74d29151bedf`
- Phase: docs-first implementation
- Owned surfaces: docs packet, task registry mirrors, `ready-review` implementation, and focused regression coverage.
- Source anchor: `ctx:sha256:da19ec03e5c89cbe79e6e15120de3e9039ee81e75235ba564c59bb026184f5a2#chunk:c000001`
- Declared source payload: `.runs/linear-12bea7bd-4716-4c9a-a49c-74d29151bedf-docs-packet/cli/2026-04-19T15-25-22-612Z-23c80dc9/memory/source-0/source.txt`
- Source payload caveat: the declared payload is not present in this child-lane checkout, so this packet preserves the parent-provided issue terms and cites read-only evidence paths for the related source lanes.

## User Request Translation

Implement a narrow fix for the `ready-review` CodeRabbit rereview latch. The issue evidence says the readiness path can still report `CodeRabbit rereview pending` even when current-head GitHub state already provides machine-checkable readiness evidence through `statusCheckRollup`, `CodeRabbit SUCCESS`, `unresolved review threads`, and `mergeStateStatus CLEAN`.

The task must preserve the issue framing and connect it to the cited source evidence for `PR #556` / `CO-223` and the stacked `PR #555` / `CO-260` work. The docs child lane produced the initial packet; the parent lane owns task registration, implementation, validation, Linear workpad updates, and PR lifecycle.

## Problem Statement

`ready-review` should not keep a stale `CodeRabbit rereview pending` block when the current PR head has already reached `CodeRabbit SUCCESS` in `statusCheckRollup`, has zero `unresolved review threads`, and reports `mergeStateStatus CLEAN`.

The failure mode matters because it can leave an otherwise clean review handoff stuck behind an already-satisfied CodeRabbit rereview latch. The issue evidence names `PR #556` for `CO-223` and `PR #555` for `CO-260` as the relevant source context, so the implementation must be scoped to the review-readiness latch and not reinterpret either feature lane.

## Desired Outcome

- `ready-review` clears stale `CodeRabbit rereview pending` when current-head `statusCheckRollup` contains `CodeRabbit SUCCESS`, `unresolved review threads` is zero, and no current-head bot feedback fetch/unacknowledged-feedback blocker remains.
- `ready-review` still blocks when CodeRabbit is missing, pending, failing, stale to an older head, or when actionable review feedback remains.
- `ready-review` still treats `unresolved review threads` as a separate hard gate.
- `ready-review` still treats `mergeStateStatus CLEAN` as a separate readiness gate; a dirty branch should block on merge state, not on a stale CodeRabbit latch when current-head CodeRabbit truth is successful.
- The parent lane can implement focused code/test changes without expanding into `CO-223` or `CO-260` behavior.

## Protected Terms

The following terms are source-critical and must remain exact in implementation and review notes:

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

## Source Evidence Paths

`CO-223` / `PR #556` evidence paths:

- `origin/co-260-local-rollout-executor:docs/PRD-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md`
- `origin/co-260-local-rollout-executor:docs/TECH_SPEC-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md`
- `origin/co-260-local-rollout-executor:docs/ACTION_PLAN-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md`
- `origin/co-260-local-rollout-executor:tasks/specs/linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md`
- `origin/co-260-local-rollout-executor:tasks/tasks-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md`
- `origin/co-260-local-rollout-executor:.agent/task/linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md`

`CO-260` / `PR #555` evidence paths:

- `origin/co-260-local-rollout-executor:docs/PRD-CO-260-local-rollout-executor.md`
- `origin/co-260-local-rollout-executor:tasks/specs/CO-260-local-rollout-executor.md`
- `origin/co-260-local-rollout-executor:docs/ACTION_PLAN-CO-260-local-rollout-executor.md`
- `origin/co-260-local-rollout-executor:tasks/tasks-linear-c9e99e2c-bc48-48f1-a8ca-4bd2a9289be2.md`
- `origin/co-260-local-rollout-executor:.agent/task/linear-c9e99e2c-bc48-48f1-a8ca-4bd2a9289be2.md`

## Alignment Matrix

| Surface | Current / Reference Evidence | Target Behavior |
| --- | --- | --- |
| `ready-review` CodeRabbit latch | Issue evidence preserves `CodeRabbit rereview pending` as the stale block to address. | Clear the stale latch only when current-head machine evidence proves `CodeRabbit SUCCESS` and feedback/thread truth is clean. |
| GitHub status proof | `statusCheckRollup` can expose `CodeRabbit SUCCESS` for the current head. | Treat current-head `CodeRabbit SUCCESS` as a valid rereview completion signal. |
| Review-thread proof | `unresolved review threads` remains a separate source of actionable feedback. | Do not clear readiness if any actionable thread remains unresolved. |
| Merge readiness | `mergeStateStatus CLEAN` confirms GitHub sees the PR as clean to merge. | Keep it as a separate readiness gate so dirty branches block on merge state rather than stale rereview state. |
| `PR #556` / `CO-223` | Source lane for stale tracked Linear fallback closeout. | Preserve as source evidence only; do not change CO-223 behavior. |
| `PR #555` / `CO-260` | Stacked local rollout executor lane. | Preserve as source evidence only; do not change CO-260 behavior. |

## Non-Goals

- Do not disable CodeRabbit gating globally.
- Do not treat any green check as equivalent to `CodeRabbit SUCCESS`.
- Do not ignore `unresolved review threads`.
- Do not require an issue-comment rereview completion when current-head `statusCheckRollup` already proves `CodeRabbit SUCCESS`.
- Do not mutate Linear or PR state.

## Not Done If

- `ready-review` can still report `CodeRabbit rereview pending` when current-head `statusCheckRollup` has `CodeRabbit SUCCESS`, `unresolved review threads` is zero, no current-head bot feedback blocker remains, and `mergeStateStatus CLEAN` is present.
- A stale or older-head `CodeRabbit SUCCESS` clears the latch.
- Readiness passes while `unresolved review threads` remains nonzero.
- The fix changes `CO-223` tracked Linear fallback behavior or `CO-260` local rollout executor behavior.
- The docs packet omits the source evidence paths for `PR #556`, `PR #555`, `CO-223`, or `CO-260`.

## Acceptance Criteria

- Add regression coverage for a PR whose prior CodeRabbit approval/comment predates the newest head while current `statusCheckRollup` reports `CodeRabbit SUCCESS` and review threads are resolved.
- Derive `CodeRabbit rereview pending` from current-head evidence and resolved-thread truth, not stale local latch state alone.
- Keep valid in-progress CodeRabbit reviews blocking until complete.
- Explain which exact current-head signal is blocking when `ready-review` waits.
- Reference `CO-223` / `PR #556` and `CO-260` / `PR #555` evidence in this task packet.
- Add a lightweight diagnostic field so future parent orchestrators can distinguish stale rereview latch from real review pending.
