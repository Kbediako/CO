# ACTION_PLAN - Runtime Default Flip Readiness Automation (0983)

## Summary
- Goal: convert runtime default-flip readiness from one-off manual checks into repeatable automation with explicit thresholds.
- Scope: docs-first updates, canary script, failure-signaling hardening, optional default flip, and full validation/PR lifecycle.
- Assumptions: existing runtime provider architecture from 0981 remains stable.

## Milestones & Sequencing
1) Docs-first + delegated deliberation
- Create 0983 docs/checklists/index entries.
- Delegate bounded streams for cadence policy + release decision and canary design.

2) Canary automation implementation
- Add dummy-repo runtime canary script and npm script entry.
- Capture appserver/fallback/unsupported-combo assertions + summary artifact.

3) Failure signaling hardening + default decision
- Ensure failed `start` status returns non-zero process exit.
- Run canary matrix; if thresholds pass, flip default runtime mode to appserver and keep CLI break-glass.

4) Validation + PR lifecycle
- Run ordered 1-10 gates and capture logs.
- Open PR, respond to review feedback, monitor quiet window, merge if unblocked.

## Dependencies
- Runtime provider and manifest observability already landed in 0981.
- Existing pack tooling (`scripts/lib/npm-pack.js`, `scripts/pack-smoke.mjs`).

## Validation
- Checks / tests: ordered 1-10 gate list, plus runtime canary summary assertions.
- Rollback plan:
  - `--runtime-mode cli` or `CODEX_ORCHESTRATOR_RUNTIME_MODE=cli` remains immediate break-glass.
  - Revert default constant flip if post-flip evidence regresses.

## Risks & Mitigations
- Risk: threshold set too low/high.
  - Mitigation: document hybrid policy and preserve conservative rollback.
- Risk: noisy local environment causing false failures.
  - Mitigation: deterministic mock lanes and explicit artifact capture.

## Approvals
- Reviewer: self-approved (task owner)
- Date: 2026-02-27
