# PRD: CO-270 exact test surface contract alignment across scripts, configs, core lane, and agent docs

## Traceability

- Linear issue: `CO-270`
- Issue id: `63dbed8c-522b-4c10-8a62-86ebb823ee29`
- Task id: `linear-63dbed8c-522b-4c10-8a62-86ebb823ee29`
- Registry id: `20260421-linear-63dbed8c-522b-4c10-8a62-86ebb823ee29`
- Phase: implementation validated; PR handoff pending
- Source anchor: `ctx:sha256:5d2910fa0d93867cfa975aa86260aab30241bc467da1a832b38c1aaa29db0c78#chunk:c000001`
- Source object id: `sha256:5d2910fa0d93867cfa975aa86260aab30241bc467da1a832b38c1aaa29db0c78`
- Declared source payload: `.runs/linear-63dbed8c-522b-4c10-8a62-86ebb823ee29-docs-packet/cli/2026-04-21T01-47-25-589Z-84d38530/memory/source-0/source.txt`
- Declared manifest: `.runs/linear-63dbed8c-522b-4c10-8a62-86ebb823ee29-docs-packet/cli/2026-04-21T01-47-25-589Z-84d38530/manifest.json`
- Source caveat: the declared `source-0` payload is not present in this child checkout. This packet is anchored on the prompt-carried `CO-270` issue wording plus repo-local evidence from `package.json`, `.github/workflows/core-lane.yml`, `AGENTS.md`, `.agent/AGENTS.md`, and `.agent/readme.md`; no Linear mutation was performed.

## User Request Translation

Create the docs-first packet and registry mirrors for `CO-270` only. Preserve the exact test-surface wording around `npm run test`, `test:orchestrator`, `test:adapters`, `test:evaluation`, `eval:test`, `vitest.config.core.ts`, `vitest.config.ts`, `.github/workflows/core-lane.yml`, `AGENTS.md`, `.agent/AGENTS.md`, and `.agent/readme.md`.

The packet must reject scope drift into `silent CI broadening`, `coverage weakening`, or `generic cleanup`. Parent owns implementation, validation, workpad refreshes, PR flow, and Linear state.

## Problem Statement

The branch now carries the explicit command contract this issue asked for, but the issue packet still described the pre-change baseline. Current branch truth across scripts, workflow wiring, and guidance is:

- `package.json` maps `npm run test` to `test:core`
- `test:core` runs `vitest run --config vitest.config.core.ts`
- `test:all` runs `npm run test:core && npm run test:adapters`
- `test:orchestrator` aliases `test:core`
- `test:evaluation` remains the targeted `vitest.config.ts` evaluation lane
- `eval:test` aliases `test:evaluation`
- `.github/workflows/core-lane.yml` now runs `npm run test:core` in `Test (core matrix)`
- `AGENTS.md`, `.agent/AGENTS.md`, `.agent/readme.md`, and `docs/README.md` all describe `npm run test` as the explicit core/default validation alias, `test:all` as the broader matrix entrypoint, and evaluation as opt-in

That split is acceptable only if it stays explicit and truthful everywhere the issue packet points reviewers. The remaining risk is drift between the newly explicit repo contract and stale packet/workpad language, not ambiguity in `package.json` or Core Lane itself.

## Desired Outcome

- One truthful contract remains visible across `package.json`, `vitest.config.core.ts`, `vitest.config.ts`, `.github/workflows/core-lane.yml`, `AGENTS.md`, `.agent/AGENTS.md`, `.agent/readme.md`, and the directly relevant front-door command table in `docs/README.md`.
- `npm run test` stays on the explicit core matrix, `test:core` is the first-class core matrix command, `test:all` is the explicit broader entrypoint, `test:orchestrator` remains a compatibility alias to `test:core`, and `eval:test` remains an alias to the opt-in `test:evaluation` lane.
- Core Lane requires the explicit `test:core` command, and the workflow step naming makes that narrow scope visible.
- The follow-up stays narrow: align the exact test surfaces, not broad validation policy, not generic docs cleanup, and not speculative CI expansion.

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

## Wrong Interpretations To Reject

- Do not silently broaden `.github/workflows/core-lane.yml` to run additional suites without an explicit contract change.
- Do not weaken coverage by deleting or obscuring the explicit `test:all`, adapter, or evaluation surfaces when keeping `npm run test` core-only.
- Do not treat the issue as generic cleanup of scripts, configs, or agent docs.
- Do not reinterpret the issue as a blanket request to make Core Lane run `test:adapters`, `test:evaluation`, or `eval:test`.
- Do not reinterpret the issue as permission to remove `test:adapters`, `test:evaluation`, or `eval:test` from the repo contract.
- Do not make the docs child lane edit package, workflow, config, implementation, Linear state, workpad state, or PR lifecycle artifacts.

## Non-Goals

- No package, workflow, config, or implementation edits in this child lane.
- No blanket CI expansion or contraction outside the exact protected surfaces.
- No removal of distinct test commands or Vitest config splits without explicit parent justification.
- No generic repo cleanup framed as test-surface alignment.
- No full repo validation from this child lane.

## Current / Reference / Target Parity Matrix

| Surface | Current Behavior | Reference Behavior | Target Behavior |
| --- | --- | --- | --- |
| `package.json` script contract | `npm run test` delegates to `test:core`; `test:core` is explicit; `test:all` runs `test:core` plus `test:adapters`; `test:orchestrator` aliases `test:core`; `test:evaluation` stays targeted; `eval:test` aliases `test:evaluation`. | Script names should map to explicit, reviewable suite ownership. | Keep this explicit split truthful across scripts, docs, workflow, and focused regression coverage. |
| Vitest config split | `vitest.config.core.ts` is the orchestrator/core lane config; `vitest.config.ts` is used by targeted adapter/evaluation surfaces. | Config ownership should stay legible and non-accidental. | Parent preserves or explicitly realigns the config split instead of drifting through incidental command edits. |
| Core Lane CI | `.github/workflows/core-lane.yml` runs `npm run test:core` in `Test (core matrix)`. | CI should truthfully reflect the intended required lane surface. | Keep Core Lane pinned to the explicit core command and keep that narrow scope visible. |
| Agent guidance | `AGENTS.md`, `.agent/AGENTS.md`, `.agent/readme.md`, and `docs/README.md` describe `npm run test` as the explicit core/default alias while keeping `test:all` broader and evaluation opt-in. | Agent-facing instructions should not imply a different contract than scripts/workflow implement. | Parent aligns guidance with the exact script/config/workflow contract and the repo front door stays truthful. |
| Scope discipline | The same surfaces can be misread as a request for more CI, less coverage, or cleanup. | Alignment issues must preserve explicit test ownership and exact surface names. | `CO-270` stays bounded to exact contract alignment and rejects `silent CI broadening`, `coverage weakening`, and `generic cleanup`. |

## Acceptance Criteria

- The packet preserves the exact protected surfaces: `npm run test`, `test:orchestrator`, `test:adapters`, `test:evaluation`, `eval:test`, `vitest.config.core.ts`, `vitest.config.ts`, `.github/workflows/core-lane.yml`, `AGENTS.md`, `.agent/AGENTS.md`, and `.agent/readme.md`.
- The packet records the current repo truth for those surfaces without paraphrasing away the script/config split.
- The parent implementation path remains narrow: keep or explicitly realign the contract across scripts, configs, workflow, and agent docs.
- The packet explicitly rejects `silent CI broadening`, `coverage weakening`, and `generic cleanup`.
- This child lane remains docs-only; parent owns all package/workflow/config edits and all validation.

## Not Done If

- The packet or workpad still describes `npm run test` as a broader matrix instead of the explicit `test:core` + `test:all` split now on the branch.
- The packet allows `.github/workflows/core-lane.yml` to broaden or narrow without explicit contract ownership.
- The packet treats `vitest.config.core.ts` and `vitest.config.ts` as interchangeable or undocumented.
- The packet frames the issue as generic cleanup instead of exact contract alignment.
- The child lane edits any file outside the declared docs/task/registry scope.

## Stakeholders

- Product: maintainers who need Core Lane and local validation expectations to stay truthful.
- Engineering: owners of `package.json`, Vitest config surfaces, Core Lane workflow, and agent guidance.
- Design: N/A.

## Metrics & Guardrails

- Primary Success Metrics:
  - exact protected surfaces are present and cross-referenced in the packet
  - current script/config/workflow/doc contract is captured truthfully
  - wrong-interpretation guardrails explicitly reject broadening, weakening, and cleanup drift
- Guardrails / Error Budgets:
  - fail closed on ambiguity about which command/config owns which suite
  - do not infer new CI requirements from docs-only wording
  - do not infer permission to reduce coverage from Core Lane's current scope

## User Experience

- Personas:
  - maintainer deciding whether to change repo test scripts or Core Lane scope
  - reviewer checking whether CI/docs/script changes stayed truthful
  - future lane resuming the issue and needing exact surface ownership quickly
- User Journeys:
  - reviewer can compare `package.json`, `.github/workflows/core-lane.yml`, and agent docs without guessing which suite each surface owns
  - parent lane can edit the smallest contract surface necessary without scope drift into generic cleanup
  - future maintainer can tell whether `eval:test` is intentionally separate from `test:evaluation`

## Technical Considerations

- Architectural Notes:
  - Current branch truth is concrete: `package.json` keeps `npm run test` and `test:orchestrator` pinned to `test:core`, adds explicit `test:all` for the broader matrix, Core Lane executes `npm run test:core`, and agent/front-door docs keep `npm run eval:test` opt-in.
  - The smallest remaining parent implementation surface is now the issue packet plus any final focused validation/docs seams needed to keep that explicit contract truthful.
  - Parent should prefer alignment and explicit wording over further command churn.
- Dependencies / Integrations:
  - `package.json`
  - `.github/workflows/core-lane.yml`
  - `AGENTS.md`
  - `.agent/AGENTS.md`
  - `.agent/readme.md`

## Open Questions

- Should parent keep `npm run test` as the explicit core/default alias indefinitely, or should a later lane reconsider that default separately from `CO-270`?
- Is any extra repo-front-door documentation beyond `docs/README.md` still needed, or is the current protected-surface plus front-door update enough once validation is green?
- If parent changes agent guidance, which wording should stay in `AGENTS.md` versus `.agent/AGENTS.md` versus `.agent/readme.md` so the contract is explicit without duplication drift?

## Approvals

- Reviewer: bounded same-issue docs child lane self-review.
- Date: 2026-04-21.
