---
id: 20260226-0981-chatgpt-login-first-runtime-provider-migration
title: ChatGPT-Login-First Runtime Provider Migration
relates_to: tasks/tasks-0981-chatgpt-login-first-runtime-provider-migration.md
risk: high
owners:
  - Codex
last_review: 2026-02-26
---

## Summary
- Objective: migrate CO from CLI-subprocess-centric runtime to a provider architecture supporting ChatGPT-login-first appserver mode while preserving backward compatibility.
- Scope: W0-W6 in one coordinated slice with explicit docs-first, delegated streams, manifest-backed telemetry, and staged rollout.
- Constraints: keep CO as control plane; no unrelated refactors; no destructive git operations.

## Decision and Success Criteria
- Decision:
  - Introduce explicit runtime axis: `runtimeMode=cli|appserver` independent of `executionMode=mcp|cloud`.
  - Initially maintain default `runtimeMode=cli` until parity/canary evidence supports default flip; this was later resolved in task 0983 with default flipped to `runtimeMode=appserver`.
  - Use deterministic fallback metadata when appserver preflight fails and fallback policy allows CLI mode.
- Success criteria:
  - W0-W5 code and docs changes ship with ordered validation evidence.
  - Appserver mode can run at least one non-trivial path end-to-end with clean fallback behavior.
  - Runtime observability is visible in start/status/flow/manifests/run summaries.
  - W6 default flip is either executed with evidence or explicitly blocked with rationale + rollback path.

## Technical Requirements
- Functional requirements:
  - Add runtime provider contracts and selector with `CliRuntimeProvider` adapter.
  - Add appserver provider MVP with ChatGPT-login preflight checks and session lifecycle hooks.
  - Add CLI/env/config precedence for runtime mode:
    - CLI flag (`--runtime-mode`)
    - env (`CODEX_ORCHESTRATOR_RUNTIME_MODE`)
    - config default (fallback)
  - Preserve orthogonal semantics:
    - `runtimeMode=cli|appserver`
    - `executionMode=mcp|cloud`
  - Route review/run-review first, then RLM/frontend-testing through provider APIs.
  - Reject unsupported runtime/execution combinations with actionable errors.
- Non-functional requirements (performance, reliability, security):
  - No regression in appserver-default behavior and no regression in `runtimeMode=cli` break-glass behavior.
  - Fallback leaves no ambiguous partial run state.
  - Runtime preflight messages are deterministic and redacted for secrets.
- Interfaces / contracts:
  - Manifest addenda for selected runtime provider/mode and fallback metadata.
  - Status output and run-summary include runtime and fallback signal.

## Architecture & Data
- Architecture / design adjustments:
  - Add runtime provider modules under CLI runtime services.
  - Thread runtime selection into orchestrator start/flow/review paths and command execution.
  - Keep cloud execution engine unchanged and provider-neutral.
- Data model changes / migrations:
  - Add additive manifest schema fields for runtime selection/fallback.
  - Regenerate shared manifest TypeScript types from schema.
- External dependencies / integrations:
  - `codex app-server` capability probes.
  - `codex login status` readiness checks for login-first operation.

## Workstream Breakdown (W0-W6)
1. W0 Foundation
- Introduce provider seam/contracts.
- Implement CLI provider adapter over current spawn logic.
- Wire selector with initial default `runtimeMode=cli` (later flipped under 0983 evidence).

2. W1 Runtime mode + observability
- Add runtime mode resolution via flag/env/config.
- Add manifest/status observability for provider selection and fallback.

3. W2 AppServer provider MVP
- Implement appserver provider preflight + lifecycle hooks.
- Normalize provider events into current run model.
- Deterministic fallback to CLI when preflight fails.

4. W3 Review path migration first
- Route review/run-review through provider abstraction.
- Preserve startup-loop/stall/timeout/delegation protections.

5. W4 RLM + frontend-test migration
- Route RLM/frontend-testing runners via provider APIs.
- Reduce brittle raw stdout assumptions where possible.

6. W5 MCP/cloud hardening
- Keep execution mode semantics stable under both runtime providers.
- Maintain provider-neutral cloud preflight and execution behavior.
- Fail-fast on unsupported combinations.

7. W6 Default flip + cleanup
- Flip default to appserver only if parity evidence is satisfied (completed under 0983 evidence).
- Preserve `runtimeMode=cli` break-glass and rollback instructions.
- Remove only redundant runtime wrapper code.

## Validation Plan
- Pre-implementation evidence:
  - Docs-review manifest under `.runs/0981-chatgpt-login-first-runtime-provider-migration/cli/<run-id>/manifest.json`.
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
  10. `npm run pack:smoke` (when required)
- Log destination:
  - `out/0981-chatgpt-login-first-runtime-provider-migration/manual/`.
- Rollout verification:
  - Canary evidence for appserver success + fallback behavior before W6.

## Open Questions
- What exact canary pass/fallback-rate threshold is required for default flip?
- Which appserver + cloud combinations should remain blocked in this phase?

## Approvals
- Reviewer: self-approved (task owner)
- Date: 2026-02-26
