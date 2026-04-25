# ACTION_PLAN - CO-360 provider-worker Codex 0.125 app-server supervision gate

## Summary
- Goal: prove provider-worker Codex CLI `0.125.0` app-server supervision before replacing the current `codex exec` / `codex exec resume` provider-worker supervision path.
- Scope: docs-first packet, then parent-owned configured `provider-linear-worker` app-server canary, sticky environment proof, persisted-turn pagination/resume/fork proof, fail-closed fallback, manifest/status truth, and regression coverage.
- Assumptions:
  - CO-351 already bounded app-server adoption to guarded local/control-host proof usage
  - current provider workers still intentionally rely on exec/resume supervision
  - the docs child lane only produced the docs packet and task registry entry
  - the source payload is present in the parent artifact tree; parent reviewed and manually applied the docs patch artifact after child-lane accept invalidated on a Linear `updated_at` change

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `CO-360`
  - `Codex CLI 0.125.0`
  - `provider-linear-worker`
  - `runtime_mode=appserver`
  - `codex exec`
  - `codex exec resume`
  - `real turns and proof artifacts`
  - `real configured environment id`
  - `persisted turns`
  - `machine-readable fallback reasons`
  - `JSONL/session-log truth`
- Not done if:
  - the canary is not a configured `provider-linear-worker` run under `runtime_mode=appserver`
  - sticky environment proof lacks a real configured environment id and exact fallback blocker
  - persisted-turn pagination/resume/fork proof is missing and no exact blocker/fallback reason is recorded
  - fallback to `codex exec` / `codex exec resume` is removed or not machine-readable
  - manifests/status proof omit selected runtime, app-server thread/turn ids, sticky env id, or resume/fork outcomes
  - JSONL/session-log truth is removed before parity is proven
  - CO-358 is treated as a hard blocker without exact canary-path cloud preflight evidence
- Non-goals:
  - CO-360 does not make app-server the default provider-worker supervision path.
  - CO-360 does not remove `codex exec` / `codex exec resume` fallback.
  - CO-360 does not remove JSONL/session-log truth surfaces before parity is proven.
  - CO-360 does not make CO-358 a blocker unless the exact canary path requires cloud preflight.
- Nearby wrong interpretations:
  - Wrong: CO-360 proves app-server startup and therefore replaces provider-worker supervision.
    Correct: CO-360 requires configured provider-worker turns plus sticky environment and persisted-turn proof or exact blockers.
  - Wrong: a configured environment id alone proves sticky app-server behavior.
    Correct: the proof must surface the real id and the behavior outcome, or retain an exact blocker/fallback reason.
  - Wrong: CLI fallback means app-server proof dimensions are irrelevant.
    Correct: fallback must remain fail-closed and machine-readable while preserving the blocked app-server proof dimensions.
  - Wrong: session-log truth can be dropped once app-server proof fields exist.
    Correct: JSONL/session-log truth remains until parity is proven and reviewed.
- Pre-implementation issue-quality review:
  - 2026-04-25: CO-360 acceptance criteria and non-goals are mirrored verbatim in the PRD/spec readiness gates.
  - 2026-04-25: micro-task path is unavailable because correctness depends on exact provider-worker surfaces, app-server proof artifacts, preserved fallback semantics, and regression coverage.

## Milestones & Sequencing
1. Create the CO-360 PRD, canonical TECH_SPEC, ACTION_PLAN, and task checklist.
2. Register the canonical TECH_SPEC in `tasks/index.json` under `items[]`.
3. Parent runs docs-review and records findings before implementation.
4. Parent wires or invokes a configured `provider-linear-worker` canary under `runtime_mode=appserver`.
5. Parent captures real-turn proof artifacts, app-server thread/turn ids, and selected runtime in manifests/status proof.
6. Parent proves sticky environment behavior with a real configured environment id, or records exact blocker plus retained fallback.
7. Parent proves persisted-turn pagination/resume/fork behavior, or records exact blocker plus retained fallback.
8. Parent adds regression coverage for provider-supervision runtime selection and truth preservation.
9. Parent verifies JSONL/session-log truth remains available until parity is proven.
10. Parent decides hold/fallback versus future default replacement from machine-readable proof.

## Dependencies
- Linear issue `CO-360`
- Source anchor `ctx:sha256:07c7c2fa5d9442a961e0bb4be17721c4884e178304d5767a51417c30e21de227#chunk:c000001`
- CO-351 app-server proof seam
- Codex CLI `0.125.0`
- `provider-linear-worker`
- existing `codex exec` / `codex exec resume` supervision
- JSONL/session-log artifacts
- CO-358 only if cloud preflight is required for the exact canary path

## Validation
- Child-lane checks:
  - `tasks/index.json` parses
  - scoped diff touches only the declared CO-360 docs/task files
- Parent-owned checks:
  - docs-review before implementation
  - configured app-server provider-worker canary with real turns
  - sticky environment proof or exact blocker/fallback
  - persisted-turn pagination/resume/fork proof or exact blocker/fallback
  - regression tests for runtime selection and truth preservation
  - manifest/status proof review for selected runtime, thread/turn ids, sticky env id, resume/fork outcomes, and fallback reasons
- Rollback plan:
  - retain provider-worker exec/resume as the default and fail-closed fallback whenever proof artifacts are missing, incomplete, or blocked

## Risks & Mitigations
- Risk: app-server startup is mistaken for provider-worker supervision parity.
  - Mitigation: require real configured provider-linear-worker turns, persisted turn ids, and resume/fork/pagination outcomes.
- Risk: sticky environment behavior is unavailable or not configured.
  - Mitigation: require a real configured environment id or an exact blocker with fallback retained.
- Risk: fallback becomes narrative-only.
  - Mitigation: require machine-readable fallback reasons in manifests/status proof.
- Risk: existing JSONL/session-log truth is removed too early.
  - Mitigation: explicitly keep those truth surfaces until parity is proven and reviewed.
- Risk: CO-358 is over-promoted into a blocker.
  - Mitigation: make cloud preflight a hard dependency only when the exact canary path requires it.

## Approvals
- Docs-first packet: bounded same-issue child lane produced artifact; parent reviewed and applied it, 2026-04-25
- Parent docs-review / implementation approval: pending
