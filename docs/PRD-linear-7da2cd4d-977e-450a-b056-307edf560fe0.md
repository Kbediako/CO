# PRD: Restore docs hygiene baseline for missing TASKS references and freshness registry drift

## Traceability

- Linear issue: `CO-378` / `7da2cd4d-977e-450a-b056-307edf560fe0`
- Issue title: `Restore docs hygiene baseline for missing TASKS references and freshness registry drift`
- Source issue: `CO-376` / `612a3dc3-f66f-4ba3-aea9-1282b54d93fe`
- Task id: `linear-7da2cd4d-977e-450a-b056-307edf560fe0`
- Registry id: `20260426-linear-7da2cd4d-977e-450a-b056-307edf560fe0`
- Phase: docs-first packet only
- Created: `2026-04-26`
- Last review: `2026-04-26`
- Source anchor: `ctx:sha256:d5f97254034d50966075bb4a608873c35be50bef85c842aeaee6c8d48694c132#chunk:c000001`
- Declared source payload: `.runs/linear-7da2cd4d-977e-450a-b056-307edf560fe0-docs-packet/cli/2026-04-26T00-18-48-548Z-109bd4df/memory/source-0/source.txt`
- Declared manifest: `.runs/linear-7da2cd4d-977e-450a-b056-307edf560fe0-docs-packet/cli/2026-04-26T00-18-48-548Z-109bd4df/manifest.json`
- Source caveat: the declared source payload was not present in this child workspace. This packet preserves the CO-378 launch prompt as the available issue contract and performs no Linear mutation.

## User Request Translation

Create a bounded docs-first packet for `CO-378` so the parent lane can repair the docs hygiene baseline found from `CO-376`. The work is about repository documentation hygiene and freshness metadata: restore missing `docs/TASKS.md` references, repair missing registry entries, repair registry references to files that no longer exist, and address stale docs without weakening `docs:check`, `docs:freshness`, or `tasks/index.json` expectations.

This lane is not the implementation lane. The parent owns baseline repair, registry mirror edits, validation, Linear state, workpad updates, PR lifecycle, and merge. This child lane leaves a concise packet and checklist for parent application.

## Problem Statement

`CO-376` surfaced docs hygiene and freshness drift that should not be fixed as part of runtime/status behavior. The baseline has missing `docs/TASKS.md` references, freshness registry drift, missing registry entries, registry references missing files, and stale docs. If left unframed, a worker could either overfit to the `CO-376` runtime/status issue or hide the docs debt by weakening hygiene checks.

`CO-378` is the bounded baseline repair lane. Its purpose is to make the current docs hygiene state truthful and green while preserving machine-checkable references across `docs/TASKS.md`, `tasks/index.json`, `docs/docs-freshness-registry.json`, `docs:check`, and `docs:freshness`.

## Intent Checksum

- Exact issue surfaces:
  - `docs/TASKS.md`
  - `docs:check`
  - `docs:freshness`
  - `linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb`
  - missing registry entries
  - registry references missing files
  - stale docs
  - `tasks/index.json`
- Required boundary:
  - docs hygiene/freshness baseline repair only
  - not `CO-376` runtime/status behavior
  - parent owns implementation, registry mirror updates, validation, Linear state, PR, and merge

## Protected Terms

- `docs/TASKS.md`
- `docs:check`
- `docs:freshness`
- `linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb`
- missing registry entries
- registry references missing files
- stale docs
- `tasks/index.json`

## Wrong Interpretations To Reject

- Do not treat this as a `CO-376` runtime/status behavior fix.
- Do not edit or reframe `linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb` or `linear-df2bd49b-2dd6-413f-8d90-af40d033dace` packet files from this lane.
- Do not weaken `docs:check`, `docs:freshness`, or registry validation to make the baseline pass.
- Do not delete registry rows, task entries, or `docs/TASKS.md` references solely to reduce failure counts.
- Do not blind-bump `last_review` dates without review rationale and evidence.
- Do not broaden into source code, tests, provider runtime, status projection, or Linear workflow behavior.

## Non-Goals

- No source code or test changes.
- No Linear mutation, workpad update, PR attachment, or state transition from this child lane.
- No registry mirror edits in this child lane; parent owns `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- No edits to `linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb` or `linear-df2bd49b-2dd6-413f-8d90-af40d033dace` files.
- No policy weakening, warning-only downgrade, or freshness cap/window expansion.
- No unrelated cleanup of archive, runtime, provider, or package surfaces.

## Current / Reference / Target Parity Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| `docs:check` | Reports missing `docs/TASKS.md` references or related docs hygiene drift. | Docs hygiene gates should fail on missing task snapshots and broken references. | Parent repairs references so `docs:check` passes without weakening the gate. | Runtime/status behavior from `CO-376`. |
| `docs:freshness` | Reports missing registry entries, registry references missing files, stale docs, or related drift. | Freshness registry rows should correspond to real files with reviewed metadata. | Parent repairs registry/file alignment and stale rows with evidence-backed review. | Blind `last_review` bumps or deleting rows for count reduction. |
| `docs/TASKS.md` | Missing references can leave task packets invisible to docs hygiene. | Active task packets should be discoverable through the task snapshot when required. | Parent restores the required references and keeps the snapshot truthful. | This child lane does not edit `docs/TASKS.md`. |
| `tasks/index.json` | Registry drift can point at missing files or omit active packet metadata. | The task registry is canonical under `items[]` and should match existing packet files. | Parent updates task registry mirrors consistently with repaired docs. | This child lane does not edit `tasks/index.json`. |
| Protected prior packet | `linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb` is named as a protected surface. | Existing packet meaning and ownership must remain stable. | Parent repairs surrounding baseline without modifying that packet in this child scope. | Any edits to protected prior packet files. |

## Acceptance Criteria

- CO-378 has a docs-first packet with PRD, TECH_SPEC, ACTION_PLAN, task spec, task checklist, and `.agent` mirror.
- The packet preserves protected terms, wrong interpretations, non-goals, a parity/alignment matrix, `Not Done If`, immediate traceability, and implementation acceptance criteria.
- The scope stays on docs hygiene/freshness baseline repair and explicitly rejects `CO-376` runtime/status behavior.
- Parent-owned implementation repairs missing `docs/TASKS.md` references, missing registry entries, registry references missing files, and stale docs without weakening `docs:check` or `docs:freshness`.
- Parent-owned validation proves `docs:check` and `docs:freshness` pass after repair and records the evidence.
- Parent-owned registry mirrors keep `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` truthful.

## Not Done If

- `docs:check` still fails on missing `docs/TASKS.md` references after parent repair.
- `docs:freshness` still fails on missing registry entries, registry references missing files, or stale docs after parent repair.
- The fix weakens or bypasses docs hygiene/freshness checks.
- `tasks/index.json`, `docs/TASKS.md`, or `docs/docs-freshness-registry.json` become less truthful or internally inconsistent.
- The work edits `linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb` or `linear-df2bd49b-2dd6-413f-8d90-af40d033dace` files from this child lane.
- The lane expands into `CO-376` runtime/status behavior, source code, tests, Linear state, PR lifecycle, or merge.

## Assumptions

- The parent lane will apply registry mirror edits and validation in the authoritative issue workspace.
- This child lane's missing source payload is acceptable because the launch prompt includes the protected issue contract needed for the packet.
