# Task Mirror - linear-c8f25aac-5bc5-4210-8fc5-a143d6b14df0

- Linear Issue: `CO-544` / `c8f25aac-5bc5-4210-8fc5-a143d6b14df0`
- Task registry id: `20260516-linear-c8f25aac-5bc5-4210-8fc5-a143d6b14df0`
- Primary checklist: `tasks/tasks-linear-c8f25aac-5bc5-4210-8fc5-a143d6b14df0.md`
- PRD: `docs/PRD-linear-c8f25aac-5bc5-4210-8fc5-a143d6b14df0.md`
- TECH_SPEC: `tasks/specs/linear-c8f25aac-5bc5-4210-8fc5-a143d6b14df0.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-c8f25aac-5bc5-4210-8fc5-a143d6b14df0.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-c8f25aac-5bc5-4210-8fc5-a143d6b14df0.md`

## Current Scope
- Release/downgrade rehydrated accepted `provider_issue_rehydration_pending_revalidation` claims when live Linear state is non-runnable.
- Preserve fail-closed pending revalidation when live evidence is unavailable.
- Distinguish cached pending revalidation from live active workers in `co-status` and `control-host freshness-gauge`.
- Add CO-510/CO-512-shaped stale cached `In Progress` with live `Blocked` regression coverage.

## Status
- [x] Live issue-context read.
- [x] Workpad created with decomposition matrix.
- [x] Exactly one `linear parallelization` decision recorded.
- [x] Docs-first packet created.
- [x] Pre-implementation docs-review fallback recorded: `.runs/linear-c8f25aac-5bc5-4210-8fc5-a143d6b14df0/cli/2026-05-16T06-53-01-659Z-cca3905f/manifest.json` stopped on existing CO-522 docs-freshness capacity debt with no CO-544 blocking changed paths.
- [x] Implementation and focused validation.
- [x] Elegance/minimality review.
- [x] Parent build and gpt-5.5/xhigh standalone review passed.
- [x] Final closeout guards recorded; `docs:freshness` remains blocked by repo-wide stale-doc baseline debt outside CO-544.
- [x] CI rework for PR #818 Core Lane test failures passed locally.
- [x] Final workpad refresh.

## Fallback Decision Table
- Large-refactor decision: not required; the existing provider-intake refresh path remains the authority for release/downgrade and status classification.
- Minor-seam decision: acceptable because the retained cache state is only a fail-closed source-truth-loss contract, not a new launch path or WIP-capacity bypass.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Rehydrated accepted pending revalidation | Cached accepted row with stale runnable metadata can occupy active WIP before live revalidation releases it. | `remove fallback` | CO-544 | Live Linear state is non-runnable for a rehydrated accepted pending-revalidation claim. | 2026-05-16 | 2026-05-16 | This issue | Live non-runnable state releases/downgrades the claim and excludes it from active WIP. | Focused CO-510/CO-512-shaped regression. |
| Missing live issue evidence | Revalidation cache state stays fail-closed instead of assuming stale cache is clean. | `justify retaining fallback` | Provider-intake control-host | Linear issue evidence is unavailable, incomplete, or degraded. | Existing provider-intake rehydration behavior | 2026-05-16 | Durable safety contract | Separate issue-quality review proves fail-closed pending revalidation is no longer needed. | Regression coverage for unavailable evidence preserving pending/degraded classification. |

- Contract name: provider-intake revalidation fail-closed cache state.
- Owning surface: provider-intake control-host claim refresh.
- Steady-state proof: absent live issue evidence remains visible as degraded cache truth and never becomes clean active-worker truth.
- Tests/docs: focused `ProviderIssueHandoff` and freshness-gauge regressions plus this CO-544 packet.
- Non-expiring rationale: this is a durable source-truth-loss safety contract, not temporary compatibility debt; remove only after a reviewed replacement proves equivalent fail-closed behavior.

## Not Done If
- A live non-runnable issue still consumes active WIP through a rehydrated accepted pending-revalidation claim.
- Missing live evidence fail-opens or silently clears the stale claim.
- Status surfaces hide the issue without fixing supported provider-intake/control-host logic.
- The fix relies on manual `provider-intake-state.json` edits or CO-510/CO-512 special casing.
