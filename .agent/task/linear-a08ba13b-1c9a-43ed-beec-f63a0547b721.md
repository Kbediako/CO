# Task Checklist - linear-a08ba13b-1c9a-43ed-beec-f63a0547b721

- Linear Issue: `CO-543` / `a08ba13b-1c9a-43ed-beec-f63a0547b721`
- MCP Task ID: `linear-a08ba13b-1c9a-43ed-beec-f63a0547b721`
- Primary PRD: `docs/PRD-linear-a08ba13b-1c9a-43ed-beec-f63a0547b721.md`
- TECH_SPEC: `tasks/specs/linear-a08ba13b-1c9a-43ed-beec-f63a0547b721.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-a08ba13b-1c9a-43ed-beec-f63a0547b721.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-a08ba13b-1c9a-43ed-beec-f63a0547b721.md`
- .agent mirror: `.agent/task/linear-a08ba13b-1c9a-43ed-beec-f63a0547b721.md`

## Docs-First
- [x] PRD drafted with user-request translation, protected terms, non-goals, Not Done If, and parity matrix. Evidence: `docs/PRD-linear-a08ba13b-1c9a-43ed-beec-f63a0547b721.md`.
- [x] TECH_SPEC drafted with stale cohort evidence and validation plan. Evidence: `tasks/specs/linear-a08ba13b-1c9a-43ed-beec-f63a0547b721.md`, `docs/TECH_SPEC-linear-a08ba13b-1c9a-43ed-beec-f63a0547b721.md`.
- [x] ACTION_PLAN drafted with serial sequencing and rollback plan. Evidence: `docs/ACTION_PLAN-linear-a08ba13b-1c9a-43ed-beec-f63a0547b721.md`.
- [x] Checklist mirrored to .agent task file. Evidence: `.agent/task/linear-a08ba13b-1c9a-43ed-beec-f63a0547b721.md`.
- [x] Registry mirrors updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.

## Acceptance Criteria
- [x] Current owner packet exists for the Apr 16 strict `spec-guard` stale `last_review` cohort.
- [x] Every affected stale row is reviewed against live Linear Done/completed state or a same-file completed checklist.
- [x] Every affected stale row is reclassified inactive `done` without deletion, blind date bump, or `spec-guard` weakening.
- [x] Related terminal packet registry rows are archived after task-index terminal evidence, so completed packet docs do not become recurring active freshness debt. Evidence: 67 terminal packet registry rows archived, including seven explicitly declared nonstandard PRD/ACTION/findings paths surfaced by gpt-5.5/xhigh review.
- [x] Preventive owner-action routing coverage exists for future over-cap cohort handling. Evidence: `npx vitest run --config vitest.config.core.ts tests/docs-freshness-maintain.spec.ts tests/docs-freshness.spec.ts tests/spec-guard.spec.ts` passed after asserting frontmatter and legacy active spec pre-expiry surfacing, spec file-selection parity, inactive frontmatter formatting parity, legacy `tasks[]` terminal lifecycle parity, archived-stub exclusion, and owner-action evidence on the over-budget regression.
- [x] `node scripts/spec-guard.mjs` passes non-dry on the branch. Evidence: returned `Spec guard: OK`.
- [ ] Draft PR is linked to CO-543 with current validation evidence.

## CO-382 Fallback Decision Table
- Large-refactor check: no new fallback mechanism or guard split is warranted; CO-543 removes lifecycle metadata drift while keeping the existing strict spec-guard and docs-freshness ownership surfaces authoritative.
- Minor-seam decision: the bounded seam is acceptable because completed packet rows are reclassified inactive or archived with evidence, and future active specs surface through the existing docs-freshness-maintain owner-action route before hard expiry.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Active spec lifecycle freshness | Completed task/spec packet rows remained active and recurred as stale spec-guard debt | remove fallback | CO-543 | Apr 16 terminal packet rows reached the 30-day strict spec-guard boundary | 2026-04-16 | 2026-05-17 | N/A after removal | Completed rows are inactive done; related terminal packet registry rows are archived; future active specs surface pre-expiry owner action | node scripts/spec-guard.mjs; npm run docs:check; focused docs-freshness/spec-guard tests; diff-budget override |

## Validation
- [x] Pre-repair strict spec-guard reproduction. Evidence: `node scripts/spec-guard.mjs --dry-run` reported exactly thirteen Apr 16 stale rows.
- [x] Numbered-row evidence review. Evidence: `tasks/tasks-1220-coordinator-symphony-aligned-standalone-review-run-review-orchestration-boundary-reassessment.md` has 17 checked and 0 unchecked items.
- [x] UUID-backed row evidence review. Evidence: live Linear GraphQL and `issue-context` verified the source issues listed in the TECH_SPEC are Done/completed.
- [x] `node scripts/spec-guard.mjs`. Evidence: returned `Spec guard: OK`.
- [x] `npx vitest run --config vitest.config.core.ts tests/docs-freshness-maintain.spec.ts tests/docs-freshness.spec.ts tests/spec-guard.spec.ts`. Evidence: 212 tests passed, including legacy `last_review:` active spec pre-expiry coverage, spec file-selection parity, inactive frontmatter formatting parity, legacy `tasks[]` lifecycle parity, archived-stub exclusion, and existing strict spec-guard coverage.
- [x] `npm run build`. Evidence: `tsc -p tsconfig.build.json` completed successfully.
- [x] `npm run lint`. Evidence: exited 0 with only the pre-existing three `no-explicit-any` warnings in `orchestrator/tests/DelegationMcpHealth.test.ts`.
- [x] `npm run test`. Evidence: 360 test files and 5854 tests passed.
- [x] `npm run docs:check`. Evidence: returned `docs:check: OK`.
- [x] `npm run docs:freshness`. Evidence: command ran and failed only on broader CO-522-owned repo-wide stale-doc baseline debt; no missing registry rows or terminal lifecycle rows were reported for this branch.
- [x] `node scripts/docs-freshness-maintain.mjs --check --format json`. Evidence: exits 1 for CO-522-owned `block_policy_over_budget`; reports 0 terminal lifecycle paths, 153 active spec pre-expiry warning entries, 0 missing/invalid registry paths, and owner issue action `update_existing` for CO-522.
- [x] `node scripts/delegation-guard.mjs`. Evidence: passed with explicit desktop-subagent override because the Codex desktop gpt-5.5/xhigh subagent evidence does not produce a repo-local delegation manifest.
- [x] `npm run repo:stewardship`. Evidence: 6547 tracked files, 0 action-required.
- [x] `npm run pack:smoke`. Evidence: completed with `pack smoke passed`.
- [x] `BASE_SHA=origin/main DIFF_BUDGET_OVERRIDE_REASON=... node scripts/diff-budget.mjs`. Evidence: exceeded 2108/1200 lines and passed with `DIFF_BUDGET_OVERRIDE_REASON=CO-543 must atomically reclassify 13 terminal stale specs plus explicit nonstandard packet registry rows and spec pre-expiry regression coverage so completed packets stop recurring as active freshness debt.`
- [x] `git diff --check`. Evidence: returned no output.
- [x] gpt-5.5/xhigh standalone review. Evidence: final direct `codex review -c model='gpt-5.5' -c model_reasoning_effort='xhigh' --uncommitted --title 'CO-543 final post-lifecycle-path rereview'` session `019e3511-e67a-7310-adab-510fbb0a010b` found no discrete correctness issues after prior findings were fixed.
- [x] Explicit elegance/minimality pass. Evidence: kept the shared `collectTaskIndexItems` helper and active-spec pre-expiry scanner because they remove repeat root causes across `spec-guard`, `docs:freshness`, and `docs:freshness:maintain`; no simplification patch was needed.

## Progress Log
- 2026-05-17: Shared root verified clean latest main; CO-543 manually admitted in an isolated worktree because current main targeted recovery is blocked by the CO-548/CO-543 dependency cycle.
- 2026-05-17: Created a single CO-543 workpad and recorded `stay_serial` / `single_bounded_change`; the stale row decisions, registry/index updates, packet, tests, validation, and PR handoff share one evidence chain.
- 2026-05-17: Reproduced strict `spec-guard` failure and verified terminal evidence for all thirteen rows.
- 2026-05-17: Reclassified the thirteen stale rows inactive `done`, archived 61 related terminal packet registry rows, added the CO-543 packet/mirrors, and validated strict `spec-guard`, focused prevention coverage, build, lint, full core tests, docs check, stewardship, pack smoke, diff-budget override, whitespace, and docs-freshness classification.
- 2026-05-17: Addressed gpt-5.5/xhigh review finding by declaring seven nonstandard terminal packet `prd`, `action_plan`, and `findings` paths in `tasks/index.json`, including the omitted 1220 findings path, and archiving six additional registry rows; post-fix audit reports no CO-543 cohort terminal packet leftovers.
- 2026-05-17: Addressed gpt-5.5/xhigh review finding by making active spec pre-expiry collection parse legacy top-level `last_review:` lines while still excluding valid docs-archive stubs; focused maintainer coverage now passes 53 tests.
- 2026-05-17: Addressed gpt-5.5/xhigh review finding by centralizing task-index item selection so `spec-guard`, `docs:freshness`, and `docs:freshness:maintain` all honor canonical `items[]` and legacy `tasks[]`; focused lifecycle/pre-expiry/spec-guard coverage now passes 210 tests.
- 2026-05-17: Addressed gpt-5.5/xhigh review finding by matching `spec-guard` frontmatter parsing for leading blank lines and CRLF; focused lifecycle/pre-expiry/spec-guard coverage now passes 211 tests.
- 2026-05-17: Addressed gpt-5.5/xhigh review finding by matching `spec-guard` file selection for active spec pre-expiry warnings; focused lifecycle/pre-expiry/spec-guard coverage now passes 212 tests.
- 2026-05-17: Addressed gpt-5.5/xhigh review finding by indenting orphaned review notes under `review_notes`; final gpt-5.5/xhigh standalone review session `019e3511-e67a-7310-adab-510fbb0a010b` found no discrete correctness issues after the lifecycle-path correction, and the explicit minimality pass required no further code changes.
