# Task Checklist - linear-67a294b8-748d-4b8d-92ae-a884b2be7d63

- Linear Issue: `CO-415` / `67a294b8-748d-4b8d-92ae-a884b2be7d63`
- MCP Task ID: `linear-67a294b8-748d-4b8d-92ae-a884b2be7d63`
- Primary PRD: `docs/PRD-linear-67a294b8-748d-4b8d-92ae-a884b2be7d63.md`
- TECH_SPEC: `tasks/specs/linear-67a294b8-748d-4b8d-92ae-a884b2be7d63.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-67a294b8-748d-4b8d-92ae-a884b2be7d63.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-67a294b8-748d-4b8d-92ae-a884b2be7d63.md`

## Docs-First
- [x] PRD drafted for current-main core validation timeout repair. Evidence: `docs/PRD-linear-67a294b8-748d-4b8d-92ae-a884b2be7d63.md`.
- [x] TECH_SPEC drafted for worker-cap root cause, config contract, and validation. Evidence: `tasks/specs/linear-67a294b8-748d-4b8d-92ae-a884b2be7d63.md`, `docs/TECH_SPEC-linear-67a294b8-748d-4b8d-92ae-a884b2be7d63.md`.
- [x] ACTION_PLAN drafted. Evidence: `docs/ACTION_PLAN-linear-67a294b8-748d-4b8d-92ae-a884b2be7d63.md`.
- [x] `tasks/index.json` updated under canonical `items[]`. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] Checklist mirrored to `.agent/task/linear-67a294b8-748d-4b8d-92ae-a884b2be7d63.md`. Evidence: `.agent/task/linear-67a294b8-748d-4b8d-92ae-a884b2be7d63.md`.
- [x] `docs/docs-freshness-registry.json` coverage added for packet files. Evidence: `docs/docs-freshness-registry.json`.

## Workflow
- [x] Live Linear context read before state transition. Evidence: `linear issue-context --issue-id 67a294b8-748d-4b8d-92ae-a884b2be7d63`.
- [x] Issue opened in started workflow state. Evidence: Linear state `In Progress`.
- [x] Single Codex Workpad created with required sections and non-empty checkbox lists. Evidence: Linear workpad comment `2afb876c-e7af-49c5-b038-24f0727a4e69`.
- [x] Pre-turn decomposition matrix recorded. Evidence: Linear workpad plan section.
- [x] Required `parallelize_now` decision recorded. Evidence: `linear parallelization --decision parallelize_now --reason independent_scope_available`.
- [x] Same-issue child lane `worker-cap-config` completed successfully; stale accept was invalidated after the parent fast-forwarded to current `origin/main`, and the parent applied the exact scoped patch. Evidence: `.runs/linear-67a294b8-748d-4b8d-92ae-a884b2be7d63-worker-cap-config/cli/2026-04-28T15-03-55-604Z-6d7e0014/manifest.json`, `.runs/linear-67a294b8-748d-4b8d-92ae-a884b2be7d63-worker-cap-config/cli/2026-04-28T15-03-55-604Z-6d7e0014/provider-linear-child-lane.patch`.

## Implementation Acceptance
- [x] Reproduce the current-main reduced cluster failure from the CO-409 evidence or fresher equivalent. Evidence: initial reduced run stalled past 12 minutes and failed with `Doctor`, `ProviderLinearChildLaneRunner`, `ControlRuntime`, and `cli-command-surface` timeout/RPC failures.
- [x] Identify the concrete shared cause. Evidence: reduced cluster passed at `--maxWorkers=2` without assertion changes, proving non-interactive worker pressure rather than CO-409 docs freshness or control-runtime projection logic.
- [x] Land the smallest fix that makes the reduced cluster pass on current main without masking failures. Evidence: `vitest.config.core.ts` lowers the non-interactive core worker cap to `2`, and `tests/vitest-progress-config.spec.ts` locks the contract.
- [x] Run full `npm run test` successfully on the repaired current-main tree. Evidence: `out/linear-67a294b8-748d-4b8d-92ae-a884b2be7d63/manual/20260428T205426Z-validation/03-npm-test.log` passed 357 files / 5026 tests.
- [x] Record downstream unblock guidance for CO-409. Evidence: CO-409 should rebase after this worker-cap fix lands, rerun its docs branch validation floor, and keep Mar 28 docs freshness ownership in CO-409/CO-420 rather than this lane.

## Validation
- [x] Reduced cluster baseline reproduction. Evidence: failed initial reduced run under provider-worker posture.
- [x] Reduced cluster lower-cap proof. Evidence: `npx vitest run --config vitest.config.core.ts --maxWorkers=2 orchestrator/tests/ControlRuntime.test.ts orchestrator/tests/ProviderLinearChildLaneRunner.test.ts orchestrator/tests/Doctor.test.ts tests/cli-command-surface.spec.ts` passed 328/328.
- [x] Focused config contract test. Evidence: `out/linear-67a294b8-748d-4b8d-92ae-a884b2be7d63/manual/20260428T205426Z-validation/01-focused-config.log` passed 13/13.
- [x] Reduced cluster after patch without explicit `--maxWorkers`. Evidence: `out/linear-67a294b8-748d-4b8d-92ae-a884b2be7d63/manual/20260428T205426Z-validation/02b-reduced-cluster-rerun.log` passed 4 files / 328 tests.
- [x] `npm run test`. Evidence: `out/linear-67a294b8-748d-4b8d-92ae-a884b2be7d63/manual/20260428T205426Z-validation/03-npm-test.log` passed 357 files / 5026 tests.
- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/linear-67a294b8-748d-4b8d-92ae-a884b2be7d63/manual/20260428T205426Z-validation/04-delegation-guard.log` found 2 subagent manifests.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/linear-67a294b8-748d-4b8d-92ae-a884b2be7d63/manual/20260428T205426Z-validation/05-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/linear-67a294b8-748d-4b8d-92ae-a884b2be7d63/manual/20260428T205426Z-validation/06-build.log`.
- [x] `npm run lint`. Evidence: `out/linear-67a294b8-748d-4b8d-92ae-a884b2be7d63/manual/20260428T205426Z-validation/07-lint.log` passed with 3 existing warnings in `orchestrator/tests/DelegationMcpHealth.test.ts`.
- [x] `npm run docs:check`. Evidence: first run hit `docs/TASKS.md` zero headroom; after archiving the historical `Slimdown Audit (0101)` block into `docs/TASKS-archive-2026.md`, `out/linear-67a294b8-748d-4b8d-92ae-a884b2be7d63/manual/20260428T205426Z-validation/08-docs-check-rerun.log` passed.
- [ ] `npm run docs:freshness`. Evidence: `out/linear-67a294b8-748d-4b8d-92ae-a884b2be7d63/manual/20260428T205426Z-validation/09-docs-freshness.log` failed on March 28 stale task packet/mirror debt; `09b-docs-freshness-maintain.log` reports `blocking_changed_paths=[]`, `configured_owner_terminal`, and follow-up `CO-420`.
- [x] `npm run repo:stewardship`. Evidence: `out/linear-67a294b8-748d-4b8d-92ae-a884b2be7d63/manual/20260428T205426Z-validation/10-repo-stewardship.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/linear-67a294b8-748d-4b8d-92ae-a884b2be7d63/manual/20260428T205426Z-validation/11-diff-budget.log`.
- [ ] Manifest-backed standalone review with `FORCE_CODEX_REVIEW=1`. Evidence: pending.
- [ ] Explicit elegance/minimality pass. Evidence: pending.

## Progress Log
- 2026-04-28: Read live Linear context, created the workpad, moved `Ready` to `In Progress`, recorded `parallelize_now`, launched docs child lane, reproduced the timeout cluster, invalidated the docs child lane after it drifted into parent-owned Linear/tool discovery, fast-forwarded to current `origin/main`, and relaunched a tighter config/test child lane.
- 2026-04-28: Continuation validation proved the worker-cap fix: focused config passed, reduced cluster passed without explicit `--maxWorkers`, and full `npm run test` passed. `docs:check` required archiving the historical Slimdown Audit block from live `docs/TASKS.md` to restore reserve headroom. `docs:freshness` remains blocked by unrelated March 28 cohort ownership debt; canonical follow-up `CO-420` was created with `docs:freshness:maintain`.
