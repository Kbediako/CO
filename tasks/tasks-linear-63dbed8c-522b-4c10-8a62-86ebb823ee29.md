# Task Checklist: CO-270 exact test surface contract alignment across scripts, configs, core lane, and agent docs

## Scope

- Task id: `linear-63dbed8c-522b-4c10-8a62-86ebb823ee29`
- Registry id: `20260421-linear-63dbed8c-522b-4c10-8a62-86ebb823ee29`
- Linear issue: `CO-270`
- Issue id: `63dbed8c-522b-4c10-8a62-86ebb823ee29`
- Child lane: docs packet only
- Parent lane owns Linear state, workpad, implementation, validation, PR lifecycle, and merge.

## Owned Files

- `docs/PRD-linear-63dbed8c-522b-4c10-8a62-86ebb823ee29.md`
- `docs/TECH_SPEC-linear-63dbed8c-522b-4c10-8a62-86ebb823ee29.md`
- `docs/ACTION_PLAN-linear-63dbed8c-522b-4c10-8a62-86ebb823ee29.md`
- `tasks/specs/linear-63dbed8c-522b-4c10-8a62-86ebb823ee29.md`
- `tasks/tasks-linear-63dbed8c-522b-4c10-8a62-86ebb823ee29.md`
- `.agent/task/linear-63dbed8c-522b-4c10-8a62-86ebb823ee29.md`
- `tasks/index.json`
- `docs/TASKS.md`
- `docs/docs-freshness-registry.json`

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

## Issue-Quality Review

- [x] Issue preserves the exact protected surfaces named in the parent prompt.
- [x] Issue records current repo truth from scripts, configs, workflow, and agent docs instead of paraphrasing away the split.
- [x] Issue explicitly rejects `silent CI broadening`.
- [x] Issue explicitly rejects `coverage weakening`.
- [x] Issue explicitly rejects `generic cleanup`.
- [x] Issue keeps package/workflow/config implementation ownership with the parent lane.

## Docs Checklist

- [x] PRD created at `docs/PRD-linear-63dbed8c-522b-4c10-8a62-86ebb823ee29.md`.
- [x] TECH_SPEC created at `docs/TECH_SPEC-linear-63dbed8c-522b-4c10-8a62-86ebb823ee29.md`.
- [x] ACTION_PLAN created at `docs/ACTION_PLAN-linear-63dbed8c-522b-4c10-8a62-86ebb823ee29.md`.
- [x] Task spec mirror created at `tasks/specs/linear-63dbed8c-522b-4c10-8a62-86ebb823ee29.md`.
- [x] Task checklist created at `tasks/tasks-linear-63dbed8c-522b-4c10-8a62-86ebb823ee29.md`.
- [x] Agent task mirror created at `.agent/task/linear-63dbed8c-522b-4c10-8a62-86ebb823ee29.md`.
- [x] Registry item added to `tasks/index.json`.
- [x] Snapshot entry added to `docs/TASKS.md`.
- [x] Freshness entries added to `docs/docs-freshness-registry.json`.
- [x] Scoped validation commands completed. Evidence: JSON parse, protected-term `rg`, scoped `git diff --check`, and all-touched-file trailing-whitespace check passed on 2026-04-21.

## Parent Implementation Checklist

- [x] Confirm the authoritative contract across `package.json`, `vitest.config.core.ts`, `vitest.config.ts`, `.github/workflows/core-lane.yml`, `AGENTS.md`, `.agent/AGENTS.md`, and `.agent/readme.md`.
- [x] Decide the correct outcome: `npm run test` remains the explicit core/default alias, `test:all` is the broader adapter-inclusive matrix, and evaluation remains opt-in.
- [x] Preserve the relationship between `npm run test` and `test:orchestrator` by pinning both to `test:core`.
- [x] Preserve the relationship between `test:adapters`, `test:evaluation`, and `eval:test` as explicit non-default surfaces.
- [x] Keep `vitest.config.core.ts` and `vitest.config.ts` ownership explicit.
- [x] Keep `.github/workflows/core-lane.yml` truthful about what Core Lane actually runs.
- [x] Keep `AGENTS.md`, `.agent/AGENTS.md`, and `.agent/readme.md` aligned with the resulting contract.
- [x] Reject `silent CI broadening`, `coverage weakening`, and `generic cleanup` in the implementation diff.
- [x] Run parent-owned validation and review before PR handoff.

## Parent Validation Closeout

- [x] Focused regression `npx vitest run tests/core-test-matrix-contract.spec.ts` passed.
- [x] Required guard/build/lint/default-test/docs/stewardship/diff-budget gates passed, except for the known repo-wide `docs:freshness` stale baseline.
- [x] Explicit `npm run test:all`, `npm run eval:test`, and pinned-Codex `npm run pack:smoke` passed.
- [x] Manifest-backed standalone review completed with `review_outcome: bounded-success` via `command-intent` retry.
- [x] Elegance/minimality pass completed; no simplification patch was needed beyond refreshing stale packet status lines.

## Source Notes

- Source anchor: `ctx:sha256:5d2910fa0d93867cfa975aa86260aab30241bc467da1a832b38c1aaa29db0c78#chunk:c000001`
- Source object id: `sha256:5d2910fa0d93867cfa975aa86260aab30241bc467da1a832b38c1aaa29db0c78`
- Declared source payload: `.runs/linear-63dbed8c-522b-4c10-8a62-86ebb823ee29-docs-packet/cli/2026-04-21T01-47-25-589Z-84d38530/memory/source-0/source.txt`
- Declared manifest: `.runs/linear-63dbed8c-522b-4c10-8a62-86ebb823ee29-docs-packet/cli/2026-04-21T01-47-25-589Z-84d38530/manifest.json`
- Caveat: the declared payload is not present in this child checkout. This checklist preserves the prompt-carried issue wording and repo-local protected-surface evidence; no Linear mutation was performed.

## Validation Commands

```bash
jq empty tasks/index.json docs/docs-freshness-registry.json
rg -n "npm run test|test:orchestrator|test:adapters|test:evaluation|eval:test|vitest.config.core.ts|vitest.config.ts|.github/workflows/core-lane.yml|AGENTS.md|.agent/AGENTS.md|.agent/readme.md|silent CI broadening|coverage weakening|generic cleanup" docs/PRD-linear-63dbed8c-522b-4c10-8a62-86ebb823ee29.md docs/TECH_SPEC-linear-63dbed8c-522b-4c10-8a62-86ebb823ee29.md docs/ACTION_PLAN-linear-63dbed8c-522b-4c10-8a62-86ebb823ee29.md tasks/specs/linear-63dbed8c-522b-4c10-8a62-86ebb823ee29.md tasks/tasks-linear-63dbed8c-522b-4c10-8a62-86ebb823ee29.md .agent/task/linear-63dbed8c-522b-4c10-8a62-86ebb823ee29.md docs/TASKS.md tasks/index.json docs/docs-freshness-registry.json
git diff --check -- docs/PRD-linear-63dbed8c-522b-4c10-8a62-86ebb823ee29.md docs/TECH_SPEC-linear-63dbed8c-522b-4c10-8a62-86ebb823ee29.md docs/ACTION_PLAN-linear-63dbed8c-522b-4c10-8a62-86ebb823ee29.md tasks/specs/linear-63dbed8c-522b-4c10-8a62-86ebb823ee29.md tasks/tasks-linear-63dbed8c-522b-4c10-8a62-86ebb823ee29.md .agent/task/linear-63dbed8c-522b-4c10-8a62-86ebb823ee29.md tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json
perl -ne 'if (/[ \t]$/) { print "$ARGV:$.: trailing whitespace\n"; $bad=1 } END { exit($bad ? 1 : 0) }' docs/PRD-linear-63dbed8c-522b-4c10-8a62-86ebb823ee29.md docs/TECH_SPEC-linear-63dbed8c-522b-4c10-8a62-86ebb823ee29.md docs/ACTION_PLAN-linear-63dbed8c-522b-4c10-8a62-86ebb823ee29.md tasks/specs/linear-63dbed8c-522b-4c10-8a62-86ebb823ee29.md tasks/tasks-linear-63dbed8c-522b-4c10-8a62-86ebb823ee29.md .agent/task/linear-63dbed8c-522b-4c10-8a62-86ebb823ee29.md tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json
```
