# Task Checklist - CO-454

## Docs-First
- [x] PRD, canonical spec, TECH_SPEC mirror, ACTION_PLAN, task checklist, and agent mirror exist for `linear-9aedac3e-09df-4859-b818-b6f2d4dc8ccc`.
- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` register the docs-first packet.
- [x] Protected terms are visible: `CO-454`, source `CO-452`, `docs:freshness:maintain`, `codex-orchestrator:canonical-owner-key=docs:freshness:maintain`, March 31 docs freshness candidate cohorts, `block_diff_local`, `co-429-completed-lane-registry-residue`, `candidate-2026-03-31-cadence-30-age-31`, `docs_freshness_candidate`, and `backlog_head_follow_up_traceability_pending`.

## Acceptance
- [x] The traceability packet and registry mirrors exist so autopilot can clear `backlog_head_follow_up_traceability_pending` after the PR lands.
- [x] CO-454 reclassifies the completed March 31 CO-54, CO-45, CO-52, CO-55, and CO-56 packet families with fresh validator evidence.
- [x] CO-454 records review rationale before changing `last_review:2026-03-31` rows. Evidence: live `linear issue-context` reads for all five source issues confirmed `Done`.
- [x] CO-454 proves owner action status with fresh `docs:freshness:maintain -- --format json` evidence. Evidence: `pass_with_owned_rolling_debt`, `owner_issue=CO-444`, `blocking_changed_paths=[]`, `required_actions=0`.

## Not Done If
- Required packet files or registry mirrors are missing.
- The packet treats source `CO-452` as owner of the March 31 stale packet/mirror debt.
- The packet weakens `docs:freshness`, `docs:freshness:maintain`, `docs:check`, or `spec-guard`.
- The packet deletes registry rows or historical task packets.
- The packet claims March 31 cohort resolution, owner re-home, archive, or row refresh is complete without fresh validator evidence.
- The packet claims the separate CO-444 rolling cohort is resolved by this completed-lane archive.

## Validation
- [x] JSON parse for `tasks/index.json`. Evidence: `node -e "JSON.parse(...tasks/index.json...)"`.
- [x] JSON parse for `docs/docs-freshness-registry.json`. Evidence: `node -e "JSON.parse(...docs/docs-freshness-registry.json...)"`.
- [x] Protected-term scan over packet files and `docs/TASKS.md`. Evidence: fixed-string scan for CO-454, source CO-452, owner marker, March 31 candidate route, and traceability hold terms.
- [x] `git diff --check`. Evidence: command completed with no output.
- [x] `npm run docs:check`. Evidence: command completed successfully using a temporary worktree-local `node_modules` symlink that was removed after the run.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `Spec guard: OK`.
- [x] `npm run docs:freshness`. Evidence: `docs:freshness OK - 5040 docs, 5043 registry entries`.
- [x] `npm run docs:freshness:maintain -- --format json`. Evidence: `pass_with_owned_rolling_debt`, `owner_issue=CO-444`, `blocking_changed_paths=[]`, `required_actions=0`.

## Notes
This branch remains docs metadata-only. It creates the packet and mirrors required before Backlog promotion and archives the reviewed completed-lane March 31 rows; it does not delete historical packets, weaken docs freshness, or resolve the separate CO-444 rolling cohort.
