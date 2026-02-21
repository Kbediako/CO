# PRD - Context Alignment Checker (Option 2) (0976)

## Summary
- Problem Statement: the current RLM/autopilot flow lacks a first-class, persisted alignment policy that can detect intent drift early, escalate safely, and gate autonomy transitions with measurable confidence.
- Desired Outcome: ship a minimal, production-safe Option 2 checker now (sentinel + risk-triggered deep audit), with explicit rollback controls and manifest-first evidence.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): fully convert the existing planning prompt into a docs-first, research-backed implementation package, run mock simulation validation before rollout, then implement only Option 2 end-to-end with strict safety gates.
- Success criteria / acceptance:
  - Docs-first artifacts are complete, linked, and guard-passing before implementation edits.
  - Research evidence is translated into concrete thresholds/policies for scoring, consensus, and drift handling.
  - Simulation-first evidence demonstrates stable behavior on intent shifts, contradictions, risk variance, false-drift traps, and 20-turn windows.
  - Option 2 is implemented and tested end-to-end with manifest/event-ledger canonical persistence.
  - Option 3 remains backlog-only (no implementation).

## Bootstrap Decision (2026-02-20)
- Decision statement: implement Option 2 only, anchored in existing RLM symbolic-loop seams, with fail-open rollout defaults, explicit feature flags, and strict confirmation/conservative fallback when confidence gates fail.
- Assumptions:
  - Existing RLM loop iteration boundaries are valid "turn" boundaries for v1 gating logic.
  - Existing run artifacts (`rlm/state.json`, `events.jsonl`, manifest summary) can carry canonical checker evidence without schema-breaking manifest changes.
  - Model routing can be enforced via explicit route policy and availability checks, with conservative fallback when high-reasoning routing is unavailable.
- Unknowns:
  - Real-world false-drift baseline across diverse downstream repos.
  - Consensus-to-user agreement distribution under noisy/contradictory long threads.
  - Latency/cost overhead ceiling for deep-audit triggers in production-like workloads.
- Primary risks:
  - False positives causing unnecessary replans/blocks.
  - Self-confirming checker bias or verbosity-inflated scoring.
  - Oscillation between pass/replan states near thresholds.
  - Over-expansion into Option 3 continuous monitoring.

## Scope
- In Scope (Option 2 now):
  - Versioned intent object with major/minor/patch semantics.
  - Sentinel check each task/turn boundary.
  - Deep audit on risk triggers.
  - 0-100 weighted rubric and policy bands.
  - 20-turn confirmation and confidence/consensus gating.
  - Model routing policy (spark vs high-reasoning) with fail-safe fallback.
  - Manifest-first append-only alignment ledger contract and derived projection.
  - Anti-gaming/anti-oscillation safeguards.
  - Rollout phases, observability metrics, and rollback conditions.
- Out of Scope (Option 3 future only):
  - Continuous always-on monitoring architecture.
  - Cross-run persistent autonomous intent memory beyond current run artifacts.
  - Large control-plane or schema migrations unrelated to Option 2.

## Stakeholders
- Product: CO maintainer + downstream agent operators.
- Engineering: orchestrator/runtime maintainers.
- Design: n/a.

## Metrics & Guardrails
- Primary Success Metrics:
  - user override rate on auto-decisions.
  - drift detection latency (turns).
  - false drift alert rate.
  - consensus-to-user agreement rate.
  - confirmation burden per 100 turns.
  - unsafe auto-decision incidents.
- Guardrails / Error Budgets:
  - Any high-risk wrong autonomous decision triggers immediate conservative rollback.
  - Sustained degradation in override or consensus-agreement metrics triggers rollback.
  - Option 3 implementation remains prohibited in this slice.

## Rollout Phases (Gate-Driven)
- Phase 0: offline replay only.
- Phase 1: shadow live scoring.
- Phase 2: advisory prompts (policy/safety may still block).
- Phase 3: gated autonomy expansion only after sustained gate compliance.

## Research Inputs (Applied)
- Calibration + reliability: Guo et al. (ICML 2017), BH-FDR (JRSS-B 1995), ADWIN (SIAM/SDM 2007).
- Consensus limits and arbitration framing: Wang et al. (self-consistency), Du et al. (multi-agent debate), Byzantine consensus limits.
- Manifest-first persistence tradeoffs: Fowler event sourcing + AWS/Azure event-sourcing/CQRS guidance.
- Anti-gaming: LLM-as-a-judge bias literature and anti-flapping alert design.

## Approvals
- Product: user
- Engineering: user
- Design: n/a
