---
id: 20260517-linear-a08ba13b-1c9a-43ed-beec-f63a0547b721
title: CO-543 resolve Apr 16 strict spec-guard stale cohort
status: in_progress
relates_to: docs/PRD-linear-a08ba13b-1c9a-43ed-beec-f63a0547b721.md
risk: high
owners:
  - Codex
last_review: 2026-05-17
related_action_plan: docs/ACTION_PLAN-linear-a08ba13b-1c9a-43ed-beec-f63a0547b721.md
task_checklists:
  - tasks/tasks-linear-a08ba13b-1c9a-43ed-beec-f63a0547b721.md
review_notes:
  - 2026-05-17: Created from live CO-543 issue-context after shared root was verified clean latest main and isolated branch `kb/co-543-spec-guard-stale-cohorts` was created. The current blocker is thirteen Apr 16 active `tasks/specs/**` rows, not CO-548 implementation code.
  - 2026-05-17: Pre-repair `node scripts/spec-guard.mjs --dry-run` reproduced exactly thirteen stale rows with `last_review=2026-04-16`; live Linear GraphQL verified CO-189, CO-192, CO-195, CO-197, CO-198, CO-199, CO-200, CO-201, CO-202, CO-203, CO-204, and CO-205 are Done/completed.
  - 2026-05-17: gpt-5.5/xhigh review found undeclared nonstandard terminal packet paths; CO-543 added explicit PRD/ACTION/findings path mappings, including the omitted 1220 findings path, and archived six additional registry rows before rerunning validation.
  - 2026-05-17: gpt-5.5/xhigh review found legacy specs with top-level `last_review:` would be skipped by pre-expiry collection; CO-543 now parses the legacy shape and excludes valid docs-archive stubs.
  - 2026-05-17: gpt-5.5/xhigh review found legacy top-level `tasks[]` task-index rows would diverge between `spec-guard` and freshness maintainers; CO-543 now centralizes task-index item selection so `items[]` and legacy `tasks[]` lifecycle evidence are honored consistently.
  - 2026-05-17: gpt-5.5/xhigh review found frontmatter parsing still diverged from `spec-guard` for leading blank lines and CRLF; CO-543 now mirrors the guard's line-based inactive-status parsing.
  - 2026-05-17: gpt-5.5/xhigh review found spec pre-expiry file selection diverged from `spec-guard`; CO-543 now limits pre-expiry warnings to immediate spec markdown files and skips `README.md`.
---

## CO-382 Fallback Decision Table
- Large-refactor check: no new fallback mechanism or guard split is warranted; CO-543 removes lifecycle metadata drift while keeping the existing strict spec-guard and docs-freshness ownership surfaces authoritative.
- Minor-seam decision: the bounded seam is acceptable because completed packet rows are reclassified inactive or archived with evidence, and future active specs surface through the existing docs-freshness-maintain owner-action route before hard expiry.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Active spec lifecycle freshness | Completed task/spec packet rows remained active and recurred as stale spec-guard debt | remove fallback | CO-543 | Apr 16 terminal packet rows reached the 30-day strict spec-guard boundary | 2026-04-16 | 2026-05-17 | N/A after removal | Completed rows are inactive done; related terminal packet registry rows are archived; future active specs surface pre-expiry owner action | node scripts/spec-guard.mjs; npm run docs:check; focused docs-freshness/spec-guard tests; diff-budget override |

## Canonical Reference
- PRD: `docs/PRD-linear-a08ba13b-1c9a-43ed-beec-f63a0547b721.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-a08ba13b-1c9a-43ed-beec-f63a0547b721.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-a08ba13b-1c9a-43ed-beec-f63a0547b721.md`
- Task checklist: `tasks/tasks-linear-a08ba13b-1c9a-43ed-beec-f63a0547b721.md`
- .agent mirror: `.agent/task/linear-a08ba13b-1c9a-43ed-beec-f63a0547b721.md`
- Linear issue: `CO-543` / `a08ba13b-1c9a-43ed-beec-f63a0547b721`

## Summary
- Objective: clear the Apr 16 strict `spec-guard` stale cohort by evidence-backed terminal reclassification, not by date refresh.
- Scope: CO-543 packet/mirrors, thirteen affected stale task specs, task-index evidence metadata, related terminal packet registry rows, `docs/TASKS.md`, active spec pre-expiry surfacing in `docs:freshness:maintain` for frontmatter and legacy `last_review:` specs, legacy `tasks[]` lifecycle parity with `spec-guard`, and focused owner-action routing regression assertions.
- Constraints: no `scripts/spec-guard.mjs` weakening, no spec deletion, no rolling cap expansion, no CO-548 source edits, and no invented completion timestamps.

## Issue-Shaping Contract
- User-request translation: recurring docs freshness/spec failures must be root-caused and fixed; completed packets should stop recurring as active freshness debt.
- Protected terms: `node scripts/spec-guard.mjs`, strict `spec-guard`, `last_review=2026-04-16`, Apr 16 stale cohort, rolling active spec cohort, no blind bumps, no deletion, no cap expansion, CO-543, CO-548, PR #824, CO-522.
- Wrong interpretations to reject:
  - broadening rolling freshness caps
  - weakening `spec-guard`
  - deleting historical packet specs
  - treating CO-548 recovery dispatch as the cause of this Core Lane failure
  - marking unresolved active specs terminal without evidence

## Stale Cohort Evidence

| Spec path | Decision | Evidence |
| --- | --- | --- |
| `tasks/specs/1220-coordinator-symphony-aligned-standalone-review-run-review-orchestration-boundary-reassessment.md` | inactive `done` | Same-file checklist has 17 checked items and 0 unchecked items. |
| `tasks/specs/linear-2886b57d-b844-4803-9e55-6fe3657d516d.md` | inactive `done` | Live Linear evidence verified CO-197 is Done/completed. |
| `tasks/specs/linear-2a8f00cf-a39a-4b15-aeca-23bacd618af1.md` | inactive `done` | Live Linear evidence verified CO-199 is Done/completed. |
| `tasks/specs/linear-4122489e-1a3b-43cf-a181-e98ada0a55e1.md` | inactive `done` | Live Linear evidence verified CO-195 is Done/completed. |
| `tasks/specs/linear-4c480fc7-b6c2-48cf-b4a2-73fe057b8aa7.md` | inactive `done` | Live `issue-context` verified CO-200 is Done/completed. |
| `tasks/specs/linear-6c2a6f36-7852-4535-9914-e0042b082c95.md` | inactive `done` | Live Linear evidence verified CO-189 is Done/completed. |
| `tasks/specs/linear-72286a49-e68b-435a-be72-74d5c28feb09.md` | inactive `done` | Live Linear evidence verified CO-192 is Done/completed. |
| `tasks/specs/linear-9917183b-824a-48f7-95ee-bcee205d7a02.md` | inactive `done` | Live Linear evidence verified CO-204 is Done/completed. |
| `tasks/specs/linear-c101cb88-3097-4502-bcd7-723d80da7955.md` | inactive `done` | Live Linear evidence verified CO-201 is Done/completed; this row was the earlier Apr 16 refresh owner and must not stay active. |
| `tasks/specs/linear-c9163fc7-832a-45ac-8961-2d6c213e52af.md` | inactive `done` | Live Linear evidence verified CO-203 is Done/completed. |
| `tasks/specs/linear-ec62eea8-7fcf-44a6-8216-10254c56e64d.md` | inactive `done` | Live Linear evidence verified CO-205 is Done/completed. |
| `tasks/specs/linear-f1d8b29c-b048-4816-96dd-a38f272dabb7.md` | inactive `done` | Live `issue-context` verified CO-198 is Done/completed. |
| `tasks/specs/linear-f8281682-ceed-4409-949c-efca2358568a.md` | inactive `done` | Live Linear evidence verified CO-202 is Done/completed. |

## Prevention
- Existing `spec-guard` inactive and terminal lifecycle semantics are correct; the failure came from stale active metadata on completed packets.
- CO-543 keeps completed rows out of active freshness by setting inactive `done` status with evidence notes and archiving related terminal packet registry rows after task-index terminal evidence is established, including nonstandard `prd`, `action_plan`, and `findings` paths that cannot be inferred from normal task key aliases.
- `docs:freshness:maintain` now emits warning-level action evidence for active specs in the 7-day window before strict `spec-guard` expiry, so upcoming hard failures are visible before they block unrelated PRs.
- Active spec pre-expiry collection now matches `spec-guard` on frontmatter and legacy top-level `last_review:` parsing, while preserving docs-archive stub exclusion so archived specs do not reopen as active debt.
- Inactive frontmatter parsing now matches `spec-guard` for leading blank lines and CRLF, preventing terminal specs from surfacing as false pre-expiry warnings under supported formatting.
- `spec-guard`, `docs:freshness`, and `docs:freshness:maintain` now share task-index `items[]` / legacy `tasks[]` selection, so completed legacy task-index packets are not misreported as active spec pre-expiry work.
- The `docs:freshness:maintain` over-budget regression now also asserts owner-action evidence is emitted, proving future over-cap recurrence is routed toward the canonical owner rather than policy cap expansion.

## Validation Plan
- `node scripts/spec-guard.mjs`
- `npx vitest run --config vitest.config.core.ts tests/docs-freshness-maintain.spec.ts tests/docs-freshness.spec.ts tests/spec-guard.spec.ts`
- `npm run docs:check`
- `npm run docs:freshness` and classify unrelated CO-522 debt separately if present
- `node scripts/diff-budget.mjs` with explicit CO-543 scope override if needed
- `git diff --check`
- gpt-5.5/xhigh standalone review
- explicit elegance/minimality pass

## Open Questions
- None for this cohort. Any new stale row after this branch needs fresh source evidence and should not be silently absorbed into CO-543.

## Approvals
- Reviewer: approved after final gpt-5.5/xhigh standalone review session `019e3511-e67a-7310-adab-510fbb0a010b` found no discrete correctness issues in staged, unstaged, or untracked changes.
- Minimality: approved; the shared task-index selector and active-spec pre-expiry scanner are the smallest durable fix for the repeated Apr 16 stale-cohort failure without weakening `spec-guard` or widening CO-548.
- Date: 2026-05-17
