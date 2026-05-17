# PRD - CO-543 Apr 16 strict spec-guard stale cohort

## Traceability
- Linear issue: `CO-543` / `a08ba13b-1c9a-43ed-beec-f63a0547b721`
- Linear URL: https://linear.app/asabeko/issue/CO-543/co-resolve-rolling-active-spec-guard-stale-cohorts-and-prevent
- Task id: `linear-a08ba13b-1c9a-43ed-beec-f63a0547b721`
- Canonical spec: `tasks/specs/linear-a08ba13b-1c9a-43ed-beec-f63a0547b721.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-a08ba13b-1c9a-43ed-beec-f63a0547b721.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-a08ba13b-1c9a-43ed-beec-f63a0547b721.md`
- Task checklist: `tasks/tasks-linear-a08ba13b-1c9a-43ed-beec-f63a0547b721.md`
- .agent mirror: `.agent/task/linear-a08ba13b-1c9a-43ed-beec-f63a0547b721.md`

## Summary
- Problem Statement: `node scripts/spec-guard.mjs` now fails on thirteen active `tasks/specs/**` rows with `last_review=2026-04-16`. The failure is blocking unrelated PR Core Lane signal, including CO-548 / PR #824.
- Root Cause: the Apr 16 cleanup refreshed stale historical rows but left completed packet specs active. That turned terminal work into a rolling 30-day recurring blocker instead of removing it from active spec freshness.
- Desired Outcome: classify each stale row from live or same-file terminal evidence, reclassify completed rows and their related packet surfaces inactive/archived, preserve history, and keep `spec-guard` strict.

## User Request Translation
- User intent / needs: do not patch over recurring freshness failures; identify why they recur, fix the root cause, and keep future cohorts routed to owner action instead of another blind date refresh.
- Success criteria / acceptance: the CO-543 packet exists, all thirteen Apr 16 rows have row-level evidence, related packet registry surfaces are no longer active freshness debt, `node scripts/spec-guard.mjs` passes non-dry, and regression coverage proves maintenance surfaces active specs before hard expiry while routing over-cap freshness/spec debt toward owner action rather than cap expansion.
- Constraints / non-goals: do not weaken `spec-guard`, do not delete historical specs, do not fabricate completion timestamps, do not widen rolling freshness caps, and do not mutate CO-548 implementation.

## Intent Checksum
- Exact phrases to preserve: `node scripts/spec-guard.mjs`, strict `spec-guard`, `last_review=2026-04-16`, Apr 16 stale cohort, rolling active spec cohort, no blind bumps, no deletion, no cap expansion, CO-543, CO-548, PR #824, CO-522.
- Protected surfaces: `tasks/specs/**`, `tasks/index.json`, `docs/docs-freshness-registry.json`, `docs/TASKS.md`, `docs:freshness:maintain`, `scripts/spec-guard.mjs`.
- Nearby wrong interpretations to reject: this is not permission to relax spec freshness, not a docs-freshness cap increase, not a CO-548 implementation change, and not a fresh review of already completed Codex 0.121 lanes.

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth | Target truth | Out of scope |
| --- | --- | --- | --- | --- |
| Strict `spec-guard` | Thirteen Apr 16 task specs are still active and stale. | Active specs must refresh within 30 days; inactive `done` specs are skipped. | Completed rows become inactive `done` with evidence notes. | Guard weakening, bypass flags, or date-only refresh. |
| Terminal packet lifecycle | Related task packet, mirror, and report registry rows still looked active after their task-index owners were terminal. | Terminal task-index evidence must cascade to packet registry lifecycle so completed packets do not become recurring `docs:freshness` work. | The 67 related packet registry rows, including seven nonstandard PRD/ACTION/findings path mappings, are archived with CO-543 terminal evidence while source files remain on disk. | Deleting files, moving content, or absorbing unrelated CO-522 stale-doc debt. |
| Linear-backed specs | Source issues CO-189 through CO-205 are live Linear Done/completed. | Completed Linear issues should not remain active spec freshness work. | The corresponding specs cite live Done/completed evidence. | Reopening or reworking those historical issues. |
| Numbered spec `1220` | Same-file checklist has 17 checked and 0 unchecked items. | Completed local task packets should not remain active spec freshness work. | The spec is reclassified inactive `done` with checklist evidence. | Reassessing standalone-review architecture. |
| Preventive routing | Active specs can age silently until strict `spec-guard` fails, and over-budget rolling cohorts can tempt cap expansion. | Maintenance should surface active spec pre-expiry debt and route owner action for broader stale cohorts without cap broadening. | Active spec pre-expiry entries become warning actions for frontmatter and legacy `last_review:` specs, file selection matches `spec-guard` immediate spec files while skipping `README.md`, inactive frontmatter parsing matches `spec-guard` under leading blank lines and CRLF, valid archived stubs stay excluded, legacy `tasks[]` terminal lifecycle rows match `spec-guard`, and the over-cap fixture asserts owner-action evidence is produced. | New queue automation or Linear issue creation from this lane. |

## Not Done If
- `node scripts/spec-guard.mjs` still reports any Apr 16 row from the declared cohort.
- Any affected row is only date-bumped without terminal evidence.
- Any affected spec is deleted or archived as a stub to hide the failure.
- `scripts/spec-guard.mjs` or rolling freshness caps are weakened.
- The PR handoff claims CO-548 is fixed before the strict spec guard blocker is cleared.

## Goals
- Create the CO-543 owner packet and mirrors.
- Reclassify terminal Apr 16 rows inactive `done` with row notes.
- Update task index and freshness registry evidence for the stale specs and related terminal packet surfaces.
- Add deterministic coverage for frontmatter and legacy active spec pre-expiry warnings, inactive frontmatter formatting parity, legacy `tasks[]` lifecycle parity, archived-stub exclusion, and owner-action routing on future over-cap cohorts.
- Prove strict `spec-guard` passes before returning to CO-548.

## Non-Goals
- No CO-548 source changes.
- No docs-freshness policy cap increase.
- No broad cleanup of CO-522 docs debt.
- No deletion of historical packet files.
- No invented `completed_at` metadata.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`, stale active spec handling is the task subject.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Apr 16 active stale spec cohort | Re-refreshing completed packet rows every 30 days. | remove fallback | CO-543 | Core Lane failure on unrelated PRs after the Apr 16 cohort aged to 31 days. | 2026-04-16 | 2026-05-17 | 30 days for docs/spec control surfaces. | Completed rows are inactive `done`; future active specs are surfaced before hard expiry and over-cap cohorts route owner action instead of cap expansion. | `node scripts/spec-guard.mjs`, focused docs-freshness-maintain regression, `npm run docs:check`, `git diff --check`. |

## Approvals
- Pre-implementation issue-quality review: live evidence confirms CO-543 owns the Apr 16 strict spec cohort and CO-548 remains a separate recovery implementation lane.
- Engineering: approved after gpt-5.5/xhigh standalone review session `019e3511-e67a-7310-adab-510fbb0a010b` found no discrete correctness issues and the explicit minimality pass kept the branch scoped to CO-543.
