# Task Mirror - linear-29b67d32-a612-489f-a1ac-8fd9cc4a9b5d

- Linear Issue: `CO-546` / `29b67d32-a612-489f-a1ac-8fd9cc4a9b5d`
- Task registry id: `20260516-linear-29b67d32-a612-489f-a1ac-8fd9cc4a9b5d`
- Primary checklist: `tasks/tasks-linear-29b67d32-a612-489f-a1ac-8fd9cc4a9b5d.md`
- PRD: `docs/PRD-linear-29b67d32-a612-489f-a1ac-8fd9cc4a9b5d.md`
- TECH_SPEC: `tasks/specs/linear-29b67d32-a612-489f-a1ac-8fd9cc4a9b5d.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-29b67d32-a612-489f-a1ac-8fd9cc4a9b5d.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-29b67d32-a612-489f-a1ac-8fd9cc4a9b5d.md`

## Current Scope
- Attach live Linear issue metadata to rehydrated accepted `provider_issue_rehydration_pending_revalidation` claims.
- Allow existing-claim issue-by-id revalidation to use configured Linear source binding when broad `dispatch_pilot.enabled` admission is disabled.
- Release live non-runnable stale pending claims out of active WIP.
- Preserve fail-closed pending state when live evidence is unavailable.
- Add focused CO-510/CO-512-shaped regression coverage.

## Status
- [x] Live post-CO-544 validation evidence captured.
- [x] Workpad created.
- [x] Parallelization decision recorded.
- [x] Docs-first packet created.
- [x] Implementation and validation.
- [x] Rework source-binding fix and validation.
- [ ] Post-merge control-host restart proof.
- [ ] Review handoff.

## Validation Evidence
- Build, lint, full core test, docs:check, repo:stewardship, spec-guard, diff-budget, and pack:smoke passed.
- Focused Codex-feedback pending-revalidation slice passed 6 tests; full `ProviderIssueHandoff` passed 419 tests.
- Full `npm run test` passed 360 files / 5652 tests.
- `docs:freshness` remains blocked by existing repo-wide stale-doc baseline debt, not missing CO-546 packet coverage.
- Post-PR #820 rework evidence: control-host stayed stale at merge commit `cb410d20b7`; direct Linear issue-by-id lookup succeeded with configured source binding, while control-host recover skipped with `dispatch_source_disabled`.
- Rework validation passed: `TrackerDispatchPilot` 21 tests, focused pending-revalidation slice 16 tests, build, lint with existing `DelegationMcpHealth.test.ts` warnings only, full core suite 360 files / 5658 tests, delegation guard with desktop subagent override, spec guard, docs:check, repo:stewardship, diff-budget, pack:smoke, `git diff --check`, JSON parsing, and gpt-5.5/xhigh model-backed review with `review_verdict=clean`.
- Rework `docs:freshness` remains blocked by existing repo-wide stale-doc baseline debt: 286 stale docs and 10 strict docs approaching expiry.

## Fallback Decision Table
- Large-refactor decision: not required; reuse the existing live issue resolver/release helper.
- Minor-seam decision: acceptable because this removes stale cached active-WIP authority and retains only explicit fail-closed pending state for missing live evidence.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Accepted pending-revalidation rehydrate | Cached accepted row can be preserved without live Linear metadata. | `remove fallback` | CO-546 | Rehydrate sees accepted `provider_issue_rehydration_pending_revalidation` with no matching run. | Existing provider-intake rehydrate behavior | 2026-05-16 | This issue | Live non-runnable Linear state attaches and releases/downgrades the claim. | Focused CO-510/CO-512-shaped regression. |
| Existing-claim source binding | Direct issue-by-id refresh is tied to broad `dispatch_pilot.enabled` admission state. | `remove fallback` | CO-546 | Control-host revalidation needs live issue metadata for an existing claim while dispatch pilot is disabled. | Existing dispatch-source setup sharing | 2026-05-16 | This issue | Existing-claim revalidation can use configured Linear source binding without enabling dispatch. | Regression with disabled dispatch pilot and configured live Linear source binding. |
| Missing live issue evidence | Claim remains pending instead of treating cache as clean. | `justify retaining fallback` | Provider-intake control-host | Linear issue lookup is unavailable, skipped, or degraded. | Existing provider-intake safety contract | 2026-05-16 | Durable safety contract | Separate reviewed replacement proves equivalent source-truth-loss behavior. | Regression preserves fail-closed pending state on unavailable evidence. |

- Contract name: provider-intake revalidation fail-closed cache state.
- Owning surface: provider-intake control-host claim refresh.
- Steady-state proof: absent live Linear issue evidence remains visible as accepted pending revalidation and never becomes clean active-worker truth.
- Tests/docs: focused ProviderIssueHandoff regressions plus CO-546 docs packet/checklist.
- Non-expiring rationale: durable source-truth-loss safety contract; remove only after a reviewed replacement proves equivalent fail-closed behavior.

## Not Done If
- Cached `issue_state=In Progress` remains active for a live `Blocked` pending-revalidation claim.
- `dispatch_pilot.enabled=false` prevents existing-claim pending revalidation from using the configured Linear source binding.
- Missing live evidence fail-opens.
- The lane relaunches blocked issues or manually edits `provider-intake-state.json`.
