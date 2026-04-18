# Task Checklist - linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0

- Linear Issue: `CO-233` / `2594bf7f-12f3-4e59-8b9f-62c551fe58a0`
- MCP Task ID: `linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0`
- Canonical Task ID: `20260418-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0`
- Primary PRD: `docs/PRD-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md`
- TECH_SPEC: `tasks/specs/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md`
- Shared source 0 anchor: `ctx:sha256:6c489971dd6f03545c47f5063f802b920c1c52fcee78a5d03e16d6b81d7d17a5#chunk:c000001`
- Current origin manifest: `../../.runs/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0/cli/2026-04-18T01-28-52-748Z-ffa1574a/manifest.json`

## Docs-First
- [x] PRD drafted for the unrelated full-suite-only `npm run test` timeout around `orchestrator/tests/SelectedRunProjection.test.ts` case `refreshes projection proofs when child-lane reservation ledger placeholders exist`, with explicit passing isolated repro and `Doctor.test.ts` contrast. Evidence: `docs/PRD-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md`.
- [x] TECH_SPEC drafted with the protected terms, adjacent `CO-226` / `CO-219` linkage, issue-quality review notes, and parent-owned implementation seams. Evidence: `tasks/specs/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md`, `docs/TECH_SPEC-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md`.
- [x] ACTION_PLAN drafted for parent implementation and focused validation only. Evidence: `docs/ACTION_PLAN-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md`.
- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated within the declared docs scope. Evidence: those files.
- [x] Checklist mirrored to `.agent/task/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md`. Evidence: `.agent/task/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md`.
- [x] Pre-implementation issue-quality review recorded in the canonical spec notes. Evidence: `tasks/specs/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md`.
- [x] `docs/docs-freshness-registry.json` coverage added for all six packet and mirror files. Evidence: `docs/docs-freshness-registry.json`.

## Child-Lane Scope
- [x] Child lane stayed inside the declared docs file scope. Evidence: final diff.
- [x] Child lane did not edit implementation or test files. Evidence: final diff.
- [x] Child lane did not mutate Linear state or workpad. Evidence: this checklist and final diff.
- [x] Child lane did not run full repo validation suites. Evidence: validation section below.
- [x] Child lane leaves changes uncommitted for parent patch export. Evidence: `git status --short`.

## Implementation Acceptance
- [ ] Full `npm run test` no longer times out or stalls around `orchestrator/tests/SelectedRunProjection.test.ts` case `refreshes projection proofs when child-lane reservation ledger placeholders exist`, or an explicit residual owner is recorded.
- [ ] The isolated repro `npx vitest run orchestrator/tests/SelectedRunProjection.test.ts -t "refreshes projection proofs when child-lane reservation ledger placeholders exist"` remains green after the parent fix.
- [ ] `orchestrator/tests/Doctor.test.ts` remains correctly classified as not being the live blocker in the same rerun.
- [ ] `CO-226` and `CO-219` remain explicit linked issues rather than inheriting this unrelated full-suite mismatch.
- [ ] The repair stays bounded to SelectedRunProjection proof refresh / child-lane placeholder resolution and does not collapse into broad runtime redesign or generic timeout padding.

## Validation
- [x] Child scoped JSON parse check. Evidence: `jq empty tasks/index.json docs/docs-freshness-registry.json`.
- [x] Child scoped protected-term check over the packet and mirrors. Evidence: `rg -n "npm run test|orchestrator/tests/SelectedRunProjection.test.ts|refreshes projection proofs when child-lane reservation ledger placeholders exist|npx vitest run orchestrator/tests/SelectedRunProjection.test.ts -t \\\"refreshes projection proofs when child-lane reservation ledger placeholders exist\\\"|orchestrator/tests/Doctor.test.ts|CO-226|CO-219|provider-linear-worker-proof.json|provider-linear-worker-child-lanes.json|Child lane reserved before child run startup." docs/PRD-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md docs/TECH_SPEC-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md docs/ACTION_PLAN-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md tasks/specs/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md tasks/tasks-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md .agent/task/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md`.
- [x] Child scoped whitespace / diff check on touched files. Evidence: `git diff --check -- docs/PRD-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md docs/TECH_SPEC-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md docs/ACTION_PLAN-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md tasks/specs/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md tasks/tasks-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md .agent/task/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json`.
- [ ] Parent focused SelectedRunProjection repro after source edits. Evidence target: `npx vitest run orchestrator/tests/SelectedRunProjection.test.ts -t "refreshes projection proofs when child-lane reservation ledger placeholders exist"`.
- [ ] Parent full-suite rerun after source edits. Evidence target: `npm run test`.
- [ ] Parent proof that `Doctor.test.ts` remains non-authoritative in the same rerun.
- [ ] Parent docs-review / scoped validation after packet acceptance.

## Progress Log
- 2026-04-18: bounded same-issue child lane created the `CO-233` docs-first packet and registry mirrors from the authoritative provider-worker prompt anchor `ctx:sha256:6c489971dd6f03545c47f5063f802b920c1c52fcee78a5d03e16d6b81d7d17a5#chunk:c000001`, while implementation ownership remained with the parent lane.
- 2026-04-18: the packet preserves the authoritative issue checksum exactly: full `npm run test` still owns the unrelated branch-baseline blocker, the named case is `refreshes projection proofs when child-lane reservation ledger placeholders exist`, the isolated `npx vitest run orchestrator/tests/SelectedRunProjection.test.ts -t "refreshes projection proofs when child-lane reservation ledger placeholders exist"` repro passes, and `orchestrator/tests/Doctor.test.ts` is no longer the live blocker in the same rerun.
- 2026-04-18: repo-local search did not surface mirrored packet docs for `CO-226` or `CO-219`, so the packet preserves them as explicit linked adjacent issues from the parent prompt rather than inventing additional local issue content.
