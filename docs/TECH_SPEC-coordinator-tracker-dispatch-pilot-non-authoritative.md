# TECH_SPEC - Coordinator Tracker Dispatch Pilot (Non-Authoritative)

- Canonical TECH_SPEC: `tasks/specs/1000-coordinator-tracker-dispatch-pilot-non-authoritative.md`.
- Owner: Codex.
- Last Reviewed: 2026-03-05.

## Summary
- Scope: implementation-complete closeout for a tracker dispatch pilot that is advisory-only and non-authoritative.
- Authority boundary: CO remains sole execution authority; no scheduler authority transfer is allowed.
- Promotion boundary: no mutating control promotion and no 0996 HOLD -> GO change.
- Safety boundary: pilot remains default-off and requires kill-switch + rollback evidence before activation; manual simulations must show no mutating side effects.

## Requirements
- Non-authoritative dispatch contract:
  - tracker/coordinator may emit dispatch recommendations only,
  - recommendations are non-executing and auditable,
  - recommendation metadata is explicit about advisory-only semantics.
- Authority invariants:
  - no scheduler authority transfer,
  - no direct runtime execution path from tracker recommendations,
  - no bypass of existing auth/approval policy checks.
- Mutating-control invariants:
  - no `pause/resume/cancel/fail/rerun` promotion in 1000,
  - 0996 HOLD/NO-GO remains unchanged.
- Safety controls:
  - feature posture remains default-off,
  - kill-switch criteria are explicit,
  - rollback drill evidence is mandatory before any on-state recommendation.
- Documentation/registry requirements:
  - PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror remain synchronized,
  - 1000 is registered in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- Validation and closeout requirements:
  - full ordered gate-chain evidence is captured and passed,
  - delegation-guard and diff-budget override reasons are explicit when applied in shared checkout closeout lanes,
  - manual dispatch/no-mutation simulations pass,
  - residual-risk remediations are evidenced with targeted rerun logs,
  - final implementation-gate rerun reaches terminal `succeeded`.

## Implementation Closeout Evidence
- Authoritative implementation-gate manifest: `.runs/1000-coordinator-tracker-dispatch-pilot-non-authoritative/cli/2026-03-05T06-43-58-994Z-7bfd5f4d/manifest.json`.
- Terminal closeout summary: `out/1000-coordinator-tracker-dispatch-pilot-non-authoritative/manual/20260305T060714Z-terminal-closeout/00-terminal-closeout-summary.md`.
- Ordered gate results: `out/1000-coordinator-tracker-dispatch-pilot-non-authoritative/manual/20260305T060714Z-terminal-closeout/gate-results-authoritative.json`.
- Override reasons: `out/1000-coordinator-tracker-dispatch-pilot-non-authoritative/manual/20260305T060714Z-terminal-closeout/overrides-authoritative.json`.
- Manual dispatch results: `out/1000-coordinator-tracker-dispatch-pilot-non-authoritative/manual/20260305T060714Z-terminal-closeout/manual-dispatch-results.json`.
- No-mutation proof: `out/1000-coordinator-tracker-dispatch-pilot-non-authoritative/manual/20260305T060714Z-terminal-closeout/no-mutation-proof.json`.
- Residual-risk remediation: `out/1000-coordinator-tracker-dispatch-pilot-non-authoritative/manual/20260305T054123Z-impl/12-residual-risk-remediation.md`.
- Residual-risk rerun log: `out/1000-coordinator-tracker-dispatch-pilot-non-authoritative/manual/20260305T054123Z-impl/12-targeted-tests-residual-risk-rerun.log`.
- Mirror-sync docs checks: `out/1000-coordinator-tracker-dispatch-pilot-non-authoritative/manual/20260305T070340Z-mirror-sync-post-closeout/01-docs-check.log`, `out/1000-coordinator-tracker-dispatch-pilot-non-authoritative/manual/20260305T070340Z-mirror-sync-post-closeout/02-docs-freshness.log`.
- Mirror parity and summary: `out/1000-coordinator-tracker-dispatch-pilot-non-authoritative/manual/20260305T070340Z-mirror-sync-post-closeout/03-mirror-parity.log`, `out/1000-coordinator-tracker-dispatch-pilot-non-authoritative/manual/20260305T070340Z-mirror-sync-post-closeout/00-mirror-sync-summary.md`.

## Acceptance
- Canonical spec encodes advisory-only/non-authoritative boundaries with implementation-checkable NO-GO conditions.
- Registry mirrors include 1000 run/spec/checklist/doc references with authoritative closeout pointers.
- Full closeout evidence includes ordered gates, manual simulations, residual-risk remediations, and terminal implementation-gate rerun status.
- `npm run docs:check`, `npm run docs:freshness`, and checklist parity diff pass in the mirror-sync closeout stream.
