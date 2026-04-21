# Task Checklist: CO-272 replace dead-code-pruning .runs archive pointers with durable tracked guidance

## Scope

- Task id: `linear-9dacc402-e9b6-40c4-b657-d4b91b68c941`
- Registry id: `20260421-linear-9dacc402-e9b6-40c4-b657-d4b91b68c941`
- Linear issue: `CO-272`
- Issue id: `9dacc402-e9b6-40c4-b657-d4b91b68c941`
- Child lane: docs packet only
- Parent lane owns Linear state, workpad, implementation, validation, PR lifecycle, and merge.

## Owned Files

- `docs/PRD-linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md`
- `docs/TECH_SPEC-linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md`
- `docs/ACTION_PLAN-linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md`
- `tasks/specs/linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md`
- `tasks/tasks-linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md`
- `.agent/task/linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md`
- `tasks/index.json`
- `docs/TASKS.md`
- `docs/docs-freshness-registry.json`

## Protected Terms

- `dead-code-pruning .runs archive pointers`
- `durable tracked guidance`
- `archives/hi-fi-tests/README.md`
- `packages/abetkaua/README.md`
- `packages/abetkaua/public/README.md`
- `.runs/0801-dead-code-pruning/archive/2025-12-08T10-01-24Z`
- `docs/guides/pixel-perfect-local-clones.md`
- `Task 0801`
- `broad archive cleanup`
- `des-obys`
- `eminente`
- `obys-library`
- `reference/plus-ex-15th`

## Issue-Quality Review

- [x] Issue preserves the exact three target README surfaces.
- [x] Issue preserves the exact `dead-code-pruning .runs archive pointers` to `durable tracked guidance` wording.
- [x] Issue explicitly rejects broad archive cleanup.
- [x] Issue explicitly preserves the distinction between the dead-code-pruning archive pointer and other valid abetkaua mirror workflow/manifests.
- [x] Issue explicitly pushes `des-obys`, `eminente`, `obys-library`, and `reference/plus-ex-15th` to separate parent-owned follow-up.

## Docs Checklist

- [x] PRD created at `docs/PRD-linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md`.
- [x] TECH_SPEC created at `docs/TECH_SPEC-linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md`.
- [x] ACTION_PLAN created at `docs/ACTION_PLAN-linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md`.
- [x] Task spec mirror created at `tasks/specs/linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md`.
- [x] Task checklist created at `tasks/tasks-linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md`.
- [x] Agent task mirror created at `.agent/task/linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md`.
- [x] Registry item added to `tasks/index.json`.
- [x] Snapshot entry added to `docs/TASKS.md`.
- [x] Freshness entries added to `docs/docs-freshness-registry.json`.
- [x] Scoped validation commands completed. Evidence: JSON parse, protected-term `rg`, scoped `git diff --check`, and all-touched-file trailing-whitespace check passed on 2026-04-21.

## Parent Implementation Checklist

- [x] Replace the dead-code-pruning archive-pointer guidance only in `archives/hi-fi-tests/README.md`.
- [x] Replace the dead-code-pruning archive-pointer sentence only in `packages/abetkaua/README.md`.
- [x] Replace the dead-code-pruning archive-pointer guidance only in `packages/abetkaua/public/README.md`.
- [x] Preserve the existing abetkaua mirror fetch/serve/check workflow and separate non-0801 mirror-manifest history in `packages/abetkaua/README.md` unless another issue explicitly owns their removal.
- [x] Do not edit `packages/des-obys/**`, `packages/eminente/**`, `packages/obys-library/**`, or `reference/plus-ex-15th/**` under `CO-272`; broader residue moved to follow-up `CO-276`.
- [x] Run parent-owned focused docs validation before PR handoff. Evidence: `jq empty tasks/index.json docs/docs-freshness-registry.json`, no-match `rg` on the old `0801` archive path across the three target README files, preserved abetkaua mirror commands via `rg`, scoped `git diff --check`, and all-touched-file trailing-whitespace check on 2026-04-21.

## Source Notes

- Source anchor: `ctx:sha256:d4c5803349b61c83660da96bb41682fa54060c07fa041841daece9d9a505d12e#chunk:c000001`
- Source object id: `sha256:d4c5803349b61c83660da96bb41682fa54060c07fa041841daece9d9a505d12e`
- Declared source payload: `.runs/linear-9dacc402-e9b6-40c4-b657-d4b91b68c941-co272-docs-packet/cli/2026-04-21T03-23-37-462Z-7f379f9c/memory/source-0/source.txt`
- Declared manifest: `.runs/linear-9dacc402-e9b6-40c4-b657-d4b91b68c941-co272-docs-packet/cli/2026-04-21T03-23-37-462Z-7f379f9c/manifest.json`
- Caveat: the expected shared source payload is absent in this child checkout. This checklist preserves the parent-provided CO-272 issue-shaping contract plus live README truth in the three target files; no Linear mutation was performed.

## Validation Commands

```bash
jq empty tasks/index.json docs/docs-freshness-registry.json
rg -n "dead-code-pruning \\.runs archive pointers|durable tracked guidance|archives/hi-fi-tests/README\\.md|packages/abetkaua/README\\.md|packages/abetkaua/public/README\\.md|\\.runs/0801-dead-code-pruning/archive/2025-12-08T10-01-24Z|docs/guides/pixel-perfect-local-clones\\.md|broad archive cleanup|des-obys|eminente|obys-library|reference/plus-ex-15th" docs/PRD-linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md docs/TECH_SPEC-linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md docs/ACTION_PLAN-linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md tasks/specs/linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md tasks/tasks-linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md .agent/task/linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md docs/TASKS.md tasks/index.json
git diff --check -- docs/PRD-linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md docs/TECH_SPEC-linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md docs/ACTION_PLAN-linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md tasks/specs/linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md tasks/tasks-linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md .agent/task/linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json
perl -ne 'if (/[ \t]$/) { print "$ARGV:$.: trailing whitespace\n"; $bad=1 } END { exit($bad ? 1 : 0) }' docs/PRD-linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md docs/TECH_SPEC-linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md docs/ACTION_PLAN-linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md tasks/specs/linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md tasks/tasks-linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md .agent/task/linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json
```
