# TECH_SPEC: CO-262 ready-review CodeRabbit rereview latch

## Metadata

- Task id: `linear-12bea7bd-4716-4c9a-a49c-74d29151bedf`
- Linear issue: `CO-262`
- Phase: docs-first implementation
- Last review: `2026-04-20`
- Source anchor: `ctx:sha256:da19ec03e5c89cbe79e6e15120de3e9039ee81e75235ba564c59bb026184f5a2#chunk:c000001`
- Declared source payload: `.runs/linear-12bea7bd-4716-4c9a-a49c-74d29151bedf-docs-packet/cli/2026-04-19T15-25-22-612Z-23c80dc9/memory/source-0/source.txt`
- Child-lane caveat: the declared payload is absent from this checkout; the spec is constrained to the parent-provided issue terms and read-only source evidence paths.

## Scope

Parent implementation should make a narrow `ready-review` readiness-latch change. The docs child lane created the initial packet; the parent lane owns implementation, tests, registry mirrors, Linear state, and PR state.

Likely parent-owned implementation surfaces:

- `scripts/lib/pr-watch-merge.js`
- `tests/pr-watch-merge.spec.ts`

Registration surfaces:

- `tasks/index.json`
- `docs/TASKS.md`
- `docs/docs-freshness-registry.json`

## Source Evidence Paths

`CO-223` / `PR #556` evidence:

- `origin/co-260-local-rollout-executor:docs/PRD-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md`
- `origin/co-260-local-rollout-executor:docs/TECH_SPEC-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md`
- `origin/co-260-local-rollout-executor:docs/ACTION_PLAN-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md`
- `origin/co-260-local-rollout-executor:tasks/specs/linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md`
- `origin/co-260-local-rollout-executor:tasks/tasks-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md`
- `origin/co-260-local-rollout-executor:.agent/task/linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md`

`CO-260` / `PR #555` evidence:

- `origin/co-260-local-rollout-executor:docs/PRD-CO-260-local-rollout-executor.md`
- `origin/co-260-local-rollout-executor:tasks/specs/CO-260-local-rollout-executor.md`
- `origin/co-260-local-rollout-executor:docs/ACTION_PLAN-CO-260-local-rollout-executor.md`
- `origin/co-260-local-rollout-executor:tasks/tasks-linear-c9e99e2c-bc48-48f1-a8ca-4bd2a9289be2.md`
- `origin/co-260-local-rollout-executor:.agent/task/linear-c9e99e2c-bc48-48f1-a8ca-4bd2a9289be2.md`

## Required Behavior

`ready-review` must clear stale `CodeRabbit rereview pending` only when all of the following current-head conditions are true:

1. `statusCheckRollup` contains a current-head CodeRabbit check with `CodeRabbit SUCCESS`.
2. `unresolved review threads` is zero.
3. Current-head bot feedback fetch did not fail.
4. Current-head unacknowledged bot feedback count is zero.
5. No current-head actionable review state contradicts readiness.

`mergeStateStatus CLEAN` remains an independent readiness gate. If the PR is dirty while CodeRabbit current-head truth is successful and feedback/thread truth is clean, `ready-review` should clear the stale CodeRabbit latch and report the merge-state blocker instead.

`ready-review` must continue to block when any of these conditions is true:

- CodeRabbit is absent from `statusCheckRollup`.
- CodeRabbit is pending, failed, cancelled, timed out, neutral without an explicit success mapping, or otherwise not `CodeRabbit SUCCESS`.
- The CodeRabbit success belongs to an older head than the PR head under review.
- `unresolved review threads` is nonzero.
- GitHub reports a non-clean merge state. In that case readiness remains blocked by merge state, not by stale `CodeRabbit rereview pending` when CodeRabbit current-head truth is successful.
- Review state includes current actionable changes requested or an equivalent hard-stop signal.

## Protected Terms And Data Contract

The implementation and tests should preserve these exact strings in fixtures, assertions, and review summaries when possible:

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

The positive latch-clearing contract is conjunctive:

```text
currentHead(statusCheckRollup.CodeRabbit == SUCCESS)
AND unresolved review threads == 0
AND unacknowledged current-head bot feedback == 0
AND bot feedback fetch succeeded
AND no actionable current-head review blockers
=> clear CodeRabbit rereview pending
```

The negative contract for CodeRabbit rereview state is fail-closed:

```text
missing_or_non_success_CodeRabbit
OR stale_head_success
OR unresolved review threads > 0
OR unacknowledged current-head bot feedback > 0
OR bot feedback fetch unknown
OR actionable_current_head_review_blocker
=> keep CodeRabbit rereview pending
```

Merge-state readiness stays separate:

```text
non_clean_merge_state
=> block ready-review with merge_state=<state>
```

## Implementation Guidance For Parent Lane

1. Locate the existing `ready-review` status snapshot and bot rereview derivation in `scripts/lib/pr-watch-merge.js`.
2. Preserve existing issue-comment and review-thread logic, but add a current-head `statusCheckRollup` path that recognizes `CodeRabbit SUCCESS` as CodeRabbit rereview completion.
3. Gate the new success path behind current-head identity. Do not accept stale check results from an earlier PR head.
4. Keep `unresolved review threads` as an independent hard gate.
5. Keep `mergeStateStatus CLEAN` as a separate readiness input. It must not override a failed/missing CodeRabbit state or unresolved threads, and dirty merge state must surface as merge-state truth rather than a stale rereview latch when CodeRabbit is successful.
6. Emit status text and diagnostics that distinguish pending CodeRabbit rereview, stale CodeRabbit latch cleanup, unresolved review threads, unacknowledged bot feedback, and merge-state blockers.

## Focused Test Plan For Parent Lane

Parent should add or update focused tests in `tests/pr-watch-merge.spec.ts` covering:

- Positive case: prior CodeRabbit approval/comment evidence predates the newest head, current-head `statusCheckRollup` includes `CodeRabbit SUCCESS`, `unresolved review threads` is zero, feedback truth is clean, `mergeStateStatus CLEAN` is present, and `ready-review` does not report `CodeRabbit rereview pending`.
- Negative case: CodeRabbit is pending in `statusCheckRollup`, so `ready-review` reports `CodeRabbit rereview pending`.
- Negative case: `unresolved review threads` is nonzero, so readiness remains blocked even with `CodeRabbit SUCCESS`.
- Negative case: current-head bot feedback is unacknowledged or unknown, so readiness remains blocked even with `CodeRabbit SUCCESS`.
- Merge-state case: merge state is not clean, so readiness remains blocked by `merge_state=<state>` even when stale CodeRabbit pending is cleared.

Suggested scoped validation after implementation:

```bash
npx vitest run --config vitest.config.core.ts tests/pr-watch-merge.spec.ts
```

## Risks

- Over-broad success matching could let any passing check clear CodeRabbit-specific rereview state.
- Ignoring head identity could clear the latch from stale `statusCheckRollup` data.
- Collapsing thread and check gates could hide actionable `unresolved review threads`.
- Treating `mergeStateStatus CLEAN` as sufficient by itself could weaken review readiness.

## Child-Lane Validation

This child lane should run only docs-scoped checks:

```bash
rg -n "ready-review|CodeRabbit rereview pending|statusCheckRollup|CodeRabbit SUCCESS|unresolved review threads|mergeStateStatus CLEAN|PR #556|PR #555|CO-223|CO-260" docs/PRD-linear-12bea7bd-4716-4c9a-a49c-74d29151bedf.md docs/TECH_SPEC-linear-12bea7bd-4716-4c9a-a49c-74d29151bedf.md docs/ACTION_PLAN-linear-12bea7bd-4716-4c9a-a49c-74d29151bedf.md tasks/specs/linear-12bea7bd-4716-4c9a-a49c-74d29151bedf.md tasks/tasks-linear-12bea7bd-4716-4c9a-a49c-74d29151bedf.md .agent/task/linear-12bea7bd-4716-4c9a-a49c-74d29151bedf.md
git diff --check -- docs/PRD-linear-12bea7bd-4716-4c9a-a49c-74d29151bedf.md docs/TECH_SPEC-linear-12bea7bd-4716-4c9a-a49c-74d29151bedf.md docs/ACTION_PLAN-linear-12bea7bd-4716-4c9a-a49c-74d29151bedf.md tasks/specs/linear-12bea7bd-4716-4c9a-a49c-74d29151bedf.md tasks/tasks-linear-12bea7bd-4716-4c9a-a49c-74d29151bedf.md .agent/task/linear-12bea7bd-4716-4c9a-a49c-74d29151bedf.md
```
