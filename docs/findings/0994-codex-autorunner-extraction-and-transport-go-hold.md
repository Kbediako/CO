# Findings - 0994 Codex-Autorunner Extraction + Discord/Telegram GO/HOLD

- Date: 2026-03-03
- Task: `0994-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction`
- Scope: close 0993 residual gate risks and freeze extraction/transport surface decisions with auditable evidence.

## Decision Summary

| Surface | Decision | Rationale |
| --- | --- | --- |
| Codex-autorunner extraction lane | GO (bounded) | Extraction boundary is explicitly constrained to transport adapters, while CO remains authority for control/scheduler/manifest state. |
| Discord interactive surface | HOLD | Security/reliability/auditability criteria are defined, but no implementation evidence exists yet for token hardening, replay controls, or delivery-failure observability. |
| Telegram interactive surface | HOLD | Same criteria gap as Discord; no implementation evidence yet for secure/session-scoped control and deterministic delivery telemetry. |

## Residual Risk Closure Evidence (from 0993 follow-up)

1) Implementation-gate test-stage env pollution
- Closure: `codex.orchestrator.json` now scrubs inherited review/diff-budget control env in the shared `test` stage.
- Regression lock: `orchestrator/tests/PipelineResolverEnvOverrides.test.ts` asserts scrubbed env values for `implementation-gate` `test`.

2) Non-deterministic review execution in gate contexts
- Closure: `codex.orchestrator.json` now sets `FORCE_CODEX_REVIEW=1` for `implementation-gate` and `docs-review` review stages.
- Regression lock: `orchestrator/tests/PipelineResolverEnvOverrides.test.ts` asserts forced review env in both gate review stages.

## GO/HOLD Promotion Conditions

- Promote Discord or Telegram from HOLD to GO only after:
  - scoped auth/session controls pass (expiry, replay protection, revocation),
  - delivery/retry failure paths are observable and tested,
  - command mapping remains deterministic and restricted to approved actions,
  - trace/audit fields are preserved end-to-end (`intent_id`, `task_id`, `run_id`, `manifest_path`, actor, action, result timestamps),
  - kill-switch and rollback controls are validated.

Until then, transport remains explicitly disabled by policy.
