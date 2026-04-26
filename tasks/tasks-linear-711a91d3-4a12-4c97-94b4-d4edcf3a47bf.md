# Task Checklist - linear-711a91d3-4a12-4c97-94b4-d4edcf3a47bf

- Linear Issue: `CO-281` / `711a91d3-4a12-4c97-94b4-d4edcf3a47bf`
- MCP Task ID: `linear-711a91d3-4a12-4c97-94b4-d4edcf3a47bf`
- Primary PRD: `docs/PRD-linear-711a91d3-4a12-4c97-94b4-d4edcf3a47bf.md`
- TECH_SPEC: `tasks/specs/linear-711a91d3-4a12-4c97-94b4-d4edcf3a47bf.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-711a91d3-4a12-4c97-94b4-d4edcf3a47bf.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-711a91d3-4a12-4c97-94b4-d4edcf3a47bf.md`
- Live issue source: read-only Linear issue body, `updatedAt=2026-04-21T05:54:02.627Z`
- Parent-provided issue source anchor: `ctx:sha256:2d92868e9c6fa9d99101ff7c39b3d0c6d5b8322632c5ec319289197d5f4bb1e8#chunk:c000001`
- Shared source 0 anchor: `ctx:sha256:2d92868e9c6fa9d99101ff7c39b3d0c6d5b8322632c5ec319289197d5f4bb1e8#chunk:c000001`
- Source object id: `sha256:2d92868e9c6fa9d99101ff7c39b3d0c6d5b8322632c5ec319289197d5f4bb1e8`
- Origin manifest: `.runs/linear-711a91d3-4a12-4c97-94b4-d4edcf3a47bf/cli/2026-04-21T05-38-15-496Z-0b50967a/manifest.json`
- Docs child-lane manifest: `.runs/linear-711a91d3-4a12-4c97-94b4-d4edcf3a47bf-docs-packet-file-refresh/cli/2026-04-21T05-56-35-757Z-41ecac5d/manifest.json`
- CO-240 lineage: `CO-240` / `ddb81c93-87b2-4dff-b69b-33d7ae3c91cd`
- Queue evidence: `.runs/local-mcp/cli/control-host/provider-intake-state.json`
- Autopilot evidence: `.runs/local-mcp/cli/control-host/provider-operator-autopilot.jsonl`

## Docs-First
- [x] PRD drafted for stale plain released/not_active Backlog cache suppressing `Backlog -> Ready` reclaim after `CO-240`. Evidence: `docs/PRD-linear-711a91d3-4a12-4c97-94b4-d4edcf3a47bf.md`.
- [x] TECH_SPEC drafted with protected terms, evidence paths, adjacent scope rejections, and parent validation guidance. Evidence: `tasks/specs/linear-711a91d3-4a12-4c97-94b4-d4edcf3a47bf.md`, `docs/TECH_SPEC-linear-711a91d3-4a12-4c97-94b4-d4edcf3a47bf.md`.
- [x] ACTION_PLAN drafted for parent implementation, focused validation, and handoff. Evidence: `docs/ACTION_PLAN-linear-711a91d3-4a12-4c97-94b4-d4edcf3a47bf.md`.
- [x] Checklist mirrored to `.agent/task/linear-711a91d3-4a12-4c97-94b4-d4edcf3a47bf.md`. Evidence: `.agent/task/linear-711a91d3-4a12-4c97-94b4-d4edcf3a47bf.md`.
- [x] Pre-implementation issue-quality review recorded in the canonical spec notes. Evidence: `tasks/specs/linear-711a91d3-4a12-4c97-94b4-d4edcf3a47bf.md` readiness gate.
- [x] `tasks/index.json` registry entry refreshed for parent import after stale docs-packet invalidation. Evidence: `tasks/index.json`.

## Workflow
- [x] Child lane stayed docs-only and did not mutate Linear state or the parent workpad. Evidence: `.runs/linear-711a91d3-4a12-4c97-94b4-d4edcf3a47bf-docs-packet-file-refresh/cli/2026-04-21T05-56-35-757Z-41ecac5d/manifest.json`.
- [x] Child lane did not edit implementation or test files. Evidence: patch scope limited to declared docs packet files and `tasks/index.json`.
- [x] Child lane packet was accepted into the parent workspace after stale artifact invalidation/relaunch. Evidence: `.runs/linear-711a91d3-4a12-4c97-94b4-d4edcf3a47bf-docs-packet-file-refresh/cli/2026-04-21T05-56-35-757Z-41ecac5d/provider-linear-child-lane.patch`.

## Implementation Acceptance
- [x] A stale plain `released` / `provider_issue_released:not_active` row with cached `issue_state=Backlog` after operator-autopilot promotes live truth to `Ready` is reclaimed / refreshed / reclassified through the normal control-host path. Evidence: `orchestrator/tests/ProviderIssueHandoff.test.ts` regression `prioritizes the autopilot-promoted stale Backlog released not-active reclaim before unrelated Ready work`.
- [x] The fixture includes stale `issue_state_type=backlog`, stale `issue_updated_at`, and `last_delivery_id=null`. Evidence: `orchestrator/tests/ProviderIssueHandoff.test.ts`.
- [x] Normal reclaim or `fresh_discovery` admits the issue without manual worker start. Evidence: focused regression starts `CO-281` through `service.poll({ trackedIssues: [], refetchTrackedIssues, deferFreshDiscovery: true })`, with `launcher.start` called for `CO-281`.
- [x] Adjacent `CO-212` and `CO-216` behavior remains preserved. Evidence: scoped provider handoff adjacent tests and full `npm run test` pass.
- [x] `CO-240` lineage and April 21 evidence paths remain visible in regression naming, docs, and review notes. Evidence: docs packet traceability plus review notes in `.runs/linear-711a91d3-4a12-4c97-94b4-d4edcf3a47bf/cli/2026-04-21T05-38-15-496Z-0b50967a/review/prompt.txt`.

## Validation
- [x] Parent focused provider handoff regression for stale plain released/not_active `Backlog -> Ready` reclaim. Evidence: `npm run test:orchestrator -- --run orchestrator/tests/ProviderIssueHandoff.test.ts -t "prioritizes the autopilot-promoted stale Backlog released not-active reclaim"`.
- [x] Parent focused assertion for `last_delivery_id=null`. Evidence: focused regression fixture and state assertion in `orchestrator/tests/ProviderIssueHandoff.test.ts`.
- [x] Parent focused no-manual-worker-start proof. Evidence: focused regression uses same-cycle poll/refetch dispatch and no manual worker-start helper.
- [x] Parent adjacent behavior review for `CO-212` and `CO-216`. Evidence: scoped adjacent provider handoff test command covering autopilot refetch, stale Backlog/Blocked released reclaim, retained Blocked release, and Ready plain released not-active cases.
- [x] Parent docs-review / `node scripts/spec-guard.mjs --dry-run` after patch import. Evidence: `node scripts/spec-guard.mjs --dry-run` passed; docs-review child stream reached a baseline-only docs freshness blocker with `blocking_changed_paths=[]` at `.runs/linear-711a91d3-4a12-4c97-94b4-d4edcf3a47bf-docs-review/cli/2026-04-21T06-15-50-020Z-51b372f5/manifest.json`.
- [x] Parent required validation/review/elegance gates before PR handoff. Evidence: delegation guard, spec guard, build, lint, test, docs:check, repo:stewardship, diff-budget passed; standalone review telemetry `review_outcome=bounded-success`; elegance evidence `out/linear-711a91d3-4a12-4c97-94b4-d4edcf3a47bf/manual/elegance-review.md`.
- [x] Docs freshness status is isolated to standing baseline debt, not this diff. Evidence: `npm run docs:freshness` has `missing_registry=0` and stale baseline count; `npm run docs:freshness:maintain` reports `blocking_changed_paths=[]`; follow-up `CO-287` filed for canonical owner `docs:freshness:maintain`.

## Progress Log
- 2026-04-21: Bounded same-issue child lane refreshed the `CO-281` docs-first packet after the prior docs-packet artifact became stale at accept time. The packet preserves `control host`, `operator-autopilot`, `Backlog -> Ready`, `provider-intake-state.json`, `released`, `provider_issue_released:not_active`, `stale Backlog cache`, `fresh_discovery`, `reclaim`, `CO-240`, `last_delivery_id=null`, and explicitly rejects `CO-212` completed-blocker scope, `CO-216` manual-demotion scope, pure capacity, manual worker start, and generic concurrency/capacity rewrites.
- 2026-04-21: Parent implementation prioritizes operator-autopilot transitioned/noop issue IDs during the same-cycle refetch dispatch, so a promoted stale Backlog row cannot lose the single available provider slot to unrelated Ready work before its cached intake row is refreshed.
