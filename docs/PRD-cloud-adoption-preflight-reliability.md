# PRD - Cloud + RLM Adoption Reliability + Fallback Contract Hardening (0974)

## Summary
- Problem Statement: cloud and RLM usage were materially under-adopted, and prior runs showed avoidable failures/skips due to preflight friction, low-signal diagnostics, and missing low-friction MCP enablement.
- Desired Outcome: keep cloud optional but make advanced paths reliable and auditable by shipping first-class doctor preflight + adoption hints, configurable cloud status resilience, explicit CI fallback-contract checks, and a safe `mcp enable` path for disabled MCP servers.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): implement the approved cloud adoption recommendations (1/2/3) with docs-first discipline and high confidence despite a long-running, compacted session.
- Success criteria / acceptance:
  - `doctor` provides a first-class cloud preflight result path (human + JSON output).
  - `doctor --usage` emits actionable adoption hints for underused cloud/RLM paths.
  - `mcp enable` provides low-friction enablement for disabled MCP servers without leaking secrets.
  - Cloud status-poll resilience can be tuned without code changes using safe env knobs.
  - Cloud canary validates both execution contract and fallback contract explicitly.
  - Fresh-repo smoke checks confirm low-friction setup/adoption behavior outside the CO repo.
  - No regression to existing cloud fallback behavior (`cloud` request -> preflight failure -> `mcp` fallback with manifest evidence).
  - Manual CLI checks and automated tests confirm behavior.
- Constraints / non-goals:
  - No requirement that every repo must have cloud env setup.
  - No breaking rename of manifest fields or fallback semantics.
  - Keep changes minimal and additive.

## Goals
- Reduce ambiguity around cloud readiness by exposing deterministic preflight diagnostics.
- Improve cloud execution robustness under transient `codex cloud status` failures.
- Ensure CI captures fallback behavior as a first-class contract rather than an implicit side effect.
- Reduce friction for advanced capability adoption (cloud/RLM/MCP) in downstream repos.

## Non-Goals
- Replacing cloud mode routing policy.
- Adding cloud environment provisioning automation.
- Introducing new mandatory secrets for local-only repos.

## Stakeholders
- Product: CO maintainers and downstream users.
- Engineering: orchestrator CLI/cloud runtime maintainers.
- Design: n/a.

## Metrics & Guardrails
- Primary Success Metrics:
  - `doctor --cloud-preflight` reports actionable pass/fail reasons.
  - Cloud canary includes explicit fallback-contract assertions.
  - Existing cloud execution/fallback tests remain green.
- Guardrails / Error Budgets:
  - Preserve additive-only behavior; no blocking changes for non-cloud repos.
  - Keep implementation constrained to approved scope 1/2/3.

## User Experience
- Personas:
  - Agent-first maintainer deciding whether to run cloud now or fix setup first.
  - CI maintainer validating cloud wiring and fallback integrity.
- User Journeys:
  - Operator runs `doctor --cloud-preflight` and gets immediate readiness verdict + guidance.
  - CI run validates real cloud execution when configured and validates fallback contract in a deterministic lane.

## Technical Considerations
- Architectural Notes:
  - Reuse existing `runCloudPreflight` logic for doctor path instead of duplicating checks.
  - Keep resilience tuning in `CodexCloudTaskExecutor` with bounded env-driven defaults.
  - Extend `cloud-canary-ci.mjs` to support explicit fallback assertion mode.
  - Add a safe MCP enable helper that rehydrates disabled server definitions via `codex mcp list --json` -> `codex mcp add`, with unsupported-field guardrails and redacted display output.
  - Add adoption hint thresholds for cloud/RLM in doctor usage summaries.
- Dependencies / Integrations:
  - `bin/codex-orchestrator.ts`
  - `orchestrator/src/cli/utils/cloudPreflight.ts`
  - `orchestrator/src/cli/doctorUsage.ts`
  - `orchestrator/src/cli/mcpEnable.ts`
  - `orchestrator/src/cloud/CodexCloudTaskExecutor.ts`
  - `.github/workflows/cloud-canary.yml`
  - `scripts/cloud-canary-ci.mjs`

## Open Questions
- None blocking for this phase.

## Pre-Implementation Review
- Standalone review outcome: approved with no actionable findings for docs/task scaffolding scope.
- Evidence: `out/0974-cloud-adoption-preflight-reliability/manual/pre-implementation-standalone-review.log`

## Approvals
- Product: user
- Engineering: user
- Design: n/a
