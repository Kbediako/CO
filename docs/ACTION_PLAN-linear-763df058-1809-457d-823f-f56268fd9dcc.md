# ACTION_PLAN - CO: Evaluate Telemetry-First Dynamic Provider-Worker Reasoning Selection After Docs-First Approval

## Summary
- Goal: close `CO-17` with a truthful docs-first recommendation on dynamic provider-worker reasoning selection, including a staged future experiment only if the idea is still worth revisiting.
- Scope: baseline source audit, live Linear team estimation confirmation, docs-first packet, audited docs-review, required docs-only validation, and review-ready closeout.
- Assumptions: CO keeps the current global `xhigh` baseline today; live CO team estimation remains disabled; adjacent landed provider-worker lanes already own review/drain/delegation truth ahead of any future cost-routing work.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: preserve `telemetry-first`, `dynamic provider-worker reasoning selection`, `docs-first approval`, `xhigh`, `CODEX_CONFIG_OVERRIDES`, `issueEstimationType`, and `Do not change dispatch ordering`.
- Not done if:
  - the packet does not make a clear now/later recommendation
  - the packet depends on Linear estimate today
  - the packet weakens docs-first `xhigh`
  - the packet omits an explicit future experiment sequence if the idea remains open
- Pre-implementation issue-quality review:
  - the current issue is narrower than an implementation lane and should remain docs-only
  - the packet must compare current code truth plus adjacent landed backlog, not reopen those lanes

## Milestones & Sequencing
1. Capture the baseline audit: current defaults, runtime launch behavior, proof token telemetry, related backlog context, and live team estimation posture.
2. Draft and register the docs-first packet, mirrored checklist, and workpad, then run an audited docs-review child stream.
3. Run the required docs-only validation and prepare PR/review handoff if the packet remains clean.

## Dependencies
- `AGENTS.md`
- `orchestrator/src/cli/providerLinearWorkerRunner.ts`
- `orchestrator/src/cli/control/linearDispatchSource.ts`
- `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
- `orchestrator/src/cli/codexDefaultsSetup.ts`
- `orchestrator/src/cli/runtime/codexCommand.ts`
- `orchestrator/src/cli/runtime/provider.ts`
- `docs/PRD-linear-9d962236-4c38-4b28-b144-007c6f3a1395.md`
- `docs/TECH_SPEC-linear-4848ec97-cfab-45d9-9023-79107b496526.md`
- `docs/TECH_SPEC-linear-cc7d12e3-eabf-4168-827e-b3a023583e22.md`
- `docs/TECH_SPEC-linear-488135bf-954e-4bd9-be7a-ad09d75f5f29.md`
- `docs/TECH_SPEC-linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514.md`

## Validation
- Checks / tests:
  - maintain the single Linear workpad comment via `linear upsert-workpad`
  - `MCP_RUNNER_TASK_ID=linear-763df058-1809-457d-823f-f56268fd9dcc "/opt/homebrew/Cellar/node/25.2.1/bin/node" "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-17-docs-review-refresh --format json`
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - manifest-backed `npm run review` plus explicit elegance review before any review-state handoff if the docs diff remains non-trivial
- Rollback plan:
  - revert the packet, registry updates, and workpad snapshot together if docs-review shows the recommendation overclaims current CO behavior or misses the live estimation posture

## Risks & Mitigations
- Risk: the packet proposes premature automation from weak signals. Mitigation: require truthful token telemetry and explicit issue/run metadata before any pilot.
- Risk: the packet treats disabled estimation as "close enough" for routing. Mitigation: record the live `issueEstimationType = "notUsed"` posture as a hard blocker for estimate-driven routing today.
- Risk: the packet accidentally weakens docs-first authoring quality. Mitigation: keep `xhigh` as a non-negotiable current baseline in the PRD and TECH_SPEC.

## Approvals
- Reviewer: Pending `docs-review`
- Date: 2026-04-09
