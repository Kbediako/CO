# Technical Spec — RLM Orchestrator Validation (Task 0954)

## Overview
- Objective: Define deterministic validation for RLM correctness, determinism, and scalability across iterative and symbolic modes.
- Scope: Unit, integration, and evaluation scenarios with offline fixtures and stubbed agents.
- Canonical TECH_SPEC: `tasks/specs/0954-rlm-orchestrator-validation.md`.

## Technical Requirements (Summary)
- Deterministic fixtures for context chunking and symbolic plans.
- Stubbed agent/planner for repeatable outputs.
- Tests covering validator gating, state snapshots, and subcall artifacts.
- Evaluation harness scenarios:
  - `rlm-context-scale` (% correct vs context length in characters/bytes up to 1,000,000).
  - `rlm-oolong` (OOLONG linear aggregation accuracy vs context length in dataset token counts).
  - `rlm-oolong-pairs` (OOLONG-Pairs pairwise accuracy/F1 vs context length in dataset token counts).
- Baseline vs RLM: baseline truncates context to a fixed window; RLM chunks full context via `ContextStore` + `runSymbolicLoop`.
- OOLONG fallback: when no rows match a target length, optionally re-fetch with a relaxed tolerance and annotate output.
- Repeatability: optional multi-run hash check (excluding timings) to validate determinism from cached/offline datasets.
