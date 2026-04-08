# PRD — Orchestrator Performance & Reliability Loop 2

## Summary
- Problem Statement: Orchestrator pipelines accrue latency and I/O overhead over time, and regressions can slip without a recurring, evidence-backed performance loop.
- Desired Outcome: Continue the discovery → fix → validate loop, focusing on the next highest-impact hotspot (initially metrics aggregation read amplification) with minimal, reviewable changes.

## Goals
- Identify the top latency and I/O hotspots in orchestrator CLI and pipeline execution (diagnostics + RLM loop).
- Reduce diagnostics pipeline wall-clock time and manifest write overhead with measurable gains (target 10–20% improvement where feasible).
- Improve reliability by eliminating or reducing common failure modes (timeouts, retries, flaky outputs) discovered during profiling.
- Add targeted tests or lightweight benchmarks to guard against regressions.
- Apply ExecPlan-style documentation + gating for this loop (PRD/TECH_SPEC/ACTION_PLAN + evidence links + non-interactive commands).

## Non-Goals
- Large-scale refactors or architectural rewrites.
- New product features or changes to public APIs unrelated to performance/reliability.
- Version bumps or release workflows.
- Fixing additional hotspots beyond the selected top hotspot for this loop (defer to the next loop).

## Stakeholders
- Product: Orchestrator Platform
- Engineering: Orchestrator Core
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics: reduced diagnostics runtime, fewer manifest writes per run, stable success rate across guardrails.
- Guardrails / Error Budgets: no regression in test pass rate; memory usage stays within current baseline; reviewable diff size.

## User Experience
- Personas: agents running pipelines, reviewers inspecting run manifests.
- User Journeys:
  - Agent runs diagnostics and gets faster completion with stable logs.
  - Reviewer opens manifests with consistent structure and smaller, predictable artifacts.

## Technical Considerations
- Architectural Notes: focus on persistence, manifest writing, and repeated filesystem access; prefer batching, caching, and early exits.
- Dependencies / Integrations: Node.js fs/promises, run manifest storage under `.runs/` and `out/`.

## Approvals
- Product:
- Engineering:
- Design:

## Definition of Done (Evidence-Backed)
- Baseline + post-change diagnostics + RLM runs captured and linked.
- Before/after runtime and manifest write counts summarized.
- Regression guard added for metrics aggregation (test or micro-benchmark).
- Implementation gate passes end-to-end using non-interactive commands.
- Diff stays within the agreed diff budget; no version bump.

## Evidence Bundle (Reviewer Click-Through)
- Diagnostics manifests: `.runs/0939-orchestrator-performance-reliability-loop-2/cli/<run-id>/manifest.json`
- Metrics summary: `.runs/0939-orchestrator-performance-reliability-loop-2/metrics.json`
- State snapshots (if needed): `out/0939-orchestrator-performance-reliability-loop-2/state.json`
- Proof snippets captured in the Action Plan (Artifacts and Notes).
