# ACTION_PLAN: CO-270 exact test surface contract alignment across scripts, configs, core lane, and agent docs

## Goal

Complete and hand off a narrow `CO-270` contract-alignment lane: preserve the exact surfaces `npm run test`, `test:orchestrator`, `test:adapters`, `test:evaluation`, `eval:test`, `vitest.config.core.ts`, `vitest.config.ts`, `.github/workflows/core-lane.yml`, `AGENTS.md`, `.agent/AGENTS.md`, and `.agent/readme.md`, and reject `silent CI broadening`, `coverage weakening`, and `generic cleanup`.

## Docs Packet Child-Lane Constraints

- This child lane edits only docs and registry mirror files in the declared scope.
- Do not edit `package.json`, `.github/workflows/core-lane.yml`, Vitest configs, or any implementation/test files from this lane.
- Do not call Linear mutation helpers.
- Do not run full repo validation suites.
- Do not imply that Core Lane should automatically broaden or narrow without explicit parent review.

## Source Evidence

- Linear issue: `CO-270`
- Issue id: `63dbed8c-522b-4c10-8a62-86ebb823ee29`
- Source anchor: `ctx:sha256:5d2910fa0d93867cfa975aa86260aab30241bc467da1a832b38c1aaa29db0c78#chunk:c000001`
- Source object id: `sha256:5d2910fa0d93867cfa975aa86260aab30241bc467da1a832b38c1aaa29db0c78`
- Declared source payload: `.runs/linear-63dbed8c-522b-4c10-8a62-86ebb823ee29-docs-packet/cli/2026-04-21T01-47-25-589Z-84d38530/memory/source-0/source.txt`
- Declared manifest: `.runs/linear-63dbed8c-522b-4c10-8a62-86ebb823ee29-docs-packet/cli/2026-04-21T01-47-25-589Z-84d38530/manifest.json`
- Repo-local contract evidence:
  - `package.json` script mapping for `npm run test`, `test:orchestrator`, `test:adapters`, `test:evaluation`, and `eval:test`
  - `.github/workflows/core-lane.yml` `Test (core matrix)` step running `npm run test:core`
  - `AGENTS.md`, `.agent/AGENTS.md`, and `.agent/readme.md` validation wording
- Source caveat: the declared payload is not present in this child checkout. This action plan preserves the prompt-carried issue wording plus repo-local surface evidence; no Linear mutation was performed.

## Issue Readiness Gate

- Intent checksum / protected terms carried forward:
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
- Not done if:
  - the packet leaves the script/config/workflow contract ambiguous
  - the packet permits Core Lane scope to broaden or narrow without explicit contract ownership
  - the packet frames the issue as `generic cleanup`
  - the child lane edits package/workflow/config files
- Pre-implementation issue-quality review:
  - 2026-04-21: repo-local inspection confirms the issue is concrete, not speculative. The corrected branch keeps `npm run test` and `test:orchestrator` pinned to `test:core`, introduces first-class `test:core`, keeps explicit `test:all` as the broader matrix entrypoint, keeps `eval:test` as an alias to `test:evaluation`, and runs `npm run test:core` in `.github/workflows/core-lane.yml`. The accepted remaining scope is packet truthfulness, focused regression coverage, and reviewable validation, not another broad CI redesign.

## Plan

1. Create the PRD, TECH_SPEC, ACTION_PLAN, task spec mirror, task checklist, and agent task mirror for `linear-63dbed8c-522b-4c10-8a62-86ebb823ee29`.
2. Register the packet in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
3. Preserve the current repo truth from `package.json`, `.github/workflows/core-lane.yml`, `AGENTS.md`, `.agent/AGENTS.md`, and `.agent/readme.md`.
4. Record wrong interpretations, non-goals, `Not Done If`, and a current/reference/target matrix that keeps the exact script/config/workflow split reviewable.
5. Run only scoped docs/JSON validation and leave the patch in the child lane workspace for parent export.

## Parent Implementation Plan

- [x] Confirm the authoritative contract across `package.json`, `vitest.config.core.ts`, `vitest.config.ts`, `.github/workflows/core-lane.yml`, `AGENTS.md`, `.agent/AGENTS.md`, and `.agent/readme.md`.
- [x] Decide the correct parent outcome: keep `npm run test` pinned to the explicit core/default matrix, add `test:all` as the broader adapter-inclusive matrix, and keep evaluation opt-in.
- [x] Keep Core Lane explicit by running `npm run test:core` in the workflow and reflecting that in agent guidance.
- [x] Keep `npm run test`, `test:orchestrator`, `test:adapters`, `test:evaluation`, and `eval:test` explicit instead of collapsing them into ambiguous aliases.
- [x] Preserve the ownership split between `vitest.config.core.ts` and `vitest.config.ts`.
- [x] Run parent-owned validation and manifest-backed review on the final protected-surface diff before PR handoff.

## Dependencies

- `package.json`
- `vitest.config.core.ts`
- `vitest.config.ts`
- `.github/workflows/core-lane.yml`
- `AGENTS.md`
- `.agent/AGENTS.md`
- `.agent/readme.md`

## Validation

### Child-Lane Checks

- `jq empty tasks/index.json docs/docs-freshness-registry.json`
- protected-term search over the packet and registry files
- `git diff --check` on the declared files only
- trailing-whitespace check on the declared files only

### Parent-Lane Checks

- [x] Re-read protected surfaces after the contract change.
- [x] Run the validation commands implied by the resulting contract.
- [x] Keep CI/doc/script wording aligned before review handoff.

## Risks & Mitigations

- Risk: the parent broadens Core Lane accidentally while trying to align docs.
  - Mitigation: treat `.github/workflows/core-lane.yml` as a protected surface; any behavior change must be explicit and mirrored.
- Risk: the parent weakens coverage by narrowing `npm run test` or collapsing separate commands.
  - Mitigation: preserve explicit script ownership and reject alias collapse without clear contract rationale.
- Risk: the issue devolves into `generic cleanup`.
  - Mitigation: keep all packet language anchored on the exact protected surfaces and the three rejected drift categories.

## Exit Criteria For This Child Lane

- Docs-first packet files exist in the declared scope.
- Registry mirrors are updated in the declared scope with review date `2026-04-21`.
- The exact protected surfaces appear across the packet and mirrors.
- JSON registries parse.
- Scoped diff and trailing-whitespace checks pass.
- No implementation, package, workflow, or config file is edited.
- No commit is created.
