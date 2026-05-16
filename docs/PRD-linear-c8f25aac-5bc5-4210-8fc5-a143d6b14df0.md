# PRD - CO-544 release rehydrated blocked provider claims from active WIP

## Traceability
- Linear issue: `CO-544` / `c8f25aac-5bc5-4210-8fc5-a143d6b14df0`
- Linear URL: https://linear.app/asabeko/issue/CO-544/co-release-rehydrated-blocked-provider-claims-from-active-wip
- Task registry id: `20260516-linear-c8f25aac-5bc5-4210-8fc5-a143d6b14df0`
- MCP Task ID: `linear-c8f25aac-5bc5-4210-8fc5-a143d6b14df0`
- Source evidence: live `linear issue-context` on 2026-05-16 plus parent-provided CO-510/CO-512 control-host intake evidence.

## Summary
- Problem Statement: after control-host restart, `provider-intake-state.json` can rehydrate stale accepted claims as active `provider_issue_rehydration_pending_revalidation` rows with cached `issue_state=In Progress`, even when fresh Linear truth shows the issues are `Blocked`. The stale accepted rows consume active WIP before direct issue revalidation can release or downgrade them.
- Desired Outcome: rehydrated accepted claims whose live Linear state is no longer execution-eligible are released or downgraded out of active WIP, while unavailable live evidence still fails closed and remains visible as cached pending revalidation.

## User Request Translation
- User intent / needs: repair the root provider-intake/control-host logic so CO-510/CO-512-style stale accepted rehydration does not occupy provider WIP after live Linear moves the issues to `Blocked`.
- Success criteria / acceptance:
  - Rehydrated accepted claims whose live Linear state is non-runnable (`Blocked`, handoff, terminal, or otherwise not execution-eligible) are released/downgraded without occupying active WIP.
  - Live issue evidence unavailable remains fail-closed; stale cached `In Progress` truth is not silently treated as clean.
  - `co-status` and `control-host freshness-gauge` distinguish cached pending revalidation from live active worker claims.
  - Regression coverage includes CO-510/CO-512-style stale cached `In Progress` claims with live `Blocked` Linear state.
  - No manual `provider-intake-state.json` edits.
- Constraints / non-goals:
  - Do not relaunch CO-510 or CO-512 from the stale claims.
  - Do not weaken WIP accounting for genuinely running provider workers.
  - Do not absorb CO-542 quota-hygiene automation.
  - Do not hide active claims only in a UI projection; fix supported provider-intake/control-host logic.

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `provider_issue_rehydration_pending_revalidation`
  - `provider-intake-state.json`
  - `CO-510`
  - `CO-512`
  - `Blocked`
  - stale `issue_state=In Progress`
  - `co-status`
  - `control-host freshness-gauge`
  - active WIP
- Protected terms / exact artifact and surface names:
  - `provider-intake-state.json`
  - `provider_issue_rehydration_pending_revalidation`
  - rehydrated accepted claim
  - live Linear `issue-context`
  - `co-status --format json`
  - `control-host freshness-gauge`
  - `ProviderIssueHandoff`
  - `ControlRuntime`
- Nearby wrong interpretations to reject:
  - manually editing or deleting `provider-intake-state.json`
  - relaunching CO-510/CO-512
  - counting all pending-revalidation cache rows as live workers
  - fail-opening when Linear issue evidence cannot be fetched
  - only suppressing rows in one status UI

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth | Target truth | Explicitly out-of-scope differences |
| --- | --- | --- | --- | --- |
| Rehydrated accepted claim | Cached claim can remain `accepted` with `reason=provider_issue_rehydration_pending_revalidation` and stale `issue_state=In Progress`. | Live Linear state is final execution eligibility evidence when available. | Live non-runnable state releases/downgrades the claim out of active WIP. | Manual state-file cleanup or issue-specific CO-510/CO-512 branches. |
| Live Linear evidence unavailable | Refresh may fail before direct revalidation completes. | Fail-closed behavior protects against launching from stale or missing evidence. | Pending revalidation remains explicit and does not masquerade as verified live worker truth. | Assuming stale cache is clean or silently freeing claims without evidence. |
| `co-status` and freshness gauge | Cached pending revalidation can be reported like active provider work. | Operators need WIP truth to distinguish live workers from cached revalidation debt. | Surfaces classify cached pending revalidation separately from live active worker claims. | Broad dashboard redesign or unrelated quota-hygiene automation. |

## Not Done If
- A rehydrated accepted pending-revalidation claim for an issue live in `Blocked`, `In Review`, `Done`, `Duplicate`, `Cancelled`, or another non-runnable state still occupies active provider WIP.
- Live issue lookup failures are treated as permission to drop or release the stale claim without degraded evidence.
- `co-status` or freshness-gauge output still cannot tell cached pending revalidation from a live active worker claim.
- The fix depends on hand-editing `provider-intake-state.json` or special-casing CO-510/CO-512.

## Goals
- Release or downgrade stale rehydrated accepted claims when live Linear proves the issue is non-runnable.
- Preserve fail-closed pending revalidation when live Linear evidence is missing or unavailable.
- Make status and freshness-gauge classification truthful about cached pending revalidation.
- Add focused regression coverage for the stale cached `In Progress` / live `Blocked` shape.

## Non-Goals
- No CO-510/CO-512 relaunch.
- No manual intake-state mutation.
- No broad queue-cap policy or quota-hygiene automation change.
- No weakening of live worker WIP accounting.

## Stakeholders
- Product: CO operators watching provider WIP, queue admission, and stale-claim incidents.
- Engineering: control-host/provider-intake maintainers and provider-worker reviewers.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics:
  - Focused regression fails before the fix and passes after.
  - Non-runnable live Linear states release/downgrade stale rehydrated accepted claims.
  - Missing live evidence keeps a fail-closed pending-revalidation classification.
  - Status/freshness surfaces separate cached pending revalidation from live workers.
- Guardrails / Error Budgets:
  - zero manual `provider-intake-state.json` edits
  - zero issue-specific CO-510/CO-512 branches
  - zero weakening for genuinely active provider worker claims

## Technical Considerations
- Architectural Notes:
  - The supported fix belongs in provider-intake/control-host claim refresh and active-WIP classification, not only UI suppression.
  - Pending revalidation should carry an explicit cache/degraded classification until live source truth proves a runnable worker claim or a non-runnable release/downgrade.
- Dependencies / Integrations:
  - provider-intake claim persistence
  - Linear issue refresh / issue-context-derived state metadata
  - co-status active issue projection
  - control-host freshness-gauge artifact classification

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- `remove fallback`: cached accepted pending-revalidation rows must not remain active WIP after live Linear proves non-runnable state.
- `justify retaining fallback`: pending revalidation remains a supported fail-closed cache state while live issue evidence is unavailable.
- Large-refactor check: a large provider-intake authority refactor is not required for this lane because the existing refresh path already owns claim release/downgrade and status classification. The narrow change is acceptable only if live evidence remains final authority and missing evidence remains fail-closed.
- Minor-seam decision: acceptable because the change removes stale active-WIP occupancy and keeps the existing fail-closed cache state only for missing live source truth.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Rehydrated accepted pending revalidation | Cached accepted row with stale runnable metadata can occupy active WIP before live revalidation releases it. | `remove fallback` | CO-544 | Live Linear state is non-runnable for a rehydrated accepted pending-revalidation claim. | 2026-05-16 | 2026-05-16 | This issue | Live non-runnable state releases/downgrades the claim and excludes it from active WIP. | Focused CO-510/CO-512-shaped regression. |
| Missing live issue evidence | Revalidation cache state stays fail-closed instead of assuming stale cache is clean. | `justify retaining fallback` | Provider-intake control-host | Linear issue evidence is unavailable, incomplete, or degraded. | Existing provider-intake rehydration behavior | 2026-05-16 | Durable safety contract | Separate issue-quality review proves fail-closed pending revalidation is no longer needed. | Regression coverage for unavailable evidence preserving pending/degraded classification. |

- Contract name: provider-intake revalidation fail-closed cache state.
- Owning surface: provider-intake control-host claim refresh.
- Steady-state proof: absent live issue evidence remains visible as degraded cache truth and never becomes clean active-worker truth.
- Tests/docs: focused `ProviderIssueHandoff` and freshness-gauge regressions plus this CO-544 packet.
- Non-expiring rationale: this is a durable source-truth-loss safety contract, not temporary compatibility debt; remove only after a reviewed replacement proves equivalent fail-closed behavior.

## Open Questions
- Whether the smallest code seam is claim refresh, active-WIP classification, or a shared helper used by both status and freshness-gauge will be decided from source inspection before implementation.

## Approvals
- Product: live CO-544 issue acceptance criteria.
- Engineering: provider-worker lane issue-quality review on 2026-05-16.
- Design: N/A.
