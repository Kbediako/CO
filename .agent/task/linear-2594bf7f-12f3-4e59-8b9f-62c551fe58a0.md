# Task Checklist - linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0

- Linear Issue: `CO-233` / `2594bf7f-12f3-4e59-8b9f-62c551fe58a0`
- MCP Task ID: `linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0`
- Canonical Task ID: `20260418-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0`
- Primary PRD: `docs/PRD-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md`
- TECH_SPEC: `tasks/specs/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md`
- Shared source 0 anchor: `ctx:sha256:3f6604004897f02bc794db8336db014b25eac836f27afb671f1ef946761d47ee#chunk:c000001`
- Current audit manifest: `.runs/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0-docs-packet-current-main-audit/cli/2026-04-18T13-48-58-782Z-e41ffc06/manifest.json`

## Docs-First
- [x] PRD drafted for the unrelated full-suite-only `npm run test` timeout around `orchestrator/tests/SelectedRunProjection.test.ts` case `refreshes projection proofs when child-lane reservation ledger placeholders exist`, with explicit passing isolated repro and `Doctor.test.ts` contrast. Evidence: `docs/PRD-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md`.
- [x] TECH_SPEC drafted with the protected terms, adjacent `CO-226` / `CO-219` linkage, issue-quality review notes, and parent-owned implementation seams. Evidence: `tasks/specs/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md`, `docs/TECH_SPEC-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md`.
- [x] ACTION_PLAN drafted for parent implementation and focused validation only. Evidence: `docs/ACTION_PLAN-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md`.
- [x] Current-main audit refreshed the owned issue-doc traceability and lane-local validation references without widening ownership beyond the six declared files. Evidence: `docs/PRD-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md`, `docs/TECH_SPEC-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md`, `docs/ACTION_PLAN-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md`, `tasks/specs/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md`, `tasks/tasks-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md`, `.agent/task/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md`.
- [x] Checklist mirrored to `.agent/task/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md`. Evidence: `.agent/task/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md`.
- [x] Pre-implementation issue-quality review recorded in the canonical spec notes. Evidence: `tasks/specs/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md`.
- [x] Current-main audit confirmed the packet semantics still match the issue scope and rerun plan; only stale traceability and lane-local validation references drifted. Evidence: the six owned files listed above.

## Child-Lane Scope
- [x] Child lane stayed inside the declared docs file scope. Evidence: final diff.
- [x] Child lane did not edit implementation or test files. Evidence: final diff.
- [x] Child lane did not mutate Linear state or workpad. Evidence: this checklist and final diff.
- [x] Child lane did not edit parent-owned global registries such as `tasks/index.json`, `docs/TASKS.md`, or `docs/docs-freshness-registry.json`. Evidence: final diff.
- [x] Child lane did not run full repo validation suites. Evidence: validation section below.
- [x] Child lane leaves changes uncommitted for parent patch export. Evidence: `git status --short`.

## Implementation Acceptance
- [ ] Full `npm run test` no longer times out or stalls around `orchestrator/tests/SelectedRunProjection.test.ts` case `refreshes projection proofs when child-lane reservation ledger placeholders exist`, or an explicit residual owner is recorded.
- [ ] The isolated repro `npx vitest run orchestrator/tests/SelectedRunProjection.test.ts -t "refreshes projection proofs when child-lane reservation ledger placeholders exist"` remains green after the parent fix.
- [ ] `orchestrator/tests/Doctor.test.ts` remains correctly classified as not being the live blocker in the same rerun.
- [ ] `CO-226` and `CO-219` remain explicit linked issues rather than inheriting this unrelated full-suite mismatch.
- [ ] The repair stays bounded to SelectedRunProjection proof refresh / child-lane placeholder resolution and does not collapse into broad runtime redesign or generic timeout padding.

## Validation
- [x] Child scoped touched-file audit stayed inside the six owned issue-doc files. Evidence: `git status --short -- docs/PRD-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md docs/TECH_SPEC-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md docs/ACTION_PLAN-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md tasks/specs/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md tasks/tasks-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md .agent/task/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md`.
- [x] Child scoped protected-term check over the packet and mirrors. Evidence: `rg -n "npm run test|orchestrator/tests/SelectedRunProjection.test.ts|refreshes projection proofs when child-lane reservation ledger placeholders exist|npx vitest run orchestrator/tests/SelectedRunProjection.test.ts -t \\\"refreshes projection proofs when child-lane reservation ledger placeholders exist\\\"|orchestrator/tests/Doctor.test.ts|CO-226|CO-219|provider-linear-worker-proof.json|provider-linear-worker-child-lanes.json|Child lane reserved before child run startup." docs/PRD-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md docs/TECH_SPEC-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md docs/ACTION_PLAN-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md tasks/specs/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md tasks/tasks-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md .agent/task/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md`.
- [x] Child scoped whitespace / diff check on touched files. Evidence: `git diff --check -- docs/PRD-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md docs/TECH_SPEC-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md docs/ACTION_PLAN-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md tasks/specs/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md tasks/tasks-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md .agent/task/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md`.
- [ ] Parent focused SelectedRunProjection repro after source edits. Evidence target: `npx vitest run orchestrator/tests/SelectedRunProjection.test.ts -t "refreshes projection proofs when child-lane reservation ledger placeholders exist"`.
- [ ] Parent full-suite rerun after source edits. Evidence target: `npm run test`.
- [ ] Parent proof that `Doctor.test.ts` remains non-authoritative in the same rerun.
- [ ] Parent docs-review / scoped validation after packet acceptance.

## Progress Log
- 2026-04-18: bounded same-issue child lane audited the existing `CO-233` packet against prompt-carried current-main audit anchor `ctx:sha256:3f6604004897f02bc794db8336db014b25eac836f27afb671f1ef946761d47ee#chunk:c000001`; the issue checksum remained correct, so the patch only refreshed stale traceability and lane-local validation references inside the six owned files.
- 2026-04-18: the packet preserves the authoritative issue checksum exactly: full `npm run test` still owns the unrelated branch-baseline blocker, the named case is `refreshes projection proofs when child-lane reservation ledger placeholders exist`, the isolated `npx vitest run orchestrator/tests/SelectedRunProjection.test.ts -t "refreshes projection proofs when child-lane reservation ledger placeholders exist"` repro passes, and `orchestrator/tests/Doctor.test.ts` is no longer the live blocker in the same rerun.
- 2026-04-18: repo-local search did not surface mirrored packet docs for `CO-226` or `CO-219`, so the packet preserves them as explicit linked adjacent issues from the parent prompt rather than inventing additional local issue content.
