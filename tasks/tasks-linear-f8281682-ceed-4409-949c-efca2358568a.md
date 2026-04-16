# Task Checklist - linear-f8281682-ceed-4409-949c-efca2358568a

- Linear Issue: `CO-202` / `f8281682-ceed-4409-949c-efca2358568a`
- MCP Task ID: `linear-f8281682-ceed-4409-949c-efca2358568a`
- Primary PRD: `docs/PRD-linear-f8281682-ceed-4409-949c-efca2358568a.md`
- TECH_SPEC: `tasks/specs/linear-f8281682-ceed-4409-949c-efca2358568a.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-f8281682-ceed-4409-949c-efca2358568a.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-f8281682-ceed-4409-949c-efca2358568a.md`
- Shared source 0 anchor: `ctx:sha256:5ae2b3954163beab22ebee308568f297c2efcf2072a75cad4ba54c36fbd94562#chunk:c000001`
- Accepted child-lane manifest: `.runs/linear-f8281682-ceed-4409-949c-efca2358568a-plain-not-active-regression/cli/2026-04-16T03-24-44-832Z-087d1c47/manifest.json`

## Docs-First
- [x] PRD drafted for stale plain released/not_active Ready reclaim. Evidence: `docs/PRD-linear-f8281682-ceed-4409-949c-efca2358568a.md`.
- [x] TECH_SPEC drafted with reclaim eligibility, protected terms, adjacent invariant preservation, and validation plan. Evidence: `tasks/specs/linear-f8281682-ceed-4409-949c-efca2358568a.md`.
- [x] ACTION_PLAN drafted for child-lane test coverage, parent implementation, validation, and review handoff. Evidence: `docs/ACTION_PLAN-linear-f8281682-ceed-4409-949c-efca2358568a.md`.
- [x] Pre-implementation issue-quality review recorded in spec notes. Evidence: `tasks/specs/linear-f8281682-ceed-4409-949c-efca2358568a.md` readiness gate.
- [x] Registry and mirrors updated: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, docs TECH_SPEC mirror, and `.agent/task` mirror. Evidence: those files.

## Child-Lane Scope
- [x] Parent recorded same-issue `parallelize_now` / `independent_scope_available` decision for focused test coverage. Evidence: Linear parallelization record for `f8281682-ceed-4409-949c-efca2358568a`.
- [x] Child lane `plain-not-active-regression` completed successfully. Evidence: `.runs/linear-f8281682-ceed-4409-949c-efca2358568a-plain-not-active-regression/cli/2026-04-16T03-24-44-832Z-087d1c47/manifest.json`.
- [x] Parent accepted the child-lane patch before source implementation refinement. Evidence: child-lane accept record at `2026-04-16T03:30:48.947Z`.
- [x] Child lane stayed scoped to `orchestrator/tests/ProviderIssueHandoff.test.ts`; parent owns source implementation and final validation.

## Implementation Acceptance
- [x] Plain `released` / `provider_issue_released:not_active` rows with stale cached `issue_state=Blocked` and `issue_state_type=started` are recheckable instead of fail-closed when cached workflow state is non-terminal, non-active, and non-handoff. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts`.
- [x] Live Ready/unstarted issue truth can reclaim the issue through fresh discovery when no blockers and no live same-issue worker exist. Evidence: `orchestrator/tests/ProviderIssueHandoff.test.ts`.
- [x] Released-pending-reopen behavior remains covered. Evidence: focused provider handoff regression suite.
- [x] Terminal pruning and same-issue live-worker behavior remain covered. Evidence: focused CO STATUS/runtime projection slice.
- [x] The fix retains provider-intake evidence and does not rely on deleting local state. Evidence: source implementation uses eligibility/recheck helpers only.

## Validation
- [x] Focused stale plain released/not_active Ready reclaim regression passed. Evidence: `npx vitest run --config vitest.config.core.ts orchestrator/tests/ProviderIssueHandoff.test.ts -t "reclaims a Ready plain released not-active claim with stale cached Blocked state"`.
- [x] Broader provider handoff and refresh serialization suites passed. Evidence: `npx vitest run --config vitest.config.core.ts orchestrator/tests/ProviderIssueHandoff.test.ts orchestrator/tests/ProviderIssueHandoffRefreshSerialization.test.ts`.
- [x] CO STATUS/runtime adjacent invariant slice passed. Evidence: focused `orchestrator/tests/ControlRuntime.test.ts` command in the action plan.
- [x] `node scripts/delegation-guard.mjs` passed after task registration.
- [x] `node scripts/spec-guard.mjs --dry-run` passed after task registration.
- [x] Required validation floor passed: `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, and `node scripts/diff-budget.mjs`.
- [x] Manifest-backed standalone review and explicit elegance review completed before PR handoff. Evidence: review telemetry `.runs/linear-f8281682-ceed-4409-949c-efca2358568a/cli/2026-04-16T03-19-06-013Z-48d74a2f/review/telemetry.json`; elegance artifact `out/linear-f8281682-ceed-4409-949c-efca2358568a/manual/elegance-review.md`.
- [ ] PR created or updated, attached to Linear, checks green, and `pr ready-review` drain clean before review-state transition.

## Handoff
- [ ] Workpad refreshed with final validation, review/elegance status, PR link, and handoff state.
- [ ] Issue moved to `In Review` only after required validation, attached PR, green checks, and clean feedback drain.

## Progress Log
- 2026-04-16: Parent moved `CO-202` from `Ready` to `In Progress`, created the single workpad, recorded the required pre-turn decomposition and parallelization decision, launched and accepted child lane `plain-not-active-regression`, implemented stale plain released/not_active reclaim eligibility, and added focused regression coverage.
- 2026-04-16: Parent added this docs-first packet after `delegation-guard` exposed missing task registration; the accepted child-lane manifest remains the intended delegation evidence path.
- 2026-04-16: Required validation floor passed; standalone review completed with `review_outcome=bounded-success` and no actionable findings; explicit elegance review found no simplification patch needed.
