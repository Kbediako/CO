---
id: 20260220-0976-context-alignment-checker-option2
title: Context Alignment Checker (Option 2) - Docs-First + Simulation-Gated Implementation
relates_to: tasks/tasks-0976-context-alignment-checker-option2.md
risk: high
owners:
  - Codex
last_review: 2026-02-20
---

## Summary
- Objective: implement a minimal, production-safe Context Alignment Checker (Option 2 only) with sentinel checks, risk-triggered deep audits, confidence-gated autonomy, and manifest-first canonical persistence.
- Scope: RLM loop integration, scoring engine, intent versioning, deep-audit consensus policy, model routing controls, alignment ledger persistence, simulation harness, and rollback-safe rollout gates.
- Constraints:
  - Docs/research/simulation gates must pass before implementation rollout.
  - Preserve backward compatibility and avoid manifest schema breaks.
  - Keep Option 3 as future backlog only.

## Decision and Gate Plan
- Implementation decision: integrate checker through existing RLM symbolic-loop seams and run-event summary pathways to minimize blast radius.
- Gate order (hard):
  1. Research synthesis complete.
  2. Docs-first artifacts complete + docs guards pass.
  3. Standalone pre-implementation review approval recorded (`docs/REVIEW-0976-context-alignment-checker-option2-pre-implementation.md`).
  4. Simulation-first mock validation shows stable metrics.
  5. Minimal Option 2 implementation + tests.
  6. Full verification/review/elegance pass.

## Technical Requirements
- Functional requirements:
  - Intent versioning object with fields:
    - goals/outcomes
    - constraints/no-go rules
    - priorities
    - style/format preferences
    - evidence references (turn IDs/trace pointers)
    - confidence metadata
  - Versioning policy:
    - `major`: explicit user goal/constraint reversal.
    - `minor`: preference/prioritization change.
    - `patch`: confidence/evidence refresh only.
  - Context check loop (Option 2):
    - sentinel on every turn boundary.
    - deep audit on risk triggers (contradictions, repeated overrides, high-risk actions, low-consensus confidence).
  - Check output contract:
    - alignment score (0-100)
    - per-dimension scores
    - drift points with evidence
    - recommended action (`pass`, `nudge`, `replan`, `block_escalate`)
    - confidence
  - Weighted scoring rubric (0-100 total):
    - goal alignment: 30
    - constraint compliance: 20
    - action-evidence coherence: 15
    - completeness: 15
    - context continuity: 10
    - efficiency discipline: 10
  - Policy bands:
    - 85-100: pass
    - 70-84: pass + nudge
    - 50-69: mandatory replan
    - <50: block/escalate
  - 20-turn confirmation + consensus policy:
    - turns 1-20: require confirmation for medium/high-risk decisions and all block/escalate outcomes.
    - at turn 20 and every 20 thereafter: run 3-evaluator consensus check.
    - autonomy requires:
      - 2/3 agreement
      - top action score >= 0.70
      - margin >= 0.15 to runner-up
      - no safety/policy veto flags
    - if failed: keep/restore confirmation mode; escalate ambiguous low-risk to high-reasoning arbitration; request user confirmation for medium/high-risk uncertainty.
  - Model routing policy:
    - default low-risk sentinel/routine inference: `gpt-5.3-spark`.
    - high-reasoning route for major/high-risk decisions, low-margin consensus, arbitration/tie-breaks, contradiction-heavy drift analysis.
    - fail-safe: if high-reasoning unavailable, require confirmation for non-trivial decisions.
  - Canonical persistence (manifest-first):
    - append-only alignment ledger events under run artifacts.
    - event envelope fields:
      - `event_id`
      - `timestamp_utc`
      - `thread_id`
      - `task_id`
      - `run_id`
      - `agent_id`
      - `event_type`
      - `intent_version`
      - `schema_version`
      - `payload`
      - `score_metadata`
      - `provenance`
      - `idempotency_key`
      - `prev_hash` and `hash`
    - immutable append semantics and idempotent ingestion.
    - replayable history as canonical source.
    - optional derived projection may be written, but must remain rebuildable from ledger.
  - Drift detection + update policy:
    - triggers: explicit corrections/overrides, contradiction signals, consensus instability, rising override rate.
    - soft drift: shadow update then promote after consistency window.
    - hard drift: immediate major bump + temporary confirmation lock.
  - Anti-gaming safeguards:
    - evidence-linked scoring and verbosity-normalized effectiveness.
    - checker prompt separation from planner path.
    - anti-oscillation hysteresis + cooldown + bounded retries.
    - conservative fallback + veto gates for unsafe autonomy.
- Non-functional requirements:
  - Deterministic behavior for scoring/gating with test fixtures.
  - No schema-breaking top-level manifest modifications.
  - Fail-open by default during phased rollout, except explicit policy/safety blocks.
  - Minimal code surface and additive flags for rollback.
- Interfaces / contracts:
  - RLM state/iteration extensions remain backward compatible.
  - Event records are append-only and versioned.
  - Derived projection marked non-canonical.

## Architecture & Data
- Integration seams (selected):
  - `orchestrator/src/cli/rlm/symbolic.ts` for turn-level sentinel/deep audit hooks.
  - `orchestrator/src/cli/rlmRunner.ts` for model-route availability/fallback policy.
  - `orchestrator/src/cli/events/runEventStream.ts` for run-level event append.
  - `orchestrator/src/cli/orchestrator.ts` + `orchestrator/src/cli/run/manifest.ts` for summary-level observability propagation.
- New artifacts:
  - alignment ledger JSONL file under run `rlm/` path.
  - optional alignment projection JSON file (derived read-model).
- Data evolution:
  - no irreversible migrations.
  - replay path from ledger to projection is required.

## Simulation-First Validation Requirements
- Build isolated dummy workspace simulation (no production-path risk).
- Scenario set must include:
  - intent shifts
  - contradictory requests
  - low/high-risk actions
  - false-positive drift traps
  - long-thread 20-turn windows
- Required simulation outputs:
  - alignment score behavior
  - override rate
  - false drift rate
  - latency/cost overhead
  - consensus-to-user agreement
- Threshold tuning loop:
  - run, analyze failures, adjust thresholds/hysteresis, rerun until stable.

## Rollout, Metrics, and Rollback
- Phase 0 gate: offline replay correlation + controlled false positives.
- Phase 1 gate: shadow overhead/stability within accepted budget.
- Phase 2 gate: measurable post-correction uplift + acceptable override rate.
- Phase 3 gate: sustained prior-gate compliance window.
- Post-dogfooding transition (local device, other codebases):
  - run advisory-mode dogfooding on non-CO repos first (`RLM_ALIGNMENT_CHECKER=1`, `RLM_ALIGNMENT_CHECKER_ENFORCE=0`).
  - aggregate per-repo metrics from run artifacts and compare to simulation gate thresholds.
  - only if stable: enable enforcement for a limited symbolic-RLM cohort; keep kill switch and advisory fallback active.
  - after sustained stability in this stage, define a separate spec for non-RLM integration; do not fold Option 3 into this task.
- Immediate rollback triggers:
  - any high-risk wrong autonomous decision.
  - sustained override or consensus-agreement degradation beyond thresholds.

## Validation Plan
- Tests / checks:
  - unit tests for scoring bands, intent versioning, consensus thresholds, anti-oscillation.
  - persistence tests for idempotency + hash-chain integrity.
  - integration tests for gating/routing/fallback behavior.
  - simulation evidence artifacts captured under `out/0976-context-alignment-checker-option2/manual/`.
  - required repo validation chain:
    - `node scripts/delegation-guard.mjs`
    - `node scripts/spec-guard.mjs --dry-run`
    - `npm run build`
    - `npm run lint`
    - `npm run test`
    - `npm run docs:check`
    - `npm run docs:freshness`
    - `node scripts/diff-budget.mjs`
    - `npm run review`
- Rollout verification:
  - confirm Option 3 is documented only as backlog.
  - verify rollback path toggles checker to conservative mode.
- Monitoring / alerts:
  - emit alignment metrics and rollback signals in run summaries/events.

## Open Questions
- What final production thresholds should be accepted after simulation calibration for each risk tier?
- Should consensus evaluator prompts be model-diverse by default in v1, or pinned per environment policy?

## Approvals
- Reviewer: user
- Date: 2026-02-20
