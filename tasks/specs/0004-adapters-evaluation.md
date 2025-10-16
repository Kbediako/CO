---
id: 20251016-adapters-eval
title: Codex-Orchestrator Adapters & Evaluation Harness Mini-Spec
relates_to: tasks/0001-prd-codex-orchestrator.md
risk: medium
owners:
  - Orchestrator Engineering
last_review: 2025-10-16
---

## Added by Orchestrator 2025-10-16

## Summary
- Objective: Define adapter schema contract updates and the evaluation harness that exercises language adapters and learning patterns as required by the Codex-Orchestrator PRD (tasks/0001-prd-codex-orchestrator.md) and prior mini-specs (0001 architecture, 0002 core execution, 0003 learning library).
- Scope: Extend adapter metadata with evaluation context, formalize fixture-driven scenarios, and stand up scripts/tests so adapters and patterns can be validated in isolation before codex cloud sync.
- Constraints: Preserve SOP guardrails (one-subtask sequencing, spec guard checks, manifest logging) and ensure harness runs deterministically in MCP (default) and local modes without mutating repository state outside `.runs/` and `evaluation/fixtures/**`.

## Adapter Schema & Execution Plans
- Add optional `evaluation` block to each `AdapterCommand` describing fixture-ready command overrides (cwd/env) plus guardrail tags (`requiresCleanFixture`, `supportsParallel`). This keeps the canonical command untouched while giving the harness deterministic hooks.
- Provide `AdapterExecutionScenario` interface exposing `adapterId`, `goals`, `fixture`, and optional `patternAssertions` for learning library assets. Scenarios resolve into concrete execution plans combining adapters (from 0002 core execution) with fixture metadata.
- Maintain registry helpers (`getAdapters`, `requireAdapter`) while introducing `createExecutionPlan(adapterId, goal, overrides)` to limit harness instantiation to validated combinations.

## Evaluation Harness Interfaces
- `evaluation/harness/index.ts` exports `runScenario` and `runAllScenarios` utilities that:
  - Read scenario definitions from `evaluation/scenarios/*.json` (checked into git and mirrored in fixtures README).
  - Spawn commands via `child_process.spawn` with timeouts, capturing stdout/stderr and exit metadata in structured results.
  - Emit per-goal JSON artifacts under `.runs/<task>/<run>/evaluation/<scenario>.json` for downstream cloud sync, aligning with persistence guardrails from 0002.
- Introduce lightweight reporter module to summarize success/failure and integrate pattern assertions (e.g., verifying codemod outputs or template presence).
- Harness defaults to MCP mode (no network writes) but supports explicit `--mode=cloud` flag that only toggles logging metadata; execution remains local per 0001 PRD guardrails.

## Build & Test Commands
- Add `npm run eval:test` invoking `vitest run evaluation` to exercise harness logic and fixtures, extending the test matrix defined in 0003 learning library.
- Document harness usage in `README` / `docs/TECH_SPEC.md` mirrors with example command sequences (`npm run build`, `npm run lint`, `npm run eval:test`).
- Ensure CI/lint configs include `evaluation/**` TypeScript sources and fixtures to avoid drift.

## Data Handling & Guardrails
- Fixtures live under `evaluation/fixtures/<language>/<scenario>` with `README` describing setup, expected outputs, and cleanup instructions.
- Harness writes run logs only within `.runs/<task>/<run>/` and never mutates fixtures; guard via deep copy of fixture to temp workspace when scenarios request isolation.
- Validation artifacts include exit codes, truncated stdout/stderr (≤10KB) and pattern assertions; sensitive env vars redacted before persistence.
- Manifests capture mode selection, approvals, risks, and follow-ups per governance; spec guard must fail if `last_review` > 30 days.

## Validation Plan
- Unit tests for execution planner and harness reporter verifying successful and failed command handling.
- Scenario smoke tests executing at least two fixtures (TypeScript adapter + codemod assertion; Python adapter smoke run) via `npm run eval:test`.
- CI gating ensures `npm run build`, `npm run lint`, and `npm run eval:test` run clean before adapters/patterns sync.

## Approvals
- Product — Jordan Lee (Approved 2025-10-16)
- Engineering — Priya Desai (Approved 2025-10-16)
- Developer Experience — Mateo Alvarez (Approved 2025-10-16)
