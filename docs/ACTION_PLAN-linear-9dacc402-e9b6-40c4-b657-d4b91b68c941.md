# ACTION_PLAN: CO-272 replace dead-code-pruning .runs archive pointers with durable tracked guidance

## Goal

Prepare and hand off a docs-first `CO-272` packet so the parent lane can make a narrow tracked-docs truthfulness fix: replace the dead-code-pruning `.runs/0801-dead-code-pruning/archive/...` guidance only in `archives/hi-fi-tests/README.md`, `packages/abetkaua/README.md`, and `packages/abetkaua/public/README.md`.

## Constraints

- This child lane edits only docs and registry mirror files in the declared scope.
- Do not edit implementation or tests from this lane.
- Do not call Linear mutation helpers.
- Do not run full repo validation suites.
- Do not widen to broad archive cleanup.
- Do not touch `packages/des-obys/**`, `packages/eminente/**`, `packages/obys-library/**`, or `reference/plus-ex-15th/**`.
- Do not strip valid non-0801 mirror workflow or manifest history from `packages/abetkaua/README.md`.

## Source Evidence

- Linear issue: `CO-272`
- Source anchor: `ctx:sha256:d4c5803349b61c83660da96bb41682fa54060c07fa041841daece9d9a505d12e#chunk:c000001`
- Source object id: `sha256:d4c5803349b61c83660da96bb41682fa54060c07fa041841daece9d9a505d12e`
- Declared source payload: `.runs/linear-9dacc402-e9b6-40c4-b657-d4b91b68c941-co272-docs-packet/cli/2026-04-21T03-23-37-462Z-7f379f9c/memory/source-0/source.txt`
- Declared manifest: `.runs/linear-9dacc402-e9b6-40c4-b657-d4b91b68c941-co272-docs-packet/cli/2026-04-21T03-23-37-462Z-7f379f9c/manifest.json`
- Source caveat: the expected shared source payload is absent in this child checkout. This action plan preserves the parent-provided issue contract plus live repo truth in the three target README files; no Linear mutation was performed.

## Plan

1. Create the PRD, TECH_SPEC, ACTION_PLAN, task spec mirror, task checklist, and agent task mirror for `linear-9dacc402-e9b6-40c4-b657-d4b91b68c941`.
2. Register the packet in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
3. Preserve the protected issue wording:
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
4. Record issue-quality review, wrong interpretations, non-goals, `Not Done If`, and the out-of-scope follow-up boundary.
5. Run only scoped docs/JSON validation and leave the patch in the child lane workspace for parent export.

## Parent Implementation Plan

1. Edit `archives/hi-fi-tests/README.md` so it no longer points to `.runs/0801-dead-code-pruning/archive/2025-12-08T10-01-24Z/archives/hi-fi-tests/`.
2. Edit `packages/abetkaua/README.md` so it no longer says the previous static snapshot lives under `.runs/0801-dead-code-pruning/archive/.../packages/abetkaua/public/`.
3. Edit `packages/abetkaua/public/README.md` so it no longer tells readers to use the dead-code-pruning archive path.
4. Replace those exact pointer sentences with durable tracked guidance tied to current mirror workflow and tracked docs.
5. Preserve `packages/abetkaua/README.md` mirror fetch/serve/check commands and do not remove separate non-0801 mirror-manifest history unless another issue explicitly owns that change.
6. Do not touch `packages/des-obys/**`, `packages/eminente/**`, `packages/obys-library/**`, or `reference/plus-ex-15th/**`; if those surfaces still need work, open or use a separate parent-owned follow-up.
7. Run only focused docs checks on the three implementation files before handoff.

## Exit Criteria For This Child Lane

- Docs-first packet files exist in the declared scope.
- Registry mirrors are updated in the declared scope.
- Protected terms are present across the packet.
- JSON registries parse.
- `git diff --check` passes for the touched docs and registry files.
- No implementation or test files are edited.
- No commit is created.
