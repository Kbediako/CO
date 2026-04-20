# CO-267 docs:freshness classification and reviewed refresh

Date: 2026-04-20
Task: `linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4`

## Review Decision

- Disposition: reviewed refresh for the exact stale docs, active spec frontmatter rows, and CO-175 rolling cohort rows identified by the parent before artifacts.
- Rationale: the stale rows are repository maintenance debt, not CO-266 terminal-blocker advisory scope. The review found no missing registry rows, missing files, invalid registry rows, or uncatalogued docs, so metadata refresh is sufficient and no docs are deleted or suppressed.
- CO-175 handling: the Mar 14 `1164-1195` rolling cohort reached `overdue=7/7` and `expires_after=2026-04-20`; this lane reviews and refreshes that cohort instead of extending the rolling window or hiding it.
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=docs:freshness:maintain`.

## Before Evidence

- `docs:freshness`: 66 blocking stale docs, 221 rolling cohort rows, 0 missing registry rows, 0 missing-on-disk rows, 0 invalid entries, 0 uncatalogued docs.
- `docs:freshness:maintain`: `block_diff_local`, policy capacity `over_budget`, blocking changed paths 0.
- `spec-guard --dry-run`: 6 stale active spec rows captured in `out/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/before/spec-guard.log`.

## Blocking Stale Docs By Class

| Class | Count |
| --- | --- |
| Active Guide | 4 |
| Agent Policy | 7 |
| Report Only | 7 |
| Shipped Skill | 2 |
| Task Mirror | 6 |
| Task Packet | 40 |

## Blocking Stale Docs By Last Review

| Last review | Cadence | Count | Lineage |
| --- | --- | --- | --- |
| 2026-01-19 | 90 days | 21 | 0940-0940 (1 task ids) |
| 2026-03-20 | 30 days | 45 | 1303-1311 (8 task ids) |

## CO-175 Rolling Cohort Review

- Owner issue: CO-175
- Baseline cohort: co-175-apr-14-march-14-tasks-1164-1195
- Rows reviewed: 221
- Last review before refresh: 2026-03-14
- Review window: overdue=7/7 days, expires_after=2026-04-20
- Lineage: 1164-1195 (32 task ids)
- Disposition: refreshed to `2026-04-20` after review; no policy cap/window change and no registry deletion.

## Non-Rolling Stale Class Review

- Agent Policy / Active Guide / Shipped Skill rows from `last_review=2026-01-19` were reviewed as stable operational guidance and skill instructions. No content change was required; registry `last_review` is refreshed to record the review.
- Task Packet / Task Mirror / Report Only rows from `last_review=2026-03-20` were reviewed as historical packet/report surfaces. They remain active evidence surfaces, so the correct disposition is reviewed refresh rather than archive or rolling-policy expansion.
- Active spec frontmatter rows in the six-row `spec-guard` failure set were reviewed with the same historical packet family and refreshed directly because `spec-guard` owns active-spec frontmatter freshness.
- Additional `tasks/specs/**` docs that were stale only in `docs:freshness` were handled as task-packet freshness debt: files with frontmatter were refreshed directly, while `tasks/specs/README.md` was refreshed only in the registry because it has no frontmatter and is excluded from `spec-guard`.

## Updated Metadata Sets

- Registry rows refreshed from reports: 290
- New CO-267 registry rows added: 7
- Spec frontmatter rows refreshed: 9
- Spec-guard active failure rows refreshed: 6
- Registry-only spec README rows refreshed: 1

## Blocking Stale Docs Exact Paths

| Path | Class | Family | Task | Last review | Cadence | Age | Overdue |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `.agent/AGENTS.md` | Agent Policy | .agent/AGENTS.md |  | 2026-01-19 | 90 | 91 | 1 |
| `.agent/prompts/hotswap-implementation.md` | Agent Policy | .agent/prompts |  | 2026-01-19 | 90 | 91 | 1 |
| `.agent/readme.md` | Agent Policy | .agent/readme.md |  | 2026-01-19 | 90 | 91 | 1 |
| `.agent/SOPs/deploy.md` | Active Guide | .agent/SOPs |  | 2026-01-19 | 90 | 91 | 1 |
| `.agent/SOPs/specs-and-research.md` | Active Guide | .agent/SOPs |  | 2026-01-19 | 90 | 91 | 1 |
| `.agent/task/1305-coordinator-live-provider-child-run-task-identity-and-delegation-guard-contract-alignment.md` | Task Mirror | .agent/task | 1305 | 2026-03-20 | 30 | 31 | 1 |
| `.agent/task/1306-coordinator-live-provider-child-run-test-stage-regression-follow-up.md` | Task Mirror | .agent/task | 1306 | 2026-03-20 | 30 | 31 | 1 |
| `.agent/task/1307-coordinator-live-provider-child-run-test-stage-terminal-completion-follow-up.md` | Task Mirror | .agent/task | 1307 | 2026-03-20 | 30 | 31 | 1 |
| `.agent/task/1308-coordinator-live-provider-child-run-cli-command-surface-subprocess-completion-follow-up.md` | Task Mirror | .agent/task | 1308 | 2026-03-20 | 30 | 31 | 1 |
| `.agent/task/1309-coordinator-live-provider-child-run-delegation-guard-launch-provenance-test-hermeticity-follow-up.md` | Task Mirror | .agent/task | 1309 | 2026-03-20 | 30 | 31 | 1 |
| `.agent/task/1310-coordinator-symphony-full-parity-audit-and-closure-truthfulness-reassessment.md` | Task Mirror | .agent/task | 1310 | 2026-03-20 | 30 | 31 | 1 |
| `.agent/task/templates/action-plan-template.md` | Agent Policy | .agent/task |  | 2026-01-19 | 90 | 91 | 1 |
| `.agent/task/templates/prd-template.md` | Agent Policy | .agent/task |  | 2026-01-19 | 90 | 91 | 1 |
| `.agent/task/templates/tasks-template.md` | Agent Policy | .agent/task |  | 2026-01-19 | 90 | 91 | 1 |
| `.agent/task/templates/tech-spec-template.md` | Agent Policy | .agent/task |  | 2026-01-19 | 90 | 91 | 1 |
| `docs/ACTION_PLAN-coordinator-live-provider-child-run-cli-command-surface-subprocess-completion-follow-up.md` | Task Packet | docs/ACTION_PLAN-* |  | 2026-03-20 | 30 | 31 | 1 |
| `docs/ACTION_PLAN-coordinator-live-provider-child-run-delegation-guard-launch-provenance-test-hermeticity-follow-up.md` | Task Packet | docs/ACTION_PLAN-* |  | 2026-03-20 | 30 | 31 | 1 |
| `docs/ACTION_PLAN-coordinator-live-provider-child-run-task-identity-and-delegation-guard-contract-alignment.md` | Task Packet | docs/ACTION_PLAN-* |  | 2026-03-20 | 30 | 31 | 1 |
| `docs/ACTION_PLAN-coordinator-live-provider-child-run-test-stage-regression-follow-up.md` | Task Packet | docs/ACTION_PLAN-* |  | 2026-03-20 | 30 | 31 | 1 |
| `docs/ACTION_PLAN-coordinator-live-provider-child-run-test-stage-terminal-completion-follow-up.md` | Task Packet | docs/ACTION_PLAN-* |  | 2026-03-20 | 30 | 31 | 1 |
| `docs/ACTION_PLAN-coordinator-symphony-full-parity-audit-and-closure-truthfulness-reassessment.md` | Task Packet | docs/ACTION_PLAN-* |  | 2026-03-20 | 30 | 31 | 1 |
| `docs/ACTION_PLAN-standalone-review-docs-first-ship.md` | Task Packet | docs/ACTION_PLAN-* |  | 2026-01-19 | 90 | 91 | 1 |
| `docs/delegation-runner-workflow.md` | Active Guide | docs/delegation-runner-workflow.md |  | 2026-01-19 | 90 | 91 | 1 |
| `docs/findings/1305-live-provider-child-run-task-identity-and-delegation-guard-contract-alignment-deliberation.md` | Report Only | docs/findings | 1305 | 2026-03-20 | 30 | 31 | 1 |
| `docs/findings/1306-live-provider-child-run-test-stage-regression-follow-up-deliberation.md` | Report Only | docs/findings | 1306 | 2026-03-20 | 30 | 31 | 1 |
| `docs/findings/1307-live-provider-child-run-test-stage-terminal-completion-follow-up-deliberation.md` | Report Only | docs/findings | 1307 | 2026-03-20 | 30 | 31 | 1 |
| `docs/findings/1308-live-provider-child-run-cli-command-surface-subprocess-completion-follow-up-deliberation.md` | Report Only | docs/findings | 1308 | 2026-03-20 | 30 | 31 | 1 |
| `docs/findings/1309-live-provider-child-run-delegation-guard-launch-provenance-test-hermeticity-follow-up-deliberation.md` | Report Only | docs/findings | 1309 | 2026-03-20 | 30 | 31 | 1 |
| `docs/findings/1310-symphony-full-parity-audit-and-closure-truthfulness-reassessment-deliberation.md` | Report Only | docs/findings | 1310 | 2026-03-20 | 30 | 31 | 1 |
| `docs/findings/1311-symphony-full-parity-hardening-and-closure-deliberation.md` | Report Only | docs/findings | 1311 | 2026-03-20 | 30 | 31 | 1 |
| `docs/guides/instructions.md` | Active Guide | docs/guides |  | 2026-01-19 | 90 | 91 | 1 |
| `docs/PRD-coordinator-live-provider-child-run-cli-command-surface-subprocess-completion-follow-up.md` | Task Packet | docs/PRD-* |  | 2026-03-20 | 30 | 31 | 1 |
| `docs/PRD-coordinator-live-provider-child-run-delegation-guard-launch-provenance-test-hermeticity-follow-up.md` | Task Packet | docs/PRD-* |  | 2026-03-20 | 30 | 31 | 1 |
| `docs/PRD-coordinator-live-provider-child-run-task-identity-and-delegation-guard-contract-alignment.md` | Task Packet | docs/PRD-* |  | 2026-03-20 | 30 | 31 | 1 |
| `docs/PRD-coordinator-live-provider-child-run-test-stage-regression-follow-up.md` | Task Packet | docs/PRD-* |  | 2026-03-20 | 30 | 31 | 1 |
| `docs/PRD-coordinator-live-provider-child-run-test-stage-terminal-completion-follow-up.md` | Task Packet | docs/PRD-* |  | 2026-03-20 | 30 | 31 | 1 |
| `docs/PRD-coordinator-symphony-full-parity-audit-and-closure-truthfulness-reassessment.md` | Task Packet | docs/PRD-* |  | 2026-03-20 | 30 | 31 | 1 |
| `docs/PRD-delegation-autonomy-platform.md` | Task Packet | docs/PRD-* |  | 2026-01-19 | 90 | 91 | 1 |
| `docs/PRD-delegation-mcp-framing-compat-fix.md` | Task Packet | docs/PRD-* |  | 2026-01-19 | 90 | 91 | 1 |
| `docs/PRD-standalone-review-docs-first-ship.md` | Task Packet | docs/PRD-* |  | 2026-01-19 | 90 | 91 | 1 |
| `docs/TECH_SPEC-coordinator-live-provider-child-run-cli-command-surface-subprocess-completion-follow-up.md` | Task Packet | docs/TECH_SPEC-* |  | 2026-03-20 | 30 | 31 | 1 |
| `docs/TECH_SPEC-coordinator-live-provider-child-run-delegation-guard-launch-provenance-test-hermeticity-follow-up.md` | Task Packet | docs/TECH_SPEC-* |  | 2026-03-20 | 30 | 31 | 1 |
| `docs/TECH_SPEC-coordinator-live-provider-child-run-task-identity-and-delegation-guard-contract-alignment.md` | Task Packet | docs/TECH_SPEC-* |  | 2026-03-20 | 30 | 31 | 1 |
| `docs/TECH_SPEC-coordinator-live-provider-child-run-test-stage-regression-follow-up.md` | Task Packet | docs/TECH_SPEC-* |  | 2026-03-20 | 30 | 31 | 1 |
| `docs/TECH_SPEC-coordinator-live-provider-child-run-test-stage-terminal-completion-follow-up.md` | Task Packet | docs/TECH_SPEC-* |  | 2026-03-20 | 30 | 31 | 1 |
| `docs/TECH_SPEC-coordinator-symphony-full-parity-audit-and-closure-truthfulness-reassessment.md` | Task Packet | docs/TECH_SPEC-* |  | 2026-03-20 | 30 | 31 | 1 |
| `docs/TECH_SPEC-coordinator-symphony-parity-linear-autonomous-intake-and-run-handoff.md` | Task Packet | docs/TECH_SPEC-* |  | 2026-03-20 | 30 | 31 | 1 |
| `docs/TECH_SPEC-delegation-autonomy-platform.md` | Task Packet | docs/TECH_SPEC-* |  | 2026-01-19 | 90 | 91 | 1 |
| `docs/TECH_SPEC-standalone-review-docs-first-ship.md` | Task Packet | docs/TECH_SPEC-* |  | 2026-01-19 | 90 | 91 | 1 |
| `skills/docs-first/SKILL.md` | Shipped Skill | skills/docs-first |  | 2026-01-19 | 90 | 91 | 1 |
| `skills/standalone-review/SKILL.md` | Shipped Skill | skills/standalone-review |  | 2026-01-19 | 90 | 91 | 1 |
| `tasks/specs/0940-delegation-autonomy-platform.md` | Task Packet | tasks/specs | 0940 | 2026-01-19 | 90 | 91 | 1 |
| `tasks/specs/1303-coordinator-symphony-parity-linear-autonomous-intake-and-run-handoff.md` | Task Packet | tasks/specs | 1303 | 2026-03-20 | 30 | 31 | 1 |
| `tasks/specs/1305-coordinator-live-provider-child-run-task-identity-and-delegation-guard-contract-alignment.md` | Task Packet | tasks/specs | 1305 | 2026-03-20 | 30 | 31 | 1 |
| `tasks/specs/1306-coordinator-live-provider-child-run-test-stage-regression-follow-up.md` | Task Packet | tasks/specs | 1306 | 2026-03-20 | 30 | 31 | 1 |
| `tasks/specs/1307-coordinator-live-provider-child-run-test-stage-terminal-completion-follow-up.md` | Task Packet | tasks/specs | 1307 | 2026-03-20 | 30 | 31 | 1 |
| `tasks/specs/1308-coordinator-live-provider-child-run-cli-command-surface-subprocess-completion-follow-up.md` | Task Packet | tasks/specs | 1308 | 2026-03-20 | 30 | 31 | 1 |
| `tasks/specs/1309-coordinator-live-provider-child-run-delegation-guard-launch-provenance-test-hermeticity-follow-up.md` | Task Packet | tasks/specs | 1309 | 2026-03-20 | 30 | 31 | 1 |
| `tasks/specs/1310-coordinator-symphony-full-parity-audit-and-closure-truthfulness-reassessment.md` | Task Packet | tasks/specs | 1310 | 2026-03-20 | 30 | 31 | 1 |
| `tasks/specs/README.md` | Task Packet | tasks/specs |  | 2026-01-19 | 90 | 91 | 1 |
| `tasks/tasks-1305-coordinator-live-provider-child-run-task-identity-and-delegation-guard-contract-alignment.md` | Task Packet | tasks/tasks-* | 1305 | 2026-03-20 | 30 | 31 | 1 |
| `tasks/tasks-1306-coordinator-live-provider-child-run-test-stage-regression-follow-up.md` | Task Packet | tasks/tasks-* | 1306 | 2026-03-20 | 30 | 31 | 1 |
| `tasks/tasks-1307-coordinator-live-provider-child-run-test-stage-terminal-completion-follow-up.md` | Task Packet | tasks/tasks-* | 1307 | 2026-03-20 | 30 | 31 | 1 |
| `tasks/tasks-1308-coordinator-live-provider-child-run-cli-command-surface-subprocess-completion-follow-up.md` | Task Packet | tasks/tasks-* | 1308 | 2026-03-20 | 30 | 31 | 1 |
| `tasks/tasks-1309-coordinator-live-provider-child-run-delegation-guard-launch-provenance-test-hermeticity-follow-up.md` | Task Packet | tasks/tasks-* | 1309 | 2026-03-20 | 30 | 31 | 1 |
| `tasks/tasks-1310-coordinator-symphony-full-parity-audit-and-closure-truthfulness-reassessment.md` | Task Packet | tasks/tasks-* | 1310 | 2026-03-20 | 30 | 31 | 1 |

## Spec Frontmatter Exact Paths

| Path | Disposition |
| --- | --- |
| `tasks/specs/0940-delegation-autonomy-platform.md` | reviewed refresh to 2026-04-20 |
| `tasks/specs/0969-playwright-context-subagent-guardrails.md` | reviewed refresh to 2026-04-20 |
| `tasks/specs/1303-coordinator-symphony-parity-linear-autonomous-intake-and-run-handoff.md` | reviewed refresh to 2026-04-20 |
| `tasks/specs/1305-coordinator-live-provider-child-run-task-identity-and-delegation-guard-contract-alignment.md` | reviewed refresh to 2026-04-20 |
| `tasks/specs/1306-coordinator-live-provider-child-run-test-stage-regression-follow-up.md` | reviewed refresh to 2026-04-20 |
| `tasks/specs/1307-coordinator-live-provider-child-run-test-stage-terminal-completion-follow-up.md` | reviewed refresh to 2026-04-20 |
| `tasks/specs/1308-coordinator-live-provider-child-run-cli-command-surface-subprocess-completion-follow-up.md` | reviewed refresh to 2026-04-20 |
| `tasks/specs/1309-coordinator-live-provider-child-run-delegation-guard-launch-provenance-test-hermeticity-follow-up.md` | reviewed refresh to 2026-04-20 |
| `tasks/specs/1310-coordinator-symphony-full-parity-audit-and-closure-truthfulness-reassessment.md` | reviewed refresh to 2026-04-20 |

## Registry-Only Spec Directory Exact Paths

| Path | Disposition |
| --- | --- |
| `tasks/specs/README.md` | registry reviewed refresh to 2026-04-20; no frontmatter, excluded from `spec-guard` |

## CO-175 Rolling Cohort Exact Paths

| Path | Class | Family | Task | Last review | Cadence | Age | Overdue |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `.agent/task/1164-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction.md` | Task Mirror | .agent/task | 1164 | 2026-03-14 | 30 | 37 | 7 |
| `.agent/task/1165-coordinator-symphony-aligned-orchestrator-public-run-entry-bootstrap-and-handoff-reassessment.md` | Task Mirror | .agent/task | 1165 | 2026-03-14 | 30 | 37 | 7 |
| `.agent/task/1166-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-manifest-contract.md` | Task Mirror | .agent/task | 1166 | 2026-03-14 | 30 | 37 | 7 |
| `.agent/task/1167-coordinator-symphony-aligned-orchestrator-auto-scout-evidence-recorder-extraction.md` | Task Mirror | .agent/task | 1167 | 2026-03-14 | 30 | 37 | 7 |
| `.agent/task/1168-coordinator-symphony-aligned-orchestrator-start-resume-control-plane-launch-shell-extraction.md` | Task Mirror | .agent/task | 1168 | 2026-03-14 | 30 | 37 | 7 |
| `.agent/task/1169-coordinator-symphony-aligned-orchestrator-execution-routing-policy-splitting.md` | Task Mirror | .agent/task | 1169 | 2026-03-14 | 30 | 37 | 7 |
| `.agent/task/1170-coordinator-symphony-aligned-orchestrator-execution-routing-fallback-manifest-contract.md` | Task Mirror | .agent/task | 1170 | 2026-03-14 | 30 | 37 | 7 |
| `.agent/task/1171-coordinator-symphony-aligned-orchestrator-cloud-preflight-request-assembly-extraction.md` | Task Mirror | .agent/task | 1171 | 2026-03-14 | 30 | 37 | 7 |
| `.agent/task/1172-coordinator-symphony-aligned-orchestrator-shared-cloud-preflight-request-contract-extraction.md` | Task Mirror | .agent/task | 1172 | 2026-03-14 | 30 | 37 | 7 |
| `.agent/task/1173-coordinator-symphony-aligned-orchestrator-cloud-target-execution-request-contract-extraction.md` | Task Mirror | .agent/task | 1173 | 2026-03-14 | 30 | 37 | 7 |
| `.agent/task/1174-coordinator-symphony-aligned-orchestrator-cloud-target-missing-env-failure-contract-extraction.md` | Task Mirror | .agent/task | 1174 | 2026-03-14 | 30 | 37 | 7 |
| `.agent/task/1175-coordinator-symphony-aligned-orchestrator-cloud-target-running-state-and-update-shell-extraction.md` | Task Mirror | .agent/task | 1175 | 2026-03-14 | 30 | 37 | 7 |
| `.agent/task/1176-coordinator-symphony-aligned-orchestrator-cloud-target-completion-shell-extraction.md` | Task Mirror | .agent/task | 1176 | 2026-03-14 | 30 | 37 | 7 |
| `.agent/task/1177-coordinator-symphony-aligned-orchestrator-cloud-target-preflight-resolution-and-sibling-skip-shell-extraction.md` | Task Mirror | .agent/task | 1177 | 2026-03-14 | 30 | 37 | 7 |
| `.agent/task/1178-coordinator-symphony-aligned-orchestrator-cloud-execution-lifecycle-shell-extraction.md` | Task Mirror | .agent/task | 1178 | 2026-03-14 | 30 | 37 | 7 |
| `.agent/task/1179-coordinator-symphony-aligned-orchestrator-local-execution-lifecycle-shell-extraction.md` | Task Mirror | .agent/task | 1179 | 2026-03-14 | 30 | 37 | 7 |
| `.agent/task/1180-coordinator-symphony-aligned-orchestrator-execution-route-state-assembly-extraction.md` | Task Mirror | .agent/task | 1180 | 2026-03-14 | 30 | 37 | 7 |
| `.agent/task/1181-coordinator-symphony-aligned-orchestrator-cloud-route-preflight-and-reroute-shell-extraction.md` | Task Mirror | .agent/task | 1181 | 2026-03-14 | 30 | 37 | 7 |
| `.agent/task/1182-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction.md` | Task Mirror | .agent/task | 1182 | 2026-03-14 | 30 | 37 | 7 |
| `.agent/task/1183-coordinator-symphony-aligned-orchestrator-cloud-route-fallback-contract-extraction.md` | Task Mirror | .agent/task | 1183 | 2026-03-14 | 30 | 37 | 7 |
| `.agent/task/1184-coordinator-symphony-aligned-orchestrator-execution-routing-decision-shell-extraction.md` | Task Mirror | .agent/task | 1184 | 2026-03-14 | 30 | 37 | 7 |
| `.agent/task/1185-coordinator-symphony-aligned-orchestrator-execution-mode-policy-extraction.md` | Task Mirror | .agent/task | 1185 | 2026-03-14 | 30 | 37 | 7 |
| `.agent/task/1186-coordinator-symphony-aligned-orchestrator-execution-route-adapter-shell-extraction.md` | Task Mirror | .agent/task | 1186 | 2026-03-14 | 30 | 37 | 7 |
| `.agent/task/1187-coordinator-symphony-aligned-orchestrator-plan-target-tracker-shell-extraction.md` | Task Mirror | .agent/task | 1187 | 2026-03-14 | 30 | 37 | 7 |
| `.agent/task/1188-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-tracker-delegation.md` | Task Mirror | .agent/task | 1188 | 2026-03-14 | 30 | 37 | 7 |
| `.agent/task/1189-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-shell-extraction.md` | Task Mirror | .agent/task | 1189 | 2026-03-14 | 30 | 37 | 7 |
| `.agent/task/1190-coordinator-symphony-aligned-orchestrator-run-lifecycle-orchestration-shell-extraction.md` | Task Mirror | .agent/task | 1190 | 2026-03-14 | 30 | 37 | 7 |
| `.agent/task/1191-coordinator-symphony-aligned-orchestrator-cloud-execution-lifecycle-shell-extraction.md` | Task Mirror | .agent/task | 1191 | 2026-03-14 | 30 | 37 | 7 |
| `.agent/task/1192-coordinator-symphony-aligned-orchestrator-pipeline-route-entry-shell-extraction.md` | Task Mirror | .agent/task | 1192 | 2026-03-14 | 30 | 37 | 7 |
| `.agent/task/1193-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction.md` | Task Mirror | .agent/task | 1193 | 2026-03-14 | 30 | 37 | 7 |
| `.agent/task/1194-coordinator-symphony-aligned-orchestrator-start-preparation-shell-extraction.md` | Task Mirror | .agent/task | 1194 | 2026-03-14 | 30 | 37 | 7 |
| `.agent/task/1195-coordinator-symphony-aligned-orchestrator-resume-preparation-shell-extraction.md` | Task Mirror | .agent/task | 1195 | 2026-03-14 | 30 | 37 | 7 |
| `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-auto-scout-evidence-recorder-extraction.md` | Task Packet | docs/ACTION_PLAN-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-cloud-execution-lifecycle-shell-extraction.md` | Task Packet | docs/ACTION_PLAN-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-cloud-preflight-request-assembly-extraction.md` | Task Packet | docs/ACTION_PLAN-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-cloud-route-fallback-contract-extraction.md` | Task Packet | docs/ACTION_PLAN-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-cloud-route-preflight-and-reroute-shell-extraction.md` | Task Packet | docs/ACTION_PLAN-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-cloud-target-completion-shell-extraction.md` | Task Packet | docs/ACTION_PLAN-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-cloud-target-execution-request-contract-extraction.md` | Task Packet | docs/ACTION_PLAN-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-cloud-target-missing-env-failure-contract-extraction.md` | Task Packet | docs/ACTION_PLAN-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-cloud-target-preflight-resolution-and-sibling-skip-shell-extraction.md` | Task Packet | docs/ACTION_PLAN-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-cloud-target-running-state-and-update-shell-extraction.md` | Task Packet | docs/ACTION_PLAN-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-execution-mode-policy-extraction.md` | Task Packet | docs/ACTION_PLAN-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-execution-route-adapter-shell-extraction.md` | Task Packet | docs/ACTION_PLAN-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-execution-route-state-assembly-extraction.md` | Task Packet | docs/ACTION_PLAN-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-execution-routing-decision-shell-extraction.md` | Task Packet | docs/ACTION_PLAN-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-execution-routing-fallback-manifest-contract.md` | Task Packet | docs/ACTION_PLAN-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-execution-routing-policy-splitting.md` | Task Packet | docs/ACTION_PLAN-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-local-execution-lifecycle-shell-extraction.md` | Task Packet | docs/ACTION_PLAN-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction.md` | Task Packet | docs/ACTION_PLAN-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction.md` | Task Packet | docs/ACTION_PLAN-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-pipeline-route-entry-shell-extraction.md` | Task Packet | docs/ACTION_PLAN-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-plan-target-tracker-shell-extraction.md` | Task Packet | docs/ACTION_PLAN-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-public-run-entry-bootstrap-and-handoff-reassessment.md` | Task Packet | docs/ACTION_PLAN-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-manifest-contract.md` | Task Packet | docs/ACTION_PLAN-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-resume-preparation-shell-extraction.md` | Task Packet | docs/ACTION_PLAN-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-run-lifecycle-orchestration-shell-extraction.md` | Task Packet | docs/ACTION_PLAN-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-shell-extraction.md` | Task Packet | docs/ACTION_PLAN-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-tracker-delegation.md` | Task Packet | docs/ACTION_PLAN-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-shared-cloud-preflight-request-contract-extraction.md` | Task Packet | docs/ACTION_PLAN-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-start-preparation-shell-extraction.md` | Task Packet | docs/ACTION_PLAN-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-start-resume-control-plane-launch-shell-extraction.md` | Task Packet | docs/ACTION_PLAN-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-with-control-plane-lifecycle-shell-extraction.md` | Task Packet | docs/ACTION_PLAN-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/findings/1164-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction-deliberation.md` | Report Only | docs/findings | 1164 | 2026-03-14 | 30 | 37 | 7 |
| `docs/findings/1165-orchestrator-public-run-entry-bootstrap-and-handoff-reassessment-deliberation.md` | Report Only | docs/findings | 1165 | 2026-03-14 | 30 | 37 | 7 |
| `docs/findings/1166-orchestrator-resume-pre-start-failure-manifest-contract-deliberation.md` | Report Only | docs/findings | 1166 | 2026-03-14 | 30 | 37 | 7 |
| `docs/findings/1167-orchestrator-auto-scout-evidence-recorder-extraction-deliberation.md` | Report Only | docs/findings | 1167 | 2026-03-14 | 30 | 37 | 7 |
| `docs/findings/1168-orchestrator-start-resume-control-plane-launch-shell-extraction-deliberation.md` | Report Only | docs/findings | 1168 | 2026-03-14 | 30 | 37 | 7 |
| `docs/findings/1169-orchestrator-execution-routing-policy-splitting-deliberation.md` | Report Only | docs/findings | 1169 | 2026-03-14 | 30 | 37 | 7 |
| `docs/findings/1170-orchestrator-execution-routing-fallback-manifest-contract-deliberation.md` | Report Only | docs/findings | 1170 | 2026-03-14 | 30 | 37 | 7 |
| `docs/findings/1171-orchestrator-cloud-preflight-request-assembly-extraction-deliberation.md` | Report Only | docs/findings | 1171 | 2026-03-14 | 30 | 37 | 7 |
| `docs/findings/1172-orchestrator-shared-cloud-preflight-request-contract-extraction-deliberation.md` | Report Only | docs/findings | 1172 | 2026-03-14 | 30 | 37 | 7 |
| `docs/findings/1173-orchestrator-cloud-target-execution-request-contract-extraction-deliberation.md` | Report Only | docs/findings | 1173 | 2026-03-14 | 30 | 37 | 7 |
| `docs/findings/1174-orchestrator-cloud-target-missing-env-failure-contract-extraction-deliberation.md` | Report Only | docs/findings | 1174 | 2026-03-14 | 30 | 37 | 7 |
| `docs/findings/1175-orchestrator-cloud-target-running-state-and-update-shell-extraction-deliberation.md` | Report Only | docs/findings | 1175 | 2026-03-14 | 30 | 37 | 7 |
| `docs/findings/1176-orchestrator-cloud-target-completion-shell-extraction-deliberation.md` | Report Only | docs/findings | 1176 | 2026-03-14 | 30 | 37 | 7 |
| `docs/findings/1177-orchestrator-cloud-target-preflight-resolution-and-sibling-skip-shell-extraction-deliberation.md` | Report Only | docs/findings | 1177 | 2026-03-14 | 30 | 37 | 7 |
| `docs/findings/1178-orchestrator-cloud-execution-lifecycle-shell-extraction-deliberation.md` | Report Only | docs/findings | 1178 | 2026-03-14 | 30 | 37 | 7 |
| `docs/findings/1179-orchestrator-local-execution-lifecycle-shell-extraction-deliberation.md` | Report Only | docs/findings | 1179 | 2026-03-14 | 30 | 37 | 7 |
| `docs/findings/1180-orchestrator-execution-route-state-assembly-extraction-deliberation.md` | Report Only | docs/findings | 1180 | 2026-03-14 | 30 | 37 | 7 |
| `docs/findings/1181-orchestrator-cloud-route-preflight-and-reroute-shell-extraction-deliberation.md` | Report Only | docs/findings | 1181 | 2026-03-14 | 30 | 37 | 7 |
| `docs/findings/1182-orchestrator-local-route-shell-extraction-deliberation.md` | Report Only | docs/findings | 1182 | 2026-03-14 | 30 | 37 | 7 |
| `docs/findings/1183-orchestrator-cloud-route-fallback-contract-extraction-deliberation.md` | Report Only | docs/findings | 1183 | 2026-03-14 | 30 | 37 | 7 |
| `docs/findings/1184-orchestrator-execution-routing-decision-shell-extraction-deliberation.md` | Report Only | docs/findings | 1184 | 2026-03-14 | 30 | 37 | 7 |
| `docs/findings/1185-orchestrator-execution-mode-policy-extraction-deliberation.md` | Report Only | docs/findings | 1185 | 2026-03-14 | 30 | 37 | 7 |
| `docs/findings/1186-orchestrator-execution-route-adapter-shell-extraction-deliberation.md` | Report Only | docs/findings | 1186 | 2026-03-14 | 30 | 37 | 7 |
| `docs/findings/1187-orchestrator-plan-target-tracker-shell-extraction-deliberation.md` | Report Only | docs/findings | 1187 | 2026-03-14 | 30 | 37 | 7 |
| `docs/findings/1188-orchestrator-run-lifecycle-task-manager-tracker-delegation-deliberation.md` | Report Only | docs/findings | 1188 | 2026-03-14 | 30 | 37 | 7 |
| `docs/findings/1189-orchestrator-run-lifecycle-task-manager-shell-extraction-deliberation.md` | Report Only | docs/findings | 1189 | 2026-03-14 | 30 | 37 | 7 |
| `docs/findings/1190-orchestrator-run-lifecycle-orchestration-shell-extraction-deliberation.md` | Report Only | docs/findings | 1190 | 2026-03-14 | 30 | 37 | 7 |
| `docs/findings/1191-orchestrator-cloud-execution-lifecycle-shell-extraction-deliberation.md` | Report Only | docs/findings | 1191 | 2026-03-14 | 30 | 37 | 7 |
| `docs/findings/1192-orchestrator-pipeline-route-entry-shell-extraction-deliberation.md` | Report Only | docs/findings | 1192 | 2026-03-14 | 30 | 37 | 7 |
| `docs/findings/1193-orchestrator-control-plane-lifecycle-shell-extraction-deliberation.md` | Report Only | docs/findings | 1193 | 2026-03-14 | 30 | 37 | 7 |
| `docs/findings/1194-orchestrator-start-preparation-shell-extraction-deliberation.md` | Report Only | docs/findings | 1194 | 2026-03-14 | 30 | 37 | 7 |
| `docs/findings/1195-orchestrator-resume-preparation-shell-extraction-deliberation.md` | Report Only | docs/findings | 1195 | 2026-03-14 | 30 | 37 | 7 |
| `docs/PRD-coordinator-symphony-aligned-orchestrator-auto-scout-evidence-recorder-extraction.md` | Task Packet | docs/PRD-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/PRD-coordinator-symphony-aligned-orchestrator-cloud-execution-lifecycle-shell-extraction.md` | Task Packet | docs/PRD-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/PRD-coordinator-symphony-aligned-orchestrator-cloud-preflight-request-assembly-extraction.md` | Task Packet | docs/PRD-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/PRD-coordinator-symphony-aligned-orchestrator-cloud-route-fallback-contract-extraction.md` | Task Packet | docs/PRD-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/PRD-coordinator-symphony-aligned-orchestrator-cloud-route-preflight-and-reroute-shell-extraction.md` | Task Packet | docs/PRD-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/PRD-coordinator-symphony-aligned-orchestrator-cloud-target-completion-shell-extraction.md` | Task Packet | docs/PRD-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/PRD-coordinator-symphony-aligned-orchestrator-cloud-target-execution-request-contract-extraction.md` | Task Packet | docs/PRD-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/PRD-coordinator-symphony-aligned-orchestrator-cloud-target-missing-env-failure-contract-extraction.md` | Task Packet | docs/PRD-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/PRD-coordinator-symphony-aligned-orchestrator-cloud-target-preflight-resolution-and-sibling-skip-shell-extraction.md` | Task Packet | docs/PRD-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/PRD-coordinator-symphony-aligned-orchestrator-cloud-target-running-state-and-update-shell-extraction.md` | Task Packet | docs/PRD-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/PRD-coordinator-symphony-aligned-orchestrator-execution-mode-policy-extraction.md` | Task Packet | docs/PRD-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/PRD-coordinator-symphony-aligned-orchestrator-execution-route-adapter-shell-extraction.md` | Task Packet | docs/PRD-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/PRD-coordinator-symphony-aligned-orchestrator-execution-route-state-assembly-extraction.md` | Task Packet | docs/PRD-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/PRD-coordinator-symphony-aligned-orchestrator-execution-routing-decision-shell-extraction.md` | Task Packet | docs/PRD-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/PRD-coordinator-symphony-aligned-orchestrator-execution-routing-fallback-manifest-contract.md` | Task Packet | docs/PRD-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/PRD-coordinator-symphony-aligned-orchestrator-execution-routing-policy-splitting.md` | Task Packet | docs/PRD-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/PRD-coordinator-symphony-aligned-orchestrator-local-execution-lifecycle-shell-extraction.md` | Task Packet | docs/PRD-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/PRD-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction.md` | Task Packet | docs/PRD-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/PRD-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction.md` | Task Packet | docs/PRD-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/PRD-coordinator-symphony-aligned-orchestrator-pipeline-route-entry-shell-extraction.md` | Task Packet | docs/PRD-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/PRD-coordinator-symphony-aligned-orchestrator-plan-target-tracker-shell-extraction.md` | Task Packet | docs/PRD-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/PRD-coordinator-symphony-aligned-orchestrator-public-run-entry-bootstrap-and-handoff-reassessment.md` | Task Packet | docs/PRD-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/PRD-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-manifest-contract.md` | Task Packet | docs/PRD-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/PRD-coordinator-symphony-aligned-orchestrator-resume-preparation-shell-extraction.md` | Task Packet | docs/PRD-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/PRD-coordinator-symphony-aligned-orchestrator-run-lifecycle-orchestration-shell-extraction.md` | Task Packet | docs/PRD-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/PRD-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-shell-extraction.md` | Task Packet | docs/PRD-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/PRD-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-tracker-delegation.md` | Task Packet | docs/PRD-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/PRD-coordinator-symphony-aligned-orchestrator-shared-cloud-preflight-request-contract-extraction.md` | Task Packet | docs/PRD-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/PRD-coordinator-symphony-aligned-orchestrator-start-preparation-shell-extraction.md` | Task Packet | docs/PRD-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/PRD-coordinator-symphony-aligned-orchestrator-start-resume-control-plane-launch-shell-extraction.md` | Task Packet | docs/PRD-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/PRD-coordinator-symphony-aligned-orchestrator-with-control-plane-lifecycle-shell-extraction.md` | Task Packet | docs/PRD-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-auto-scout-evidence-recorder-extraction.md` | Task Packet | docs/TECH_SPEC-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-cloud-execution-lifecycle-shell-extraction.md` | Task Packet | docs/TECH_SPEC-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-cloud-preflight-request-assembly-extraction.md` | Task Packet | docs/TECH_SPEC-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-cloud-route-fallback-contract-extraction.md` | Task Packet | docs/TECH_SPEC-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-cloud-route-preflight-and-reroute-shell-extraction.md` | Task Packet | docs/TECH_SPEC-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-cloud-target-completion-shell-extraction.md` | Task Packet | docs/TECH_SPEC-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-cloud-target-execution-request-contract-extraction.md` | Task Packet | docs/TECH_SPEC-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-cloud-target-missing-env-failure-contract-extraction.md` | Task Packet | docs/TECH_SPEC-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-cloud-target-preflight-resolution-and-sibling-skip-shell-extraction.md` | Task Packet | docs/TECH_SPEC-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-cloud-target-running-state-and-update-shell-extraction.md` | Task Packet | docs/TECH_SPEC-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-execution-mode-policy-extraction.md` | Task Packet | docs/TECH_SPEC-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-execution-route-adapter-shell-extraction.md` | Task Packet | docs/TECH_SPEC-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-execution-route-state-assembly-extraction.md` | Task Packet | docs/TECH_SPEC-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-execution-routing-decision-shell-extraction.md` | Task Packet | docs/TECH_SPEC-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-execution-routing-fallback-manifest-contract.md` | Task Packet | docs/TECH_SPEC-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-execution-routing-policy-splitting.md` | Task Packet | docs/TECH_SPEC-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-local-execution-lifecycle-shell-extraction.md` | Task Packet | docs/TECH_SPEC-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction.md` | Task Packet | docs/TECH_SPEC-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction.md` | Task Packet | docs/TECH_SPEC-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-pipeline-route-entry-shell-extraction.md` | Task Packet | docs/TECH_SPEC-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-plan-target-tracker-shell-extraction.md` | Task Packet | docs/TECH_SPEC-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-public-run-entry-bootstrap-and-handoff-reassessment.md` | Task Packet | docs/TECH_SPEC-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-manifest-contract.md` | Task Packet | docs/TECH_SPEC-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-resume-preparation-shell-extraction.md` | Task Packet | docs/TECH_SPEC-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-run-lifecycle-orchestration-shell-extraction.md` | Task Packet | docs/TECH_SPEC-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-shell-extraction.md` | Task Packet | docs/TECH_SPEC-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-tracker-delegation.md` | Task Packet | docs/TECH_SPEC-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-shared-cloud-preflight-request-contract-extraction.md` | Task Packet | docs/TECH_SPEC-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-start-preparation-shell-extraction.md` | Task Packet | docs/TECH_SPEC-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-start-resume-control-plane-launch-shell-extraction.md` | Task Packet | docs/TECH_SPEC-* |  | 2026-03-14 | 30 | 37 | 7 |
| `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-with-control-plane-lifecycle-shell-extraction.md` | Task Packet | docs/TECH_SPEC-* |  | 2026-03-14 | 30 | 37 | 7 |
| `tasks/specs/1164-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction.md` | Task Packet | tasks/specs | 1164 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/specs/1165-coordinator-symphony-aligned-orchestrator-public-run-entry-bootstrap-and-handoff-reassessment.md` | Task Packet | tasks/specs | 1165 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/specs/1166-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-manifest-contract.md` | Task Packet | tasks/specs | 1166 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/specs/1167-coordinator-symphony-aligned-orchestrator-auto-scout-evidence-recorder-extraction.md` | Task Packet | tasks/specs | 1167 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/specs/1168-coordinator-symphony-aligned-orchestrator-start-resume-control-plane-launch-shell-extraction.md` | Task Packet | tasks/specs | 1168 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/specs/1169-coordinator-symphony-aligned-orchestrator-execution-routing-policy-splitting.md` | Task Packet | tasks/specs | 1169 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/specs/1170-coordinator-symphony-aligned-orchestrator-execution-routing-fallback-manifest-contract.md` | Task Packet | tasks/specs | 1170 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/specs/1171-coordinator-symphony-aligned-orchestrator-cloud-preflight-request-assembly-extraction.md` | Task Packet | tasks/specs | 1171 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/specs/1172-coordinator-symphony-aligned-orchestrator-shared-cloud-preflight-request-contract-extraction.md` | Task Packet | tasks/specs | 1172 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/specs/1173-coordinator-symphony-aligned-orchestrator-cloud-target-execution-request-contract-extraction.md` | Task Packet | tasks/specs | 1173 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/specs/1174-coordinator-symphony-aligned-orchestrator-cloud-target-missing-env-failure-contract-extraction.md` | Task Packet | tasks/specs | 1174 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/specs/1175-coordinator-symphony-aligned-orchestrator-cloud-target-running-state-and-update-shell-extraction.md` | Task Packet | tasks/specs | 1175 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/specs/1176-coordinator-symphony-aligned-orchestrator-cloud-target-completion-shell-extraction.md` | Task Packet | tasks/specs | 1176 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/specs/1177-coordinator-symphony-aligned-orchestrator-cloud-target-preflight-resolution-and-sibling-skip-shell-extraction.md` | Task Packet | tasks/specs | 1177 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/specs/1178-coordinator-symphony-aligned-orchestrator-cloud-execution-lifecycle-shell-extraction.md` | Task Packet | tasks/specs | 1178 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/specs/1179-coordinator-symphony-aligned-orchestrator-local-execution-lifecycle-shell-extraction.md` | Task Packet | tasks/specs | 1179 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/specs/1180-coordinator-symphony-aligned-orchestrator-execution-route-state-assembly-extraction.md` | Task Packet | tasks/specs | 1180 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/specs/1181-coordinator-symphony-aligned-orchestrator-cloud-route-preflight-and-reroute-shell-extraction.md` | Task Packet | tasks/specs | 1181 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/specs/1182-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction.md` | Task Packet | tasks/specs | 1182 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/specs/1183-coordinator-symphony-aligned-orchestrator-cloud-route-fallback-contract-extraction.md` | Task Packet | tasks/specs | 1183 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/specs/1184-coordinator-symphony-aligned-orchestrator-execution-routing-decision-shell-extraction.md` | Task Packet | tasks/specs | 1184 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/specs/1185-coordinator-symphony-aligned-orchestrator-execution-mode-policy-extraction.md` | Task Packet | tasks/specs | 1185 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/specs/1186-coordinator-symphony-aligned-orchestrator-execution-route-adapter-shell-extraction.md` | Task Packet | tasks/specs | 1186 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/specs/1187-coordinator-symphony-aligned-orchestrator-plan-target-tracker-shell-extraction.md` | Task Packet | tasks/specs | 1187 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/specs/1188-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-tracker-delegation.md` | Task Packet | tasks/specs | 1188 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/specs/1189-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-shell-extraction.md` | Task Packet | tasks/specs | 1189 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/specs/1190-coordinator-symphony-aligned-orchestrator-run-lifecycle-orchestration-shell-extraction.md` | Task Packet | tasks/specs | 1190 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/specs/1191-coordinator-symphony-aligned-orchestrator-cloud-execution-lifecycle-shell-extraction.md` | Task Packet | tasks/specs | 1191 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/specs/1192-coordinator-symphony-aligned-orchestrator-pipeline-route-entry-shell-extraction.md` | Task Packet | tasks/specs | 1192 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/specs/1193-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction.md` | Task Packet | tasks/specs | 1193 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/specs/1194-coordinator-symphony-aligned-orchestrator-start-preparation-shell-extraction.md` | Task Packet | tasks/specs | 1194 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/specs/1195-coordinator-symphony-aligned-orchestrator-resume-preparation-shell-extraction.md` | Task Packet | tasks/specs | 1195 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/tasks-1164-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction.md` | Task Packet | tasks/tasks-* | 1164 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/tasks-1165-coordinator-symphony-aligned-orchestrator-public-run-entry-bootstrap-and-handoff-reassessment.md` | Task Packet | tasks/tasks-* | 1165 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/tasks-1166-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-manifest-contract.md` | Task Packet | tasks/tasks-* | 1166 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/tasks-1167-coordinator-symphony-aligned-orchestrator-auto-scout-evidence-recorder-extraction.md` | Task Packet | tasks/tasks-* | 1167 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/tasks-1168-coordinator-symphony-aligned-orchestrator-start-resume-control-plane-launch-shell-extraction.md` | Task Packet | tasks/tasks-* | 1168 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/tasks-1169-coordinator-symphony-aligned-orchestrator-execution-routing-policy-splitting.md` | Task Packet | tasks/tasks-* | 1169 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/tasks-1170-coordinator-symphony-aligned-orchestrator-execution-routing-fallback-manifest-contract.md` | Task Packet | tasks/tasks-* | 1170 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/tasks-1171-coordinator-symphony-aligned-orchestrator-cloud-preflight-request-assembly-extraction.md` | Task Packet | tasks/tasks-* | 1171 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/tasks-1172-coordinator-symphony-aligned-orchestrator-shared-cloud-preflight-request-contract-extraction.md` | Task Packet | tasks/tasks-* | 1172 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/tasks-1173-coordinator-symphony-aligned-orchestrator-cloud-target-execution-request-contract-extraction.md` | Task Packet | tasks/tasks-* | 1173 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/tasks-1174-coordinator-symphony-aligned-orchestrator-cloud-target-missing-env-failure-contract-extraction.md` | Task Packet | tasks/tasks-* | 1174 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/tasks-1175-coordinator-symphony-aligned-orchestrator-cloud-target-running-state-and-update-shell-extraction.md` | Task Packet | tasks/tasks-* | 1175 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/tasks-1176-coordinator-symphony-aligned-orchestrator-cloud-target-completion-shell-extraction.md` | Task Packet | tasks/tasks-* | 1176 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/tasks-1177-coordinator-symphony-aligned-orchestrator-cloud-target-preflight-resolution-and-sibling-skip-shell-extraction.md` | Task Packet | tasks/tasks-* | 1177 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/tasks-1178-coordinator-symphony-aligned-orchestrator-cloud-execution-lifecycle-shell-extraction.md` | Task Packet | tasks/tasks-* | 1178 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/tasks-1179-coordinator-symphony-aligned-orchestrator-local-execution-lifecycle-shell-extraction.md` | Task Packet | tasks/tasks-* | 1179 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/tasks-1180-coordinator-symphony-aligned-orchestrator-execution-route-state-assembly-extraction.md` | Task Packet | tasks/tasks-* | 1180 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/tasks-1181-coordinator-symphony-aligned-orchestrator-cloud-route-preflight-and-reroute-shell-extraction.md` | Task Packet | tasks/tasks-* | 1181 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/tasks-1182-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction.md` | Task Packet | tasks/tasks-* | 1182 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/tasks-1183-coordinator-symphony-aligned-orchestrator-cloud-route-fallback-contract-extraction.md` | Task Packet | tasks/tasks-* | 1183 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/tasks-1184-coordinator-symphony-aligned-orchestrator-execution-routing-decision-shell-extraction.md` | Task Packet | tasks/tasks-* | 1184 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/tasks-1185-coordinator-symphony-aligned-orchestrator-execution-mode-policy-extraction.md` | Task Packet | tasks/tasks-* | 1185 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/tasks-1186-coordinator-symphony-aligned-orchestrator-execution-route-adapter-shell-extraction.md` | Task Packet | tasks/tasks-* | 1186 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/tasks-1187-coordinator-symphony-aligned-orchestrator-plan-target-tracker-shell-extraction.md` | Task Packet | tasks/tasks-* | 1187 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/tasks-1188-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-tracker-delegation.md` | Task Packet | tasks/tasks-* | 1188 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/tasks-1189-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-shell-extraction.md` | Task Packet | tasks/tasks-* | 1189 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/tasks-1190-coordinator-symphony-aligned-orchestrator-run-lifecycle-orchestration-shell-extraction.md` | Task Packet | tasks/tasks-* | 1190 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/tasks-1191-coordinator-symphony-aligned-orchestrator-cloud-execution-lifecycle-shell-extraction.md` | Task Packet | tasks/tasks-* | 1191 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/tasks-1192-coordinator-symphony-aligned-orchestrator-pipeline-route-entry-shell-extraction.md` | Task Packet | tasks/tasks-* | 1192 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/tasks-1193-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction.md` | Task Packet | tasks/tasks-* | 1193 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/tasks-1194-coordinator-symphony-aligned-orchestrator-start-preparation-shell-extraction.md` | Task Packet | tasks/tasks-* | 1194 | 2026-03-14 | 30 | 37 | 7 |
| `tasks/tasks-1195-coordinator-symphony-aligned-orchestrator-resume-preparation-shell-extraction.md` | Task Packet | tasks/tasks-* | 1195 | 2026-03-14 | 30 | 37 | 7 |
