# PRD - Codex CLI Capability Adoption + Low-Friction Downstream Reliability (0975)

## Summary
- Problem Statement: CO exposes most modern Codex CLI capabilities, but downstream onboarding still has sharp edges that suppress practical adoption (help-path side effects, cloud preflight/runtime mismatch, cloud observability gaps, logging ambiguity, and prior dependence on fallback-oriented behavior).
- Desired Outcome: preserve current architecture while landing small additive changes that make setup and daily usage more automatic, reliable, and future-model friendly.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): maximize practical usage of Codex CLI capabilities in CO and downstream repos, reduce setup friction, and implement the smallest high-impact redesigns with explicit delegation/review/cloud behavior.
- Success criteria / acceptance:
  - Downstream initialization reliably exposes runnable pipeline IDs instead of failing with missing config.
  - Delegation setup honors explicit repo pinning.
  - CLI help behavior is consistent for key onboarding commands.
  - Docs and templates explicitly direct agent behavior (role selection, delegation ownership, monitoring discipline, review cadence, cloud decisioning).
  - Required checks and manual downstream smoke are captured with evidence.
  - Fallback paths are no longer silent defaults in practice: compatibility fallback can remain, but usage must be explicit and easy to avoid.
  - Downstream agents can log reproducible CO issues with one command and portable evidence.
  - New feature work is validated via scenario-style, user-perspective tests in dummy repos.
  - Agent observability remains explicit and test-enforced.
  - Standalone review has a deterministic fail-fast path when Codex CLI enters delegation-startup loops.
  - Review evidence manifest selection is task-scoped by default, even when `--task` is omitted.
  - `npm run review` keeps delegation MCP enabled by default for capability parity, with explicit disable controls for troubleshooting.
  - `npm run review` permits unbounded review duration by default (timeout guards become opt-in via env settings).
- Constraints / non-goals:
  - No disruptive rewrite of orchestration architecture.
  - No mandatory managed Codex CLI path.
  - Prefer additive compatibility and keep legacy aliases where already supported.

## Goals
- Improve out-of-the-box reliability for `init/setup/flow/start` downstream usage.
- Reduce onboarding ambiguity for delegation + multi-agent + cloud decisions.
- Preserve MCP-first and patience-first behavior while improving adoption signal quality.
- Minimize practical dependence on fallback behavior by making bootstrap-first operation the default recommended path and emitting explicit fallback signals.
- Provide built-in downstream issue logging to accelerate dogfooding feedback loops across repos/devices.
- Standardize scenario-based feature validation and observability contracts.

## Non-Goals
- Large pipeline framework redesign.
- Removing current alias compatibility (`collab` legacy naming).
- Requiring cloud mode for normal operation.

## Stakeholders
- Product: CO maintainers and downstream consumers.
- Engineering: CLI/runtime maintainers, docs maintainers.
- Design: n/a.

## Metrics & Guardrails
- Primary Success Metrics:
  - Downstream smoke no longer reports `Pipeline '<id>' not found` after `init codex`.
  - Delegation setup retains `--repo` pin in generated MCP config path.
  - `start --help`, `init --help`, and `plan --help` print usage and exit cleanly.
  - Cloud preflight output reflects the same environment-id sources used by run-time resolution.
  - Cloud runs surface actionable remote execution metadata while in progress.
- Guardrails / Error Budgets:
  - Additive-only changes; avoid regressions in existing CO repo flows.
  - Keep diff constrained and test-covered.

## User Experience
- Personas:
  - Agent-first maintainer bootstrapping CO defaults in a fresh repo.
  - Operator running long-horizon work with delegation/review discipline.
- User Journeys:
  - `init codex` -> `setup --yes` -> `flow --task <id>` should be predictable and discoverable.
  - Help flags should never trigger accidental execution for onboarding commands.

## Technical Considerations
- Architectural Notes:
  - Ship fallback pipeline config in npm package and downstream template to avoid missing-config failures.
  - Keep command behavior additive and explicit (help parsing + repo pin wiring).
  - Keep guidance aligned with existing MCP-first / cloud-preflight / review-loop rules.
  - Add explicit issue-bundle logging command in `doctor` workflow to capture reproducible downstream evidence (manifest pointers, run context, fallback/preflight state).
  - Add scenario-style tests that execute CLI flows in fixture repos under `/tmp`, including failure paths and observability checks.
  - Add observability contract assertions for status/manifest payloads consumed by agents.
  - Harden the standalone review wrapper with startup-loop detection and bounded termination in addition to no-output stall/absolute timeout checks.
  - Ensure review wrapper manifest discovery uses active task env (`MCP_RUNNER_TASK_ID`/`TASK`) when no explicit task flag is provided.
  - Apply review-scope delegation policy in the wrapper environment only (enabled by default, explicit opt-out override) to avoid global MCP config churn.
  - Shift review timeout/stall/startup-loop guards to opt-in policy controls instead of default hard limits.
- Dependencies / Integrations:
  - `bin/codex-orchestrator.ts`
  - `orchestrator/src/cli/delegationSetup.ts`
  - `templates/codex/*`
  - `package.json`
  - command-surface + init template tests

## Options Considered
1. Minimal patch set (chosen): package/template config + help fixes + delegation repo pin + docs alignment.
   - Pros: low risk, immediate UX/reliability gains, backward compatible.
   - Cons: does not fully solve language-specific pipeline optimization.
2. New downstream profile command surface (`setup --profile downstream`).
   - Pros: clearer onboarding abstraction.
   - Cons: larger CLI surface and implementation cost.
3. Full adaptive pipeline engine by repo language.
   - Pros: strongest long-term automation.
   - Cons: highest complexity/risk; out of scope for this slice.

## Open Questions
- Should adaptive per-language default stage execution be a separate follow-up after this reliability patch?
- Should package fallback usage emit an explicit operator warning/hint so teams move to bootstrap-first config intentionally?
- Should strict no-fallback mode become the default after one release cycle of explicit fallback visibility?
- Should issue bundles support optional remote sinks (for example GitHub issue draft payloads) in a later phase?

## Imported Field Reports (Tower-Defence)
- Source file: `/Users/kbediako/Code/tower-defence/docs/codex-orchestrator-issues.md`
- Imported issue IDs: CO-001, CO-002, CO-003, CO-004, CO-005.
- Intake evidence: `out/0975-codex-cli-capability-adoption-redesign/manual/tower-defence-issues-intake-2026-02-19.md`
- Closure status: CO-001..CO-004 implemented with regression coverage and downstream smoke validation (`out/0975-codex-cli-capability-adoption-redesign/manual/tower-defence-followup-implementation-2026-02-19.md`, `out/0975-codex-cli-capability-adoption-redesign/manual/downstream-smoke-cloud-progress-2026-02-19.md`).
- Open risk: CO-005 (direct standalone `codex review` hang/delegation startup loop) remains reproducible upstream; this slice ships CO-side mitigation in the hardened review wrapper path (`scripts/run-review.ts`) with delegation default-on + explicit opt-out controls + optional issue-log capture.

## Deliberated Follow-up (2026-02-19)
- Delegate stream: `019c772e-615c-7100-b26a-bf65afed174c`.
- Priority risks:
  - Hidden fallback dependency remains easy to miss.
  - Failure logging is fragmented across repos/devices.
  - Scenario-based testing and observability are not yet enforced as mandates.
- Chosen next slice: minimal additive implementation (fallback visibility + issue bundle logging + scenario test coverage + observability contract tests).

## Pre-Implementation Review
- Delegated baseline + downstream smoke completed and accepted for implementation planning.
- Evidence: collab subagent outputs (`019c745a-a368-7d83-bd1c-76543479c209`, `019c745a-a87f-7ea1-a7ed-9842ccb57cfe`).

## Approvals
- Product: user
- Engineering: user
- Design: n/a
