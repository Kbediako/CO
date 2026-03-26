# Task Checklist - linear-df2bd49b-2dd6-413f-8d90-af40d033dace

- MCP Task ID: `linear-df2bd49b-2dd6-413f-8d90-af40d033dace`
- Primary PRD: `docs/PRD-linear-df2bd49b-2dd6-413f-8d90-af40d033dace.md`
- TECH_SPEC: `tasks/specs/linear-df2bd49b-2dd6-413f-8d90-af40d033dace.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-df2bd49b-2dd6-413f-8d90-af40d033dace.md`

## Docs-first
- [x] PRD drafted for the `CO-21` Symphony-style workpad contract lane. Evidence: `docs/PRD-linear-df2bd49b-2dd6-413f-8d90-af40d033dace.md`.
- [x] TECH_SPEC drafted for the same lane. Evidence: `tasks/specs/linear-df2bd49b-2dd6-413f-8d90-af40d033dace.md`, `docs/TECH_SPEC-linear-df2bd49b-2dd6-413f-8d90-af40d033dace.md`.
- [x] ACTION_PLAN drafted for the same lane. Evidence: `docs/ACTION_PLAN-linear-df2bd49b-2dd6-413f-8d90-af40d033dace.md`.
- [x] `tasks/index.json` registers the `CO-21` TECH_SPEC entry. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the `CO-21` snapshot. Evidence: `docs/TASKS.md`.
- [x] Checklist mirrored to `.agent/task/linear-df2bd49b-2dd6-413f-8d90-af40d033dace.md`. Evidence: `.agent/task/linear-df2bd49b-2dd6-413f-8d90-af40d033dace.md`.
- [x] docs-review approved the `CO-21` packet for implementation. Evidence: `.runs/linear-df2bd49b-2dd6-413f-8d90-af40d033dace/cli/2026-03-26T02-33-46-297Z-0fc2e709/manifest.json`.

## Investigation
- [x] Live Linear workflow states and current issue state were rechecked before transition, and the issue was moved from `Ready` to `In Progress`. Evidence: `node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear issue-context --issue-id df2bd49b-2dd6-413f-8d90-af40d033dace --format json`, `node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear transition --issue-id df2bd49b-2dd6-413f-8d90-af40d033dace --state "In Progress" --format json`.
- [x] Bootstrap workpad comment created in the issue with the required core sections. Evidence: `node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear upsert-workpad --issue-id df2bd49b-2dd6-413f-8d90-af40d033dace --body-file <temp> --format json`.
- [x] Required Symphony references were audited before implementation: `SPEC.md`, `elixir/WORKFLOW.md`, `elixir/README.md`, `elixir/lib/symphony_elixir/workflow.ex`, `elixir/lib/symphony_elixir/tracker.ex`, `elixir/lib/symphony_elixir/linear/adapter.ex`. Evidence: those upstream paths plus this docs-first packet.
- [x] Current CO seams were audited before implementation: `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`, `orchestrator/src/cli/providerLinearWorkerRunner.ts`, `skills/linear/SKILL.md`, `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`, `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`, `orchestrator/tests/LinearCliShell.test.ts`.
- [x] Delegation override explicitly recorded for this worker run because subagent spawning is unavailable in-session. Evidence: `DELEGATION_GUARD_OVERRIDE_REASON="Provider worker run could not delegate because spawn_agent is unavailable without explicit user authorization in this session." node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" start docs-review --format json --no-interactive --task linear-df2bd49b-2dd6-413f-8d90-af40d033dace`, `.runs/linear-df2bd49b-2dd6-413f-8d90-af40d033dace/cli/2026-03-26T02-33-46-297Z-0fc2e709/manifest.json`.

## Implementation
- [x] Enforce the stronger workpad body contract in the helper/runtime surface beyond the marker-only rule. Evidence: `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`, `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`.
- [x] Require the stable section structure and normalized checklist expectations for environment/workspace stamp, plan, acceptance criteria, validation, and notes. Evidence: `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`, `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`.
- [x] Mirror ticket-provided `Validation`, `Test Plan`, or `Testing` requirements into the workpad contract when present. Evidence: `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`, `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`.
- [x] Tighten the provider-worker prompt and repo-local `linear` skill to require milestone-driven refreshes and same-workpad terminal closeout. Evidence: `orchestrator/src/cli/providerLinearWorkerRunner.ts`, `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`, `skills/linear/SKILL.md`.
- [x] Add focused regressions for bootstrap creation, milestone refresh, and final or review-handoff refresh expectations. Evidence: `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`, `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`.

## Validation
- [x] `DELEGATION_GUARD_OVERRIDE_REASON="Provider worker run could not delegate because spawn_agent is unavailable without explicit user authorization in this session." node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" start docs-review --format json --no-interactive --task linear-df2bd49b-2dd6-413f-8d90-af40d033dace`. Evidence: `.runs/linear-df2bd49b-2dd6-413f-8d90-af40d033dace/cli/2026-03-26T02-33-46-297Z-0fc2e709/manifest.json`.
- [x] `DELEGATION_GUARD_OVERRIDE_REASON="Provider worker run could not delegate because spawn_agent is unavailable without explicit user authorization in this session." node scripts/delegation-guard.mjs`. Evidence: local command output confirms the override is active.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: local command output; dry-run succeeded while reporting pre-existing stale-spec warnings in `tasks/specs/0955-collab-orchestrator-integration.md` and `tasks/specs/0956-subagents-skill-codex-cli-refresh.md`.
- [x] `npm run build`. Evidence: local command completed successfully after the final parser hardening pass.
- [x] `npm run lint`. Evidence: local command completed successfully after the final parser hardening pass.
- [ ] `npm run test`. Blocked by unrelated existing failures in `orchestrator/tests/Doctor.test.ts` and `orchestrator/tests/RuntimeProvider.test.ts`; the rerun still failed there while the focused Linear slice remained green.
- [x] `npm run docs:check`. Evidence: local command completed successfully.
- [x] `npm run docs:freshness`. Evidence: local command completed successfully (`docs:freshness OK - 2925 docs, 2935 registry entries`).
- [x] `node scripts/diff-budget.mjs`. Evidence: local command completed with `DIFF_BUDGET_OVERRIDE_REASON="Workspace branch already carries unrelated changes against origin/main; CO-21 is limited to the Linear workpad contract packet, helper, skill, and tests."`.
- [x] `npm run review`. Evidence: `.runs/linear-df2bd49b-2dd6-413f-8d90-af40d033dace/cli/2026-03-26T02-14-49-677Z-47502599/review/output.log`.
- [x] `npm run pack:smoke`. Evidence: local command completed successfully (`pack smoke passed`).

## Delivery
- [ ] Open PR for `CO-21`, attach it to Linear, handle feedback, and wait for required checks to reach terminal green. Blocked until the unrelated `npm run test` failures in `orchestrator/tests/Doctor.test.ts` and `orchestrator/tests/RuntimeProvider.test.ts` are resolved or explicitly waived.
- [ ] Verify unresolved actionable review threads = `0` or record a waiver with evidence before moving to `In Review`.
- [ ] Merge the latest `origin/main` into the branch before review handoff, refresh the workpad to match current status and risks, and stop coding once the issue reaches `In Review`.
