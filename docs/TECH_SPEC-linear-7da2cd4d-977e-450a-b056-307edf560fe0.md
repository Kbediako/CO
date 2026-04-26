---
id: 20260426-linear-7da2cd4d-977e-450a-b056-307edf560fe0
title: "Restore docs hygiene baseline for missing TASKS references and freshness registry drift"
relates_to: docs/PRD-linear-7da2cd4d-977e-450a-b056-307edf560fe0.md
risk: medium
owners:
  - Codex
created: 2026-04-26
last_review: 2026-04-26
related_action_plan: docs/ACTION_PLAN-linear-7da2cd4d-977e-450a-b056-307edf560fe0.md
task_checklists:
  - tasks/tasks-linear-7da2cd4d-977e-450a-b056-307edf560fe0.md
---

# TECH_SPEC: Restore docs hygiene baseline for missing TASKS references and freshness registry drift

This mirror points to the canonical task spec at `tasks/specs/linear-7da2cd4d-977e-450a-b056-307edf560fe0.md`.

## Scope

This spec defines the `CO-378` docs hygiene/freshness baseline repair contract. This child lane owns only the docs-first packet files listed in the launch prompt. The parent lane owns implementation, registry mirror edits, Linear state, workpad updates, validation, PR lifecycle, and merge.

The implementation target is docs metadata and reference repair, not runtime/status behavior from `CO-376`.

## Source And Evidence

- Linear issue: `CO-378` / `7da2cd4d-977e-450a-b056-307edf560fe0`
- Source issue: `CO-376` / `612a3dc3-f66f-4ba3-aea9-1282b54d93fe`
- Source anchor: `ctx:sha256:d5f97254034d50966075bb4a608873c35be50bef85c842aeaee6c8d48694c132#chunk:c000001`
- Declared source payload: `.runs/linear-7da2cd4d-977e-450a-b056-307edf560fe0-docs-packet/cli/2026-04-26T00-18-48-548Z-109bd4df/memory/source-0/source.txt`
- Declared manifest: `.runs/linear-7da2cd4d-977e-450a-b056-307edf560fe0-docs-packet/cli/2026-04-26T00-18-48-548Z-109bd4df/manifest.json`
- Source caveat: the declared source payload was absent in this child workspace. The packet uses the launch prompt as source truth and performs no Linear mutation.

## Protected Contract

Protected surfaces and phrases:

- `docs/TASKS.md`
- `docs:check`
- `docs:freshness`
- `linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb`
- missing registry entries
- registry references missing files
- stale docs
- `tasks/index.json`

The implementation must repair docs hygiene/freshness baseline drift while preserving the semantics of these surfaces. It must not modify the protected prior packet files from this child lane.

## Functional Requirements

Parent implementation should:

1. Reproduce the current `docs:check` and `docs:freshness` failure shape before editing baseline files.
2. Classify every missing `docs/TASKS.md` reference needed for `docs:check`.
3. Classify missing registry entries and add truthful registry rows for existing docs that must be tracked.
4. Classify registry references missing files and either restore the intended file or remove/update the row only with evidence that the referenced file is obsolete.
5. Classify stale docs and refresh `last_review` only after a review rationale is recorded.
6. Keep `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` internally consistent.
7. Preserve the protected `linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb` packet meaning and avoid edits to it unless the parent explicitly widens scope outside this child lane.

## Non-Functional Requirements

- Keep the repair minimal and auditable.
- Prefer metadata/reference repair over policy changes.
- Preserve current gate strictness for `docs:check` and `docs:freshness`.
- Record before/after validation evidence in parent-owned artifacts.
- Do not introduce source code, test, package, or runtime changes for this docs baseline lane.

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth |
| --- | --- | --- | --- |
| Missing `docs/TASKS.md` references | `docs:check` can report packet references that are missing from the task snapshot. | Active docs-first packets should be represented where the hygiene gate expects them. | Parent restores required snapshot references or records an evidence-backed disposition. |
| Missing registry entries | `docs:freshness` can report docs that exist without registry rows. | Tracked markdown docs should have registry metadata. | Parent adds accurate registry rows for docs that remain in scope. |
| Registry references missing files | Registry rows can point at files that no longer exist. | Registry rows should resolve to real files or be removed with evidence. | Parent restores, updates, or removes rows based on file truth and rationale. |
| Stale docs | `docs:freshness` can report stale `last_review` dates. | Dates reflect actual review, not blind freshness bumps. | Parent refreshes dates only after content review and evidence. |
| `tasks/index.json` | Registry drift can make task packet references inconsistent. | `items[]` is the canonical task registry. | Parent keeps index paths and docs packet files aligned. |

## Wrong Interpretations To Reject

- Do not treat this as a `CO-376` runtime/status behavior fix.
- Do not weaken `docs:check`, `docs:freshness`, `spec-guard`, or freshness registry validation.
- Do not delete rows or references solely to reduce failure counts.
- Do not blind-bump review dates.
- Do not edit protected `linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb` or `linear-df2bd49b-2dd6-413f-8d90-af40d033dace` files from this child lane.
- Do not make Linear mutations from this child lane.

## Non-Goals

- No source code or test changes.
- No runtime/status behavior changes for `CO-376`.
- No parent-owned registry edits in this child lane.
- No Linear state, workpad, PR, or merge work in this child lane.
- No freshness policy weakening, warning-only downgrade, or cap/window expansion.

## Parent Validation Contract

Parent should run the appropriate validation after implementation, including at minimum:

- scoped before reproduction for `docs:check` and `docs:freshness`
- `npm run docs:check`
- `npm run docs:freshness`
- any required spec/freshness registry checks affected by touched files
- parent-owned review and PR lifecycle gates

This child lane should not run full repo validation suites.

## Not Done If

- `docs:check` still reports missing `docs/TASKS.md` references after parent repair.
- `docs:freshness` still reports missing registry entries, registry references missing files, or stale docs after parent repair.
- Baseline repair hides docs debt or weakens gates.
- `tasks/index.json`, `docs/TASKS.md`, or `docs/docs-freshness-registry.json` disagree about active packet paths.
- This child lane edits files outside its declared six-file packet scope.
