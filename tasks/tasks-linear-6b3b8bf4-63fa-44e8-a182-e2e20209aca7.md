# Task Checklist - linear-6b3b8bf4-63fa-44e8-a182-e2e20209aca7

- Linear Issue: `CO-369` / `6b3b8bf4-63fa-44e8-a182-e2e20209aca7`
- Issue title: `CO-360: align task registry docs pointer with TECH_SPEC mirror`
- MCP Task ID: `linear-6b3b8bf4-63fa-44e8-a182-e2e20209aca7`
- Primary PRD: `docs/PRD-linear-6b3b8bf4-63fa-44e8-a182-e2e20209aca7.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-6b3b8bf4-63fa-44e8-a182-e2e20209aca7.md`
- Task spec: `tasks/specs/linear-6b3b8bf4-63fa-44e8-a182-e2e20209aca7.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-6b3b8bf4-63fa-44e8-a182-e2e20209aca7.md`

## Docs-First
- [x] PRD drafted for the `CO-360` task registry docs pointer alignment issue. Evidence: `docs/PRD-linear-6b3b8bf4-63fa-44e8-a182-e2e20209aca7.md`.
- [x] TECH_SPEC drafted with protected terms, rejected interpretations, non-goals, parity matrix, and parent-owned implementation fork. Evidence: `tasks/specs/linear-6b3b8bf4-63fa-44e8-a182-e2e20209aca7.md`, `docs/TECH_SPEC-linear-6b3b8bf4-63fa-44e8-a182-e2e20209aca7.md`.
- [x] ACTION_PLAN drafted for parent implementation and closeout. Evidence: `docs/ACTION_PLAN-linear-6b3b8bf4-63fa-44e8-a182-e2e20209aca7.md`.
- [x] Task checklist and `.agent` mirror drafted within child-lane scope. Evidence: `tasks/tasks-linear-6b3b8bf4-63fa-44e8-a182-e2e20209aca7.md`, `.agent/task/linear-6b3b8bf4-63fa-44e8-a182-e2e20209aca7.md`.
- [x] Parent applies packet patch and updates parent-owned registry mirrors. Evidence: child lane `.runs/linear-6b3b8bf4-63fa-44e8-a182-e2e20209aca7-co369-docs-packet/cli/2026-04-25T09-39-15-489Z-53166d03/manifest.json` succeeded; helper accept was stale after parent restacked to current `origin/main`, so parent applied the reviewed patch artifact manually and registered this packet in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- [x] Parent verifies current `CO-360` `tasks/index.json` `paths.docs` value and docs mirror state before implementation. Evidence: `tasks/index.json` showed `paths.spec` and `paths.docs` both pointing at `tasks/specs/linear-17451947-1b72-4d01-9e3d-86dcaab46c39-provider-worker-codex-0125-appserver-supervision-gate.md`; `test -f docs/TECH_SPEC-linear-17451947-1b72-4d01-9e3d-86dcaab46c39.md` was false before implementation.
- [x] Parent implements one outcome: missing mirror plus `paths.docs` repoint, or specific legacy fallback rationale. Evidence: parent added `docs/TECH_SPEC-linear-17451947-1b72-4d01-9e3d-86dcaab46c39.md`, repointed only `tasks/index.json` `paths.docs`, kept `paths.spec` unchanged, and registered the mirror in `docs/docs-freshness-registry.json`.

## Source / Assumptions
- [x] Source-0 anchor recorded. Evidence: `ctx:sha256:17c72b629ea51d97e5065c3e76d6f4316f93091ecea9e4b15ea7310a08b13aab#chunk:c000001`.
- [x] Source payload availability caveat recorded. Evidence: child drafting could not see the parent source path, and parent reconciled to `.runs/linear-6b3b8bf4-63fa-44e8-a182-e2e20209aca7/cli/2026-04-25T09-36-04-589Z-45349664/memory/source-0/source.txt`.
- [x] Parent/child ownership split recorded. Evidence: PRD, TECH_SPEC, ACTION_PLAN, and this checklist.

## Parent Implementation
- [x] Identify exact `CO-360` task UUID, canonical `tasks/specs` path, docs `TECH_SPEC` mirror path, and `paths.docs` value. Evidence: registry id `20260425-linear-17451947-1b72-4d01-9e3d-86dcaab46c39`, canonical spec `tasks/specs/linear-17451947-1b72-4d01-9e3d-86dcaab46c39-provider-worker-codex-0125-appserver-supervision-gate.md`, mirror `docs/TECH_SPEC-linear-17451947-1b72-4d01-9e3d-86dcaab46c39.md`, previous `paths.docs` fallback to the canonical spec.
- [x] Verify whether the `CO-360` docs `TECH_SPEC` mirror exists and should be the docs pointer target. Evidence: mirror was absent before this lane and the registry convention uses docs-side `TECH_SPEC` mirrors for `paths.docs` when present.
- [x] If mirror is missing, create the parent-owned mirror from canonical task-spec truth and repoint `tasks/index.json` `paths.docs`. Evidence: `docs/TECH_SPEC-linear-17451947-1b72-4d01-9e3d-86dcaab46c39.md` added, `tasks/index.json` `paths.docs` updated to that file, and `paths.spec` left unchanged.
- [x] If mirror/repoint is not appropriate, record the specific legacy fallback rationale with evidence. Evidence: not used; parent selected mirror/repoint, so no legacy fallback remains.
- [x] Keep implementation bounded away from unrelated registry rows, docs freshness policy, provider runtime files, and child-owned packet-only assumptions. Evidence: diff only touches CO-369 docs packet registration, CO-360 docs mirror/pointer registration, and task tracking docs.

## Validation
- [x] Child target-file presence and scoped whitespace check. Evidence: `test -f` confirmed all six owned files and `git diff --check -- <six owned files>` passed on 2026-04-25.
- [x] Child protected-term check. Evidence: `rg -n "CO-360|CO-369|paths\\.docs|TECH_SPEC mirror|CO-360 docs TECH_SPEC mirror|legacy fallback rationale|tasks/index\\.json|docs/docs-freshness-registry\\.json|provider runtime files|Not Done If|Parity / Alignment Matrix" <six owned files>` found required terms.
- [x] Parent focused docs/registry validation. Evidence: JSON parse passed for `tasks/index.json` and `docs/docs-freshness-registry.json`; focused pointer search confirmed CO-360 `paths.docs` points to `docs/TECH_SPEC-linear-17451947-1b72-4d01-9e3d-86dcaab46c39.md`; `git diff --check`, `npm run docs:check`, and `npm run docs:freshness` passed.
- [x] Parent `node scripts/spec-guard.mjs --dry-run`. Evidence: command passed on 2026-04-25.
- [x] Parent review/elegance pass if non-trivial implementation occurs. Evidence: final wrapper review telemetry `.runs/linear-6b3b8bf4-63fa-44e8-a182-e2e20209aca7/cli/2026-04-25T09-36-04-589Z-45349664/review/telemetry.json` reports `status: succeeded` and `review_outcome: bounded-success`; explicit elegance pass kept the narrow mirror/repoint shape and found no safe simplification.

## Handoff Status
- [x] Child lane leaves docs packet changes in place for patch export. Evidence: dirty working tree in this child workspace.
- [x] Parent applies/accepts child-lane patch artifact. Evidence: helper accept rejected with `provider_worker_child_lane_stale` after parent HEAD moved from `54c1d43320567de935d184f5e6be41ab51454d01` to `e3e0d24c6a4a2a16ad8cb839cfb5f8f58de593bc`; parent ran `git apply --check` and applied `.runs/linear-6b3b8bf4-63fa-44e8-a182-e2e20209aca7-co369-docs-packet/cli/2026-04-25T09-39-15-489Z-53166d03/provider-linear-child-lane.patch` manually.
- [x] Parent prunes generated child workspace after docs-review. Evidence: generated child workspace `co369-docs-packet-2026-04-25T09-39-15-489Z-53166d03` removed after docs-review P2 flagged it as a full nested checkout local artifact; durable lane evidence remains under `.runs/linear-6b3b8bf4-63fa-44e8-a182-e2e20209aca7-co369-docs-packet/cli/2026-04-25T09-39-15-489Z-53166d03/`.
- [ ] Parent updates Linear workpad and PR lifecycle artifacts. Evidence: pending parent lane.

## Progress Log
- 2026-04-25: Created the scoped `CO-369` docs-first packet for `CO-360` registry/docs pointer alignment, preserving the mirror/repoint versus legacy fallback decision fork and child/parent ownership split.
- 2026-04-25: Scoped child validation passed for target-file presence, `git diff --check`, protected-term search, and status limited to the six owned files.
- 2026-04-25: Parent selected the mirror/repoint outcome, added the missing CO-360 docs TECH_SPEC mirror, kept `paths.spec` on the canonical task spec, repointed `paths.docs` to the mirror, registered it for freshness, and pruned the generated `.child-lanes` checkout flagged by docs-review.

## Relevant Files
- `docs/PRD-linear-6b3b8bf4-63fa-44e8-a182-e2e20209aca7.md`
- `docs/TECH_SPEC-linear-6b3b8bf4-63fa-44e8-a182-e2e20209aca7.md`
- `docs/ACTION_PLAN-linear-6b3b8bf4-63fa-44e8-a182-e2e20209aca7.md`
- `tasks/specs/linear-6b3b8bf4-63fa-44e8-a182-e2e20209aca7.md`
- `tasks/tasks-linear-6b3b8bf4-63fa-44e8-a182-e2e20209aca7.md`
- `.agent/task/linear-6b3b8bf4-63fa-44e8-a182-e2e20209aca7.md`
- `docs/TECH_SPEC-linear-17451947-1b72-4d01-9e3d-86dcaab46c39.md`

## Notes
- Do not edit `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, the `CO-360` TECH_SPEC mirror, or provider runtime files from this child lane.
- Do not pre-decide the implementation beyond verified parent evidence.
- Do not accept a legacy fallback unless the parent records a specific rationale.
