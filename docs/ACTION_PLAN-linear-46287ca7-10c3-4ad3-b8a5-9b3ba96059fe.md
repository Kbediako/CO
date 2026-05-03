# Action Plan: CO-498 repo-wide spec-guard and docs freshness baseline debt

## Scope
- Task id: `linear-46287ca7-10c3-4ad3-b8a5-9b3ba96059fe`
- Child task id: `linear-46287ca7-10c3-4ad3-b8a5-9b3ba96059fe-packet-docs`
- Registry id: `20260503-linear-46287ca7-10c3-4ad3-b8a5-9b3ba96059fe`
- Linear issue: `CO-498`
- Issue id: `46287ca7-10c3-4ad3-b8a5-9b3ba96059fe`

## Plan
1. Create the bounded CO-498 docs-first packet and mirrors.
2. Parent imports the packet and, if needed, registers the spec in `tasks/index.json`, `docs/TASKS.md`, and docs freshness metadata.
3. Parent captures active-branch evidence for `node scripts/spec-guard.mjs --dry-run`, `npm run docs:freshness`, and `npm run docs:freshness:maintain -- --format json`.
4. Parent reproduces the reduced failure on a clean origin/main baseline before assigning ownership to the active diff.
5. Parent classifies each blocker as lane-owned, CO-444 `rolling freshness cohort` owner debt, stale `task specs` / `last_review` debt, or other repo-wide baseline debt.
6. Parent updates only the owning metadata/spec surfaces after review or live source-state evidence, or blocks/routes the issue if the debt is not CO-498-owned.
7. Parent validates without provider child-lane behavior changes, validator weakening, historical packet deletion, or blind `last_review` bumps.

## Acceptance Criteria
- [x] Docs packet exists in the six child-owned files.
- [x] Protected terms are present: `docs:freshness`, `spec-guard`, `last_review`, `rolling freshness cohort`, `CO-444`, `task specs`, and clean origin/main baseline.
- [x] Non-goals are explicit: no provider child-lane behavior changes, no validator weakening, no historical packet deletion, and no blind last_review bumps.
- [x] Parent proves whether the reduced `spec-guard` / `docs:freshness` failure reproduces on clean `origin/main`.
- [x] Parent preserves exact owner-truth evidence for CO-444 and any `rolling freshness cohort` blocker.
- [x] Parent routes repo-wide baseline debt without widening unrelated implementation lanes.
- [x] Parent completes required registry/catalog/task-index/docs snapshot updates and validation after importing the packet.

## Validation
- [x] Child docs lane created packet files only.
- [x] Child scoped trailing-whitespace check on the six declared files.
- [x] Child protected-term scan across the six declared files.
- [x] Child changed-path scope check for the six declared files.
- [x] Parent `node scripts/spec-guard.mjs --dry-run`.
- [x] Parent `npm run docs:freshness`.
- [x] Parent `npm run docs:freshness:maintain -- --format json`.
- [x] Parent clean origin/main baseline repro for any reduced blocker cluster.

## Risks
- Treating baseline debt as lane-owned could widen unrelated implementation work; mitigate with clean `origin/main` repro before ownership decisions.
- Treating CO-444 owner debt as stale noise could lose machine-readable cohort ownership; mitigate by preserving `docs:freshness:maintain -- --format json` evidence.
- Blind last_review bumps could hide stale active specs; mitigate with review or live source-state evidence before updates.
- Historical packet deletion could erase useful audit context; mitigate by retaining history and changing only current owner/classification metadata when justified.

- 2026-05-03: Parent accepted child lane `packet-docs`, registered the packet, verified all affected stale-source Linear issues are Done/completed, archived/reclassified historical metadata, and reran focused guard/freshness validation cleanly.
