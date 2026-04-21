# ACTION_PLAN: CO-272 Durable README Guidance

## Goal

Replace dead `.runs/0801-dead-code-pruning/archive/...` README guidance with durable tracked guidance in the scoped Task 0801 README residue, then refresh the `CO-272` docs-first packet and registry mirrors.

## Constraints

- Work only inside this child lane workspace.
- Edit only files in the declared docs scope.
- Do not mutate Linear, GitHub PRs, temporary workpad files, or parent-owned coordination state.
- Do not widen beyond current tracked Task 0801 README archive-pointer residue.
- Do not run full repo validation suites.
- Preserve valid abetkaua mirror workflow and separate non-0801 run-manifest history.

## Source Evidence

- Source anchor: `ctx:sha256:89eae343f6b7d6c89e08d2ae54c394e5c638f9dcb5407f0a55fe38560772d55b#chunk:c000001`
- Source object id: `sha256:89eae343f6b7d6c89e08d2ae54c394e5c638f9dcb5407f0a55fe38560772d55b`
- Declared source payload: `.runs/linear-9dacc402-e9b6-40c4-b657-d4b91b68c941-co272-readme-guidance/cli/2026-04-21T13-03-01-509Z-99593f7b/memory/source-0/source.txt`
- Declared manifest: `.runs/linear-9dacc402-e9b6-40c4-b657-d4b91b68c941-co272-readme-guidance/cli/2026-04-21T13-03-01-509Z-99593f7b/manifest.json`
- Caveat: the declared source payload path is absent in this child checkout, so the live README scan and prior attempt `31c319913` are supporting references.

## Steps

1. Replace the dead Task 0801 archive pointer in `archives/hi-fi-tests/README.md` with tracked stub and regeneration guidance.
2. Replace the dead Task 0801 archive pointer in `packages/abetkaua/README.md` while preserving mirror fetch, serve, check, and manifest sections.
3. Replace the dead Task 0801 archive pointer in `packages/abetkaua/public/README.md` with fetch, check, and serve commands.
4. Replace the same dead archive-pointer pattern in `des-obys`, `eminente`, and `obys-library` README stubs with project-specific regeneration, validation, and serve commands.
5. Replace `reference/plus-ex-15th/README.md` archive/serve guidance with tracked loader-metadata and hi-fi toolkit regeneration guidance.
6. Refresh the PRD, TECH_SPEC, ACTION_PLAN, task spec mirror, task checklist, and agent task mirror.
7. Register the packet in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
8. Run the tracked README stale-path check plus JSON/diff checks needed for this docs slice.

## Exit Criteria

- The old `.runs/0801-dead-code-pruning/archive` path has no tracked README matches.
- Registry JSON parses.
- `git diff --check` passes for the touched files.
- The workspace keeps the patch in place for parent export.
- No commit is created.
