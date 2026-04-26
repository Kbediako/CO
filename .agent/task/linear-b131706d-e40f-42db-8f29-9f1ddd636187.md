# Task Checklist - linear-b131706d-e40f-42db-8f29-9f1ddd636187

- Linear Issue: `CO-392` / `b131706d-e40f-42db-8f29-9f1ddd636187`
- MCP Task ID: `linear-b131706d-e40f-42db-8f29-9f1ddd636187`
- Primary PRD: `docs/PRD-linear-b131706d-e40f-42db-8f29-9f1ddd636187.md`
- TECH_SPEC: `tasks/specs/linear-b131706d-e40f-42db-8f29-9f1ddd636187.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-b131706d-e40f-42db-8f29-9f1ddd636187.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-b131706d-e40f-42db-8f29-9f1ddd636187.md`
- Parent manifest: `.runs/linear-b131706d-e40f-42db-8f29-9f1ddd636187/cli/2026-04-26T10-05-24-694Z-37794f20/manifest.json`
- Source anchor: `ctx:sha256:237922429b5f977c9299537a72c7887f30919f1a156eb0289092c2b5f9a1065b#chunk:c000001`

## Docs-First
- [x] Source payload availability checked. Evidence: `.runs/linear-b131706d-e40f-42db-8f29-9f1ddd636187/cli/2026-04-26T10-05-24-694Z-37794f20/memory/source-0/source.txt`.
- [x] PRD drafted for CO-392. Evidence: `docs/PRD-linear-b131706d-e40f-42db-8f29-9f1ddd636187.md`.
- [x] TECH_SPEC drafted with protected terms, parity matrix, and adjacent-lane boundary. Evidence: `tasks/specs/linear-b131706d-e40f-42db-8f29-9f1ddd636187.md`, `docs/TECH_SPEC-linear-b131706d-e40f-42db-8f29-9f1ddd636187.md`.
- [x] ACTION_PLAN drafted. Evidence: `docs/ACTION_PLAN-linear-b131706d-e40f-42db-8f29-9f1ddd636187.md`.
- [x] Checklist mirrored to `.agent/task`. Evidence: `.agent/task/linear-b131706d-e40f-42db-8f29-9f1ddd636187.md`.
- [x] Registry mirrors updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Docs-review manifest captured. Evidence: `.runs/linear-b131706d-e40f-42db-8f29-9f1ddd636187-docs-review/cli/2026-04-26T10-49-31-623Z-16f26867/manifest.json`.

## Implementation
- [x] Same-issue child lane completed and was rejected with parent evidence. Evidence: `.runs/linear-b131706d-e40f-42db-8f29-9f1ddd636187-co379-live-started-regression/cli/2026-04-26T10-12-26-338Z-f86a07cd/manifest.json`.
- [x] Add focused CO-379-shape regression for stale `Ready/unstarted` released-pending-reopen claim with no `run_id` / no `run_manifest_path` and live `In Progress/started` truth. Evidence: `orchestrator/tests/ProviderIssueHandoffRefreshSerialization.test.ts`.
- [x] Refresh stale live-started metadata during accepted/drained control-host refresh. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts`.
- [x] Reclassify/reclaim/requeue/launch through normal admission path or record an actionable recovery reason instead of silently keeping `released`. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts`.
- [x] Align CO STATUS/provider-intake active/running/admission truth after recovery. Evidence: recovered claim becomes `starting` with live `In Progress/started` metadata and a run identity.
- [x] Preserve CO-193 Ready/unstarted reclaim and CO-189 live-worker duplicate-protection coverage. Evidence: adjacent focused test run plus same-issue unreadable-occupancy regressions in `orchestrator/tests/ProviderIssueHandoffRefreshSerialization.test.ts`.

## Validation
- [x] `node scripts/delegation-guard.mjs` passed with 2 subagent manifests on 2026-04-26 after merging current `origin/main`.
- [x] `node scripts/spec-guard.mjs --dry-run` passed on 2026-04-26 after merging current `origin/main`.
- [x] Focused provider handoff regression(s). Evidence: `npm run test:core -- orchestrator/tests/ProviderIssueHandoffRefreshSerialization.test.ts` passed 40 tests on 2026-04-26 after the PR feedback fix.
- [x] Adjacent CO-193 / CO-189 focused coverage passed 2 selected tests on 2026-04-26 after the fresh-discovery slot fix.
- [x] `npm run build` passed on 2026-04-26 after merging current `origin/main`.
- [x] `npm run lint` passed on 2026-04-26 after merging current `origin/main` with 3 pre-existing warnings in `orchestrator/tests/DelegationMcpHealth.test.ts`.
- [x] `npm run test` passed on 2026-04-26 after the PR feedback fix: 355 files, 4929 tests.
- [x] `npm run docs:check` passed on 2026-04-26 after merging current `origin/main`.
- [x] `npm run docs:freshness` passed on 2026-04-26 after merging current `origin/main`: 4827 docs, 4830 registry entries.
- [x] `npm run repo:stewardship` passed on 2026-04-26 after merging current `origin/main`: 5950 tracked files, 0 action-required.
- [x] `node scripts/diff-budget.mjs` passed on 2026-04-26 after the PR feedback fix: working-tree files 5/25, lines 77/1200; advisory stacked aggregate files 9/25, lines 1033/1200.
- [x] Manifest-backed forced standalone review completed on 2026-04-26 after the PR feedback fix. Evidence: `.runs/linear-b131706d-e40f-42db-8f29-9f1ddd636187/cli/2026-04-26T10-05-24-694Z-37794f20/review/telemetry.json` reports `status=succeeded` and `review_outcome=clean-success`.
- [x] Explicit elegance/minimality pass completed after the PR feedback fix. Evidence: `out/linear-b131706d-e40f-42db-8f29-9f1ddd636187/manual/elegance-review.md`.
- [ ] PR attach and ready-review drain before review transition

## Progress Log
- 2026-04-26: Parent confirmed CO-392 was already `In Progress`, created/updated the single workpad, recorded `parallelize_now` / `independent_scope_available`, launched child lane `co379-live-started-regression`, and rejected its completed patch because it tested fresh discovery rather than the required direct issue-by-id recovery path.
- 2026-04-26: Drafted CO-392 docs-first packet and registry mirrors, then implemented the bounded one-probe live-started no-run pending-reopen recovery path.
- 2026-04-26: Focused `ProviderIssueHandoffRefreshSerialization.test.ts` passed with the CO-379-shape regression.
- 2026-04-26: Docs-review surfaced a high-signal P1 that the live-start probe could bypass same-issue unreadable/foreign occupancy. Parent fixed the probe to skip occupied provider keys and added a regression where unreadable same-issue occupancy blocks the direct probe while capacity remains available.
- 2026-04-26: Core validation reran after the P1 fix: focused refresh suite, adjacent CO-193/CO-189 tests, build, lint, full test, docs gates, repo stewardship, and diff budget all passed.
- 2026-04-26: Forced standalone review surfaced a P2 capped-admission gap: a successful live-start probe followed by state-specific capacity exhaustion could preserve stale pending-reopen metadata. Parent fixed the capped path to route live-started no-run pending-reopen claims through normal admission for both special-probe and normally budgeted direct-read paths, which writes live metadata plus `provider_issue_refresh_start_blocked:max_concurrency`, and added a state-cap regression.
- 2026-04-26: Full validation reran after the capped-admission fix: focused refresh suite, adjacent CO-193/CO-189 tests, delegation/spec guards, build, lint, full test, docs gates, repo stewardship, and diff budget all passed.
- 2026-04-26: Forced standalone review then surfaced a P1 normally budgeted direct-read occupancy gap: the capped live-start launch branch could ignore same-issue unreadable/foreign occupancy when the direct read did not use the special probe slot. Parent fixed that branch to carry the occupied-provider veto and added a normally budgeted same-issue unreadable-occupancy regression.
- 2026-04-26: Full validation reran after the occupied-provider veto fix: focused refresh suite, adjacent CO-193/CO-189 tests, delegation/spec guards, build, lint, full test, docs gates, repo stewardship, and diff budget all passed.
- 2026-04-26: Merged current `origin/main` and reran validation: focused refresh suite, adjacent CO-193/CO-189 tests, delegation/spec guards, build, lint, full test, docs gates, repo stewardship, and diff budget all passed.
- 2026-04-26: Forced standalone review then surfaced a P1 normal-launch occupancy gap: when dispatch budget still permitted a start, same-issue unreadable/foreign occupancy could bypass the capped-branch guard and fall through to the normal launch. Parent added the occupied-provider veto before both released-claim launch paths and changed the normally budgeted unreadable-occupancy regression to keep spare dispatch capacity.
- 2026-04-26: Full validation reran after the normal-launch occupied-provider veto fix: focused refresh suite, adjacent CO-193/CO-189 tests, delegation/spec guards, build, lint, full test, docs gates, repo stewardship, and diff budget all passed.
- 2026-04-26: Forced standalone review then surfaced a P2 fresh-discovery slot gap: a non-special live-start path could consume the state slot reserved for fresh discovery. Parent fixed the bypass condition, widened pending-reopen metadata refresh so preserved-slot claims update to live started truth, and added a reserved state-slot regression.
- 2026-04-26: Full validation reran after the fresh-discovery slot fix: focused refresh suite, adjacent CO-193/CO-189 tests, delegation/spec guards, build, lint, full test, docs gates, repo stewardship, and diff budget all passed. Final forced standalone review completed with `review_outcome=bounded-success`, and explicit elegance review found no simplification patch needed.
- 2026-04-26: Merged latest `origin/main` again after review/elegance, resolved the docs freshness registry conflict by preserving both CO-392 and incoming main entries, and reran post-merge gates: delegation guard, spec guard, build, lint, full test, docs:check, docs:freshness, repo:stewardship, and diff-budget all passed.
- 2026-04-26: Addressed PR feedback: added missing parity-table blank lines, moved the no-run pending-reopen live-started probe usage flag into the direct issue-by-id callback, and added a poll-snapshot reserved-slot regression. Post-feedback validation, manifest-backed standalone review, and elegance pass passed.

## Notes
- Do not hand-edit or delete `provider-intake-state.json` as the fix.
- Keep this lane distinct from CO-193, CO-238, CO-181, CO-391, CO-389, and CO-390.
- No app runtime proof is required; this is a control-host/provider-intake lane.
