# Agent Task Mirror: CO-262 ready-review CodeRabbit rereview latch

## Scope

- Task id: `linear-12bea7bd-4716-4c9a-a49c-74d29151bedf`
- Linear issue: `CO-262`
- Child lane: docs packet accepted
- Parent lane owns implementation, Linear state, workpad, PR lifecycle, and registry mirrors.

## Owned Files

- `docs/PRD-linear-12bea7bd-4716-4c9a-a49c-74d29151bedf.md`
- `docs/TECH_SPEC-linear-12bea7bd-4716-4c9a-a49c-74d29151bedf.md`
- `docs/ACTION_PLAN-linear-12bea7bd-4716-4c9a-a49c-74d29151bedf.md`
- `tasks/specs/linear-12bea7bd-4716-4c9a-a49c-74d29151bedf.md`
- `tasks/tasks-linear-12bea7bd-4716-4c9a-a49c-74d29151bedf.md`
- `.agent/task/linear-12bea7bd-4716-4c9a-a49c-74d29151bedf.md`

## Protected Terms

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

## Checklist

- [x] PRD created at `docs/PRD-linear-12bea7bd-4716-4c9a-a49c-74d29151bedf.md`.
- [x] TECH_SPEC created at `docs/TECH_SPEC-linear-12bea7bd-4716-4c9a-a49c-74d29151bedf.md`.
- [x] ACTION_PLAN created at `docs/ACTION_PLAN-linear-12bea7bd-4716-4c9a-a49c-74d29151bedf.md`.
- [x] Task spec mirror created at `tasks/specs/linear-12bea7bd-4716-4c9a-a49c-74d29151bedf.md`.
- [x] Task checklist created at `tasks/tasks-linear-12bea7bd-4716-4c9a-a49c-74d29151bedf.md`.
- [x] Agent task mirror created at `.agent/task/linear-12bea7bd-4716-4c9a-a49c-74d29151bedf.md`.
- [x] `CO-223` / `PR #556` source evidence paths referenced in the docs packet.
- [x] `CO-260` / `PR #555` source evidence paths referenced in the docs packet.
- [x] Protected-term grep completed over the six owned files.
- [x] `git diff --check` completed over the six owned files.
- [x] Parent registers the task in `tasks/index.json`.
- [x] Parent updates `docs/TASKS.md`.
- [x] Parent updates `docs/docs-freshness-registry.json`.
- [x] Parent implements and tests the `ready-review` latch behavior. Evidence: `npx vitest run tests/pr-watch-merge.spec.ts` passed with 82 tests.

## Source Notes

- Source anchor: `ctx:sha256:da19ec03e5c89cbe79e6e15120de3e9039ee81e75235ba564c59bb026184f5a2#chunk:c000001`
- Declared source payload: `.runs/linear-12bea7bd-4716-4c9a-a49c-74d29151bedf-docs-packet/cli/2026-04-19T15-25-22-612Z-23c80dc9/memory/source-0/source.txt`
- Child-lane caveat: the declared source payload is absent from this checkout; this mirror preserves the parent-provided issue constraints and evidence paths.

## Parent Implementation Reminder

The intended behavior is not "ignore CodeRabbit." The intended behavior is: when `ready-review` sees current-head `statusCheckRollup` with `CodeRabbit SUCCESS`, zero `unresolved review threads`, and `mergeStateStatus CLEAN`, it should clear the stale `CodeRabbit rereview pending` latch. It should continue to fail closed for missing, pending, failed, stale, or contradicted CodeRabbit and review-thread states.
