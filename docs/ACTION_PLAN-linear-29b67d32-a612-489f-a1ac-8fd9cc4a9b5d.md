# ACTION_PLAN - CO-546 attach live Linear state to rehydrated pending-claim revalidation

## Traceability
- Linear issue: `CO-546` / `29b67d32-a612-489f-a1ac-8fd9cc4a9b5d`
- PRD: `docs/PRD-linear-29b67d32-a612-489f-a1ac-8fd9cc4a9b5d.md`
- TECH_SPEC: `tasks/specs/linear-29b67d32-a612-489f-a1ac-8fd9cc4a9b5d.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-29b67d32-a612-489f-a1ac-8fd9cc4a9b5d.md`
- Checklist: `tasks/tasks-linear-29b67d32-a612-489f-a1ac-8fd9cc4a9b5d.md`

## Current Evidence
- CO-544 merged, then live control-host validation still showed CO-510 and CO-512 active provider-intake accepted claims with `reason=provider_issue_rehydration_pending_revalidation`, stale cached `issue_state=In Progress`, and `live_linear_state=null`.
- Fresh issue-context reads showed CO-510 and CO-512 are `Blocked`.
- Source inspection shows accepted claims without queued retry are rewritten as accepted pending-revalidation in `rehydrateNow` without calling the fresh tracked issue resolver.
- Post-PR #820 rework evidence shows the remaining failure is source binding, not release classification: the control-host resolver calls `resolveLinearWebhookSourceSetup`, which returns `dispatch_source_disabled` when `dispatch_pilot.enabled=false` even though direct issue-by-id lookup succeeds with the configured Linear source binding.

## Plan
1. Register this docs-first packet across task mirrors and freshness registry.
2. Add focused `ProviderIssueHandoff` regression coverage for accepted pending-revalidation cached `In Progress` plus live `Blocked`.
3. Split existing-claim revalidation source binding from broad dispatch-pilot admission so direct issue-by-id refresh can use the configured Linear source binding when `dispatch_pilot.enabled=false`.
4. Implement/retain the narrow rehydrate helper that applies fresh tracked issue release fields before preserving accepted/running/resumable pending-revalidation claims.
5. Preserve fail-closed pending state when live issue lookup is unavailable or skipped.
6. Run focused validation and update the Linear workpad with evidence.
7. Prepare PR/review handoff if validation is clean; manually trigger Codex review if automatic review does not start.

## Validation
- `git diff --check`
- `node -e "JSON.parse(require('node:fs').readFileSync('tasks/index.json','utf8')); JSON.parse(require('node:fs').readFileSync('docs/docs-freshness-registry.json','utf8'))"`
- Focused `ProviderIssueHandoff` tests covering CO-546.
- Focused disabled-dispatch-pilot source-binding test.
- `node scripts/spec-guard.mjs --dry-run`
- Build/lint/docs gates scaled to touched surfaces before PR handoff.

## Risks
- Releasing without live evidence would fail open; tests must prove unavailable evidence preserves pending revalidation.
- Duplicating eligibility logic could drift from CO-544; reuse existing live issue refresh/release helpers.
- Broad status-monitor changes could absorb CO-542; keep this lane limited to CO-546 claim revalidation.

## Fallback Decision Table
- Large-refactor decision: not required; reuse the existing live issue resolver/release helper and split only the source-binding authority for existing-claim revalidation.
- Minor-seam decision: acceptable because this removes stale cached active-WIP authority, keeps broad dispatch-pilot admission disabled, and retains only explicit fail-closed pending state for missing live evidence.

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
