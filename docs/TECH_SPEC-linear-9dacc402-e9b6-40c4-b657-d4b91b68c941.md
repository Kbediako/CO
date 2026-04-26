# TECH_SPEC: CO-272 Durable README Guidance

## Scope

This spec covers the bounded `CO-272` docs implementation slice. This child lane owns only:

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

Parent lane owns Linear state, workpad state, PR lifecycle, and final integration.

## Source And Evidence

- Linear issue: `CO-272`
- Source anchor: `ctx:sha256:89eae343f6b7d6c89e08d2ae54c394e5c638f9dcb5407f0a55fe38560772d55b#chunk:c000001`
- Source object id: `sha256:89eae343f6b7d6c89e08d2ae54c394e5c638f9dcb5407f0a55fe38560772d55b`
- Declared source payload: `.runs/linear-9dacc402-e9b6-40c4-b657-d4b91b68c941-co272-readme-guidance/cli/2026-04-21T13-03-01-509Z-99593f7b/memory/source-0/source.txt`
- Declared manifest: `.runs/linear-9dacc402-e9b6-40c4-b657-d4b91b68c941-co272-readme-guidance/cli/2026-04-21T13-03-01-509Z-99593f7b/manifest.json`
- Source caveat: the declared source payload path is absent in this child checkout. The live README scan and prior attempt commit `31c319913` were used as references.

## Current Reading

- `archives/hi-fi-tests/README.md` points to `.runs/0801-dead-code-pruning/archive/2025-12-08T10-01-24Z/archives/hi-fi-tests/`.
- `packages/abetkaua/README.md` points to `.runs/0801-dead-code-pruning/archive/2025-12-08T10-01-24Z/packages/abetkaua/public/`.
- `packages/abetkaua/public/README.md` points to the same dead-code-pruning archive and suggests copying from it.
- `packages/des-obys/README.md` and `packages/des-obys/public/README.md` point to `.runs/0801-dead-code-pruning/archive/2025-12-08T10-01-24Z/packages/des-obys/public/`.
- `packages/eminente/README.md` and `packages/eminente/public/README.md` point to `.runs/0801-dead-code-pruning/archive/2025-12-08T10-01-24Z/packages/eminente/public/`.
- `packages/obys-library/README.md` and `packages/obys-library/public/README.md` point to `.runs/0801-dead-code-pruning/archive/2025-12-08T10-01-24Z/packages/obys-library/public/`.
- `reference/plus-ex-15th/README.md` points to and serves `.runs/0801-dead-code-pruning/archive/2025-12-08T10-01-24Z/archives/hi-fi-tests/15th-plus/...`.
- `packages/abetkaua/README.md` also contains valid current workflow commands:
  - `npm run mirror:fetch -- --project abetkaua`
  - `npm run mirror:serve -- --project abetkaua --port 4173`
  - `npm run mirror:check -- --project abetkaua`

## Requirements

1. Replace only the dead-code-pruning `.runs/0801-dead-code-pruning/archive/...` guidance in the in-scope README files.
2. Use durable tracked guidance or explicit regeneration commands.
3. Preserve valid abetkaua mirror workflow guidance and separate non-0801 manifest history.
4. Refresh the `CO-272` PRD, TECH_SPEC, ACTION_PLAN, task spec, task checklist, agent mirror, `tasks/index.json`, `docs/TASKS.md`, and docs-freshness registry entries.
5. Do not edit parent-owned Linear, GitHub, workpad, implementation, or unrelated archive-residue surfaces.

## Design

- `archives/hi-fi-tests/README.md` becomes a tracked stub description with regeneration guidance through tracked docs and the hi-fi toolkit pipeline.
- `packages/abetkaua/README.md` keeps the existing mirror workflow sections and changes only the opening dead archive sentence.
- `packages/abetkaua/public/README.md` becomes an on-demand rebuild note with fetch, check, and serve commands.
- `des-obys`, `eminente`, and `obys-library` mirror README stubs become on-demand rebuild notes with project-specific fetch, check, and serve commands.
- `reference/plus-ex-15th/README.md` keeps loader macro metadata and points readers to hi-fi toolkit regeneration plus serving the regenerated output path.
- Registry/checklist updates record this as a docs-first packet and docs implementation slice, not as a broad archive cleanup.

## Follow-Up Boundary

These are explicitly out of scope:

- historical `0801` PRD/TECH_SPEC rewrites
- generic `.runs` cleanup
- archive payload restoration or relocation
- unrelated `.runs` operational manifest evidence

## Validation Plan

Run only scoped checks:

```bash
git grep -n "\\.runs/.*/archive" -- "*README.md"
jq empty tasks/index.json docs/docs-freshness-registry.json
rg -n "mirror:fetch -- --project abetkaua|mirror:serve -- --project abetkaua --port 4173|mirror:check -- --project abetkaua" packages/abetkaua/README.md packages/abetkaua/public/README.md
rg -n "mirror:fetch -- --project (des-obys|eminente|obys-library)|mirror:check -- --project (des-obys|eminente|obys-library)|mirror:serve -- --project (des-obys|eminente|obys-library) --port 4173" packages/des-obys/README.md packages/des-obys/public/README.md packages/eminente/README.md packages/eminente/public/README.md packages/obys-library/README.md packages/obys-library/public/README.md
git diff --check
```

The first `git grep` is expected to return no matches after the patch.
