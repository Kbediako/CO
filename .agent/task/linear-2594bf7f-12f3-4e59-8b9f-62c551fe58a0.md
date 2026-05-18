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

## Historical Child-Lane Scope (docs-packet audit only)
- [x] Child lane stayed inside the declared docs file scope before parent implementation landed. Evidence: `.runs/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0-docs-packet-current-main-audit/cli/2026-04-18T13-48-58-782Z-e41ffc06/manifest.json`.
- [x] Child lane did not edit implementation or test files. Evidence: `.runs/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0-docs-packet-current-main-audit/cli/2026-04-18T13-48-58-782Z-e41ffc06/manifest.json`.
- [x] Child lane did not mutate Linear state or workpad. Evidence: `.runs/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0-docs-packet-current-main-audit/cli/2026-04-18T13-48-58-782Z-e41ffc06/manifest.json`.
- [x] Child lane did not edit parent-owned global registries such as `tasks/index.json`, `docs/TASKS.md`, or `docs/docs-freshness-registry.json`. Evidence: `.runs/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0-docs-packet-current-main-audit/cli/2026-04-18T13-48-58-782Z-e41ffc06/manifest.json`.
- [x] Child lane did not run full repo validation suites. Evidence: validation section below.
- [x] Parent accepted the docs-only child patch before landing the runtime/test fix. Evidence: `.runs/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0-docs-packet-current-main-audit/cli/2026-04-18T13-48-58-782Z-e41ffc06/manifest.json`.

## Parent Implementation Scope
- [x] Parent branch caps Vitest workers for unattended broad-lane runs keyed by `CI`, `CODEX_VITEST_PROGRESS`, `CODEX_NON_INTERACTIVE`, `CODEX_NO_INTERACTIVE`, and `CODEX_NONINTERACTIVE`, while leaving interactive local runs uncapped. Evidence: `vitest.config.core.ts`.
- [x] Parent branch covers the non-interactive worker-cap aliases in config tests so the runtime change stays explicit. Evidence: `tests/vitest-progress-config.spec.ts`.

## Implementation Acceptance
- [x] Full `npm run test` no longer times out or stalls around `orchestrator/tests/SelectedRunProjection.test.ts` case `refreshes projection proofs when child-lane reservation ledger placeholders exist`. Evidence: `/tmp/co233-npm-run-test.log` plus full-suite summary `344 passed` / `4177 passed`.
- [x] The isolated repro `npx vitest run orchestrator/tests/SelectedRunProjection.test.ts -t "refreshes projection proofs when child-lane reservation ledger placeholders exist"` remains green after the parent fix. Evidence: parent focused repro output (`1 passed | 76 skipped`).
- [x] `orchestrator/tests/Doctor.test.ts` remains correctly classified as not being the live blocker in the same rerun. Evidence: `/tmp/co233-npm-run-test.log` shows `SelectedRunProjection.test.ts` passed and `Doctor.test.ts` also passed inside the same full-suite run.
- [x] `CO-226` and `CO-219` remain explicit linked issues rather than inheriting this unrelated full-suite mismatch. Evidence: packet docs and workpad.
- [x] The repair stays bounded to the Vitest runner/config seam for unattended broad-lane worker saturation and does not collapse into broad runtime redesign or generic timeout padding. Evidence: `vitest.config.core.ts`, `tests/vitest-progress-config.spec.ts`.

## Validation
- [x] Child scoped touched-file audit stayed inside the six owned issue-doc files. Evidence: `git status --short -- docs/PRD-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md docs/TECH_SPEC-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md docs/ACTION_PLAN-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md tasks/specs/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md tasks/tasks-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md .agent/task/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md`.
- [x] Child scoped protected-term check over the packet and mirrors. Evidence: `rg -n "npm run test|orchestrator/tests/SelectedRunProjection.test.ts|refreshes projection proofs when child-lane reservation ledger placeholders exist|npx vitest run orchestrator/tests/SelectedRunProjection.test.ts -t \\\"refreshes projection proofs when child-lane reservation ledger placeholders exist\\\"|orchestrator/tests/Doctor.test.ts|CO-226|CO-219|provider-linear-worker-proof.json|provider-linear-worker-child-lanes.json|Child lane reserved before child run startup." docs/PRD-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md docs/TECH_SPEC-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md docs/ACTION_PLAN-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md tasks/specs/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md tasks/tasks-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md .agent/task/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md`.
- [x] Child scoped whitespace / diff check on touched files. Evidence: `git diff --check -- docs/PRD-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md docs/TECH_SPEC-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md docs/ACTION_PLAN-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md tasks/specs/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md tasks/tasks-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md .agent/task/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md`.
- [x] Parent `node scripts/spec-guard.mjs --dry-run` pre-review guard is recorded for this packet. Evidence: `out/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0/manual/20260418T144616Z-spec-guard.log`.
- [x] Parent focused SelectedRunProjection repro after source edits. Evidence: `npx vitest run --config vitest.config.core.ts orchestrator/tests/SelectedRunProjection.test.ts -t "refreshes projection proofs when child-lane reservation ledger placeholders exist"` (`1 passed | 76 skipped`).
- [x] Parent full-suite rerun after source edits. Evidence: `npm run test` summary `Test Files 344 passed (344)` / `Tests 4177 passed (4177)` from `/tmp/co233-npm-run-test.log`.
- [x] Parent proof that `Doctor.test.ts` remains non-authoritative in the same rerun. Evidence: `/tmp/co233-npm-run-test.log` lines for `SelectedRunProjection.test.ts` and `Doctor.test.ts` in the same green suite.
- [x] Parent standalone review / scoped validation after packet acceptance. Evidence: `out/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0/manual/20260418T143124Z-standalone-review-fallback.md`.
- [x] Parent elegance review after standalone review. Evidence: `out/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0/manual/20260418T143124Z-elegance-review.md`.
- [x] Parent downstream package smoke before handoff. Evidence: `out/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0/manual/20260418T143528Z-pack-smoke.log`.

## Progress Log
- 2026-04-18: bounded same-issue child lane audited the existing `CO-233` packet against prompt-carried current-main audit anchor `ctx:sha256:3f6604004897f02bc794db8336db014b25eac836f27afb671f1ef946761d47ee#chunk:c000001`; the issue checksum remained correct, so the patch only refreshed stale traceability and lane-local validation references inside the six owned files.
- 2026-04-18: the initial packet preserved the authoritative historical issue checksum exactly: the branch-baseline blocker had shifted away from `orchestrator/tests/Doctor.test.ts` and onto the named `SelectedRunProjection` case `refreshes projection proofs when child-lane reservation ledger placeholders exist`, while the isolated `npx vitest run orchestrator/tests/SelectedRunProjection.test.ts -t "refreshes projection proofs when child-lane reservation ledger placeholders exist"` repro already passed.
- 2026-04-18: repo-local search did not surface mirrored packet docs for `CO-226` or `CO-219`, so the packet preserves them as explicit linked adjacent issues from the parent prompt rather than inventing additional local issue content.
- 2026-04-18: parent implementation fixed the suite-context failure by capping Vitest workers for unattended broad-lane runs in `vitest.config.core.ts` and covering the non-interactive aliases in `tests/vitest-progress-config.spec.ts`, while preserving uncapped interactive local runs.
- 2026-04-18: parent validation cleared the focused repro, full `npm run test`, `Doctor.test.ts` non-blocker contrast, `npm run build`, `npm run lint`, `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, and `node scripts/diff-budget.mjs`.
- 2026-04-18: parent review closeout is now explicit rather than pending: repeated forced standalone-review reruns drifted after concrete packet fixes, so the lane records manual fallback plus explicit elegance review, then reran and captured `npm run pack:smoke` successfully before PR handoff.
