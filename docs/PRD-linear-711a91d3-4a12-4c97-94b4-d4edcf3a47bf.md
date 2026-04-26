# PRD - Control host: reclaim stale plain released/not_active Backlog cache after Backlog -> Ready post-CO-240

## Added by Bootstrap 2026-04-21

## Traceability
- Linear issue: `CO-281` / `711a91d3-4a12-4c97-94b4-d4edcf3a47bf`
- Task id: `linear-711a91d3-4a12-4c97-94b4-d4edcf3a47bf`
- Canonical spec: `tasks/specs/linear-711a91d3-4a12-4c97-94b4-d4edcf3a47bf.md`
- Live issue source: read-only Linear issue body, `updatedAt=2026-04-21T05:54:02.627Z`
- Parent-provided issue source anchor: `ctx:sha256:2d92868e9c6fa9d99101ff7c39b3d0c6d5b8322632c5ec319289197d5f4bb1e8#chunk:c000001`
- Shared source 0 anchor: `ctx:sha256:2d92868e9c6fa9d99101ff7c39b3d0c6d5b8322632c5ec319289197d5f4bb1e8#chunk:c000001`
- Source object id: `sha256:2d92868e9c6fa9d99101ff7c39b3d0c6d5b8322632c5ec319289197d5f4bb1e8`
- Context dir: `.runs/linear-711a91d3-4a12-4c97-94b4-d4edcf3a47bf/cli/2026-04-21T05-38-15-496Z-0b50967a/memory/source-0`
- Source payload: `.runs/linear-711a91d3-4a12-4c97-94b4-d4edcf3a47bf/cli/2026-04-21T05-38-15-496Z-0b50967a/memory/source-0/source.txt`
- Origin manifest: `.runs/linear-711a91d3-4a12-4c97-94b4-d4edcf3a47bf/cli/2026-04-21T05-38-15-496Z-0b50967a/manifest.json`
- Docs child-lane manifest: `.runs/linear-711a91d3-4a12-4c97-94b4-d4edcf3a47bf-docs-packet-file-refresh/cli/2026-04-21T05-56-35-757Z-41ecac5d/manifest.json`
- CO-240 lineage: `CO-240` / `ddb81c93-87b2-4dff-b69b-33d7ae3c91cd`
- Queue evidence artifacts:
  - `.runs/local-mcp/cli/control-host/provider-intake-state.json`
  - `.runs/local-mcp/cli/control-host/provider-operator-autopilot.jsonl`

## Summary
`CO-281` is a post-closeout follow-on to `CO-240`. A fresh April 21 incident shows that the control host can still leave a live `Ready` issue suppressed after operator-autopilot promotes a backlog head from `Backlog` to `Ready`. The stale row remains in `provider-intake-state.json` as plain `released` / `provider_issue_released:not_active`, still caching `issue_state=Backlog`, `issue_state_type=backlog`, stale `issue_updated_at`, and `last_delivery_id=null`. In that condition, normal reclaim or `fresh_discovery` fails to refresh the row to live `Ready` truth or admit the issue without manual intervention.

## User Request Translation
- Preserve the exact issue-body framing around `control host`, `operator-autopilot`, `Backlog -> Ready`, `provider-intake-state.json`, `released`, `provider_issue_released:not_active`, `stale Backlog cache`, `fresh_discovery`, `reclaim`, `CO-240`, and `last_delivery_id=null`.
- Treat this as new post-CO-240 evidence from April 21, 2026, not a bookkeeping refresh of the completed `CO-240` lane.
- Keep the fix on the normal control-host reclaim / `fresh_discovery` path; do not make manual provider-worker start the steady-state solution.
- Preserve adjacent behavior from `CO-212` completed-blocker reclaim and `CO-216` manual-demotion hold scope.
- Keep the interpretation narrower than pure capacity, generic concurrency, or broad provider-capacity rewrites.

## Intent Checksum
- Protected terms and surfaces:
  - `control host`
  - `operator-autopilot`
  - `Backlog -> Ready`
  - `provider-intake-state.json`
  - `released`
  - `provider_issue_released:not_active`
  - `stale Backlog cache`
  - `fresh_discovery`
  - `reclaim`
  - `CO-240`
  - `last_delivery_id=null`
  - `.runs/local-mcp/cli/control-host/provider-intake-state.json`
  - `.runs/local-mcp/cli/control-host/provider-operator-autopilot.jsonl`
- Nearby wrong interpretations to reject:
  - `CO-212` completed-blocker scope
  - `CO-216` manual-demotion scope
  - pure capacity explanation
  - manual worker start as the product solution
  - generic concurrency/capacity rewrites
  - control-host restart, state-file deletion, or manual claim cleanup as the shipped fix

## Parity / Alignment Matrix

| Surface | Current | Target |
| --- | --- | --- |
| Live issue truth | operator-autopilot promotes the backlog head from `Backlog` to `Ready`, and live Linear issue-context reflects `Ready`. | The control host treats live `Ready` truth as authoritative for reclaim / `fresh_discovery` eligibility. |
| Retained intake row | `provider-intake-state.json` still carries plain `released` / `provider_issue_released:not_active` with stale `issue_state=Backlog`, `issue_state_type=backlog`, stale `issue_updated_at`, and `last_delivery_id=null`. | The retained row stays auditable but is refreshed or reclassified against live `Ready` truth instead of suppressing pickup. |
| Reclaim path | Normal reclaim or `fresh_discovery` does not admit the issue without manual intervention. | Normal reclaim / `fresh_discovery` admits the issue without manual worker start when no preserved veto applies. |
| CO-240 lineage | `CO-240` covered stale plain released/not_active `Backlog` / `Ready` reclaim, but new post-closeout evidence shows a remaining path. | `CO-281` closes only the post-CO-240 stale Backlog cache shape and keeps lineage explicit. |
| Adjacent scopes | `CO-212` and `CO-216` are nearby but distinct. | Completed-blocker reclaim and manual-demotion behavior remain preserved and are not reopened. |

## Acceptance Criteria
- Capture a regression using a stale plain `released` / `provider_issue_released:not_active` row whose cached `issue_state` remains `Backlog` after operator-autopilot promotes the live issue to `Ready`.
- Reclassify or refresh the stale row against live `Ready` truth without manual worker start.
- Preserve adjacent `CO-212` and `CO-216` behavior.
- Keep the regression tied to `CO-240` lineage and the April 21 queue evidence artifacts:
  - `.runs/local-mcp/cli/control-host/provider-intake-state.json`
  - `.runs/local-mcp/cli/control-host/provider-operator-autopilot.jsonl`

## Non-Goals
- Do not reopen `CO-212` completed-blocker reclaim scope.
- Do not reopen `CO-216` manual-demotion hold scope.
- Do not solve this by restarting control-host, deleting state files, or requiring manual provider-worker starts.
- Do not broaden into generic concurrency or capacity rewrites beyond this stale released/not_active reclaim seam.
- Do not edit implementation or test files from this docs child lane.

## Not Done If
- A backlog head can still be promoted to `Ready` while `provider-intake-state.json` keeps stale `Backlog` truth under a plain `released` / `provider_issue_released:not_active` row.
- Normal reclaim or `fresh_discovery` still fails to admit that issue without manual intervention.
- The fix only changes observability while stale cached truth still suppresses real `Ready` pickup.
- The explanation collapses into `CO-212`, `CO-216`, pure capacity, manual worker start, or generic concurrency/capacity language.

## Metrics & Guardrails
- Primary success metrics:
  - focused coverage proves stale plain released/not_active `Backlog` cache is refreshed or reclassified after live `Backlog -> Ready`
  - focused coverage proves reclaim / `fresh_discovery` admits the issue without manual worker start
  - focused coverage proves `last_delivery_id=null` does not cause stale Backlog truth to fail closed once live truth is `Ready`
- Guardrails:
  - no duplicate same-issue worker launch
  - no manual claim deletion as the product path
  - no regression to `CO-212` completed-blocker reclaim
  - no regression to `CO-216` manual-demotion hold behavior
  - no broad capacity or concurrency redesign

## User Experience
- Operators can rely on operator-autopilot `Backlog -> Ready` promotion to become visible to normal control-host reclaim and `fresh_discovery`.
- `provider-intake-state.json` remains useful audit evidence without trapping a runnable issue behind stale Backlog cache.
- Reviewers can evaluate `CO-281` as the post-CO-240 stale Backlog cache follow-on, not as a generic capacity, manual-start, or completed-blocker issue.

## Technical Considerations
- The parent implementation likely belongs in the existing provider handoff/reclaim classification flow that already handles plain `provider_issue_released:not_active` rows and `fresh_discovery`.
- The parent should refresh or reclassify stale `Backlog` cached truth against live `Ready` truth before stale cache suppresses admission.
- The parent should preserve retained row auditability and avoid deleting local evidence as the fix.
- The parent should include adjacent invariants for `CO-212` and `CO-216` if the chosen seam touches their behavior.

## Open Questions
- Does the narrowest parent fix live entirely in `providerIssueHandoff.ts`, or does the stale `Backlog` / live `Ready` distinction need a workflow-state helper?
- Should the reclassification persist an explicit reason for stale Backlog cache recovery, or is refreshed `Ready` metadata plus existing reclaim/admission telemetry sufficient?
- Does `last_delivery_id=null` need a dedicated regression assertion, or is it covered by the stale row fixture shape?

## Approvals
- Product: Linear issue `CO-281`
- Engineering: pending parent lane acceptance, docs-review, implementation validation, and PR lifecycle
- Design: N/A
