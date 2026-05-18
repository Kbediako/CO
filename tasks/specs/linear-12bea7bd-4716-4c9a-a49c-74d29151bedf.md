---
id: 20260420-linear-12bea7bd-4716-4c9a-a49c-74d29151bedf
title: "CO-262 ready-review CodeRabbit rereview latch"
status: done
relates_to: docs/PRD-linear-12bea7bd-4716-4c9a-a49c-74d29151bedf.md
risk: high
owners:
  - Codex
last_review: 2026-05-18
review_notes:
  - 2026-05-18: CO-522 spec lifecycle audit found the linked task checklist has zero unchecked items (14 checked), so this spec is terminal and eligible for implementation-docs archive. Evidence: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/spec-preexpiry-local-classification.json`.
---

# Task Spec: CO-262 ready-review CodeRabbit rereview latch

## Metadata

- Task id: `linear-12bea7bd-4716-4c9a-a49c-74d29151bedf`
- Linear issue: `CO-262`
- Status: docs packet prepared by child lane
- Last review: `2026-04-20`
- PRD: `docs/PRD-linear-12bea7bd-4716-4c9a-a49c-74d29151bedf.md`
- Technical spec: `docs/TECH_SPEC-linear-12bea7bd-4716-4c9a-a49c-74d29151bedf.md`
- Action plan: `docs/ACTION_PLAN-linear-12bea7bd-4716-4c9a-a49c-74d29151bedf.md`

## User Intent

Create the docs-first packet for a narrow `ready-review` fix. The issue is that `CodeRabbit rereview pending` can remain as a readiness block even when current-head GitHub evidence has `statusCheckRollup` with `CodeRabbit SUCCESS`, zero `unresolved review threads`, and `mergeStateStatus CLEAN`.

The source context is `PR #556` for `CO-223` and the stacked `PR #555` for `CO-260`. These are evidence sources only; their feature behavior is not in scope for this task.

## Source Anchor

- Pointer: `ctx:sha256:da19ec03e5c89cbe79e6e15120de3e9039ee81e75235ba564c59bb026184f5a2#chunk:c000001`
- Declared payload: `.runs/linear-12bea7bd-4716-4c9a-a49c-74d29151bedf-docs-packet/cli/2026-04-19T15-25-22-612Z-23c80dc9/memory/source-0/source.txt`
- Caveat: the declared payload is not present in this child checkout; the packet is constrained by the parent-provided protected terms and read-only source path evidence.

## Source Evidence Paths

`CO-223` / `PR #556`:

- `origin/co-260-local-rollout-executor:docs/PRD-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md`
- `origin/co-260-local-rollout-executor:docs/TECH_SPEC-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md`
- `origin/co-260-local-rollout-executor:docs/ACTION_PLAN-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md`
- `origin/co-260-local-rollout-executor:tasks/specs/linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md`
- `origin/co-260-local-rollout-executor:tasks/tasks-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md`
- `origin/co-260-local-rollout-executor:.agent/task/linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md`

`CO-260` / `PR #555`:

- `origin/co-260-local-rollout-executor:docs/PRD-CO-260-local-rollout-executor.md`
- `origin/co-260-local-rollout-executor:tasks/specs/CO-260-local-rollout-executor.md`
- `origin/co-260-local-rollout-executor:docs/ACTION_PLAN-CO-260-local-rollout-executor.md`
- `origin/co-260-local-rollout-executor:tasks/tasks-linear-c9e99e2c-bc48-48f1-a8ca-4bd2a9289be2.md`
- `origin/co-260-local-rollout-executor:.agent/task/linear-c9e99e2c-bc48-48f1-a8ca-4bd2a9289be2.md`

## Target Contract

The parent implementation should make `ready-review` clear `CodeRabbit rereview pending` only when:

- `statusCheckRollup` contains current-head `CodeRabbit SUCCESS`.
- `unresolved review threads` is zero.
- No current-head actionable review blocker remains.

The parent implementation should keep blocking when:

- CodeRabbit is missing, pending, failed, or stale.
- `unresolved review threads` is nonzero.
- merge state is not clean, as an independent merge-state blocker rather than part of the `CodeRabbit rereview pending` latch-clear condition.
- actionable current-head review feedback remains.

`mergeStateStatus CLEAN` remains the merge-readiness target for a fully ready PR, but `ready-review` must report merge-state truth separately when current-head CodeRabbit evidence is already clean.

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

## Not Done If

- Any stale `CodeRabbit SUCCESS` can clear the latch.
- Any unresolved review thread is ignored.
- `mergeStateStatus CLEAN` is treated as sufficient without `CodeRabbit SUCCESS`.
- The implementation changes `CO-223` or `CO-260` behavior.
- Parent integration forgets to register the packet in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.

## Child-Lane Verification

This lane should verify only the docs packet:

```bash
rg -n "ready-review|CodeRabbit rereview pending|statusCheckRollup|CodeRabbit SUCCESS|unresolved review threads|mergeStateStatus CLEAN|PR #556|PR #555|CO-223|CO-260" docs/PRD-linear-12bea7bd-4716-4c9a-a49c-74d29151bedf.md docs/TECH_SPEC-linear-12bea7bd-4716-4c9a-a49c-74d29151bedf.md docs/ACTION_PLAN-linear-12bea7bd-4716-4c9a-a49c-74d29151bedf.md tasks/specs/linear-12bea7bd-4716-4c9a-a49c-74d29151bedf.md tasks/tasks-linear-12bea7bd-4716-4c9a-a49c-74d29151bedf.md .agent/task/linear-12bea7bd-4716-4c9a-a49c-74d29151bedf.md
git diff --check -- docs/PRD-linear-12bea7bd-4716-4c9a-a49c-74d29151bedf.md docs/TECH_SPEC-linear-12bea7bd-4716-4c9a-a49c-74d29151bedf.md docs/ACTION_PLAN-linear-12bea7bd-4716-4c9a-a49c-74d29151bedf.md tasks/specs/linear-12bea7bd-4716-4c9a-a49c-74d29151bedf.md tasks/tasks-linear-12bea7bd-4716-4c9a-a49c-74d29151bedf.md .agent/task/linear-12bea7bd-4716-4c9a-a49c-74d29151bedf.md
```
