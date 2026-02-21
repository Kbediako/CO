# ACTION_PLAN - Context Alignment Checker (Option 2) (0976)

## Summary
- Goal: deliver a docs-first, research-backed, simulation-gated Option 2 context alignment checker with minimal implementation risk.
- Scope: bootstrap decisioning, research synthesis, docs guards, mock simulation, minimal end-to-end implementation, and full validation/review.
- Assumptions: existing RLM symbolic loop and run-event surfaces can host Option 2 behavior without broad refactor or manifest schema breakage.

## Phases and Gates
1) Bootstrap + decision framing (complete before drafting spec details).
2) Research-first synthesis with citations and concrete thresholds.
3) Docs-first artifacts and registry/task wiring.
4) Docs guard pass (`docs:check`, `docs:freshness`, spec freshness).
5) Simulation-first in isolated dummy environment.
6) Simulation gate evaluation and threshold tuning.
7) Option 2 minimal implementation.
8) Test + full repo verification + review/elegance.

## Milestones & Sequencing
1. Bootstrap and phase gates
2. Research synthesis into design choices
3. Create PRD + TECH_SPEC + ACTION_PLAN + checklist + mirrors/registry
4. Capture docs-review evidence pre-implementation
5. Run simulation harness and calibrate thresholds
6. Implement minimal Option 2 (no Option 3)
7. Run required validation chain and review loops
8. Publish final report and backlog Option 3 only

## Dependencies
- Existing RLM symbolic loop and event stream persistence.
- Existing guardrail scripts and docs freshness registry.
- Delegated research/review evidence streams.

## Validation
- Checks / tests:
  - docs guards before implementation edits.
  - simulation metrics must be recorded and meet provisional stability targets.
  - required build/lint/test/docs/review chain after implementation.
- Rollback plan:
  - feature-flag kill switch for checker.
  - deep-audit disable mode while preserving sentinel.
  - conservative confirmation mode fallback when confidence/routing gates fail.

## Post-Dogfooding Next Steps (Device-Local, Multi-Codebase)
- Trigger condition: complete advisory-mode dogfooding on non-CO codebases on this device (`RLM_ALIGNMENT_CHECKER=1`, `RLM_ALIGNMENT_CHECKER_ENFORCE=0`) with captured run artifacts.
- Immediate follow-up after dogfooding:
  - aggregate observed metrics across repos: false drift rate, override rate, consensus-to-user agreement, latency overhead ratio, and cost overhead ratio.
  - compare observed metrics against the simulation gate policy and document any threshold deltas before enforcement expansion.
- Promotion gate:
  - if no high-risk wrong autonomous decisions and metrics remain within target, enable enforcement for a limited cohort of symbolic RLM runs.
  - keep rollback immediate via `RLM_ALIGNMENT_CHECKER=0` and fall back to advisory mode if drift/override/consensus signals regress.
- Expansion boundary:
  - after sustained symbolic-RLM stability, draft a separate cross-pipeline alignment contract for non-RLM flows.
  - keep Option 3 as backlog-only until this dogfooding-to-enforcement path is complete.

## Risks & Mitigations
- Risk: false drift blocks productive flow.
  - Mitigation: hysteresis + cooldown + calibrated thresholds from simulation.
- Risk: model routing failures create unsafe autonomy.
  - Mitigation: fail-safe confirmation requirement for non-trivial decisions.
- Risk: scope creep into Option 3.
  - Mitigation: explicit out-of-scope gates and backlog-only tracking.
- Risk: persistence complexity increases failure surface.
  - Mitigation: append-only ledger with idempotency and hash-chain tests; derived projection optional and rebuildable.

## Approvals
- Reviewer: user
- Date: 2026-02-20
