# ACTION_PLAN - linear-bf0ba9ec-47f0-45ac-be83-490df0f0b45d

## Summary
- Goal: fix the launchd-owned child-runtime seam so admitted provider-worker runs resolve the required executables truthfully and stop failing on bare `node`.
- Scope: docs-first packet, audited docs-review child stream, explicit child launch-runtime contract, truthful runtime-provider failure classification, focused regressions, and the normal validation/review handoff flow.
- Assumptions:
  - the parent `process.execPath` used to start the launchd-supervised root host is the correct Node executable for child worker entrypoints
  - existing provider-worker proof and terminal summary surfaces are the right place to record machine-checkable launch/runtime parity failure

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: preserve `launchd-supervised control-host child runtime PATH`, `provider-linear-worker`, `providerLinearWorkerRunner.js`, `/bin/sh: node: command not found`, `CO-87`, appserver/login probe truth, and machine-checkable runtime-parity failure.
- Not done if: the child run still depends on ambient interactive PATH for `node`, or runtime provider probing still reports misleading fallback truth when the launch/runtime contract is unavailable under launchd.
- Pre-implementation issue-quality review: approved. The live seam is the launchd child-runtime contract plus truthful runtime-provider classification, not a broader intake, dispatch, or dashboard rewrite.

## Milestones & Sequencing
1. Create the CO-115 docs packet, checklist mirrors, local workpad source, and registry entries, then run audited `linear child-stream --pipeline docs-review`.
2. Implement the explicit child Node launch contract for `provider-linear-worker` stage execution under launchd-owned PATH and environment.
3. Tighten runtime-provider or provider-worker failure classification so missing executable resolution becomes explicit runtime-parity proof instead of generic shell or fallback churn.
4. Add focused regressions for the `CO-87` non-interactive PATH failure shape and truthful runtime-provider probe behavior.
5. Run the required validation floor, standalone review, explicit elegance review, and workpad refresh before any PR or review handoff.

## Dependencies
- `codex.orchestrator.json`
- `orchestrator/src/cli/services/commandRunner.ts`
- `orchestrator/src/cli/controlHostCliShell.ts`
- `orchestrator/src/cli/providerLinearWorkerRunner.ts`
- `orchestrator/src/cli/runtime/provider.ts`
- `orchestrator/src/cli/utils/codexCli.ts`
- `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
- `orchestrator/tests/RuntimeProvider.test.ts`

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-bf0ba9ec-47f0-45ac-be83-490df0f0b45d node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-115-docs-review --format json`
  - focused regressions for non-interactive PATH child launch and truthful runtime-provider classification
  - reproducer proof capture against the current `CO-87` artifact shape and post-fix behavior
  - required repo validation floor after implementation
- Rollback plan:
  - revert the explicit child-runtime contract and failure-classification changes together so provider-worker launch behavior returns to the pre-CO-115 baseline without partial runtime metadata drift.

## Risks & Mitigations
- Risk: fixing only the outer `node` shell command leaves runtime-provider probing misleading under launchd.
  - Mitigation: pair the launch-contract fix with explicit runtime-provider or proof classification for missing executable resolution.
- Risk: broad PATH mutation could mask the real runtime contract and reopen unrelated env seams.
  - Mitigation: prefer a narrow explicit executable-path contract owned by the parent runtime.
- Risk: retry or reconcile loops still collapse the new failure into generic summaries.
  - Mitigation: emit machine-checkable parity proof and summary from the provider-worker layer.

## Approvals
- Reviewer: `codex-orchestrator docs-review` child stream passed `spec-guard` and `docs:check` after the `docs/TASKS.md` archive trim, then failed only on the standing repo-wide `docs:freshness` baseline; manual fallback accepted
- Date: 2026-04-09
