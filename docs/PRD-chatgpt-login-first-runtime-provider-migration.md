# PRD - ChatGPT-Login-First Runtime Provider Migration (0981)

## Summary
- Problem Statement: CO currently orchestrates Codex primarily through CLI subprocess execution and has no independent runtime axis for app-server/login-first execution.
- Desired Outcome: introduce a runtime-provider architecture with `runtimeMode=cli|appserver` orthogonal to `executionMode=mcp|cloud`, preserve backward-compatible behavior until parity evidence is proven, and provide deterministic fallback telemetry.
- Status Update (2026-02-27): parity evidence from 0983 runtime canary automation justified flipping the default runtime mode to `appserver`; `runtimeMode=cli` remains documented break-glass.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): execute the full migration plan across W0-W6 as top-level orchestrator, with docs-first discipline, delegated streams, manifest-backed evidence, and operational safety.
- Success criteria / acceptance:
  - W0-W6 workstreams implemented or explicitly blocked with evidence and next actions.
  - Docs-first artifacts and checklist mirrors are complete before runtime code changes.
  - Runtime provider seam ships with `CliRuntimeProvider` and `AppServerRuntimeProvider` MVP plus auditable fallback metadata.
  - Validation gates pass in required order with logs under `out/0981-chatgpt-login-first-runtime-provider-migration/manual/`.
  - PR lifecycle completed if unblocked.
- Constraints / non-goals:
  - Keep CO as control plane.
  - No unrelated refactors.
  - Non-destructive git workflow.
  - Preserve compatibility/default behavior until parity evidence justifies default flip.

## Goals
- Land runtime-provider seam with minimal behavioral drift on existing default path.
- Make runtime selection explicit and auditable in manifest/status/run-summary outputs.
- Add ChatGPT-login-first app-server runtime path with deterministic fallback to CLI runtime.
- Migrate review, RLM, and frontend-testing runtime call sites through provider APIs.
- Keep `executionMode` semantics stable and provider-neutral.

## Non-Goals
- Full pipeline rewrite.
- Removing CLI runtime path during initial rollout.
- API-key-first dependency for normal operation.
- Broad cleanup beyond migration scope.

## Stakeholders
- Product: CO maintainers and downstream operators using orchestration pipelines.
- Engineering: top-level and delegated agents running diagnostics/review/implementation gates.
- Design: n/a.

## Metrics & Guardrails
- Primary Success Metrics:
  - `runtimeMode=cli` parity with no regressions in required lanes.
  - App-server canary runs succeed for representative review + runtime flows.
  - Fallback events are deterministic, visible, and low/noise.
- Guardrails / Error Budgets:
  - No manifest schema compatibility breakage.
  - Unsupported mode combinations fail-fast with actionable error text.
  - Immediate rollback path (`runtimeMode=cli`) remains documented and tested.

## User Experience
- Personas: maintainers, operators, delegated subagents.
- User Journeys:
  - Run pipelines with explicit runtime mode (`--runtime-mode`) or defaults.
  - Inspect status/manifest to see selected provider and fallback reason.
  - Use `runtimeMode=cli` as break-glass when appserver preflight is unavailable.

## Technical Considerations
- Architectural Notes:
  - Add runtime-provider contracts and selector.
  - Keep `executionMode` and `runtimeMode` independent; runtime mode applies to local (`mcp`) execution path.
  - Normalize appserver preflight/fallback metadata into existing manifest model.
- Dependencies / Integrations:
  - Codex CLI (`codex app-server`, `codex login status`) capability checks.
  - Existing run-review, RLM runner, and frontend testing runner paths.

## Open Questions
- What post-flip soak window should be required before npm release/global-update rollout?
- Which provider combinations should be permanently unsupported vs. deferred?

## Approvals
- Product: self-approved (task owner)
- Engineering: self-approved (task owner)
- Design: n/a
