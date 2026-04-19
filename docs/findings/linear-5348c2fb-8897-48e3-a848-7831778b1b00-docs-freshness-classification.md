# CO-254 Apr 19 Docs And Spec Freshness Classification

## Source Artifacts
- Command: `MCP_RUNNER_TASK_ID=linear-5348c2fb-8897-48e3-a848-7831778b1b00 npm run docs:freshness`
- Preserved log: `out/linear-5348c2fb-8897-48e3-a848-7831778b1b00/before/docs-freshness.log`
- Preserved report: `out/linear-5348c2fb-8897-48e3-a848-7831778b1b00/before/docs-freshness.json`
- Command: `node scripts/spec-guard.mjs --dry-run`
- Preserved log: `out/linear-5348c2fb-8897-48e3-a848-7831778b1b00/before/spec-guard.log`
- Baseline ref: `origin/main` at `258581dea`
- Workpad: Linear comment `dd9afa74-1a3f-42c8-80fc-c2296d5023ad`

## Gate Result Before Fix
- `docs:freshness`: failed with `47` blocking stale docs and `221` CO-175 rolling rows.
- Totals: `4174` docs, `4177` registry entries.
- Missing/invalid drift: `0` missing registry entries, `0` missing-on-disk entries, `0` invalid entries, and `0` uncatalogued docs.
- Class split: `Task Packet=31`, `Task Mirror=6`, `Report Only=6`, `Active Guide=2`, `Public Guide=2`.
- `spec-guard --dry-run`: printed `17` stale active spec frontmatter rows. Dry-run exited `0` by design while preserving the failure text.
- Changed-path impact before fix: the branch had no tracked source/docs diff when the before artifacts were captured. The stale set is repo-wide baseline debt, not CO-231 Doctor diff-local debt.

## Relationship To Existing Owners
- CO-175 remains the owner of the still-visible rolling cohort: `221` rows, `last_review=2026-03-14`, lineage `1164-1195`, expires after `2026-04-20`.
- CO-239 remains complete for the Apr 18 Mar 18 `1289-1298` cohort. The Apr 19 stale set is a new rollover with `last_review=2026-03-19` plus legacy 90/14-day docs.
- CO-231 remains Doctor-scoped. Its validation can cite CO-254 for the repo-wide freshness baseline instead of absorbing this work.

## Stale Docs By Date

| Last review / cadence | Count | Classes | Disposition |
| --- | ---: | --- | --- |
| `2026-03-19` / `30` days | 40 | Task Packet, Task Mirror, Report Only | Reviewed refresh to `2026-04-19` |
| `2026-01-18` / `90` days | 5 | Task Packet, Active Guide | Reviewed refresh to `2026-04-19` |
| `2026-04-04` / `14` days | 2 | Public Guide | Reviewed refresh to `2026-04-19` |

## Stale Docs By Class

| Class | Count | Outcome |
| --- | ---: | --- |
| Task Packet | 31 | Refresh after this review |
| Task Mirror | 6 | Refresh after this review |
| Report Only | 6 | Refresh after this review |
| Active Guide | 2 | Refresh after this review |
| Public Guide | 2 | Refresh after this review |

## Path Family Breakdown

| Path family | Count | Outcome |
| --- | ---: | --- |
| `.agent/task` | 6 | Refresh |
| `docs/ACTION_PLAN-*` | 7 | Refresh |
| `docs/findings` | 6 | Refresh |
| `docs/PRD-*` | 7 | Refresh |
| `docs/TECH_SPEC-*` | 6 | Refresh |
| `docs/public` | 2 | Refresh |
| `docs/diagnostics-prompt-guide.md` | 1 | Refresh |
| `docs/FOLLOWUP-0951-true-rlm-symbolic.md` | 1 | Refresh |
| `tasks/specs` | 5 | Refresh |
| `tasks/tasks-*` | 6 | Refresh |

## Task-Lineage Cluster
- `1299-1304` contributes the coherent March 19 historical task lineage.
- The lineage includes `6` task mirrors, `6` report-only deliberation docs, `6` task checklists, `5` task specs, `6` PRDs, `6` ACTION_PLAN docs, and `5` TECH_SPEC docs.
- `1303` does not have a stale `tasks/specs/1303...` row in the docs freshness report, and its TECH_SPEC is represented outside the stale path set. Exact paths from the report, not task-number inference, are authoritative.

## Non-Task Docs
- `docs/diagnostics-prompt-guide.md`: active guide; still canonical for the diagnostics prompt installed by `scripts/setup-codex-prompts.sh`. Refresh after review.
- `docs/FOLLOWUP-0951-true-rlm-symbolic.md`: active follow-up guide for PR166 / task 0951 symbolic RLM gaps. Refresh after review; broader archival is out of scope.
- `docs/ACTION_PLAN-rlm-orchestrator.md`, `docs/PRD-rlm-orchestrator.md`, `docs/TECH_SPEC-rlm-orchestrator.md`: legacy RLM task packet docs that now explicitly redirect to shipped 0951 / delegation RLM docs. Refresh as useful historical pointer docs; archival can be a separate owner issue if desired.
- `docs/public/downstream-setup.md` and `docs/public/provider-onboarding.md`: public guides; current setup/onboarding posture remains active and should stay fail-closed on the shorter 14-day cadence. Refresh after review.

## Exact Stale Doc Paths
- `.agent/task/1299-coordinator-symphony-aligned-frontend-test-cli-remaining-boundary-freeze-reassessment.md`
- `.agent/task/1300-coordinator-symphony-aligned-frontend-test-cli-help-surface-completion.md`
- `.agent/task/1301-coordinator-symphony-aligned-frontend-test-cli-remaining-boundary-freeze-reassessment-revisit.md`
- `.agent/task/1302-coordinator-linear-and-telegram-provider-setup-and-smoke-testing.md`
- `.agent/task/1303-coordinator-symphony-parity-linear-autonomous-intake-and-run-handoff.md`
- `.agent/task/1304-coordinator-live-linear-tracked-issue-by-id-query-string-contract-fix.md`
- `docs/ACTION_PLAN-coordinator-linear-and-telegram-provider-setup-and-smoke-testing.md`
- `docs/ACTION_PLAN-coordinator-live-linear-tracked-issue-by-id-query-string-contract-fix.md`
- `docs/ACTION_PLAN-coordinator-symphony-aligned-frontend-test-cli-help-surface-completion.md`
- `docs/ACTION_PLAN-coordinator-symphony-aligned-frontend-test-cli-remaining-boundary-freeze-reassessment-revisit.md`
- `docs/ACTION_PLAN-coordinator-symphony-aligned-frontend-test-cli-remaining-boundary-freeze-reassessment.md`
- `docs/ACTION_PLAN-coordinator-symphony-parity-linear-autonomous-intake-and-run-handoff.md`
- `docs/ACTION_PLAN-rlm-orchestrator.md`
- `docs/diagnostics-prompt-guide.md`
- `docs/findings/1299-frontend-test-cli-remaining-boundary-freeze-reassessment-deliberation.md`
- `docs/findings/1300-frontend-test-cli-help-surface-completion-deliberation.md`
- `docs/findings/1301-frontend-test-cli-remaining-boundary-freeze-reassessment-revisit-deliberation.md`
- `docs/findings/1302-linear-and-telegram-provider-setup-and-smoke-testing-deliberation.md`
- `docs/findings/1303-symphony-parity-linear-autonomous-intake-and-run-handoff-deliberation.md`
- `docs/findings/1304-live-linear-tracked-issue-by-id-query-string-contract-fix-deliberation.md`
- `docs/FOLLOWUP-0951-true-rlm-symbolic.md`
- `docs/PRD-coordinator-linear-and-telegram-provider-setup-and-smoke-testing.md`
- `docs/PRD-coordinator-live-linear-tracked-issue-by-id-query-string-contract-fix.md`
- `docs/PRD-coordinator-symphony-aligned-frontend-test-cli-help-surface-completion.md`
- `docs/PRD-coordinator-symphony-aligned-frontend-test-cli-remaining-boundary-freeze-reassessment-revisit.md`
- `docs/PRD-coordinator-symphony-aligned-frontend-test-cli-remaining-boundary-freeze-reassessment.md`
- `docs/PRD-coordinator-symphony-parity-linear-autonomous-intake-and-run-handoff.md`
- `docs/PRD-rlm-orchestrator.md`
- `docs/public/downstream-setup.md`
- `docs/public/provider-onboarding.md`
- `docs/TECH_SPEC-coordinator-linear-and-telegram-provider-setup-and-smoke-testing.md`
- `docs/TECH_SPEC-coordinator-live-linear-tracked-issue-by-id-query-string-contract-fix.md`
- `docs/TECH_SPEC-coordinator-symphony-aligned-frontend-test-cli-help-surface-completion.md`
- `docs/TECH_SPEC-coordinator-symphony-aligned-frontend-test-cli-remaining-boundary-freeze-reassessment-revisit.md`
- `docs/TECH_SPEC-coordinator-symphony-aligned-frontend-test-cli-remaining-boundary-freeze-reassessment.md`
- `docs/TECH_SPEC-rlm-orchestrator.md`
- `tasks/specs/1299-coordinator-symphony-aligned-frontend-test-cli-remaining-boundary-freeze-reassessment.md`
- `tasks/specs/1300-coordinator-symphony-aligned-frontend-test-cli-help-surface-completion.md`
- `tasks/specs/1301-coordinator-symphony-aligned-frontend-test-cli-remaining-boundary-freeze-reassessment-revisit.md`
- `tasks/specs/1302-coordinator-linear-and-telegram-provider-setup-and-smoke-testing.md`
- `tasks/specs/1304-coordinator-live-linear-tracked-issue-by-id-query-string-contract-fix.md`
- `tasks/tasks-1299-coordinator-symphony-aligned-frontend-test-cli-remaining-boundary-freeze-reassessment.md`
- `tasks/tasks-1300-coordinator-symphony-aligned-frontend-test-cli-help-surface-completion.md`
- `tasks/tasks-1301-coordinator-symphony-aligned-frontend-test-cli-remaining-boundary-freeze-reassessment-revisit.md`
- `tasks/tasks-1302-coordinator-linear-and-telegram-provider-setup-and-smoke-testing.md`
- `tasks/tasks-1303-coordinator-symphony-parity-linear-autonomous-intake-and-run-handoff.md`
- `tasks/tasks-1304-coordinator-live-linear-tracked-issue-by-id-query-string-contract-fix.md`

## Spec-Guard Rows

| Path | Disposition |
| --- | --- |
| `docs/design/specs/FRONTEND_DESIGN_PIPELINE_V2.md` | Reviewed active design spec; refresh frontmatter to `2026-04-19` |
| `tasks/specs/0913-orchestrator-refactor-roadmap.md` | Reviewed active historical spec; refresh frontmatter to `2026-04-19` |
| `tasks/specs/0914-npm-companion-package.md` | Reviewed active historical spec; refresh frontmatter to `2026-04-19` |
| `tasks/specs/0928-repo-refactor-simplification.md` | Reviewed active historical spec; refresh frontmatter to `2026-04-19` |
| `tasks/specs/0932-orchestrator-performance-reliability.md` | Reviewed active historical spec; refresh frontmatter to `2026-04-19` |
| `tasks/specs/0933-orchestrator-experience-jsonl-repair.md` | Reviewed active historical spec; refresh frontmatter to `2026-04-19` |
| `tasks/specs/0934-orchestrator-persistence-throughput.md` | Reviewed active historical spec; refresh frontmatter to `2026-04-19` |
| `tasks/specs/0957-codex-cloud-execution-wiring.md` | Reviewed active cloud execution spec; refresh frontmatter to `2026-04-19` |
| `tasks/specs/0958-cloud-canary-ci.md` | Reviewed active cloud canary spec; refresh frontmatter to `2026-04-19` |
| `tasks/specs/0959-experience-prompt-injection-delegation-skill-harmonization.md` | Reviewed active experience/delegation spec; refresh frontmatter to `2026-04-19` |
| `tasks/specs/0960-delegation-skills-optimization-patch-release.md` | Reviewed active shipped-skill release spec; refresh frontmatter to `2026-04-19` |
| `tasks/specs/0961-recursive-rlm-enhancements.md` | Reviewed active symbolic RLM enhancement spec; refresh frontmatter to `2026-04-19` |
| `tasks/specs/0962-release-cloud-rlm-hardening.md` | Reviewed active release/cloud/RLM spec; refresh frontmatter to `2026-04-19` |
| `tasks/specs/0963-codex-cli-alignment-refresh-e2e.md` | Reviewed active Codex CLI alignment spec; refresh frontmatter to `2026-04-19` |
| `tasks/specs/0965-rlm-help-cloud-stdout.md` | Reviewed active RLM/cloud stdout spec; refresh frontmatter to `2026-04-19` |
| `tasks/specs/0966-review-modernization-docs-canary.md` | Reviewed active review modernization spec; refresh frontmatter to `2026-04-19` |
| `tasks/specs/1304-coordinator-live-linear-tracked-issue-by-id-query-string-contract-fix.md` | Reviewed as part of the March 19 `1299-1304` cluster; refresh frontmatter and registry to `2026-04-19` |

## Decision
Outcome: refresh the exact `47` docs freshness rows in `docs/docs-freshness-registry.json` to `last_review=2026-04-19`, refresh the exact `17` active spec frontmatter rows to `last_review=2026-04-19`, register the CO-254 packet/classification docs, and add Apr 19 owner evidence to `docs/guides/docs-freshness-cohorts.md`.

Rationale:

- Rolling deferral is not appropriate because the stale set contains active guides and public guides, which are ineligible for rolling freshness debt.
- The March 19 task lineage is small and coherent, but adding it as rolling debt would not address the public/active-guide or spec-guard rows and would still leave unrelated lanes blocked.
- Reclassification is not appropriate because the catalog classes match the files: task packet/mirror/report rows are historical task records, diagnostics/RLM docs are active guides or task packets, and downstream/provider onboarding are public guides.
- Archiving is broader than this lane. The task packet records remain useful owner evidence, while the RLM legacy docs currently function as historical pointers to shipped 0951 docs.
- Refreshing after this explicit review restores the baseline while preserving CO-175 rolling visibility and gate semantics.

## Residual Risk
- CO-175 rolling debt remains visible and expires after `2026-04-20`; a follow-up owner is required if it is not refreshed, archived, reclassified, or re-owned before the window closes.
- Future UTC date boundaries may surface additional historical cohorts. Those should get their own owner issue or reviewed refresh, not be pushed into unrelated feature lanes.
- Legacy RLM docs may deserve archive-policy treatment later, but that is not needed to restore the Apr 19 baseline.
