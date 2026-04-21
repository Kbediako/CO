# TECH_SPEC: CO-272 replace dead-code-pruning .runs archive pointers with durable tracked guidance

## Scope

This spec defines the implementation contract for `CO-272`. The docs child lane owns only the docs packet and registry mirrors. The parent lane owns implementation, Linear state, workpad updates, validation, PR creation, review lifecycle, and merge.

The target implementation surface is docs-only and limited to:

- `archives/hi-fi-tests/README.md`
- `packages/abetkaua/README.md`
- `packages/abetkaua/public/README.md`

## Source And Evidence

- Linear issue: `CO-272`
- Source anchor: `ctx:sha256:d4c5803349b61c83660da96bb41682fa54060c07fa041841daece9d9a505d12e#chunk:c000001`
- Source object id: `sha256:d4c5803349b61c83660da96bb41682fa54060c07fa041841daece9d9a505d12e`
- Declared source payload: `.runs/linear-9dacc402-e9b6-40c4-b657-d4b91b68c941-co272-docs-packet/cli/2026-04-21T03-23-37-462Z-7f379f9c/memory/source-0/source.txt`
- Declared manifest: `.runs/linear-9dacc402-e9b6-40c4-b657-d4b91b68c941-co272-docs-packet/cli/2026-04-21T03-23-37-462Z-7f379f9c/manifest.json`
- Source caveat: the expected shared source payload is absent in this child checkout. This spec preserves the parent-provided issue contract plus live repo truth in the three target README files; no Linear mutation was performed.

## Protected Contract

The protected issue terms are:

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

## Current Docs Reading

Read-only discovery in this lane found:

- `archives/hi-fi-tests/README.md` currently directs readers to `.runs/0801-dead-code-pruning/archive/2025-12-08T10-01-24Z/archives/hi-fi-tests/`.
- `packages/abetkaua/README.md` currently says the previous static snapshot lives under `.runs/0801-dead-code-pruning/archive/2025-12-08T10-01-24Z/packages/abetkaua/public/`.
- `packages/abetkaua/public/README.md` currently says mirrored assets were moved to `.runs/0801-dead-code-pruning/archive/2025-12-08T10-01-24Z/packages/abetkaua/public/`.
- `packages/abetkaua/README.md` also includes valid current workflow commands:
  - `npm run mirror:fetch -- --project abetkaua`
  - `npm run mirror:serve -- --project abetkaua --port 4173`
  - `npm run mirror:check -- --project abetkaua`
- `packages/abetkaua/README.md` also includes separate mirror-manifest history under `.runs/abetkaua/mirror/...`, which is not the same problem as the dead-code-pruning archive relocation pointer.
- Similar historical pointers still exist in out-of-scope surfaces such as `packages/des-obys/public/README.md`, `packages/eminente/public/README.md`, `packages/obys-library/public/README.md`, and `reference/plus-ex-15th/README.md`.

## Target Guidance Contract

Parent implementation should:

1. Remove the exact dead-code-pruning archive-pointer dependency from the three in-scope README files.
2. Replace it with durable tracked guidance that explains the current tracked contract for each surface.
3. Keep the change minimal and local to the exact dead-code-pruning pointer text.

The intended per-file contract is:

- `archives/hi-fi-tests/README.md`
  - describe the directory as a tracked anchor for hi-fi test archive material
  - direct readers to regenerate or repopulate from current tracked workflows rather than from `.runs/0801-...`
  - avoid inventing a new archival location if the repo does not track one
- `packages/abetkaua/README.md`
  - preserve the existing mirror overview and commands
  - preserve separate non-0801 mirror-manifest history unless a different issue explicitly owns its removal
  - replace only the dead-code-pruning archive relocation sentence with durable tracked guidance, optionally pointing to `packages/abetkaua/public/README.md` and `docs/guides/pixel-perfect-local-clones.md`
- `packages/abetkaua/public/README.md`
  - describe the directory as the tracked landing surface for regenerated mirror assets
  - direct readers to `npm run mirror:fetch -- --project abetkaua` rather than to `.runs/0801-...`
  - avoid telling readers to copy from the old dead-code-pruning archive path

## Follow-Up Boundary

The following surfaces are explicitly out of scope for `CO-272` and must become a separate parent-owned follow-up if needed:

- `packages/des-obys/**`
- `packages/eminente/**`
- `packages/obys-library/**`
- `reference/plus-ex-15th/**`

This issue does not own a generic cleanup of all residual historical archive pointers.

## Readiness And Safety Gates

The fix must not:

- strip all `.runs` references from `packages/abetkaua/README.md`
- remove valid mirror commands from `packages/abetkaua/README.md`
- expand into broader `0801` residue or archive policy changes
- touch implementation code, tests, Linear state, or workpad state from this child lane

## Focused Validation Plan

Parent implementation should keep validation narrow and docs-scoped:

- absence check:
  - `rg -n '\\.runs/0801-dead-code-pruning/archive/2025-12-08T10-01-24Z' archives/hi-fi-tests/README.md packages/abetkaua/README.md packages/abetkaua/public/README.md`
- presence checks for preserved/current guidance:
  - `rg -n 'mirror:fetch -- --project abetkaua|mirror:serve -- --project abetkaua --port 4173|mirror:check -- --project abetkaua' packages/abetkaua/README.md`
  - `rg -n 'pixel-perfect-local-clones|mirror:fetch -- --project abetkaua' packages/abetkaua/README.md packages/abetkaua/public/README.md archives/hi-fi-tests/README.md`
- whitespace check:
  - `git diff --check -- archives/hi-fi-tests/README.md packages/abetkaua/README.md packages/abetkaua/public/README.md`

## Wrong Interpretations To Reject

- Do not widen to `packages/des-obys/**`, `packages/eminente/**`, `packages/obys-library/**`, or `reference/plus-ex-15th/**`.
- Do not rewrite the fix as all-`.runs` removal.
- Do not change `docs/PRD-dead-code-pruning.md` or `docs/TECH_SPEC-dead-code-pruning.md` under this issue.
- Do not turn this into content restoration or archive relocation work.
- Do not drop valid abetkaua mirror workflow/manifests while removing the dead-code-pruning pointer.

## Non-Goals

- No broad `0801` residue cleanup.
- No changes to code or tests.
- No changes to Linear state or workpad state from this child lane.
- No removal of separate non-0801 run history from `packages/abetkaua/README.md`.

## Not Done If

- Any of the three target README files still references `.runs/0801-dead-code-pruning/archive/2025-12-08T10-01-24Z`.
- The implementation removes valid abetkaua mirror workflow guidance.
- The implementation touches out-of-scope `0801` residue.
- The implementation treats this as generic archive cleanup rather than a three-file durable-guidance repair.

## Child-Lane Validation

This child lane validates only docs and registry shape:

```bash
jq empty tasks/index.json docs/docs-freshness-registry.json
rg -n "dead-code-pruning \\.runs archive pointers|durable tracked guidance|archives/hi-fi-tests/README\\.md|packages/abetkaua/README\\.md|packages/abetkaua/public/README\\.md|\\.runs/0801-dead-code-pruning/archive/2025-12-08T10-01-24Z|docs/guides/pixel-perfect-local-clones\\.md|broad archive cleanup|des-obys|eminente|obys-library|reference/plus-ex-15th" docs/PRD-linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md docs/TECH_SPEC-linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md docs/ACTION_PLAN-linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md tasks/specs/linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md tasks/tasks-linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md .agent/task/linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md docs/TASKS.md tasks/index.json
git diff --check -- docs/PRD-linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md docs/TECH_SPEC-linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md docs/ACTION_PLAN-linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md tasks/specs/linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md tasks/tasks-linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md .agent/task/linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json
perl -ne 'if (/[ \t]$/) { print "$ARGV:$.: trailing whitespace\n"; $bad=1 } END { exit($bad ? 1 : 0) }' docs/PRD-linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md docs/TECH_SPEC-linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md docs/ACTION_PLAN-linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md tasks/specs/linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md tasks/tasks-linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md .agent/task/linear-9dacc402-e9b6-40c4-b657-d4b91b68c941.md tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json
```
