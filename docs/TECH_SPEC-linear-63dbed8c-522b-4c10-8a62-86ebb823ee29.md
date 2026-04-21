# TECH_SPEC: CO-270 exact test surface contract alignment across scripts, configs, core lane, and agent docs

## Metadata

- Task id: `linear-63dbed8c-522b-4c10-8a62-86ebb823ee29`
- Registry id: `20260421-linear-63dbed8c-522b-4c10-8a62-86ebb823ee29`
- Linear issue: `CO-270`
- Issue id: `63dbed8c-522b-4c10-8a62-86ebb823ee29`
- Status: implementation validated; PR handoff pending
- Last review: `2026-04-21`
- PRD: `docs/PRD-linear-63dbed8c-522b-4c10-8a62-86ebb823ee29.md`
- Canonical task spec: `tasks/specs/linear-63dbed8c-522b-4c10-8a62-86ebb823ee29.md`
- Action plan: `docs/ACTION_PLAN-linear-63dbed8c-522b-4c10-8a62-86ebb823ee29.md`

## User Intent

Preserve the exact test-surface contract around `npm run test`, `test:orchestrator`, `test:adapters`, `test:evaluation`, `eval:test`, `vitest.config.core.ts`, `vitest.config.ts`, `.github/workflows/core-lane.yml`, `AGENTS.md`, `.agent/AGENTS.md`, and `.agent/readme.md`.

The issue is not a generic request for more CI or fewer tests. It is a request to keep one truthful, reviewable contract across those surfaces and to reject `silent CI broadening`, `coverage weakening`, and `generic cleanup`.

## Source Anchor

- Pointer: `ctx:sha256:5d2910fa0d93867cfa975aa86260aab30241bc467da1a832b38c1aaa29db0c78#chunk:c000001`
- Object id: `sha256:5d2910fa0d93867cfa975aa86260aab30241bc467da1a832b38c1aaa29db0c78`
- Declared payload: `.runs/linear-63dbed8c-522b-4c10-8a62-86ebb823ee29-docs-packet/cli/2026-04-21T01-47-25-589Z-84d38530/memory/source-0/source.txt`
- Declared manifest: `.runs/linear-63dbed8c-522b-4c10-8a62-86ebb823ee29-docs-packet/cli/2026-04-21T01-47-25-589Z-84d38530/manifest.json`
- Caveat: the declared payload is not present in this child checkout. This spec preserves the prompt-carried issue wording and supplements it with repo-local evidence from the protected files; no Linear mutation was performed.

## Protected Terms

- `npm run test`
- `test:orchestrator`
- `test:adapters`
- `test:evaluation`
- `eval:test`
- `vitest.config.core.ts`
- `vitest.config.ts`
- `.github/workflows/core-lane.yml`
- `AGENTS.md`
- `.agent/AGENTS.md`
- `.agent/readme.md`
- `silent CI broadening`
- `coverage weakening`
- `generic cleanup`

## Current Repo Truth

- `package.json` currently defines:
  - `test` as `npm run test:core --`
  - `test:core` as `vitest run --config vitest.config.core.ts`
  - `test:all` as `npm run test:core && npm run test:adapters`
  - `test:orchestrator` as `npm run test:core --`
  - `test:adapters` as `vitest run --passWithNoTests --config vitest.config.ts adapters`
  - `test:evaluation` as `vitest run --passWithNoTests --config vitest.config.ts evaluation/tests`
  - `eval:test` as `npm run test:evaluation --`
- `.github/workflows/core-lane.yml` runs `npm run test:core` in the `Test (core matrix)` step.
- `AGENTS.md` documents `npm run test` as the explicit core/default validation alias, `npm run test:all` as the broader matrix, and `npm run test:core` as the narrow Core Lane matrix.
- `.agent/AGENTS.md` documents the same split and keeps `npm run eval:test` opt-in.
- `.agent/readme.md` lists `npm run test:core`, `npm run test`, and `npm run eval:test` in its build/test checklist.

This means the branch now has the first-class `test:core` vs `test:all` contract the issue asked for without widening the historical `npm run test` surface. The remaining implementation risk is drift between scripts, workflow, and docs, not absence of a broader entrypoint.

## Target Contract

The parent implementation should leave one explicit and reviewable answer to these questions:

1. What does `npm run test` own?
2. What do `test:orchestrator`, `test:adapters`, `test:evaluation`, and `eval:test` each own?
3. Which Vitest config is authoritative for each command?
4. What exactly does `.github/workflows/core-lane.yml` require?
5. What should `AGENTS.md`, `.agent/AGENTS.md`, and `.agent/readme.md` tell future agents about that contract?

Any change to one of those answers must be reflected explicitly across the protected surfaces, not smuggled in through a single-file tweak.

## Parent Implementation Surface

- `package.json`
- `vitest.config.core.ts`
- `vitest.config.ts`
- `.github/workflows/core-lane.yml`
- `AGENTS.md`
- `.agent/AGENTS.md`
- `.agent/readme.md`

Parent should prefer the smallest truthful alignment inside that list. If current truth is already correct, the implementation may be docs-only or no-op outside packet/registry refresh. If current truth changes, the change must stay narrow and explicit.

## Requirements

### Functional Requirements

1. Preserve the exact protected surfaces named in the issue.
2. Preserve the current script/config/workflow relationship unless parent explicitly changes it.
3. If parent changes any surface, the resulting contract must remain explicit across scripts, configs, workflow, and agent docs.
4. Keep `npm run test`, `test:orchestrator`, `test:adapters`, `test:evaluation`, and `eval:test` reviewable as distinct surfaces rather than ambiguous aliases.
5. Keep `vitest.config.core.ts` and `vitest.config.ts` ownership legible.
6. Keep `.github/workflows/core-lane.yml` truthful about what Core Lane actually executes.
7. Keep `AGENTS.md`, `.agent/AGENTS.md`, and `.agent/readme.md` aligned with the resulting contract.

### Non-Functional Requirements

- No `silent CI broadening`
- No `coverage weakening`
- No `generic cleanup`
- Minimal diff in the parent lane
- Clear reviewer-facing ownership for every protected surface

## Current / Reference / Target Matrix

| Surface | Current | Reference | Target |
| --- | --- | --- | --- |
| Script ownership | `npm run test` delegates to `test:core`; `test:core` is first-class; `test:all` is the broader matrix; `test:orchestrator` aliases `test:core`; adapter and evaluation surfaces stay separate. | Distinct commands should keep distinct meaning. | Keep this explicit split truthful and regression-covered. |
| Config ownership | `vitest.config.core.ts` and `vitest.config.ts` are separate config surfaces. | Config choice should not be hidden inside script drift. | Parent preserves or explicitly updates config ownership. |
| Core Lane | Workflow runs `npm run test:core` in `Test (core matrix)`. | CI should expose the required lane truth. | Keep workflow truth explicit and visibly narrow. |
| Agent docs | Agent docs plus `docs/README.md` now mention the explicit core/default vs broader/opt-in split. | Guidance should match real execution surfaces. | Parent keeps those docs aligned with the exact contract. |
| Scope discipline | Alignment work can be misread as cleanup or CI expansion. | Alignment lanes preserve exact surface ownership. | Parent stays inside exact contract alignment only. |

## Wrong Interpretations To Reject

- `Make Core Lane run everything by default.`
- `Make Core Lane run less by default and clean up the docs later.`
- `Collapse all test commands into one because they are confusing.`
- `Remove or repoint adapter/evaluation commands without explicit contract review.`
- `Treat this as generic cleanup of scripts/docs/workflows.`

## Non-Goals

- Blanket expansion of Core Lane to execute every suite.
- Blanket narrowing of coverage to only the easiest currently green path.
- Broad Vitest or CI refactors outside the protected surfaces.
- Child-lane edits to package, workflow, config, or implementation files.

## Not Done If

- A reviewer still cannot tell what `npm run test` owns relative to the other protected commands.
- `.github/workflows/core-lane.yml` and the docs imply different required test surfaces.
- `vitest.config.core.ts` and `vitest.config.ts` ownership is still ambiguous after the parent change.
- The issue is closed via `generic cleanup` rather than explicit contract alignment.

## Validation Plan

### Child-Lane Checks

- `jq empty tasks/index.json docs/docs-freshness-registry.json`
- protected-term grep across the packet and registry mirrors
- `git diff --check` over the declared files only
- trailing-whitespace check over the declared files only

### Parent-Lane Checks

- re-read the protected surfaces after any contract edit
- run the validation commands implied by the final contract
- keep any Core Lane change explicit in both workflow and agent docs
- run parent-owned review/validation before PR handoff

## Approvals

- Docs packet: bounded same-issue docs child lane, 2026-04-21.
- Standalone review: manifest-backed `bounded-success` via `command-intent` retry, 2026-04-21.
- Elegance review: parent manual pass found no simplification patch needed after refreshing stale packet status lines, 2026-04-21.
