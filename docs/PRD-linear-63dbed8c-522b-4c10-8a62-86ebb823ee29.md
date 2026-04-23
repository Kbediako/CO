# PRD: CO-270 Core Lane vs Full Test Matrix Contract

## Traceability

- Linear issue: `CO-270`
- Issue id: `63dbed8c-522b-4c10-8a62-86ebb823ee29`
- Task id: `linear-63dbed8c-522b-4c10-8a62-86ebb823ee29`
- Registry id: `20260421-linear-63dbed8c-522b-4c10-8a62-86ebb823ee29`
- Current attempt: Rework reset from `origin/main` on 2026-04-21
- Source anchor: `ctx:sha256:15bab6d2b18fa5a71d0aaed22f8d1d12e6e4ec96cf968e818ddaf3fe34eda514#chunk:c000001`

## User Request Translation

Make the repository's test contract explicit. Today `npm run test` is the Core Lane suite, but several surfaces read as if it were the whole repository matrix. This issue must make the difference between the core matrix, the broader adapter-inclusive matrix, and the opt-in evaluation lane visible in commands, CI, tests, and agent-facing docs.

## Problem Statement

Core Lane is intentionally narrow, but `npm run test` has historically been ambiguous because it delegates to the core/orchestrator Vitest config while excluding `adapters/**` and `evaluation/tests/**`. That ambiguity creates two risks:

- reviewers may assume Core Lane covers adapter and evaluation suites that it does not run
- future agents may broaden or narrow CI silently instead of making an explicit contract decision

The fix should be a truthfulness contract, not a CI expansion by accident.

## Intended Contract

- `npm run test:core` is the first-class Core Lane / narrow core matrix command and uses `vitest.config.core.ts`.
- `npm run test` remains the default repo validation alias to `test:core`, preserving current Core Lane scope while making that scope explicit.
- `npm run test:orchestrator` remains a compatibility alias to `test:core`.
- `npm run test:all` is the explicit broader Vitest matrix entrypoint for `test:core` plus `test:adapters`.
- `npm run test:adapters` remains the adapter-targeted command using an adapter-scoped Vitest config so focused filters stay focused.
- `npm run test:evaluation` remains the targeted evaluation command using an evaluation-scoped Vitest config so focused filters stay focused.
- `npm run eval:test` remains the opt-in evaluation alias to `test:evaluation`.
- `.github/workflows/core-lane.yml` calls `npm run test:core`, not ambiguous `npm run test`.

Delegated aliases must preserve npm-run argument forwarding so focused checks such as `npm run test -- tests/foo.spec.ts` and `npm run test:all -- --help` do not get parsed by npm instead of Vitest.

## Protected Surfaces

- `package.json`
- `.github/workflows/core-lane.yml`
- `AGENTS.md`
- `.agent/AGENTS.md`
- `.agent/readme.md`
- `docs/README.md`
- `vitest.config.core.ts`
- `vitest.config.ts`
- `tests/core-test-matrix-contract.spec.ts`

## Wrong Interpretations To Reject

- Do not silently broaden Core Lane to `test:all`.
- Do not weaken adapter or evaluation coverage by deleting commands or docs references.
- Do not treat this as generic CI cleanup or performance work.
- Do not treat `npm run test` ambiguity as docs-only; the command and workflow surfaces must change.

## Non-Goals

- No blanket expansion of Core Lane to the full matrix.
- No removal of `test:adapters`, `test:evaluation`, or `eval:test`.
- No unrelated Vitest, CI, or docs cleanup outside the named surfaces.
- No adapter or evaluation coverage weakening; scoped config changes are allowed only to preserve focused-filter behavior without changing lane ownership.

## Acceptance Criteria

- The command contract distinguishes core, broader adapter-inclusive, and opt-in evaluation lanes.
- `test:core` exists as a first-class command for the current core suite.
- `.github/workflows/core-lane.yml` invokes `npm run test:core`.
- `test:all` exists as the broader adapter-inclusive entrypoint and is documented truthfully.
- Agent-facing docs no longer overclaim adapter/evaluation coverage for Core Lane.
- Focused regression coverage verifies scripts and workflow mapping, including delegated alias argument forwarding.

## Not Done If

- `npm run test` still reads like a repo-wide suite while running only core tests.
- Core Lane still invokes ambiguous `npm run test`.
- Docs imply adapter/evaluation coverage is part of Core Lane.
- There is no explicit broader matrix command.
- Delegated aliases drop forwarded arguments.
