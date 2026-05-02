# TECH_SPEC Mirror - CO-454 resolve March 31 docs freshness candidate cohorts

Canonical spec: `tasks/specs/linear-9aedac3e-09df-4859-b818-b6f2d4dc8ccc.md`; PRD: `docs/PRD-linear-9aedac3e-09df-4859-b818-b6f2d4dc8ccc.md`; action plan: `docs/ACTION_PLAN-linear-9aedac3e-09df-4859-b818-b6f2d4dc8ccc.md`.

## Contract
CO-454 is the source CO-452 follow-up for March 31 docs freshness candidate cohorts. The packet preserves `docs:freshness:maintain`, canonical owner marker `codex-orchestrator:canonical-owner-key=docs:freshness:maintain`, `block_diff_local`, `co-429-completed-lane-registry-residue`, `candidate-2026-03-31-cadence-30-age-31`, `docs_freshness_candidate`, `last_review:2026-03-31`, and `blocking_changed_paths=[]`.

This mirror exists to clear repo-side traceability for `backlog_head_follow_up_traceability_pending` and to record the reviewed completed-lane repair that PR #736 now carries. CO-54, CO-45, CO-52, CO-55, and CO-56 are live `Done`, so their March 31 packet rows are archived with fresh review evidence; the separate CO-444 rolling cohort is not claimed resolved.

## Not Done If
- The six packet files or registry mirrors are missing.
- The packet omits `CO-454`, source `CO-452`, `docs:freshness:maintain`, `block_diff_local`, or `co-429-completed-lane-registry-residue`.
- It treats the CO-452 js_repl posture diff as owner of the March 31 stale packet/mirror debt.
- It deletes registry rows, weakens docs freshness gates, or blindly bumps `last_review:2026-03-31`.
- It claims the owner issue or March 31 candidate cohorts are fixed without fresh validator evidence.
- It claims the CO-444 rolling cohort is fixed by this completed-lane archive.

## Validation
This branch validates JSON syntax for `tasks/index.json` and `docs/docs-freshness-registry.json`, scans packet files for protected terms, runs `git diff --check`, `node scripts/spec-guard.mjs --dry-run`, `npm run docs:freshness`, `npm run docs:freshness:maintain -- --format json`, and `npm run docs:check`.
