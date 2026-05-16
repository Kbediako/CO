# Task Checklist - CO-546 attach live Linear state to rehydrated pending-claim revalidation

- Linear Issue: `CO-546` / `29b67d32-a612-489f-a1ac-8fd9cc4a9b5d`
- Task registry id: `20260516-linear-29b67d32-a612-489f-a1ac-8fd9cc4a9b5d`
- PRD: `docs/PRD-linear-29b67d32-a612-489f-a1ac-8fd9cc4a9b5d.md`
- TECH_SPEC: `tasks/specs/linear-29b67d32-a612-489f-a1ac-8fd9cc4a9b5d.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-29b67d32-a612-489f-a1ac-8fd9cc4a9b5d.md`

## Current Scope
- Attach live Linear issue metadata to rehydrated accepted pending-revalidation claims.
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
- [ ] PR/review handoff complete.

## Validation Evidence
- `git diff --check` passed.
- `node -e "JSON.parse(require('node:fs').readFileSync('tasks/index.json','utf8')); JSON.parse(require('node:fs').readFileSync('docs/docs-freshness-registry.json','utf8'))"` passed.
- `node scripts/spec-guard.mjs` passed.
- `npm run build` passed.
- `npm run lint` passed with 3 existing warnings in `orchestrator/tests/DelegationMcpHealth.test.ts`.
- `npm run test:core -- orchestrator/tests/ProviderIssueHandoff.test.ts -t "pending-revalidation|accepted pending-revalidation claims during rehydrate|keeps accepted pending-revalidation claims fail-closed during rehydrate|releases stale running claims during rehydrate"` passed 14 tests.
- 2026-05-16 rework: focused Codex-feedback slice passed 6 tests covering assigned pending reason refresh, queued pending refresh, retry-field clearing on release, fail-closed unavailable evidence, stale running release, and stale refresh rollback.
- `npm run test:core -- orchestrator/tests/ProviderIssueHandoff.test.ts` passed 419 tests.
- `npm run test` passed 360 files / 5652 tests.
- `npm run docs:check` passed.
- `npm run repo:stewardship` passed.
- `node scripts/diff-budget.mjs` passed, working-tree files=6/25 and lines=179/1200; stacked aggregate files=9/25 and lines=889/1200 advisory only.
- `npm run pack:smoke` passed.
- `npm run docs:freshness` failed on existing repo-wide stale-doc baseline: 286 stale docs and 10 strict docs approaching expiry; CO-546 registry rows are present.

## Fallback Decision Table
- Large-refactor decision: not required; reuse the existing live issue resolver/release helper.
- Minor-seam decision: acceptable because this removes stale cached active-WIP authority and retains only explicit fail-closed pending state for missing live evidence.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Accepted pending-revalidation rehydrate | Cached accepted row can be preserved without live Linear metadata. | `remove fallback` | CO-546 | Rehydrate sees accepted `provider_issue_rehydration_pending_revalidation` with no matching run. | Existing provider-intake rehydrate behavior | 2026-05-16 | This issue | Live non-runnable Linear state attaches and releases/downgrades the claim. | Focused CO-510/CO-512-shaped regression. |
| Missing live issue evidence | Claim remains pending instead of treating cache as clean. | `justify retaining fallback` | Provider-intake control-host | Linear issue lookup is unavailable, skipped, or degraded. | Existing provider-intake safety contract | 2026-05-16 | Durable safety contract | Separate reviewed replacement proves equivalent source-truth-loss behavior. | Regression preserves fail-closed pending state on unavailable evidence. |

- Contract name: provider-intake revalidation fail-closed cache state.
- Owning surface: provider-intake control-host claim refresh.
- Steady-state proof: absent live Linear issue evidence remains visible as accepted pending revalidation and never becomes clean active-worker truth.
- Tests/docs: focused ProviderIssueHandoff regressions plus CO-546 docs packet/checklist.
- Non-expiring rationale: durable source-truth-loss safety contract; remove only after a reviewed replacement proves equivalent fail-closed behavior.

## Not Done If
- A live `Blocked` issue can remain accepted pending-revalidation with stale cached `In Progress` metadata after rehydrate.
- Missing live evidence releases or hides the stale claim.
- The fix relaunches CO-510/CO-512 or depends on manual state-file edits.
