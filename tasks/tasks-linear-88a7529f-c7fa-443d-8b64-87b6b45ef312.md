# Task Checklist - linear-88a7529f-c7fa-443d-8b64-87b6b45ef312

- Linear Issue: `CO-479` / `88a7529f-c7fa-443d-8b64-87b6b45ef312`
- MCP Task ID: `linear-88a7529f-c7fa-443d-8b64-87b6b45ef312`
- Primary PRD: `docs/PRD-linear-88a7529f-c7fa-443d-8b64-87b6b45ef312.md`
- TECH_SPEC: `tasks/specs/linear-88a7529f-c7fa-443d-8b64-87b6b45ef312.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-88a7529f-c7fa-443d-8b64-87b6b45ef312.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-88a7529f-c7fa-443d-8b64-87b6b45ef312.md`
- Shared source 0 anchor: `ctx:sha256:ad8143d1da80d2c59b489656a2cfc36568c3cbb1256bddf3689f84cd477329bc#chunk:c000001`
- Current origin manifest: `.runs/linear-88a7529f-c7fa-443d-8b64-87b6b45ef312-docs-packet/cli/2026-05-02T01-53-30-289Z-5901dd5b/manifest.json`
- Expected patch artifact: `.runs/linear-88a7529f-c7fa-443d-8b64-87b6b45ef312-docs-packet/cli/2026-05-02T01-53-30-289Z-5901dd5b/provider-linear-child-lane.patch`

## Docs-First
- [x] PRD drafted for classifying stale April 1 source specs without changing source specs in the child lane. Evidence: `docs/PRD-linear-88a7529f-c7fa-443d-8b64-87b6b45ef312.md`.
- [x] TECH_SPEC drafted with protected terms, rejected reinterpretations, and parent-owned classification requirements. Evidence: `tasks/specs/linear-88a7529f-c7fa-443d-8b64-87b6b45ef312.md`, `docs/TECH_SPEC-linear-88a7529f-c7fa-443d-8b64-87b6b45ef312.md`.
- [x] ACTION_PLAN drafted for parent `clean origin/main` `spec-guard` classification and live Linear verification. Evidence: `docs/ACTION_PLAN-linear-88a7529f-c7fa-443d-8b64-87b6b45ef312.md`.
- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated within the declared docs scope. Evidence: those files.
- [x] Checklist mirrored to `.agent/task/linear-88a7529f-c7fa-443d-8b64-87b6b45ef312.md`. Evidence: `.agent/task/linear-88a7529f-c7fa-443d-8b64-87b6b45ef312.md`.
- [x] Pre-implementation issue-quality review recorded in spec notes. Evidence: `tasks/specs/linear-88a7529f-c7fa-443d-8b64-87b6b45ef312.md`.
- [x] `docs/docs-freshness-registry.json` coverage added for all six packet and mirror files. Evidence: `docs/docs-freshness-registry.json`.

## Delegation Scope
- [x] Child lane stayed inside the declared docs file scope. Evidence: final diff.
- [x] Child lane did not edit source specs for `CO-46`, `CO-62`, `CO-63`, or `CO-57`. Evidence: final diff.
- [x] Child lane did not edit implementation or test files. Evidence: final diff.
- [x] Child lane did not mutate Linear state or workpad. Evidence: this checklist and final diff.
- [x] Child lane did not run full repo validation suites. Evidence: validation section below.
- [x] Child lane produced a parent-accepted docs packet patch. Evidence: `.runs/linear-88a7529f-c7fa-443d-8b64-87b6b45ef312-docs-packet/cli/2026-05-02T01-53-30-289Z-5901dd5b/provider-linear-child-lane.patch`.

## Parent-Owned Classification Acceptance
- [x] Reproduce or classify the `clean origin/main` `spec-guard` failure for stale `active task specs` with `last_review=2026-04-01`. Evidence: baseline `node scripts/spec-guard.mjs --dry-run` identified the four April 1 source specs named by CO-479 before repair.
- [x] `live-verify Linear state` for `CO-46`. Evidence: packaged `linear issue-context` confirmed `Done`, `state_type=completed`, `updated_at=2026-04-01T00:19:42.932Z`, attached PR `#339`.
- [x] `live-verify Linear state` for `CO-62`. Evidence: packaged `linear issue-context` confirmed `Done`, `state_type=completed`, `updated_at=2026-04-15T22:50:30.391Z`, attached PR `#341`.
- [x] `live-verify Linear state` for `CO-63`. Evidence: packaged `linear issue-context` confirmed `Done`, `state_type=completed`, `updated_at=2026-04-14T01:14:40.810Z`, attached PR `#342`.
- [x] `live-verify Linear state` for `CO-57`. Evidence: packaged `linear issue-context` confirmed `Done`, `state_type=completed`, `updated_at=2026-04-09T13:28:53.032Z`, attached PR `#338`.
- [x] Classify each source spec as `active refresh vs inactive/terminal reclassification` before changing source spec date/status fields. Evidence: all four sources are terminal and reclassified as inactive `done` specs under canonical owner key `spec-guard:active-specs:last_review=2026-04-01`.
- [x] Preserve historical packet evidence; do not delete source packet docs to clear stale rows. Evidence: source packet docs remain in place; only spec status, index approval metadata, and registry active/archived metadata changed.
- [x] Keep `spec-guard` fail-closed and do not weaken guard policy. Evidence: no changes to `scripts/spec-guard.mjs`; post-repair validation owns the clean dry-run proof.
- [x] Do not hide this work under `CO-474` or treat docs:freshness ownership as equivalent to active-spec ownership. Evidence: CO-479 records canonical owner key `spec-guard:active-specs:last_review=2026-04-01` in `tasks/index.json` and the Linear workpad/PR notes.

## Validation
- [x] Child scoped JSON parse check. Evidence: `jq empty tasks/index.json docs/docs-freshness-registry.json`.
- [x] Child scoped protected-term check over the packet and mirrors. Evidence: `rg -n "spec-guard|active task specs|last_review=2026-04-01|CO-46|CO-62|CO-63|CO-57|clean origin/main|live-verify Linear state|active refresh vs inactive/terminal reclassification" docs/PRD-linear-88a7529f-c7fa-443d-8b64-87b6b45ef312.md docs/TECH_SPEC-linear-88a7529f-c7fa-443d-8b64-87b6b45ef312.md docs/ACTION_PLAN-linear-88a7529f-c7fa-443d-8b64-87b6b45ef312.md tasks/specs/linear-88a7529f-c7fa-443d-8b64-87b6b45ef312.md tasks/tasks-linear-88a7529f-c7fa-443d-8b64-87b6b45ef312.md .agent/task/linear-88a7529f-c7fa-443d-8b64-87b6b45ef312.md`.
- [x] Child scoped whitespace / diff check on touched files. Evidence: `git diff --check -- docs/PRD-linear-88a7529f-c7fa-443d-8b64-87b6b45ef312.md docs/TECH_SPEC-linear-88a7529f-c7fa-443d-8b64-87b6b45ef312.md docs/ACTION_PLAN-linear-88a7529f-c7fa-443d-8b64-87b6b45ef312.md tasks/specs/linear-88a7529f-c7fa-443d-8b64-87b6b45ef312.md tasks/tasks-linear-88a7529f-c7fa-443d-8b64-87b6b45ef312.md .agent/task/linear-88a7529f-c7fa-443d-8b64-87b6b45ef312.md tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json`; `rg -n "[[:blank:]]$" ...` returned no matches for the same touched-file set.
- [x] Child scoped changed-file review. Evidence: `git status --short` and `git diff --name-only` showed only declared packet/registry files; untracked files were the six declared CO-479 packet/mirror files.
- [x] Delegation guard. Evidence: `MCP_RUNNER_TASK_ID=linear-88a7529f-c7fa-443d-8b64-87b6b45ef312 node scripts/delegation-guard.mjs` -> OK, 1 subagent manifest.
- [x] Final `spec-guard`. Evidence: `MCP_RUNNER_TASK_ID=linear-88a7529f-c7fa-443d-8b64-87b6b45ef312 node scripts/spec-guard.mjs --dry-run` -> OK.
- [x] Final docs checks. Evidence: `MCP_RUNNER_TASK_ID=linear-88a7529f-c7fa-443d-8b64-87b6b45ef312 npm run docs:check` -> OK; `MCP_RUNNER_TASK_ID=linear-88a7529f-c7fa-443d-8b64-87b6b45ef312 npm run docs:freshness` -> OK.
- [x] Final stewardship and diff budget. Evidence: `MCP_RUNNER_TASK_ID=linear-88a7529f-c7fa-443d-8b64-87b6b45ef312 npm run repo:stewardship` -> OK; `MCP_RUNNER_TASK_ID=linear-88a7529f-c7fa-443d-8b64-87b6b45ef312 node scripts/diff-budget.mjs` -> OK.
- [x] Build, lint, and test. Evidence: `npm run build` -> OK; `npm run lint` -> OK with pre-existing `no-explicit-any` warnings in `orchestrator/tests/DelegationMcpHealth.test.ts`; `npm run test` -> OK.
- [x] Manifest-backed standalone review. Evidence: `FORCE_CODEX_REVIEW=1 npm run review` -> `review_outcome=clean-success`, telemetry at `.runs/linear-88a7529f-c7fa-443d-8b64-87b6b45ef312/cli/2026-05-02T01-50-16-744Z-74f86245/review/telemetry.json`.
- [x] Elegance/minimality pass. Evidence: `out/linear-88a7529f-c7fa-443d-8b64-87b6b45ef312/manual/elegance-review/elegance-review.md`.

## Progress Log
- 2026-05-02: Bounded same-issue child lane created the `CO-479` docs-first packet and registry mirrors against source anchor `ctx:sha256:ad8143d1da80d2c59b489656a2cfc36568c3cbb1256bddf3689f84cd477329bc#chunk:c000001`. The referenced parent source payload path was absent in this child checkout, so the packet is anchored on the parent-provided issue contract. Protected terms preserved: `spec-guard`, `active task specs`, `last_review=2026-04-01`, `CO-46`, `CO-62`, `CO-63`, `CO-57`, `clean origin/main`, `live-verify Linear state`, and `active refresh vs inactive/terminal reclassification`. Rejected interpretations preserved: no blind `last_review` bumps, no `spec-guard` weakening, no deleting historical packet evidence, no hiding under `CO-474`, and no treating docs:freshness ownership as equivalent to active-spec ownership.
- 2026-05-02: Parent lane corrected the source anchor to the user-provided `ctx:sha256:ad8143d1da80d2c59b489656a2cfc36568c3cbb1256bddf3689f84cd477329bc#chunk:c000001`, live-verified all four source issues as terminal `Done` / `completed`, and chose inactive/terminal reclassification for each source spec rather than an active review refresh. Historical packet files are preserved; source registry rows are archived, source specs are `done`, and `tasks/index.json` records the completed-lane cohort approval.
- 2026-05-02: Full validation, manifest-backed standalone review, and elegance review are clean. PR creation and ready-review drain remain before Linear review handoff.
