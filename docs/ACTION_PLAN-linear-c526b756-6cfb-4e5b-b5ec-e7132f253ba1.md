# ACTION_PLAN - CO-353 Codex CLI 0.125.0 Reasoning-Token Telemetry

## Summary
- Goal: add an additive reasoning-token telemetry path for Codex CLI 0.125.0 `turn.completed.usage.reasoning_output_tokens` from completed-turn usage through provider proof, manifests, control/read-model metrics, and status/dashboard output.
- Scope: docs-first packet now; parent-owned implementation later across token parsing, provider proof, manifest propagation, read-model aggregation, status/dashboard rendering, and focused regressions.
- Assumptions:
  - current CO token telemetry already carries input/output/total token values
  - Codex CLI 0.125.0 completed-turn usage is the source for `reasoning_output_tokens`
  - missing reasoning-token usage must remain explicit `null`/`n/a`, not inferred
  - this child lane only owns the docs packet and scoped registry/freshness entries
  - the declared source payload path is not present in this child lane workspace; parent owns reconciliation

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `Codex CLI 0.125.0`
  - `turn.completed.usage.reasoning_output_tokens`
  - `reasoning-token usage`
  - `provider proof`
  - `manifests`
  - `control/read-model metrics`
  - `status/dashboard output`
- Not done if:
  - `turn.completed.usage.reasoning_output_tokens` is not parsed when present
  - reasoning-token usage is missing from provider proof
  - reasoning-token usage is not propagated to manifests
  - control/read-model metrics omit reasoning-token usage
  - status/dashboard output omits reasoning-token usage or explicit unavailable state
  - missing reasoning-token usage is inferred from other token totals
  - older proof artifacts fail without the new field
  - implementation changes model posture, runtime selection, rate-limit policy, pricing, or budget enforcement
- Pre-implementation issue-quality review:
  - 2026-04-25: self-reviewed as a telemetry parity/alignment lane. Exact field and surface names are protected; micro-task path is unavailable because correctness depends on provider proof, manifests, control/read-model metrics, status/dashboard output, and backward compatibility.

## Milestones & Sequencing
1. Create the CO-353 PRD, canonical TECH_SPEC, ACTION_PLAN, and task checklist.
2. Register the canonical TECH_SPEC in `tasks/index.json` under `items[]`.
3. Add freshness entries for the scoped packet files.
4. Parent reconciles the source payload and runs docs-review before implementation.
5. Parent extends token parsing for `turn.completed.usage.reasoning_output_tokens`.
6. Parent extends provider proof with nullable reasoning-token usage.
7. Parent propagates reasoning-token usage through manifests and provider-run summaries.
8. Parent extends control/read-model metrics and aggregate totals.
9. Parent updates status/dashboard output with a compact reasoning-token usage display.
10. Parent adds focused regression coverage for present, absent, legacy, and display cases.
11. Parent runs the normal validation/review floor and completes Linear/workpad/PR lifecycle.

## Dependencies
- Linear issue `CO-353`
- Source anchor `ctx:sha256:4a1b90d4079209b44b35ed390dfc9ddc4b647dbdb70c4633a2907d47cd8aabc3#chunk:c000001`
- Codex CLI 0.125.0 completed-turn usage payloads
- existing provider proof persistence
- existing manifest/run-summary persistence
- existing control/read-model metrics
- existing `CO STATUS` and operator dashboard output

## Validation
- Child-lane checks:
  - protected-term scan across declared docs packet files
  - parse `tasks/index.json`
  - parse `docs/docs-freshness-registry.json`
  - scoped `git diff --check --` for declared files
- Parent-owned checks:
  - docs-review before implementation
  - focused parser test for `turn.completed.usage.reasoning_output_tokens`
  - provider proof serialization/hydration test for reasoning-token usage
  - manifest/run-summary propagation check
  - control/read-model aggregation check
  - status/dashboard rendering check
  - backward-compatibility test for older events/proofs without the field
  - normal validation floor after implementation
- Rollback plan:
  - because the target change is additive telemetry, parent can revert the implementation while leaving older input/output/total token telemetry intact
  - if Codex CLI 0.125.0 sample data is unavailable, retain existing token telemetry and record reasoning-token usage as unavailable rather than inferring it

## Risks & Mitigations
- Risk: reasoning-token usage is folded into output tokens and becomes impossible to audit separately.
  - Mitigation: require a separate nullable `reasoning_output_tokens` field through proof, read model, and display.
- Risk: missing upstream data is inferred from totals.
  - Mitigation: require explicit unavailable semantics when `turn.completed.usage.reasoning_output_tokens` is absent.
- Risk: dashboard output becomes noisy or hides existing operational signals.
  - Mitigation: require a compact display and preserve existing token, session, rate-limit, and throughput context.
- Risk: older proof artifacts break after the additive schema change.
  - Mitigation: require legacy proof tests and optional/null field handling.
- Risk: telemetry work widens into policy or model posture.
  - Mitigation: non-goals explicitly exclude budget, pricing, rate-limit, runtime, model, and Codex CLI adoption changes.

## Approvals
- Docs-first packet: bounded same-issue child lane, 2026-04-25
- Parent docs-review / implementation approval: pending
