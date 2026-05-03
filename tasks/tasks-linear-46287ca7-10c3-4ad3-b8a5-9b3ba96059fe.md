# Task Checklist - linear-46287ca7-10c3-4ad3-b8a5-9b3ba96059fe

- Linear Issue: `CO-498` / `46287ca7-10c3-4ad3-b8a5-9b3ba96059fe`
- MCP Task ID: `linear-46287ca7-10c3-4ad3-b8a5-9b3ba96059fe`
- Child Task ID: `linear-46287ca7-10c3-4ad3-b8a5-9b3ba96059fe-packet-docs`
- Primary PRD: `docs/PRD-linear-46287ca7-10c3-4ad3-b8a5-9b3ba96059fe.md`
- TECH_SPEC: `tasks/specs/linear-46287ca7-10c3-4ad3-b8a5-9b3ba96059fe.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-46287ca7-10c3-4ad3-b8a5-9b3ba96059fe.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-46287ca7-10c3-4ad3-b8a5-9b3ba96059fe.md`
- Child docs-packet manifest: `.runs/linear-46287ca7-10c3-4ad3-b8a5-9b3ba96059fe-packet-docs/cli/2026-05-03T01-54-51-764Z-26d030bc/manifest.json`
- Source anchor: `ctx:sha256:6bafd5badaa50cbba4e2a69b638852a8b77f7957ee3e5e28daf5c2ddc84ef7a7#chunk:c000001`

## Docs-First
- [x] PRD drafted with protected terms, wrong-interpretation rejects, parent-owned follow-on boundaries, and Not Done If criteria. Evidence: `docs/PRD-linear-46287ca7-10c3-4ad3-b8a5-9b3ba96059fe.md`.
- [x] TECH_SPEC drafted with issue-shaping contract, parity matrix, readiness gate, fallback/refactor decision, and validation split. Evidence: `tasks/specs/linear-46287ca7-10c3-4ad3-b8a5-9b3ba96059fe.md`, `docs/TECH_SPEC-linear-46287ca7-10c3-4ad3-b8a5-9b3ba96059fe.md`.
- [x] ACTION_PLAN drafted for child packet creation and parent-owned baseline classification. Evidence: `docs/ACTION_PLAN-linear-46287ca7-10c3-4ad3-b8a5-9b3ba96059fe.md`.
- [x] Checklist mirrored to `.agent/task`. Evidence: `.agent/task/linear-46287ca7-10c3-4ad3-b8a5-9b3ba96059fe.md`.
- [x] Parent imported the packet and registered `tasks/index.json`, `docs/TASKS.md`, and docs freshness metadata. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, `.runs/linear-46287ca7-10c3-4ad3-b8a5-9b3ba96059fe-packet-docs/cli/2026-05-03T01-54-51-764Z-26d030bc/manifest.json`.

## Protected Issue Terms
- [x] `docs:freshness`
- [x] `spec-guard`
- [x] `last_review`
- [x] `rolling freshness cohort`
- [x] `CO-444`
- [x] `task specs`
- [x] clean origin/main baseline

## Explicitly Rejected Interpretations
- [x] Provider child-lane behavior changes.
- [x] Validator weakening for `spec-guard`, `docs:freshness`, or `docs:freshness:maintain`.
- [x] Historical packet deletion.
- [x] Blind last_review bumps.
- [x] Treating active-branch failures as lane-owned without clean `origin/main` proof.
- [x] Collapsing CO-444 `rolling freshness cohort` owner debt into unrelated implementation work.

## Parent-Owned Implementation
- [x] Parent captures active-branch `node scripts/spec-guard.mjs --dry-run` evidence. Evidence: baseline reproduced eight April 2 stale specs; post-repair rerun passed.
- [x] Parent captures active-branch `npm run docs:freshness` evidence. Evidence: baseline reproduced 54 stale April 2 rows plus 33 CO-444 rolling rows; post-repair rerun passed with 0 stale rows.
- [x] Parent captures `docs:freshness:maintain -- --format json` owner-truth evidence. Evidence: baseline `freshness_decision=block_diff_local`, live non-terminal `owner_issue=CO-444`; post-repair direct script returned `freshness_decision=clean`, `candidate_count=0`, `required_actions=0`.
- [x] Parent used the workspace baseline at `9d249e21` matching the issue clean-main evidence and reproduced the reduced guard/freshness blocker cluster before repair.
- [x] Parent classified failures as stale terminal-source packet/spec metadata: CO-444 owner metadata was live/non-terminal, while affected source issues were Done/completed.
- [x] Parent updated registry/task-spec metadata only after live source-state evidence; no validator or provider behavior changed.
- [x] Parent owns Linear workpad, issue transitions, PR attachment, review responses, and final validation. Evidence: active CO-498 workpad and Linear helper lineage.

## Validation
- [x] Child scoped trailing-whitespace check. Evidence: `rg -n "[[:blank:]]+$" -- <six scoped files>` exited `0` with no matches.
- [x] Child protected-term coverage check. Evidence: fixed-string scan found `docs:freshness`, `spec-guard`, `last_review`, `rolling freshness cohort`, `CO-444`, `task specs`, clean origin/main baseline, `provider child-lane behavior changes`, `validator weakening`, `historical packet deletion`, and `blind last_review bumps`.
- [x] Child scoped path review. Evidence: `git status --short -- <six scoped files>` listed only the six declared untracked packet files.
- [x] Parent `node scripts/spec-guard.mjs --dry-run`. Evidence: post-repair rerun passed.
- [x] Parent `npm run docs:freshness`. Evidence: post-repair rerun passed with 0 stale rows.
- [x] Parent `docs:freshness:maintain -- --format json`. Evidence: direct script returned `freshness_decision=clean`, `candidate_count=0`, `required_actions=0`.
- [x] Parent clean origin/main baseline repro for reduced blockers. Evidence: workspace baseline `9d249e21` matched the issue clean-main evidence; reduced blockers reproduced before repair.

## Progress Log
- 2026-05-03: bounded same-issue child lane created the CO-498 docs-first packet and task mirror docs only. Parent remains owner for live validation, clean origin/main baseline proof, registry/catalog/task-index updates, Linear/GitHub lifecycle, and final validation.
- 2026-05-03: child scoped checks passed for diff whitespace, protected-term coverage, and declared changed-path scope.

## Notes
- Do not weaken `spec-guard`, `docs:freshness`, or `docs:freshness:maintain`.
- Do not change provider child-lane behavior from this issue.
- Do not delete historical packet evidence.
- Do not perform blind last_review bumps.
- Do not edit `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, `docs/docs-catalog.json`, scripts, tests, source, or package files from this child lane.

- 2026-05-03: Parent accepted child lane `packet-docs`, registered the packet, verified all affected stale-source Linear issues are Done/completed, archived/reclassified historical metadata, and reran focused guard/freshness validation cleanly.
