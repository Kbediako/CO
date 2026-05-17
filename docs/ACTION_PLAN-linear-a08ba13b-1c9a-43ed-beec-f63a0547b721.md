# ACTION PLAN - CO-543 Apr 16 strict spec-guard stale cohort

## Summary
- Goal: clear the Apr 16 strict `spec-guard` stale cohort by terminal reclassification, not by another date refresh.
- Scope: CO-543 packet, thirteen stale `tasks/specs/**` rows, task-index/registry evidence, related terminal packet registry rows, `docs/TASKS.md`, active spec pre-expiry surfacing for frontmatter and legacy `last_review:` specs, legacy `tasks[]` and mixed `items[]` + `tasks[]` lifecycle parity with `spec-guard`, and focused owner-action routing coverage.
- Assumptions: live Linear Done/completed state and completed same-file checklists are authoritative terminal evidence for this lane.

## Issue Readiness Gate
- Protected terms: `node scripts/spec-guard.mjs`, strict `spec-guard`, `last_review=2026-04-16`, Apr 16 stale cohort, rolling active spec cohort, no blind bumps, no deletion, no cap expansion, CO-543, CO-548, PR #824, CO-522.
- Not done if: the guard still fails on any declared Apr 16 row, a row is date-only bumped, a spec is deleted, the guard or policy caps are weakened, or CO-548 implementation is changed from this lane.
- Fallback/refactor decision: remove the stale-active-row fallback. Completed packets must be inactive `done`; future over-cap cohorts must route owner action rather than cap expansion.
- Large-refactor check: no guard refactor is warranted because `spec-guard` already skips inactive specs correctly. The defect is lifecycle metadata drift.
- Minor-seam decision: bounded lifecycle metadata repair is acceptable because it removes active-row drift without adding another compatibility path.

## CO-382 Fallback Decision Table
- Large-refactor check: no new fallback mechanism or guard split is warranted; CO-543 removes lifecycle metadata drift while keeping the existing strict spec-guard and docs-freshness ownership surfaces authoritative.
- Minor-seam decision: the bounded seam is acceptable because completed packet rows are reclassified inactive or archived with evidence, and future active specs surface through the existing docs-freshness-maintain owner-action route before hard expiry.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Active spec lifecycle freshness | Completed task/spec packet rows remained active and recurred as stale spec-guard debt | remove fallback | CO-543 | Apr 16 terminal packet rows reached the 30-day strict spec-guard boundary | 2026-04-16 | 2026-05-17 | N/A after removal | Completed rows are inactive done; related terminal packet registry rows are archived; future active specs surface pre-expiry owner action | node scripts/spec-guard.mjs; npm run docs:check; focused docs-freshness/spec-guard tests; diff-budget override |

## Milestones
1. Confirm shared root clean latest main and create isolated worktree.
2. Read live CO-543 issue-context and create one workpad.
3. Record one serial `linear parallelization` decision.
4. Reproduce the thirteen-row `spec-guard` failure.
5. Verify terminal evidence for each stale row.
6. Create CO-543 packet and mirrors.
7. Reclassify completed specs inactive `done`, update task-index approvals, and archive stale-spec plus related terminal packet registry rows, including explicit path mappings for nonstandard PRD/ACTION/findings surfaces.
8. Add focused prevention assertions for active spec pre-expiry surfacing, legacy `last_review:` parity, inactive frontmatter formatting parity, legacy `tasks[]` and mixed `items[]` + `tasks[]` terminal lifecycle parity with `spec-guard`, archived-stub exclusion, and owner-action routing on over-budget freshness debt.
9. Run validation gates, standalone review, and elegance pass.
10. Commit, push, open a draft PR, attach it to CO-543, and return to CO-548 after Core Lane is unblocked.

## Validation
- `node scripts/spec-guard.mjs`
- `npx vitest run --config vitest.config.core.ts tests/docs-freshness-maintain.spec.ts tests/docs-freshness.spec.ts tests/spec-guard.spec.ts`
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/docs-freshness-maintain.mjs --check --format json`
- `npm run repo:stewardship`
- `npm run pack:smoke`
- `node scripts/diff-budget.mjs`
- `git diff --check`
- gpt-5.5/xhigh standalone review
- explicit elegance/minimality pass

## Rollback
- Revert the CO-543 commit. No guard behavior, CO-548 implementation files, or historical packet deletions are involved.

## Risks
- Risk: metadata changes look like blind bumps. Mitigation: every affected spec receives a CO-543 row note and this packet records terminal evidence.
- Risk: docs freshness debt is widened into CO-543. Mitigation: registry updates are limited to this packet, the thirteen affected task-spec rows, and terminal packet surfaces tied to those task-index rows; broader CO-522 debt remains separate.
- Risk: prevention coverage duplicates existing tests. Mitigation: add narrow active-spec pre-expiry fixtures for frontmatter and legacy spec/task-index shapes, including CRLF/leading-blank inactive parsing parity, plus owner-action evidence on an existing over-cap regression instead of broad fixture churn.

## Approvals
- Reviewer: approved by final gpt-5.5/xhigh standalone review session `019e3511-e67a-7310-adab-510fbb0a010b`; no discrete correctness issues were reported after the lifecycle-path correction.
- Minimality: approved; no simplification patch was needed after the central lifecycle helper and pre-expiry scanner were checked against the CO-543 scope.
- Date: 2026-05-17
