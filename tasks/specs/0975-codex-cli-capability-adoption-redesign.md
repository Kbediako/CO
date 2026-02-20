---
id: 20260219-0975-codex-cli-capability-adoption-redesign
title: Codex CLI Capability Adoption + Low-Friction Downstream Reliability
relates_to: tasks/tasks-0975-codex-cli-capability-adoption-redesign.md
risk: medium
owners:
  - Codex
last_review: 2026-02-20
---

## Summary
- Objective: close high-impact downstream friction points identified by delegated capability inventory and user-perspective smoke testing.
- Scope: package/template config availability, command help consistency (`init`, `plan`, `start`), delegation setup repo pin fidelity, fallback-visibility hardening, downstream issue logging, scenario-style user-flow tests, and observability contract checks.
- Constraints: additive compatibility only; no managed-CLI requirement; keep MCP-first and patience-first behavior unchanged.

## Technical Requirements
- Functional requirements:
  - Primary downstream path should be bootstrap-first (`init/setup` writes repo-local config); fallback config loading remains compatibility-only and should not be treated as the recommended steady-state.
  - `loadUserConfig` package fallback must remain available for compatibility in npm/npx installs by shipping `codex.orchestrator.json` in package artifacts.
  - When fallback paths are used (for example packaged pipeline config fallback or cloud fallback to MCP), runs must emit explicit, machine-readable/operator-readable signals.
  - `init codex` must include `codex.orchestrator.json` in downstream template output.
  - `start --help`, `init --help`, and `plan --help` must print usage and not execute side effects.
  - `runDelegationSetup` must preserve explicit repo pin (`--repo <path>`) in plan/apply command wiring.
  - Add a downstream-friendly issue logging workflow via `doctor` that can bundle reproducible run context and issue details to a local artifact file.
  - Add automatic failure issue logging for `start`/`flow` when opted in (`--auto-issue-log` and/or env policy), so downstream agents can capture failures without separate doctor command runs.
  - Add strict no-fallback config mode for execution pipelines (repo-local `codex.orchestrator.json` required when enabled) while keeping default compatibility behavior.
  - Centralize command-preview shell quoting helper usage across setup command surfaces to avoid drift in repo/path quoting behavior.
  - Standalone review wrapper must fail fast when delegation startup loops are detected (bounded, actionable timeout path even when output is streaming).
  - Standalone review wrapper must default manifest filtering to active task env (`MCP_RUNNER_TASK_ID`/`TASK`) when `--task` is omitted.
  - Standalone review wrapper should support automatic issue-bundle capture on review failures for downstream dogfooding.
  - Standalone review wrapper should keep delegation MCP available by default and provide explicit disable controls for targeted troubleshooting.
  - Standalone review wrapper should allow unlimited runtime by default; timeout/stall/startup-loop controls remain opt-in.
  - Standalone review wrapper should emit patience-first monitor checkpoints during long-running waits (elapsed + idle progress visibility) without introducing default runtime limits.
  - Before classifying direct `codex review --uncommitted` startup-loop behavior as repo-specific, reproduce in at least one simulated/mock repo and archive evidence.
  - Standalone review wrapper should detect large uncommitted review scopes in CO-like diffs and emit explicit advisories (operator + prompt) so reviews prioritize high-signal findings without relying on delegation-off as the sole mitigation.
  - Require scenario-based user-flow tests for new CLI capability slices using dummy fixture repos (setup + execution + failure/observability checks).
  - Add observability contract tests for status/manifest payload fields agents depend on during long runs.
- Non-functional requirements:
  - Keep existing command interfaces backward compatible.
  - Maintain current guardrail and review-loop semantics.
- Interfaces / contracts:
  - No breaking changes to existing command names/flags.
  - No schema-breaking manifest changes.

## Validation Plan
- Tests / checks:
  - `npm run test -- orchestrator/tests/InitTemplates.test.ts tests/cli-command-surface.spec.ts`
  - `npm run test -- orchestrator/tests/UserConfigStageSets.test.ts`
  - Add targeted tests for fallback-visibility signaling and `doctor --issue-log`.
  - Add targeted tests for `--auto-issue-log` failure capture on `start`/`flow` paths.
  - Add targeted tests for strict config fallback deny mode (fail-fast when repo config missing).
  - Add targeted tests for standalone review loop-detection fail-fast behavior.
  - Add targeted tests for standalone review manifest task scoping defaults.
  - Add targeted tests for review-scope delegation MCP default-on policy and explicit disable controls.
  - Add targeted tests for unlimited-by-default timeout policy.
  - Add targeted tests for long-running review monitor checkpoint output.
  - Add targeted tests for large-scope uncommitted advisory behavior (stdout + prompt advisory injection).
  - Add scenario-style tests that run in copied fixtures (`evaluation/fixtures/**`) and validate user-perspective flow + observability fields.
  - Add targeted coverage for delegation setup TOML-fallback re-pin path.
  - Add targeted coverage for shared command-preview quoting helper usage.
  - Full required gate sequence before handoff.
- Manual verification:
  - Downstream fixture smoke (`evaluation/fixtures/go-smoke` copied to `/tmp`) for init/setup/doctor/flow behavior.
  - Confirm no `Pipeline '<id>' not found` after `init codex`.
  - Capture downstream issue-bundle generation from a simulated failure path.
  - Capture standalone review failure reproduction showing bounded failure + issue-bundle artifact emission.
  - Capture long-run direct `codex review` reproduction and wrapper mitigation behavior.
  - Capture a second long-run direct `codex review --uncommitted` reproduction in a simulated/mock repo to verify whether startup-loop behavior is repo-agnostic.

## Architecture Decision
- Chosen approach: minimal additive redesign (package + template + UX consistency + repo-pin fix).
- Rejected for this slice: introducing a new profile system or full adaptive per-language execution engine.

## External Intake (2026-02-19)
- Source: `/Users/kbediako/Code/tower-defence/docs/codex-orchestrator-issues.md`
- Imported items:
  - CO-001 `start --help` incorrectly executed run setup (fixed).
  - CO-002 doctor cloud preflight env-id resolution mismatch vs runtime metadata resolution (fixed in bootstrap-first repo config path).
  - CO-003 cloud in-progress observability gap (`cloud_execution` null) (fixed: early progress updates now persisted during in-progress runs).
  - CO-004 resolver log ambiguity around design config source (fixed).
  - CO-005 standalone `codex review` hangs in delegation startup loop (reproduced; CO wrapper mitigation implemented in this slice, residual upstream direct-command risk tracked).
- Evidence: `out/0975-codex-cli-capability-adoption-redesign/manual/tower-defence-issues-intake-2026-02-19.md`
- Additional evidence: `out/0975-codex-cli-capability-adoption-redesign/manual/standalone-review-hang-repro-2026-02-19.md`, `out/0975-codex-cli-capability-adoption-redesign/manual/standalone-review-wrapper-mitigation-2026-02-19.md`

## Deliberation Notes (Approved Follow-ups)
- Delegate stream: `019c74b5-d70a-7422-83c0-fd229c0b771f`.
- Root-cause pointers:
  - CO-002 likely in doctor preflight env-id resolution path vs runtime path (`orchestrator/src/cli/doctor.ts`, `orchestrator/src/cli/orchestrator.ts`).
  - CO-003 likely in cloud execution metadata write timing (`orchestrator/src/cli/orchestrator.ts`, `orchestrator/src/cloud/CodexCloudTaskExecutor.ts`).
  - CO-004 likely in unconditional resolver logging (`orchestrator/src/cli/services/pipelineResolver.ts`).
- Approved ordering: CO-004 -> CO-002 -> CO-003.

## Deliberation Notes (Post-Approval Mandates)
- Delegate stream: `019c772e-615c-7100-b26a-bf65afed174c`.
- Ranked risks:
  - Hidden fallback dependency (high).
  - Cross-repo/device issue logging friction (high).
  - Missing scenario-test mandate for feature work (medium-high).
  - Observability not fully contract-tested (medium).
- Chosen minimal slice:
  - Explicit fallback visibility signals.
  - `doctor --issue-log` issue bundle workflow.
  - Scenario-style fixture tests in dummy repos.
  - Observability contract assertions in tests.

## Approvals
- Reviewer: user
- Date: 2026-02-19
- Pre-implementation delegated analysis evidence: collab streams `019c745a-a368-7d83-bd1c-76543479c209`, `019c745a-a87f-7ea1-a7ed-9842ccb57cfe`
- Delegation scout manifest: `.runs/0975-codex-cli-capability-adoption-redesign-scout/cli/2026-02-19T05-36-06-693Z-7267ee91/manifest.json`
- Docs-review manifest: `.runs/0975-codex-cli-capability-adoption-redesign/cli/2026-02-19T05-40-07-222Z-efbb9b74/manifest.json`
- Standalone pre-implementation review log: `out/0975-codex-cli-capability-adoption-redesign/manual/pre-implementation-standalone-review.log`
