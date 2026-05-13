# 0995 Implementation Findings - Residual Risk Remediation + Transport Policy Alignment

## Scope
- Task stream: `0995-coordinator-control-bridge-slice-3-residual-risk-remediation-and-transport-policy-alignment-impl`.
- Owned implementation fixes: replay persistence recovery, cancel traceability request id sourcing, cross-platform test-stage command portability.

## Remediation Evidence
- `P1` replay persistence recovery: fixed by persisting control state during idempotent replay handling.
  - Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/tests/ControlServer.test.ts` (`persists replayed control snapshots after an initial persist failure`).
- `P1` cancel traceability request id fallback: traceability now falls back to `latest_action.request_id` when top-level request id is absent.
  - Evidence: `orchestrator/src/cli/delegationServer.ts`, `orchestrator/tests/DelegationServer.test.ts` (`falls back to latest_action.request_id for cancel traceability when top-level request id is missing`).
- `P2` cross-platform portability: removed POSIX-only `env -u` wrapper from the test stage command and validated command resolution via config tests.
  - Evidence: `codex.orchestrator.json`, `orchestrator/tests/PipelineResolverEnvOverrides.test.ts` (`scrubs inherited review control env in implementation-gate test stage`).

## Codex-Autorunner Extraction + Transport Policy (GO/HOLD/NO-GO)
- Extraction boundary (`GO`, bounded): codex-autorunner remains transport-adapter-only (ingress normalization, auth/rate-limit wrappers, outbound status projection); CO remains sole authority for control-state transitions, scheduler/execution decisions, and manifest truth.
- Discord/Telegram surface policy:
  - `GO`: read-only notifications (status cards, gate/failure alerts) with scoped auth, signature validation, and rate limits.
  - `HOLD`: mutating controls (`pause`, `resume`, `cancel`, `fail`, `rerun`) remain disabled until promotion controls are met and explicitly approved.
  - `NO-GO`: shell execution, secret retrieval/mutation, config/policy mutation, direct manifest/control-file writes, and approval bypass requests are permanently unsupported through transport adapters.
- Promotion controls for HOLD -> GO: security (scoped creds + replay protection), reliability (deterministic retries + idempotency), traceability (`intent_id`, `request_id`, `task_id`, `run_id`, `manifest_path`), and rollback/kill-switch governance.

## Validation Artifacts
- Targeted tests: `.runs/0995-coordinator-control-bridge-slice-3-residual-risk-remediation-and-transport-policy-alignment-impl/cli/2026-03-03T15-06-51-469Z-93538ac8/targeted-vitest-0995-impl.log`.
- Standalone review checkpoint artifacts:
  - Prompt: `.runs/0995-coordinator-control-bridge-slice-3-residual-risk-remediation-and-transport-policy-alignment-impl/cli/2026-03-03T15-06-51-469Z-93538ac8/review/prompt.txt`
  - Output: `.runs/0995-coordinator-control-bridge-slice-3-residual-risk-remediation-and-transport-policy-alignment-impl/cli/2026-03-03T15-06-51-469Z-93538ac8/review/output.log`

## Residual Risk Notes
- Shared-checkout diff volume required `DIFF_BUDGET_OVERRIDE_REASON` for review wrapper execution.
- The supporting diagnostics run used to seed the `...-impl` manifest was interrupted and remains non-terminal in manifest metadata; do not treat that diagnostics manifest as a validation gate pass.
