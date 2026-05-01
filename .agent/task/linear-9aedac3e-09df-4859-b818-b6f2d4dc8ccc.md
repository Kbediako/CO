# Agent Task Mirror - linear-9aedac3e-09df-4859-b818-b6f2d4dc8ccc

- Linear Issue: `CO-454` / `9aedac3e-09df-4859-b818-b6f2d4dc8ccc`
- Title: Resolve March 31 docs freshness candidate cohorts
- Source issue: `CO-452`
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=docs:freshness:maintain`
- PRD: `docs/PRD-linear-9aedac3e-09df-4859-b818-b6f2d4dc8ccc.md`
- TECH_SPEC: `docs/TECH_SPEC-linear-9aedac3e-09df-4859-b818-b6f2d4dc8ccc.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-9aedac3e-09df-4859-b818-b6f2d4dc8ccc.md`
- Checklist: `tasks/tasks-linear-9aedac3e-09df-4859-b818-b6f2d4dc8ccc.md`

## Current Truth
- CO-452 reproduced a clean-main docs freshness blocker that is not caused by the js_repl posture diff.
- CO-454 is the canonical follow-up for March 31 docs freshness candidate cohorts.
- The protected blocker terms are `docs:freshness:maintain`, `block_diff_local`, `co-429-completed-lane-registry-residue`, `candidate-2026-03-31-cadence-30-age-31`, `docs_freshness_candidate`, `last_review:2026-03-31`, and `blocking_changed_paths=[]`.
- The repo packet and mirrors are required to clear `backlog_head_follow_up_traceability_pending` before CO-454 leaves Backlog.
- PR #736 now also archives the completed CO-54, CO-45, CO-52, CO-55, and CO-56 packet families after live Linear `Done` verification.

## Guardrails
- Do not weaken `docs:freshness`, `docs:freshness:maintain`, `docs:check`, or `spec-guard`.
- Do not delete registry rows or historical task packets.
- Do not blindly bump March 31 review dates.
- Do not claim owner re-home, rolling cohort resolution, or completed-lane cohort resolution without fresh validator evidence.
- Do not widen CO-452 or general Codex CLI `0.128.0` release intake into this docs freshness follow-up.

## Validation Handoff
- Traceability branch:
  - creates six packet files
  - registers `20260501-linear-9aedac3e-09df-4859-b818-b6f2d4dc8ccc` in `tasks/index.json`
  - adds a CO-454 `docs/TASKS.md` snapshot
  - adds six active rows to `docs/docs-freshness-registry.json`
- Completed-lane repair:
  - reclassifies the five March 31 source specs to inactive `done`
  - archives the 30 matching registry rows with `last_review=2026-05-01`
  - records live Linear evidence and fresh `docs:freshness:maintain -- --format json` proof
  - leaves the separate CO-444 rolling cohort visible and owned

## Notes
Keep this mirror aligned with `tasks/tasks-linear-9aedac3e-09df-4859-b818-b6f2d4dc8ccc.md`.
