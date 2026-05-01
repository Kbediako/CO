# TECH_SPEC Mirror - CO-454 resolve March 31 docs freshness candidate cohorts

Canonical spec: `tasks/specs/linear-9aedac3e-09df-4859-b818-b6f2d4dc8ccc.md`; PRD: `docs/PRD-linear-9aedac3e-09df-4859-b818-b6f2d4dc8ccc.md`; action plan: `docs/ACTION_PLAN-linear-9aedac3e-09df-4859-b818-b6f2d4dc8ccc.md`.

## Contract
CO-454 is the source CO-452 follow-up for March 31 docs freshness candidate cohorts. The packet preserves `docs:freshness:maintain`, canonical owner marker `codex-orchestrator:canonical-owner-key=docs:freshness:maintain`, `block_diff_local`, `co-429-completed-lane-registry-residue`, `candidate-2026-03-31-cadence-30-age-31`, `docs_freshness_candidate`, `last_review:2026-03-31`, and `blocking_changed_paths=[]`.

This mirror exists to clear repo-side traceability for `backlog_head_follow_up_traceability_pending`. It does not claim the March 31 cohorts are resolved, does not weaken `docs:freshness`, does not delete registry rows, and does not claim owner re-home is complete without fresh `docs:freshness:maintain -- --format json` evidence.

## Not Done If
- The six packet files or registry mirrors are missing.
- The packet omits `CO-454`, source `CO-452`, `docs:freshness:maintain`, `block_diff_local`, or `co-429-completed-lane-registry-residue`.
- It treats the CO-452 js_repl posture diff as owner of the March 31 stale packet/mirror debt.
- It deletes registry rows, weakens docs freshness gates, or blindly bumps `last_review:2026-03-31`.
- It claims the owner issue or March 31 candidate cohorts are fixed without fresh validator evidence.

## Validation
This traceability branch should validate JSON syntax for `tasks/index.json` and `docs/docs-freshness-registry.json`, scan packet files for protected terms, and run `git diff --check`. Parent CO-454 work owns `docs:freshness`, `docs:freshness:maintain -- --format json`, row refresh/archive/reclassification decisions, and any owner action proof.
