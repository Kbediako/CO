# Task Checklist - CO-546 attach live Linear state to rehydrated pending-claim revalidation

- Linear Issue: `CO-546` / `29b67d32-a612-489f-a1ac-8fd9cc4a9b5d`
- Task registry id: `20260516-linear-29b67d32-a612-489f-a1ac-8fd9cc4a9b5d`
- PRD: `docs/PRD-linear-29b67d32-a612-489f-a1ac-8fd9cc4a9b5d.md`
- TECH_SPEC: `tasks/specs/linear-29b67d32-a612-489f-a1ac-8fd9cc4a9b5d.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-29b67d32-a612-489f-a1ac-8fd9cc4a9b5d.md`

## Current Scope
- Attach live Linear issue metadata to rehydrated accepted pending-revalidation claims.
- Allow existing-claim issue-by-id revalidation to use configured Linear source binding when `dispatch_pilot.enabled=false` without enabling broad dispatch admission.
- Release/downgrade live non-runnable pending-revalidation claims out of active WIP.
- Preserve fail-closed pending revalidation when live evidence is unavailable.
- Add CO-510/CO-512-shaped stale cached `In Progress` with live `Blocked` regression coverage.

## Status
- [x] Live post-CO-544 validation evidence captured by parent orchestration.
- [x] Workpad created with decomposition matrix.
- [x] `linear parallelization` decision recorded as `stay_serial` / `single_bounded_change`.
- [x] Docs-first packet created.
- [x] Focused regression added.
- [x] Implementation complete.
- [x] Focused validation passing.
- [x] Full core validation passing.
- [x] Pack smoke passing.
- [x] Workpad updated with evidence.
- [x] Rework root-cause source-binding fix complete.
- [x] Model-backed review clean.
- [ ] Rework validation proves CO-510/CO-512 stale claims release after control-host restart.
- [ ] PR/review handoff complete.

## Validation Evidence
- `git diff --check` passed.
- `node -e "JSON.parse(require('node:fs').readFileSync('tasks/index.json','utf8')); JSON.parse(require('node:fs').readFileSync('docs/docs-freshness-registry.json','utf8'))"` passed.
- `node scripts/spec-guard.mjs --dry-run` passed.
- `npm run build` passed.
- `npm run lint` passed with 3 existing warnings in `orchestrator/tests/DelegationMcpHealth.test.ts`.
- `npm run test:core -- orchestrator/tests/ProviderIssueHandoff.test.ts -t "pending-revalidation|accepted pending-revalidation claims during rehydrate|keeps accepted pending-revalidation claims fail-closed during rehydrate|releases stale running claims during rehydrate"` passed 14 tests.
- 2026-05-16 rework: focused Codex-feedback slice passed 6 tests covering assigned pending reason refresh, queued pending refresh, retry-field clearing on release, fail-closed unavailable evidence, stale running release, and stale refresh rollback.
- `npm run test:core -- orchestrator/tests/ProviderIssueHandoff.test.ts` passed 419 tests.
- `npm run test` passed 360 files / 5652 tests.
- `npm run docs:check` passed.
- `npm run repo:stewardship` passed.
- `node scripts/diff-budget.mjs` passed, working-tree files=13/25 and lines=527/1200.
- `npm run pack:smoke` passed.
- `npm run docs:freshness` failed on existing repo-wide stale-doc baseline: 286 stale docs and 10 strict docs approaching expiry; CO-546 registry rows are present.
- Post-PR #820 rework evidence: restarted control host on merge commit `cb410d20b7` still showed active accepted CO-510/CO-512 claims with cached `issue_state=In Progress`, while live issue-context showed both `Blocked`; direct issue-by-id lookup worked with configured source binding, but `control-host recover` skipped with `dispatch_source_disabled`.
- 2026-05-16 rework: `npm run test:core -- orchestrator/tests/TrackerDispatchPilot.test.ts` passed 21 tests.
- 2026-05-16 rework: `npm run test:core -- orchestrator/tests/ProviderIssueHandoff.test.ts -t "pending-revalidation|revalidation resolver|broad dispatch"` passed 16 tests.
- 2026-05-16 rework: `npm run build` passed.
- 2026-05-16 rework: `npm run lint` passed with the existing 3 warnings in `orchestrator/tests/DelegationMcpHealth.test.ts`.
- 2026-05-16 rework: `npm run test:core -- --reporter=dot` passed 360 files / 5658 tests.
- 2026-05-16 rework: `DELEGATION_GUARD_OVERRIDE_REASON='CO-546 used desktop gpt-5.5/xhigh subagents for root-cause research, quota-hygiene routing, and focused diff review; repo-local child manifests are not produced by desktop spawn_agent.' node scripts/delegation-guard.mjs` passed.
- 2026-05-16 rework: `node scripts/spec-guard.mjs --dry-run`, `npm run docs:check`, `npm run repo:stewardship`, `node scripts/diff-budget.mjs`, `npm run pack:smoke`, `git diff --check`, and JSON parsing for `tasks/index.json` plus `docs/docs-freshness-registry.json` passed.
- 2026-05-16 rework: `npm run docs:freshness` still fails on the existing repo-wide stale-doc baseline: 286 stale docs and 10 strict docs approaching expiry.
- 2026-05-16 rework review: `codex-orchestrator review --manifest .runs/linear-29b67d32-a612-489f-a1ac-8fd9cc4a9b5d/cli/2026-05-16T12-10-28-410Z-ed2414f2/manifest.json --uncommitted --runtime-mode cli` ran on Codex CLI 0.130.0 with `gpt-5.5` / `xhigh` and produced `review_verdict=clean`; telemetry recorded bounded success after a command-intent retry because the first attempt tried to run validation.

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
- A live `Blocked` issue can remain accepted pending-revalidation with stale cached `In Progress` metadata after rehydrate.
- `dispatch_pilot.enabled=false` prevents existing-claim pending revalidation from using the configured Linear source binding.
- Missing live evidence releases or hides the stale claim.
- The fix relaunches CO-510/CO-512 or depends on manual state-file edits.
