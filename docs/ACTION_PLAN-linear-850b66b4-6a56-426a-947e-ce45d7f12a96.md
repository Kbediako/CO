# ACTION_PLAN - CO STATUS / observability: reconcile top-level provider_intake with concurrent running claims and retry/error history

## Summary
- Goal: give the parent lane a bounded implementation plan for the truth-contract gap where top-level `provider_intake` is singular but concurrent running claims and `retry/error history` still exist across `CO STATUS`, `co-status --format json`, and `.runs/local-mcp/cli/control-host/provider-intake-state.json`.
- Scope: docs-first packet, registry/checklist mirrors, parent-owned intake-summary/observability alignment, and parent-owned focused validation.
- Assumptions:
  - the shared source payload itself is absent in this child checkout
  - the protected lane wording is the authoritative checksum for this slice
  - the smallest correct fix is one explicit contract between `buildProviderIntakeSummary()` / `selectProviderIntakeClaim()` and concurrent-running/read-model surfaces, not a scheduler rewrite

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `top-level provider_intake`
  - `concurrent running claims`
  - `CO STATUS`
  - `co-status --format json`
  - `.runs/local-mcp/cli/control-host/provider-intake-state.json`
  - `buildProviderIntakeSummary()`
  - `selectProviderIntakeClaim()`
  - `state-rank plus updated_at sort`
  - `retry/error history`
- Not done if:
  - top-level `provider_intake` still contradicts concurrent-running operator truth with no explicit contract
  - `retry/error history` still disappears solely because a different claim wins `state-rank plus updated_at sort`
  - the fix collapses or hides concurrent running claims instead of aligning the surfaces
  - the lane drifts into admission, scheduler, or renderer redesign
- Pre-implementation issue-quality review:
  - 2026-04-18: the lane prompt makes this an intake-summary versus observability truth-alignment lane, not a concurrency-policy or renderer lane. The packet therefore rejects widening into scheduler, admission-cap, or destructive state-cleanup work.

## Milestones & Sequencing
1. Create the docs-first packet and mirrors for `CO-243` within the declared docs scope.
2. Parent audits the current top-level intake-summary path through `providerIntakeState.ts`, `controlRuntime.ts`, `observabilityReadModel.ts`, `observabilitySurface.ts`, and `operatorDashboardPresenter.ts`.
3. Parent audits the concurrent-running/read-model path through `selectedRunProjection.ts`, runtime projections, and `CO STATUS` / `co-status --format json`.
4. Parent identifies the smallest seam where singular `provider_intake` semantics contradict concurrent running claims or hide `retry/error history`.
5. Parent implements one explicit contract so top-level `provider_intake` no longer silently outranks concurrent-running truth.
6. Parent preserves `retry/error history` for the relevant claim or claim set.
7. Parent confirms the change does not collapse or hide concurrent running claims.
8. Parent runs focused validation and carries the packet into its normal review/PR path.

## Dependencies
- Shared source anchor: `ctx:sha256:e406003646faf7e5ea017cd7f91b297ac8e25a900b7ecb2a26dc8d3eeab09575#chunk:c000001`
- Origin manifest: `.runs/linear-850b66b4-6a56-426a-947e-ce45d7f12a96-docs-packet/cli/2026-04-18T06-37-07-244Z-a8194450/manifest.json`
- Live seam inventory:
  - `orchestrator/src/cli/control/providerIntakeState.ts`
  - `orchestrator/src/cli/control/controlRuntime.ts`
  - `orchestrator/src/cli/control/selectedRunProjection.ts`
  - `orchestrator/src/cli/control/observabilityReadModel.ts`
  - `orchestrator/src/cli/control/observabilitySurface.ts`
  - `orchestrator/src/cli/control/operatorDashboardPresenter.ts`
- Likely parent focused tests:
  - `orchestrator/tests/ProviderIntakeState.test.ts`
  - `orchestrator/tests/ControlRuntime.test.ts`
  - `orchestrator/tests/SelectedRunProjection.test.ts`

## Validation
- Child lane only:
  - `python3 - <<'PY'\nimport json, pathlib\njson.loads(pathlib.Path('tasks/index.json').read_text())\nPY`
  - `rg -n "top-level provider_intake|concurrent running claims|CO STATUS|co-status --format json|\\.runs/local-mcp/cli/control-host/provider-intake-state\\.json|buildProviderIntakeSummary\\(\\)|selectProviderIntakeClaim\\(\\)|state-rank plus updated_at sort|retry/error history" docs/PRD-linear-850b66b4-6a56-426a-947e-ce45d7f12a96.md docs/TECH_SPEC-linear-850b66b4-6a56-426a-947e-ce45d7f12a96.md docs/ACTION_PLAN-linear-850b66b4-6a56-426a-947e-ce45d7f12a96.md tasks/specs/linear-850b66b4-6a56-426a-947e-ce45d7f12a96.md tasks/tasks-linear-850b66b4-6a56-426a-947e-ce45d7f12a96.md .agent/task/linear-850b66b4-6a56-426a-947e-ce45d7f12a96.md`
  - `git diff --check -- docs/PRD-linear-850b66b4-6a56-426a-947e-ce45d7f12a96.md docs/TECH_SPEC-linear-850b66b4-6a56-426a-947e-ce45d7f12a96.md docs/ACTION_PLAN-linear-850b66b4-6a56-426a-947e-ce45d7f12a96.md tasks/specs/linear-850b66b4-6a56-426a-947e-ce45d7f12a96.md tasks/tasks-linear-850b66b4-6a56-426a-947e-ce45d7f12a96.md .agent/task/linear-850b66b4-6a56-426a-947e-ce45d7f12a96.md tasks/index.json docs/TASKS.md`
- Parent implementation lane:
  - focused `ProviderIntakeState.test.ts` slice for concurrent-claim summary behavior
  - focused `ControlRuntime.test.ts` and `SelectedRunProjection.test.ts` slice for top-level summary versus concurrent-running truth
  - any nearby observability/controller tests needed to prove `CO STATUS` and `co-status --format json` remain concurrent-claim aware while top-level `provider_intake` stays truthful
  - parent docs-review before implementation
  - parent-selected scoped validation after source edits
- Rollback plan:
  - revert the bounded truth-contract seam if it collapses concurrent running claims, loses retry/error visibility, or widens into scheduler/admission changes

## Risks & Mitigations
- Risk: the fix collapses concurrent running claims to make top-level `provider_intake` look consistent.
  - Mitigation: keep concurrent running claims as explicit protected truth and as unchecked implementation acceptance criteria.
- Risk: retry/error residue remains tied to the wrong claim after the summary contract changes.
  - Mitigation: keep `retry/error history` as an explicit protected term and focused validation target.
- Risk: the parent widens into provider admission or scheduler changes.
  - Mitigation: keep those surfaces explicit non-goals in the spec and checklist.

## Approvals
- Docs packet child lane: `.runs/linear-850b66b4-6a56-426a-947e-ce45d7f12a96-docs-packet/cli/2026-04-18T06-37-07-244Z-a8194450/manifest.json`
- Parent docs-review: pending parent acceptance
- Parent implementation/review/PR lifecycle: pending parent lane
