# Task Checklist - linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9

- Linear Issue: `CO-289` / `30d86aaa-8afb-4e47-8de1-f2ab493a15a9`
- MCP Task ID: `linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9`
- Primary PRD: `docs/PRD-linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md`
- TECH_SPEC: `tasks/specs/linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md`
- Source anchor: `ctx:sha256:6c59a269dfa69e9b7db180869f29ed426f66424f7f5cab6c4650cd494af19246#chunk:c000001`
- Declared child-lane manifest: `.runs/linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9-co289-docs-packet/cli/2026-04-21T06-56-20-392Z-b41cf2db/manifest.json`

## Docs-First
- [x] PRD drafted for the `CO-289` provider-worker rehydrated active-run provenance seam. Evidence: `docs/PRD-linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md`.
- [x] TECH_SPEC drafted with protected terms, wrong interpretations to reject, non-goals, `Not done if`, acceptance criteria, and the `CO-244` / `CO-216` boundary. Evidence: `tasks/specs/linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md`, `docs/TECH_SPEC-linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md`.
- [x] ACTION_PLAN drafted for parent-owned implementation and focused validation. Evidence: `docs/ACTION_PLAN-linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md`.
- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated for this packet. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Checklist mirrored to `.agent/task/linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md`. Evidence: `.agent/task/linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md`.
- [x] Pre-implementation issue-quality review recorded in the spec notes. Evidence: `tasks/specs/linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md`.

## Child Lane Scope
- [x] Stayed within docs phase and declared file scope. Evidence: changed files are limited to the six packet/checklist files plus `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- [x] Did not call Linear mutation helpers. Evidence: no Linear mutation commands were run by this child lane.
- [x] Did not run full repo validation suites. Evidence: only JSON parse, protected-term grep, and diff whitespace checks were planned for this docs scope.
- [x] Source payload absence recorded truthfully. Evidence: PRD/spec traceability notes that the declared `.runs/.../source-0/source.txt` path is absent in this child checkout.

## Parent Implementation Acceptance
- [x] Parent audits every `provider_issue_rehydrated_active_run` writer in `providerIssueHandoff.ts`. Evidence: `rg -n "provider_issue_rehydrated_active_run|launch_source: undefined|launch_token: undefined" orchestrator/src/cli/control/providerIssueHandoff.ts`.
- [x] Parent derives claim launch provenance from complete matching manifest evidence: `provider_launch_source`, `provider_control_host_task_id`, and `provider_control_host_run_id`. Evidence: `resolveRehydratedActiveRunLaunchProvenance` requires a matching active-run manifest tuple.
- [x] Rehydrated claims no longer persist as `launch_source: null` when attached manifest provenance is valid. Evidence: `ProviderIssueHandoffRefreshSerialization.test.ts` active-run rehydration regression.
- [x] Same-issue `linear child-lane` succeeds for a valid rehydrated parent. Evidence: `ProviderLinearChildLaneShell.test.ts` success coverage remains green, and the parent claim preserves launch provenance only for valid active-run evidence.
- [x] Missing, stale, conflicting, or non-control-host provenance still fails with `provider_worker_child_lane_provenance_invalid`. Evidence: focused stale/mismatch regressions plus child-lane diagnostic coverage.
- [x] `CO-244` remains a completed manifest-side prerequisite rather than the implementation scope. Evidence: implementation consumes the existing manifest tuple and does not backfill or redesign manifest provenance.
- [x] `CO-216` operator-autopilot backlog-promotion/manual-demotion logic remains untouched. Evidence: changed implementation files are limited to provider rehydration provenance and child-lane diagnostics.

## Validation
- [x] JSON parse check for `tasks/index.json` and `docs/docs-freshness-registry.json`. Evidence: `node -e "JSON.parse(require('node:fs').readFileSync('tasks/index.json','utf8')); JSON.parse(require('node:fs').readFileSync('docs/docs-freshness-registry.json','utf8'));"` exited `0`.
- [x] Protected-term grep over the six packet/checklist files. Evidence: `rg -n "provider_issue_rehydrated_active_run|provider_control_host_task_id|provider_control_host_run_id|provider_launch_source|launch_source: null|provider_worker_child_lane_provenance_invalid|linear child-lane|CO-244|CO-216" docs/PRD-linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md docs/TECH_SPEC-linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md docs/ACTION_PLAN-linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md tasks/specs/linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md tasks/tasks-linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md .agent/task/linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md` exited `0`.
- [x] `git diff --check` over the declared file scope. Evidence: `git diff --check -- docs/PRD-linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md docs/TECH_SPEC-linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md docs/ACTION_PLAN-linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md tasks/specs/linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md tasks/tasks-linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md .agent/task/linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json` exited `0`.
- [x] Scoped final-newline/trailing-whitespace check covered all declared files, including untracked packet files. Evidence: Node file scan over the nine declared files exited `0`.
- [x] Parent targeted provider handoff/intake/child-lane tests complete before review handoff. Evidence: `npx vitest run orchestrator/tests/ProviderIssueHandoff.test.ts orchestrator/tests/ProviderIssueHandoffRefreshSerialization.test.ts orchestrator/tests/ProviderLinearChildLaneShell.test.ts` passed with 434 tests.
- [x] Full validation rerun completed after the second standalone-review fix. Evidence: `CI=1 npm run test > .runs/linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9/full-test.log 2>&1` exited `0`; tail shows 346 files and 4430 tests passed.

## Progress Log
- 2026-04-21: bounded same-issue child lane created the `CO-289` docs-first packet and registry mirrors from the parent-provided protected issue framing. The declared source payload path is absent in this child checkout, so the packet is anchored on the source anchor plus local inspection of `providerIssueHandoff.ts`, `tests/delegation-guard.spec.ts`, and the completed `CO-244` packet.
