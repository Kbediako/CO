# Task Checklist: CO-272 Replace Dead .runs Archive Guidance

## Scope

- Task id: `linear-9dacc402-e9b6-40c4-b657-d4b91b68c941`
- Registry id: `20260421-linear-9dacc402-e9b6-40c4-b657-d4b91b68c941`
- Linear issue: `CO-272`
- Child lane: docs implementation slice
- Parent lane owns Linear state, workpad state, PR lifecycle, and final integration.

## Owned Files

- `archives/hi-fi-tests/README.md`
- `packages/abetkaua/README.md`
- `packages/abetkaua/public/README.md`
- `packages/des-obys/README.md`
- `packages/des-obys/public/README.md`
- `packages/eminente/README.md`
- `packages/eminente/public/README.md`
- `packages/obys-library/README.md`
- `packages/obys-library/public/README.md`
- `reference/plus-ex-15th/README.md`
- `.agent/task/linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md`
- `docs/ACTION_PLAN-linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md`
- `docs/PRD-linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md`
- `docs/TECH_SPEC-linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md`
- `tasks/specs/linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md`
- `tasks/tasks-linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md`
- `tasks/index.json`
- `docs/TASKS.md`
- `docs/docs-freshness-registry.json`

## Checklist

- [x] Confirmed tracked README files contained the dead Task 0801 archive pointer before the patch.
- [x] Replaced `archives/hi-fi-tests/README.md` guidance with tracked stub and regeneration guidance.
- [x] Replaced only the dead archive-pointer sentence in `packages/abetkaua/README.md` and preserved mirror workflow/manifests.
- [x] Replaced `packages/abetkaua/public/README.md` guidance with fetch, check, and serve commands.
- [x] Replaced `des-obys`, `eminente`, and `obys-library` README stub guidance with project-specific fetch, check, and serve commands.
- [x] Replaced `reference/plus-ex-15th/README.md` archive/serve guidance with tracked loader-metadata and hi-fi toolkit regeneration guidance.
- [x] Refreshed PRD, TECH_SPEC, ACTION_PLAN, task spec, task checklist, and agent mirror.
- [x] Registered the packet in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- [x] Run targeted stale-path absence check. Evidence: `git grep -n "\\.runs/.*/archive" -- "*README.md"` returned no matches on 2026-04-21.
- [x] Run scoped JSON/diff checks. Evidence: `jq empty tasks/index.json docs/docs-freshness-registry.json`, preserved-command `rg`, scoped `git diff --check`, and all-touched-file trailing-whitespace check passed on 2026-04-21.

## Protected Terms

- `dead-code-pruning .runs archive pointers`
- `durable tracked guidance`
- `archives/hi-fi-tests/README.md`
- `packages/abetkaua/README.md`
- `packages/abetkaua/public/README.md`
- `packages/des-obys/README.md`
- `packages/des-obys/public/README.md`
- `packages/eminente/README.md`
- `packages/eminente/public/README.md`
- `packages/obys-library/README.md`
- `packages/obys-library/public/README.md`
- `reference/plus-ex-15th/README.md`
- `.runs/0801-dead-code-pruning/archive/2025-12-08T10-01-24Z`
- `docs/guides/pixel-perfect-local-clones.md`
- `Task 0801`
- `broad archive cleanup`
- `des-obys`
- `eminente`
- `obys-library`
- `reference/plus-ex-15th`

## Source Notes

- Source anchor: `ctx:sha256:89eae343f6b7d6c89e08d2ae54c394e5c638f9dcb5407f0a55fe38560772d55b#chunk:c000001`
- Source object id: `sha256:89eae343f6b7d6c89e08d2ae54c394e5c638f9dcb5407f0a55fe38560772d55b`
- Declared source payload: `.runs/linear-9dacc402-e9b6-40c4-b657-d4b91b68c941-co272-readme-guidance/cli/2026-04-21T13-03-01-509Z-99593f7b/memory/source-0/source.txt`
- Declared manifest: `.runs/linear-9dacc402-e9b6-40c4-b657-d4b91b68c941-co272-readme-guidance/cli/2026-04-21T13-03-01-509Z-99593f7b/manifest.json`
- Caveat: the declared source payload path is absent in this child checkout. This checklist uses the parent handoff, current README contents, and prior attempt `31c319913` as references.

## Validation Commands

```bash
git grep -n "\\.runs/.*/archive" -- "*README.md"
jq empty tasks/index.json docs/docs-freshness-registry.json
git diff --check
```
