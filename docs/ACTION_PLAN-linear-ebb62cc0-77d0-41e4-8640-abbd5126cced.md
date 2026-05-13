# ACTION_PLAN - CO: Surface and handle Linear rate limits in provider tracked-issue rereads

## Added by Bootstrap 2026-03-29

## Traceability
- Linear issue: `CO-34` / `ebb62cc0-77d0-41e4-8640-abbd5126cced`
- Linear URL: https://linear.app/asabeko/issue/CO-34/co-surface-and-handle-linear-rate-limits-in-provider-tracked-issue
- Related source issue: `CO-33`

## Summary
- Goal: Finish `CO-34` by preserving explicit Linear rate-limit semantics in tracked-issue rereads, adding bounded safe reread backoff, and surfacing the resulting truth through provider-worker proof/control-host reads.
- Scope: docs-first packet, audited docs review, narrow dispatch-source and worker-runner changes, focused regressions, required validation, and normal review handoff.
- Assumptions:
  - the existing `CO-33` rate-limit metadata contract is the right source of truth to reuse for tracked-issue reads
  - control-host read surfaces already pass the raw provider-worker proof through, so widening proof data is enough unless tests show a missing presenter contract
  - the short reset-aware wait can stay bounded and synchronous inside the worker reread seam without materially changing operator expectations

## Milestones & Sequencing
1) Register the `CO-34` docs-first packet, update `tasks/index.json`, refresh `docs/TASKS.md`, update `docs/docs-freshness-registry.json`, and mirror the checklist under `.agent/task/`.
2) Run an audited child-stream `docs-review` for `linear-ebb62cc0-77d0-41e4-8640-abbd5126cced`, then refresh the spec/task packet with the manifest-backed approval result.
3) Implement the smallest shared rate-limit mapping + provider-worker reread changes needed to preserve structured failures, bounded short-window wait, and reduced reread pressure.
4) Add focused regressions for by-id tracked-issue rate limits and worker post-turn reread behavior, plus any targeted control-host proof expectation updates if required.
5) Run required validation, standalone review, and an explicit elegance pass; refresh the workpad with review status and hand off only if the lane is actually review-ready.

## Dependencies
- `orchestrator/src/cli/control/linearDispatchSource.ts`
- `orchestrator/src/cli/control/linearGraphqlClient.ts`
- `orchestrator/src/cli/providerLinearWorkerRunner.ts`
- `orchestrator/tests/LinearDispatchSource.test.ts`
- `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
- `orchestrator/tests/ControlRuntime.test.ts` or adjacent proof/presenter tests if proof payload changes require them

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-ebb62cc0-77d0-41e4-8640-abbd5126cced node scripts/delegation-guard.mjs`
  - `MCP_RUNNER_TASK_ID=linear-ebb62cc0-77d0-41e4-8640-abbd5126cced node scripts/spec-guard.mjs --dry-run`
  - `MCP_RUNNER_TASK_ID=linear-ebb62cc0-77d0-41e4-8640-abbd5126cced node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --issue-id ebb62cc0-77d0-41e4-8640-abbd5126cced --format json`
  - focused vitest for `orchestrator/tests/LinearDispatchSource.test.ts`
  - focused vitest for `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
  - focused proof/presenter tests only if required by the final diff
  - `MCP_RUNNER_TASK_ID=linear-ebb62cc0-77d0-41e4-8640-abbd5126cced npm run build`
  - `MCP_RUNNER_TASK_ID=linear-ebb62cc0-77d0-41e4-8640-abbd5126cced npm run lint`
  - `MCP_RUNNER_TASK_ID=linear-ebb62cc0-77d0-41e4-8640-abbd5126cced npm run test`
  - `MCP_RUNNER_TASK_ID=linear-ebb62cc0-77d0-41e4-8640-abbd5126cced npm run docs:check`
  - `MCP_RUNNER_TASK_ID=linear-ebb62cc0-77d0-41e4-8640-abbd5126cced npm run docs:freshness`
  - `MCP_RUNNER_TASK_ID=linear-ebb62cc0-77d0-41e4-8640-abbd5126cced node scripts/diff-budget.mjs`
  - `MCP_RUNNER_TASK_ID=linear-ebb62cc0-77d0-41e4-8640-abbd5126cced npm run review`
  - `MCP_RUNNER_TASK_ID=linear-ebb62cc0-77d0-41e4-8640-abbd5126cced npm run pack:smoke` only if downstream-facing CLI/package/review-wrapper surfaces change
- Rollback plan:
  - revert the bounded reread pacing/proof changes if they blur truthfulness or create additional hidden waits
  - if the worker cannot safely reduce reread pressure without changing ownership semantics, keep the smaller classification/proof fix and record the pressure-reduction limit explicitly

## Risks & Mitigations
- Risk: the new shared mapper could unintentionally change non-worker dispatch behavior.
  - Mitigation: keep malformed/non-rate-limit behavior unchanged and add focused regression coverage at the dispatch-source boundary.
- Risk: bounded wait logic could hide longer rate-limit windows or make worker status look hung.
  - Mitigation: apply waits only when the computed reset window is short and fully evidenced; otherwise fail explicitly as rate-limited with reset metadata.
- Risk: a proof-only change might not surface clearly enough in the control-host/read-model payload.
  - Mitigation: confirm raw proof passthrough in tests and update the minimal presenter/read-model contract only if existing surfaces drop the new fields.

## Approvals
- Reviewer: docs-review approved via `/Users/kbediako/Code/CO/.runs/linear-ebb62cc0-77d0-41e4-8640-abbd5126cced-docs-review/cli/2026-03-29T11-31-24-681Z-749a0ed3/manifest.json`
- Date: 2026-03-29

## Freshness Review
- 2026-04-29: CO-409 PR #719 freshness review reread this historical task packet/mirror after the Mar 29 cadence crossed the gate; content remains valid for its original issue scope, so only freshness metadata was refreshed under live docs:freshness:maintain owner CO-409.
