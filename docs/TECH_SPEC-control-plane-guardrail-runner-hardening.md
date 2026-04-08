# TECH_SPEC - Control-Plane + Guardrail Runner Hardening (0970)

## Summary
- Objective: ship targeted hardening for control-plane request shaping and guardrail runner/reporting reliability.
- Scope:
  - `orchestrator/src/control-plane/request-builder.ts`
  - `orchestrator/src/cli/utils/specGuardRunner.ts`
  - `orchestrator/src/cli/utils/delegationGuardRunner.ts`
  - `orchestrator/src/cli/run/manifest.ts`
  - related tests.
- Constraints:
  - Preserve approved guard-profile policy (`auto` default; strict markers unchanged; strict no-child-manifest hard fail).
  - Keep implementation minimal and backward-compatible.

## Design

### 1) Control-plane request shaping
- Update request builder to omit optional task fields when undefined, rather than serializing keys with `undefined` values.
- Preserve current semantics for present values (`id`, `title`, `tags` always present).

### 2) Guard wrapper script resolution
- Add deterministic script-path resolution order for both wrappers:
  1. repo-local script under `<repoRoot>/scripts/...`
  2. package-local script under `<packageRoot>/scripts/...` (when present)
- `specGuardRunner`:
  - execute first available path.
  - if none exists, emit explicit skip warning and exit `0` (current non-blocking contract).
- `delegationGuardRunner`:
  - execute first available path.
  - if none exists, preserve existing profile semantics:
    - strict -> fail
    - warn -> skip

### 3) Guardrail summary correctness
- Refine guardrail status computation to detect skip outcomes from command summaries/log text, not only `entry.status`.
- Expected behavior:
  - if spec guard wrapper exits `0` with "skipped" summary, status snapshot counts it as skipped (not succeeded).

## Validation
- Automated:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `npm run review`
- Targeted tests:
  - Control-plane request optional fields behavior.
  - Delegation runner script resolution behavior.
  - Guardrail summary skip classification behavior.

## Open Questions
- None blocking.
