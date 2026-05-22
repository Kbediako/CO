# Task Checklist - linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec

- Linear Issue: `CO-406` / `8e9e3747-77fa-4d28-879a-0fdc07fb1eec`
- MCP Task ID: `linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec`
- Primary PRD: `docs/PRD-linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec.md`
- TECH_SPEC: `tasks/specs/linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec.md`

## Evidence Gates
- [x] Issue-quality review captured. Evidence: `tasks/specs/linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec.md` records that this is narrower than CO-404 and broader than a display-only repair.
- [x] Fallback / refactor decision captured. Evidence: spec records `remove fallback` for no-run accepted capacity and `justify retaining fallback` for audit state plus duplicate-launch protection.
- [x] Durable fallback retention evidence captured. Evidence: spec records provider-intake pending-revalidation audit state and duplicate-launch single-flight protection.
- [x] Standalone review approval captured before handoff. Evidence: `.runs/linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec/cli/2026-04-28T03-24-10-840Z-68459578/review/telemetry.json` reports `status=succeeded`, `review_outcome=clean-success`.
- [x] Docs-review manifest captured before implementation. Evidence: attempted manifests `.runs/linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec-docs-review/cli/2026-04-28T03-36-07-064Z-71f62a6f/manifest.json` and `.runs/linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec-docs-review/cli/2026-04-28T03-39-14-364Z-38e264be/manifest.json`; blocked by out-of-scope `docs:freshness:maintain` owner verification/stale baseline debt now filed as `CO-412`.
- [x] Implementation review manifest captured after implementation. Evidence: `.runs/linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec/cli/2026-04-28T03-24-10-840Z-68459578/review/telemetry.json`.

## Parent Tasks
1. Docs-first packet and registration
   - Files: `docs/PRD-linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec.md`, `tasks/specs/linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec.md`, `docs/TECH_SPEC-linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec.md`, `docs/ACTION_PLAN-linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec.md`, `tasks/tasks-linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec.md`, `.agent/task/linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec.md`, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
   - Commands: JSON parse, protected-term scan, docs-review.
   - Acceptance: packet and mirrors exist and docs-review evidence is recorded.
   - [x] Status: Packet complete; docs-review blocked by out-of-scope CO-412 baseline debt.
2. Parent implementation
   - Files: `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/src/cli/control/controlRuntime.ts`, and provider-intake helpers inspected; regression coverage landed in `orchestrator/tests/ProviderIssueHandoff.test.ts` and `orchestrator/tests/ControlRuntime.test.ts`.
   - Commands: focused vitest regressions, build, lint, test.
   - Acceptance: no-run accepted pending-revalidation claims do not consume capacity, same-issue retry does not self-block, and real running/launching duplicate protection remains.
   - [x] Status: Focused implementation evidence complete; source already had the needed non-occupancy predicate and read-model distinction, now pinned by regressions.
3. Same-issue child lane
   - Files: `orchestrator/tests/ProviderIssueHandoff.test.ts`, `orchestrator/tests/ControlRuntime.test.ts`.
   - Commands: child-lane terminal manifest plus parent accept/reject/invalidate action.
   - Acceptance: child lane reaches terminal status and parent reconciles its patch before touching delegated tests.
   - [x] Status: Child terminal success; accept invalidated by stale Linear `updated_at`, then parent ran `git apply --check` and applied the patch manually.
4. Validation and review
   - Files: review telemetry and task checklist.
   - Commands: validation floor, standalone review, elegance pass, diff budget.
   - Acceptance: required checks pass or waivers are explicit and bounded.
   - [x] Status: Current-main validation floor passed except `docs:freshness`, which is waived to `CO-412` because `blocking_changed_paths=[]` and the configured owner `CO-401` is terminal; full-suite timeout reran clean in focused `ControlRuntime` coverage; standalone review rerun completed clean-success and final elegance review found no simplification edits.
5. PR and Linear handoff
   - Files: PR attachment and workpad.
   - Commands: push/open PR, attach PR, merge latest `origin/main`, PR checks, `ready-review`, Linear transition.
   - Acceptance: workpad refreshed and issue moved to `In Review` only after handoff prerequisites.
   - [x] Status: Pending.

## Relevant Files
- `docs/PRD-linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec.md`
- `tasks/specs/linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec.md`
- `docs/ACTION_PLAN-linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec.md`
- `orchestrator/src/cli/control/providerIssueHandoff.ts`
- `orchestrator/src/cli/control/controlRuntime.ts`
- `orchestrator/tests/ProviderIssueHandoff.test.ts`
- `orchestrator/tests/ControlRuntime.test.ts`

## Notes
- Child lane `no-run-capacity-regression` is no longer active; parent owns reconciled tests after stale-metadata invalidation.
- Preserve `provider_issue_rehydration_pending_revalidation`, `provider_issue_start_blocked:max_concurrency`, `running=2`, and `max_allowed=3` terminology.
- CO-404 acknowledgement-timeout behavior is explicitly out of scope.

## CO-575 terminal lifecycle reconciliation

- 2026-05-22: Historical open checklist residue was reconciled under CO-575 after tasks/index and live Linear terminal evidence showed this task is already complete. This allows implementation-docs archival to preserve the full packet on doc-archives without keeping active docs-freshness debt open on main.
