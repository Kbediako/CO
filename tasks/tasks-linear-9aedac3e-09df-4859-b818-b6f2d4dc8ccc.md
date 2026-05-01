# Task Checklist - CO-454

## Docs-First
- [x] PRD, canonical spec, TECH_SPEC mirror, ACTION_PLAN, task checklist, and agent mirror exist for `linear-9aedac3e-09df-4859-b818-b6f2d4dc8ccc`.
- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` register the docs-first packet.
- [x] Protected terms are visible: `CO-454`, source `CO-452`, `docs:freshness:maintain`, `codex-orchestrator:canonical-owner-key=docs:freshness:maintain`, March 31 docs freshness candidate cohorts, `block_diff_local`, `co-429-completed-lane-registry-residue`, and `backlog_head_follow_up_traceability_pending`.

## Acceptance
- [x] The traceability packet and registry mirrors exist so autopilot can clear `backlog_head_follow_up_traceability_pending` after the PR lands.
- [ ] Parent CO-454 work resolves or intentionally reclassifies the March 31 docs freshness candidate cohorts with fresh validator evidence.
- [ ] Parent CO-454 work records review rationale before changing `last_review:2026-03-31` rows.
- [ ] Parent CO-454 work proves any owner action or owner re-home with fresh `docs:freshness:maintain -- --format json` evidence.

## Not Done If
- Required packet files or registry mirrors are missing.
- The packet treats source `CO-452` as owner of the March 31 stale packet/mirror debt.
- The packet weakens `docs:freshness`, `docs:freshness:maintain`, `docs:check`, or `spec-guard`.
- The packet deletes registry rows or historical task packets.
- The packet claims March 31 cohort resolution, owner re-home, archive, or row refresh is complete without fresh validator evidence.

## Validation
- [x] JSON parse for `tasks/index.json`. Evidence: `node -e "JSON.parse(...tasks/index.json...)"`.
- [x] JSON parse for `docs/docs-freshness-registry.json`. Evidence: `node -e "JSON.parse(...docs/docs-freshness-registry.json...)"`.
- [x] Protected-term scan over packet files and `docs/TASKS.md`. Evidence: fixed-string scan for CO-454, source CO-452, owner marker, March 31 candidate route, and traceability hold terms.
- [x] `git diff --check`. Evidence: command completed with no output.
- [x] `npm run docs:check`. Evidence: command completed successfully using a temporary worktree-local `node_modules` symlink that was removed after the run.
- [ ] Parent implementation and full docs freshness validation after actual cohort decisions.

## Notes
This branch is traceability-only. It creates the packet and mirrors required before Backlog promotion; it does not resolve `block_diff_local` or alter March 31 registry rows.
