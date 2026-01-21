---
id: 20260120-0954-rlm-orchestrator-validation
title: RLM Orchestrator Validation Plan
relates_to: tasks/tasks-0954-rlm-orchestrator-validation.md
risk: medium
owners:
  - Codex
last_review: 2026-01-20
---

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: Define a deterministic RLM test matrix for correctness, determinism, and scalability (iterative + symbolic modes), including OOLONG + OOLONG-Pairs long-context aggregation benchmarks.
- Scope: Unit tests, integration tests, and evaluation/benchmark scenarios using stubbed agents/planners and offline fixtures plus external OOLONG dataset fetch helpers.
- Constraints: No live model calls; symbolic RLM + delegation assumed available.

## Technical Requirements
- Functional requirements:
  - Deterministic RLM agent/planner stubs for repeatable outputs.
  - Context chunking fixtures (small/medium/large) with stable hashes.
  - Iterative loop tests for validator gating, state snapshots, and max-iteration exits.
  - Symbolic loop tests for plan validation, subcall artifacts, and budget clamps.
  - Delegation path exercised in deterministic mode (stubbed subagent outputs).
- Non-functional requirements (performance, reliability, security):
  - Offline-only; bounded runtime per scenario; no flaky assertions.
- Interfaces / contracts:
  - RLM runner accepts injected agent/planner (test hook) or adapter stub.
  - Evaluation harness scenarios produce JSON artifacts for diff-match assertions.

## Architecture & Data
- Architecture / design adjustments:
  - Add deterministic fixtures under `orchestrator/tests/fixtures/rlm-*`.
  - Add evaluation fixtures under `evaluation/fixtures/rlm-*`.
  - Optional: add helper to compute state hashes for determinism checks.
- Data model changes / migrations:
  - None.
- External dependencies / integrations:
  - Optional OOLONG dataset downloads (HF) via helper script; local sample fixtures for CI.
  - Dataset sources: `oolongbench/oolong-synth` (linear OOLONG), `oolongbench/oolong-synth` filtered to `trec_coarse` for OOLONG-Pairs.
  - Cache outputs under `out/<task-id>/datasets/` to avoid repeated network downloads.

## Evaluation Method Notes
- Baseline definition: simulate non-RLM by truncating contexts to a fixed window (`baseline_max_context_tokens`, default 131,000) and answering with only the truncated context.
- RLM definition: chunked symbolic loop over full context using `ContextStore`/`runSymbolicLoop`, aggregating label counts deterministically.
- Context length units: OOLONG uses dataset token counts (`context_len`); synthetic context-scale uses character/byte lengths.
- OOLONG-Pairs scoring: compute F1 for predicted vs gold user-ID pairs plus perfect-match % (F1 == 1) per context length.

## Validation Plan
### Unit tests
- Planned fixtures (placeholders in this PR; populate when unit tests land):
  - `orchestrator/tests/fixtures/rlm-contexts/{small,medium,large}.txt`
  - `orchestrator/tests/fixtures/rlm-plans/*.json`
  - `orchestrator/tests/fixtures/rlm-expected/*.json`
- Commands:
  - `npm run test:orchestrator`
- Success criteria (once fixtures/tests are added):
  - State snapshots match expected fixtures; repeated runs produce identical hashes.
- Failure criteria:
  - Any mismatch in expected state, missing artifacts, or nondeterministic outputs.

### Integration tests
- Planned fixtures (placeholder; add when integration suite lands):
  - Context + validator scripts bundled with the integration harness (TBD)
  - Stubbed agent/planner outputs
- Commands:
  - `npm run build`
  - `npm run test:orchestrator` (integration suite)
- Success criteria:
  - Expected exit codes (pass/fail), `rlm/state.json` and subcall artifacts written, identical outputs across two runs.
- Failure criteria:
  - Non-zero exit, missing artifacts, or unstable state.

### Evaluation / benchmarking tests
- Required fixtures:
  - `evaluation/fixtures/rlm-context-scale/fixture.json` (synthetic context-length benchmark spec)
  - `evaluation/fixtures/rlm-oolong/fixture.json` (OOLONG linear aggregation, local sample + HF fetch config)
  - `evaluation/fixtures/rlm-oolong-pairs/fixture.json` (OOLONG-Pairs pairwise tasks, local sample + HF fetch config)
  - `evaluation/scenarios/rlm-context-scale.json`
  - `evaluation/scenarios/rlm-oolong.json`
  - `evaluation/scenarios/rlm-oolong-pairs.json`
- Commands:
  - `npm run eval:test`
  - `node --loader ts-node/esm evaluation/benchmarks/rlm-context-scale.mjs --fixture evaluation/fixtures/rlm-context-scale --output out/rlm-context-scale/results.json`
  - `node --loader ts-node/esm evaluation/benchmarks/rlm-oolong.mjs --fixture evaluation/fixtures/rlm-oolong --output out/rlm-oolong/results.json`
  - `node --loader ts-node/esm evaluation/benchmarks/rlm-oolong-pairs.mjs --fixture evaluation/fixtures/rlm-oolong-pairs --output out/rlm-oolong-pairs/results.json`
- Success criteria:
  - Benchmark scenario runs in eval harness; JSON output includes sizes up to 1,000,000 context length; baseline/RLM correctness percentages recorded per size.
  - OOLONG scenarios output accuracy curves (baseline vs RLM) and record sample counts per length.
  - OOLONG-Pairs scenarios output pairwise F1 + perfect-match accuracy curves (baseline vs RLM).
  - Repeatability hashes match across configured runs (when enabled) using cached/offline datasets.
- Failure criteria:
  - Missing output, timeout, or incorrect correctness metrics (e.g., <100% on needle-search trials).
  - Missing OOLONG samples for a requested context length after fallback tolerance (unless offline mode is explicitly set).

## Reusable Patterns from rlm Repo
- Local REPL persistence + context/history accumulation tests: `rlm/tests/test_local_repl*.py`, `rlm/tests/test_multi_turn_integration.py`.
- Parsing/final-answer extraction tests: `rlm/tests/test_parsing.py`.
- Mock LM for deterministic responses: `rlm/tests/mock_lm.py`.
- LMHandler + REPL integration example (manual, for adaptation): `rlm/examples/lm_in_repl.py`.
- OOLONG + OOLONG-Pairs long-context aggregation benchmarks (dataset + evaluation harness patterns).

## Open Questions
- Which CI lane should run large-scale benchmarks (PR vs nightly)?
- Should determinism be enforced via hash snapshots or strict JSON diff?
- Do we need a dedicated CLI wrapper for evaluation scenarios?
- Which OOLONG task groups should be mandatory in CI (counting vs user vs timeline)?
- Baseline context window size to simulate non-RLM truncation?

## Approvals
- Reviewer: Codex (standalone review)
- Date: 2026-01-20
- Notes: Approved after resolving docs:check path placeholders and checklist sync. Standalone review (2026-01-20) flagged ensuring new 0954 docs/fixtures are committed alongside tasks/index updates. Follow-up review attempt on 2026-01-20 (codex review hung; manual review applied) resolved gaps on context-length units, dataset source, and baseline definition.
