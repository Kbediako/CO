# TECH_SPEC - Runtime Default Flip Readiness Automation (0983)

## Summary
- Objective: automate runtime-mode canary simulations in dummy repos, harden CLI failure signaling for unsupported combinations, and make an evidence-backed default-flip decision.
- Scope: canary script + minimal runtime/CLI wiring + docs/checklist synchronization.
- Constraints: small diffs, no unrelated refactors, preserve rollback path (`runtimeMode=cli`).

## Technical Requirements
- Functional requirements:
  - Add a runtime canary automation script that:
    - Packs/install CO into throwaway dummy repos.
    - Runs appserver requested mode with preflight-success simulation and validates `runtime_mode=appserver` without fallback.
    - Runs appserver requested mode with forced precheck failure and validates deterministic fallback to CLI (`runtime_fallback.occurred=true`).
    - Runs unsupported combination (`executionMode=cloud + runtimeMode=appserver`) and validates fail-fast behavior.
    - Emits machine-readable summary (pass/fail counts, rates, threshold decision).
  - Ensure failed `start` runs return non-zero exit code so automation can reliably assert failures.
  - If thresholds pass, flip runtime default to appserver while retaining `cli` override/break-glass.
- Non-functional requirements:
  - Deterministic, auditable outputs in `out/0983-runtime-default-flip-readiness-automation/manual/`.
  - Backward-compatible manifest schema and fallback metadata.

## Architecture & Data
- Architecture / design adjustments:
  - New script under `scripts/` for runtime canary matrix orchestration.
  - Minimal CLI status/exit-code behavior hardening.
  - Runtime default constant update only after canary threshold pass.
- Data model changes / migrations:
  - None (read existing manifest fields).
- External dependencies / integrations:
  - npm packaging/install in temp directories.
  - mock codex binary for deterministic preflight/exec behavior in dummy repos.

## Validation Plan
- Canary threshold policy:
  - Appserver-success lane pass rate >= 95% across >= 20 iterations.
  - Forced-fallback lane deterministic pass rate = 100%.
  - Unsupported-combo fail-fast lane deterministic pass rate = 100%.
- Required gate order:
  1. `node scripts/delegation-guard.mjs`
  2. `node scripts/spec-guard.mjs --dry-run`
  3. `npm run build`
  4. `npm run lint`
  5. `npm run test`
  6. `npm run docs:check`
  7. `npm run docs:freshness`
  8. `node scripts/diff-budget.mjs`
  9. `npm run review`
  10. `npm run pack:smoke`

## Risks & Mitigations
- Risk: simulated canaries overestimate real-world readiness.
  - Mitigation: keep explicit rollback path and document post-flip soak checks.
- Risk: exit-code hardening could alter existing scripts.
  - Mitigation: constrain change to clear `failed` statuses only and update docs.

## Approvals
- Reviewer: self-approved (task owner)
- Date: 2026-02-27
