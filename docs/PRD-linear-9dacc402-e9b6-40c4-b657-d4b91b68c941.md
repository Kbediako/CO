# PRD: CO-272 replace dead-code-pruning .runs archive pointers with durable tracked guidance

## Traceability

- Linear issue: `CO-272`
- Issue title: `Replace dead-code-pruning .runs archive pointers with durable tracked guidance`
- Task id: `linear-9dacc402-e9b6-40c4-b657-d4b91b68c941`
- Registry id: `20260421-linear-9dacc402-e9b6-40c4-b657-d4b91b68c941`
- Phase: docs-first packet only
- Parent-owned implementation surfaces:
  - `archives/hi-fi-tests/README.md`
  - `packages/abetkaua/README.md`
  - `packages/abetkaua/public/README.md`
- Source anchor: `ctx:sha256:d4c5803349b61c83660da96bb41682fa54060c07fa041841daece9d9a505d12e#chunk:c000001`
- Source object id: `sha256:d4c5803349b61c83660da96bb41682fa54060c07fa041841daece9d9a505d12e`
- Declared source payload: `.runs/linear-9dacc402-e9b6-40c4-b657-d4b91b68c941-co272-docs-packet/cli/2026-04-21T03-23-37-462Z-7f379f9c/memory/source-0/source.txt`
- Declared manifest: `.runs/linear-9dacc402-e9b6-40c4-b657-d4b91b68c941-co272-docs-packet/cli/2026-04-21T03-23-37-462Z-7f379f9c/manifest.json`
- Source caveat: the expected shared source payload is absent in this child checkout. This packet is anchored on the parent-provided CO-272 issue contract plus live repo truth in the three target README files; no Linear mutation was performed.

## User Request Translation

Replace only the Task `0801` dead-code-pruning `.runs` archive pointer guidance in `archives/hi-fi-tests/README.md`, `packages/abetkaua/README.md`, and `packages/abetkaua/public/README.md` with durable tracked guidance.

This is not a broad archive cleanup. The packet must explicitly reject widening into `packages/des-obys/**`, `packages/eminente/**`, `packages/obys-library/**`, or `reference/plus-ex-15th/**`, and it must preserve the fact that `packages/abetkaua/README.md` also contains separate mirror workflow and manifest history that are not the dead-code-pruning archive-pointer problem.

## Problem Statement

Three tracked README surfaces still tell operators to use a specific `.runs/0801-dead-code-pruning/archive/2025-12-08T10-01-24Z/...` snapshot:

- `archives/hi-fi-tests/README.md`
- `packages/abetkaua/README.md`
- `packages/abetkaua/public/README.md`

Those paths are dead-code-pruning relocation artifacts, not durable tracked guidance. They make current repo docs depend on an old run-local archive location instead of on stable tracked instructions.

At the same time, `packages/abetkaua/README.md` also includes separate mirror commands and manifest references under `.runs/abetkaua/mirror/...` that remain useful operational history. A naive "remove every `.runs` reference" edit would drift past the actual issue and erase valid guidance.

## Desired Outcome

- Only the dead-code-pruning archive-pointer wording is replaced in the three named README files.
- The replacement text is durable tracked guidance grounded in current repo surfaces such as `docs/guides/pixel-perfect-local-clones.md`, `packages/abetkaua/README.md`, and `packages/abetkaua/public/README.md`, not in a historical `.runs/0801-...` archive path.
- `packages/abetkaua/README.md` keeps its mirror fetch/serve/check workflow and does not lose separate non-0801 mirror-manifest history unless a different issue explicitly owns that change.
- Broader `0801` residue in `des-obys`, `eminente`, `obys-library`, and `reference/plus-ex-15th` is called out as parent-owned follow-up, not as expanded scope here.

## Issue-Quality Review

The issue is sufficiently specific for implementation. It names the exact three target files, the exact bad guidance pattern, the required replacement style (`durable tracked guidance`), and the exact out-of-scope residue cluster that must not be swept into the same diff.

This packet rejects a narrower interpretation that only rewrites wording inside the new docs packet without changing the target README files, and it rejects a wider interpretation that reopens all remaining `0801` archive residue or strips all `.runs` references from `packages/abetkaua/README.md`.

The micro-task path is not eligible. Correctness depends on exact file names, exact protected wording, explicit out-of-scope follow-up, and preserving some non-0801 run-history references while removing only the dead-code-pruning archive pointers.

## Protected Terms

These terms and surfaces are protected issue wording and must remain exact in implementation, review notes, and closeout evidence:

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

## Wrong Interpretations To Reject

- Do not widen this issue into a sweep of all remaining `0801` residue.
- Do not edit `packages/des-obys/**`, `packages/eminente/**`, `packages/obys-library/**`, or `reference/plus-ex-15th/**` under this issue.
- Do not delete or restore archived payloads; this is a docs-guidance truthfulness fix, not a content-recovery task.
- Do not strip all `.runs` references from `packages/abetkaua/README.md`; only the dead-code-pruning archive relocation pointer is in scope.
- Do not rewrite the `0801` PRD/TECH_SPEC or other historical task docs as part of this issue.
- Do not broaden into validation ownership, Linear state mutation, workpad edits, or PR lifecycle changes from this child lane.

## Non-Goals

- No broad `0801` archive or reference cleanup.
- No edits to `packages/des-obys/**`, `packages/eminente/**`, `packages/obys-library/**`, or `reference/plus-ex-15th/**`.
- No removal of valid mirror workflow instructions from `packages/abetkaua/README.md`.
- No removal of separate non-0801 mirror manifest history from `packages/abetkaua/README.md`.
- No implementation or test edits in this docs child lane.

## Current / Reference / Target Parity Matrix

| Surface | Current Behavior | Reference Behavior | Target Behavior |
| --- | --- | --- | --- |
| `archives/hi-fi-tests/README.md` | tells readers to use `.runs/0801-dead-code-pruning/archive/2025-12-08T10-01-24Z/archives/hi-fi-tests/` | tracked README guidance should explain the retained purpose of the path and how to recreate or repopulate artifacts without depending on a historical run directory | remove the dead-code-pruning archive pointer and replace it with durable tracked guidance |
| `packages/abetkaua/README.md` | says the previous static snapshot now lives under `.runs/0801-dead-code-pruning/archive/.../packages/abetkaua/public/`, while also containing mirror commands and separate mirror-manifest history | tracked project README should describe current mirror workflow and durable tracked surfaces; non-0801 operational history may remain if still useful | replace only the dead-code-pruning archive-pointer sentence and preserve the mirror workflow/manifests unless separately scoped |
| `packages/abetkaua/public/README.md` | says mirrored assets were moved to `.runs/0801-dead-code-pruning/archive/.../packages/abetkaua/public/` and suggests copying from that archive path | tracked public README should explain this directory as the current landing surface for regenerated mirror assets | remove the dead-code-pruning archive pointer and keep durable regeneration guidance |
| Broader `0801` residue | similar historical pointers still exist in `des-obys`, `eminente`, `obys-library`, and `reference/plus-ex-15th` | broader residue cleanup needs its own explicit ownership and acceptance criteria | record as parent-owned follow-up only; do not expand this issue |

## Acceptance Criteria

- Parent implementation edits only `archives/hi-fi-tests/README.md`, `packages/abetkaua/README.md`, and `packages/abetkaua/public/README.md`.
- After implementation, those three files no longer depend on `.runs/0801-dead-code-pruning/archive/2025-12-08T10-01-24Z/...` for their primary guidance.
- The replacement text is durable tracked guidance tied to current repo workflows and tracked surfaces.
- `packages/abetkaua/README.md` still preserves its mirror fetch/serve/check instructions and may retain separate non-0801 mirror-manifest history if that history remains useful.
- No edits are made under `packages/des-obys/**`, `packages/eminente/**`, `packages/obys-library/**`, or `reference/plus-ex-15th/**` as part of `CO-272`.

## Not Done If

- Any of the three target README files still contains the dead-code-pruning archive path `.runs/0801-dead-code-pruning/archive/2025-12-08T10-01-24Z`.
- `packages/abetkaua/README.md` loses valid mirror workflow guidance while fixing the archive-pointer sentence.
- The change expands into broader `0801` residue cleanup.
- The implementation turns into generic `.runs` scrubbing rather than the exact dead-code-pruning archive-pointer fix.
