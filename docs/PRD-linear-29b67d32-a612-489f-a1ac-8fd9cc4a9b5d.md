# PRD - CO-546 attach live Linear state to rehydrated pending-claim revalidation

## Traceability
- Linear issue: `CO-546` / `29b67d32-a612-489f-a1ac-8fd9cc4a9b5d`
- Linear URL: https://linear.app/asabeko/issue/CO-546/co-attach-live-linear-state-to-rehydrated-pending-claim-revalidation
- Task registry id: `20260516-linear-29b67d32-a612-489f-a1ac-8fd9cc4a9b5d`
- MCP Task ID: `linear-29b67d32-a612-489f-a1ac-8fd9cc4a9b5d`
- Source evidence: post-merge CO-544 live control-host validation on 2026-05-16 showed CO-510 and CO-512 rehydrated as accepted pending-revalidation rows with stale cached `issue_state=In Progress` and no attached live Linear state while live issue-context showed both issues `Blocked`.

## Summary
- Problem Statement: CO-544 fixed release classification once live issue evidence reaches the refresh path, but control-host rehydration can rewrite accepted `provider_issue_rehydration_pending_revalidation` claims from cached metadata before attaching live Linear state. The resulting rows remain accepted with stale `issue_state=In Progress`, `live_linear_state=null`, and active-claim capacity impact even though live Linear says the issue is `Blocked`.
- Desired Outcome: rehydrated pending-revalidation claims fetch and persist fresh Linear issue metadata during supported rehydration/revalidation. Live non-runnable state releases the stale claim out of active WIP; unavailable evidence remains an explicit fail-closed pending-revalidation state.

## User Request Translation
- User intent / needs: address the root cause behind the post-CO-544 validation failure instead of patching the live `provider-intake-state.json`; the fix must make the control-host path attach live Linear state to rehydrated pending claims so stale cached `In Progress` cannot keep blocked issues active.
- Success criteria / acceptance:
  - Accepted `provider_issue_rehydration_pending_revalidation` rows with live `Blocked` Linear state are refreshed with live issue metadata and released/downgraded out of active WIP during rehydration/revalidation.
  - Running/resumable stale claims that fall back to accepted pending-revalidation also apply the same live-state release path when fresh Linear evidence is available.
  - Missing or failed live issue lookup remains fail-closed and does not silently release the claim.
  - Regression coverage reproduces the CO-510/CO-512 shape: cached `issue_state=In Progress`, live `Blocked`, no matching run, accepted pending-revalidation.
  - No manual edits to `provider-intake-state.json` and no CO-510/CO-512 special cases.
- Constraints / non-goals:
  - Do not relaunch CO-510 or CO-512 from stale cached claims.
  - Do not weaken active worker WIP accounting for genuinely live runs.
  - Do not absorb CO-542 quota-hygiene automation or broad status-monitor redesign.
  - Do not mark unavailable Linear evidence as clean.

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `provider_issue_rehydration_pending_revalidation`
  - `provider-intake-state.json`
  - `CO-510`
  - `CO-512`
  - `Blocked`
  - stale `issue_state=In Progress`
  - `live_linear_state=null`
  - active WIP
- Protected terms / exact artifact and surface names:
  - `ProviderIssueHandoff`
  - `rehydrateNow`
  - `resolveFreshTrackedIssueForActiveClaim`
  - `provider_issue_rehydration_pending_revalidation`
  - `co-status --format json`
  - `control-host provider-intake-state.json`
- Nearby wrong interpretations to reject:
  - manual provider-intake cleanup
  - UI-only hiding of stale rows
  - relaunching blocked issues
  - accepting cached state as live state
  - adding a new fallback without expiry metadata

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth | Target truth | Explicitly out-of-scope differences |
| --- | --- | --- | --- | --- |
| Accepted pending-revalidation rehydrate | Rewrites the claim as accepted pending-revalidation from cached fields and can leave `live_linear_state=null`. | Live Linear state is authoritative when available. | Fresh live issue metadata is attached before deciding whether the pending claim remains, releases, or reactivates. | Manual state-file surgery or issue-specific CO-510/CO-512 branches. |
| Live `Blocked` issue | Cached `In Progress` may survive after rehydrate. | `Blocked` is not provider-worker runnable. | Claim is released/downgraded with fresh `issue_state=Blocked` evidence. | Relaunching or resuming blocked work. |
| Live issue lookup unavailable | Evidence can be missing during control-host restart. | Source-truth loss must fail closed. | Claim remains pending revalidation with cached/degraded truth visible. | Fail-opening by deleting/releasing without evidence. |

## Not Done If
- A rehydrated accepted pending-revalidation claim for a live `Blocked` issue still persists with only cached `In Progress` state.
- Running/resumable stale claims can be demoted to accepted pending-revalidation without attempting live-state release when fresh issue resolution is available.
- Missing live evidence releases the claim or makes it look clean.
- The implementation relies on manual `provider-intake-state.json` edits or special-cases CO-510/CO-512.

## Goals
- Attach fresh Linear issue metadata during rehydrated pending-claim revalidation.
- Release live non-runnable pending-revalidation claims out of active WIP.
- Preserve explicit fail-closed pending revalidation when live evidence is unavailable.
- Add focused regression coverage for the exact post-merge CO-544 failure shape.

## Non-Goals
- No CO-510/CO-512 relaunch.
- No manual intake-state mutation.
- No broad quota-hygiene automation change.
- No weakening of real running provider-worker accounting.

## Stakeholders
- Product: CO operators watching WIP capacity, blocked issue routing, and stale claim incidents.
- Engineering: provider-intake/control-host maintainers and review agents.
- Design: N/A.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- `remove fallback`: cached pending-revalidation rows must not retain active cached `In Progress` truth after live Linear proves non-runnable state.
- `justify retaining fallback`: pending revalidation remains a durable fail-closed state only while live issue evidence is unavailable.
- Large-refactor check: no broad control-host authority rewrite is required because `resolveFreshTrackedIssueForActiveClaim` already centralizes live issue refresh/release semantics. The lane should reuse that authority rather than adding a second classifier.
- Minor-seam decision: acceptable only if the change removes stale cached active-WIP occupancy and does not introduce a new launch or release fallback.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Accepted pending-revalidation rehydrate | Cached accepted row can be preserved without live Linear metadata. | `remove fallback` | CO-546 | Rehydrate sees accepted `provider_issue_rehydration_pending_revalidation` with no matching run. | Existing provider-intake rehydrate behavior | 2026-05-16 | This issue | Live non-runnable Linear state attaches and releases/downgrades the claim. | Focused CO-510/CO-512-shaped regression. |
| Missing live issue evidence | Claim remains pending instead of treating cache as clean. | `justify retaining fallback` | Provider-intake control-host | Linear issue lookup is unavailable, skipped, or degraded. | Existing provider-intake safety contract | 2026-05-16 | Durable safety contract | Separate reviewed replacement proves equivalent source-truth-loss behavior. | Regression preserves fail-closed pending state on unavailable evidence. |

## Validation Plan
- Focused `ProviderIssueHandoff` regression for accepted pending-revalidation with cached `In Progress` and live `Blocked`.
- Focused regression for running/resumable stale claim demotion using live non-runnable evidence.
- Focused fail-closed regression for unavailable live evidence.
- `git diff --check`, JSON parse, spec guard, build/lint/focused tests, and review handoff as scope requires.
