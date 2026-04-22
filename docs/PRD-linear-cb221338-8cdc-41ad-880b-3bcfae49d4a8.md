# PRD - CO STATUS / observability: degraded-read fallback when `/ui/data.json` times out but supervisor truth stays fresh after `CO-296`

## Added by Docs Child Lane 2026-04-22

## Traceability
- Linear issue: `CO-304` / `cb221338-8cdc-41ad-880b-3bcfae49d4a8`
- Linear URL: https://linear.app/asabeko/issue/CO-304
- Task id: `linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8`
- Canonical task ID: `20260422-linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8`
- Canonical spec: `tasks/specs/linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8.md`
- Docs packet child lane manifest: `.runs/linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8-docs-packet/cli/2026-04-22T09-12-53-248Z-15113023/manifest.json`
- Source anchor: `ctx:sha256:76ba3f055c3147136a183eb8c1b65b40e881d8c91dd0453e5a39d11444a819e1#chunk:c000001`
- Source object id: `sha256:76ba3f055c3147136a183eb8c1b65b40e881d8c91dd0453e5a39d11444a819e1`
- Expected source payload: `.runs/linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8-docs-packet/cli/2026-04-22T09-12-53-248Z-15113023/memory/source-0/source.txt`
- Source payload note: the expected shared `source-0` payload is not present in this child checkout, so the exact issue wording below is preserved from the parent lane prompt, the protected terms in the issue contract, and nearby repo packet patterns for direct `co-status --format json` read failures.

## Summary
- Problem Statement: `co-status --format json` can time out on `/ui/data.json` even while `provider-intake-state.json` continues advancing after `CO-296`. That means the dashboard-backed read path can fail while supervisor truth still says the control-host intake loop is moving.
- Desired Outcome: when `/ui/data.json` times out, `co-status --format json` can use a bounded `degraded-read fallback` from supervisor truth only while `provider-intake-state.json` remains fresh enough under a `fail-closed freshness` gate. If supervisor truth is stale or absent, the command must still fail closed instead of emitting obsolete state.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): create the missing docs-first packet for `CO-304` only so the parent lane can implement the narrowest truthful recovery for `co-status --format json` timing out on `/ui/data.json` while `provider-intake-state.json` still advances after `CO-296`.
- Success criteria / acceptance:
  - reproduce the split where `/ui/data.json` times out but supervisor truth remains fresh enough to prove the host is still advancing
  - add a bounded `degraded-read fallback` for `co-status --format json`
  - gate that fallback with explicit `fail-closed freshness`
  - keep the fallback explicitly distinct from UI layout work, dashboard visual redesign, or unrelated control-host features
  - preserve explicit evidence that `CO-296` remains the adjacent reference boundary, not a scope expansion target
- Constraints / non-goals:
  - child lane owns only the declared docs/task packet files plus `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`
  - parent lane owns implementation, focused validation, Linear state, workpad, PR lifecycle, and merge
  - do not edit implementation or test files in this child lane
  - do not run full repo validation suites in this child lane

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `co-status --format json`
  - `/ui/data.json`
  - `provider-intake-state.json`
  - `CO-296`
  - `supervisor truth`
  - `degraded-read fallback`
  - `fail-closed freshness`
- Protected terms / exact artifact and surface names:
  - `co-status --format json`
  - `/ui/data.json`
  - `provider-intake-state.json`
  - `CO-296`
  - `supervisor truth`
  - `degraded-read fallback`
  - `fail-closed freshness`
  - healthy advancing intake after a timed-out UI read
  - stale supervisor truth must still fail closed
- Nearby wrong interpretations to reject:
  - redesign the dashboard layout or UI composition
  - do a dashboard visual redesign instead of fixing the read contract
  - widen the lane into unrelated control-host features
  - hide the timeout by returning stale supervisor data without a freshness gate
  - treat every `/ui/data.json` timeout as proof that the whole host is dead

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth |
| --- | --- | --- | --- |
| `co-status --format json` | can time out on `/ui/data.json` even while supervisor-led intake still advances | direct JSON consumers should remain truthful when the UI read path is degraded but supervisor truth is still fresh | command can emit a bounded `degraded-read fallback` instead of failing immediately |
| `provider-intake-state.json` | keeps advancing after `CO-296` for this failure class | advancing supervisor truth should remain authoritative evidence that the intake loop still has current state | supervisor truth is used only as fallback input, not as a blanket override |
| Freshness gate | not explicit enough for this failure class | fallback data must only be used while fresh enough to be trusted | `fail-closed freshness` decides whether degraded output is allowed |
| Operator signal | timeout on `/ui/data.json` can look like total host failure | operator signal should distinguish read-path degradation from a dead host | output stays explicit about degraded read versus stale or unavailable supervisor truth |
| Scope boundary | easy to drift into broader dashboard or control-host redesign | the issue is a narrow read-contract lane after `CO-296` | lane stays bounded to timeout classification plus fallback freshness |

## Acceptance Criteria
- The docs packet and checklist mirrors exist for the declared `CO-304` files only.
- The packet preserves the exact checksum `co-status --format json`, `/ui/data.json`, `provider-intake-state.json`, `CO-296`, `supervisor truth`, `degraded-read fallback`, and `fail-closed freshness`.
- Parent implementation can add a bounded degraded fallback without presenting stale supervisor truth as current.
- The packet keeps the lane explicitly separate from UI layout work, dashboard visual redesign, and unrelated control-host features.

## Non-Goals
- No UI layout or interaction redesign.
- No dashboard visual redesign.
- No unrelated control-host feature work.
- No source or test edits in this child lane.
- No stale-data override that bypasses `fail-closed freshness`.

## Not Done If
- `co-status --format json` still has only hard failure when `/ui/data.json` times out even though supervisor truth remains fresh.
- The fallback can emit supervisor truth after freshness has gone stale.
- The issue packet drifts into UI layout, dashboard visual redesign, or unrelated control-host features.
- `CO-296` is treated as a reopened implementation lane instead of the adjacent reference boundary.

## Stakeholders
- Product: CO operators relying on truthful `co-status --format json` output during read-side degradation.
- Engineering: status/read-model, UI dataset fetch, and supervisor-truth maintainers.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics:
  - degraded `/ui/data.json` reads can still produce truthful JSON output when supervisor truth is demonstrably fresh
  - stale supervisor truth remains a hard stop through `fail-closed freshness`
  - the lane stays explicitly separate from dashboard/UI redesign work
- Guardrails / Error Budgets:
  - preserve explicit timeout/degraded messaging instead of silently masking the failure
  - never return stale supervisor truth after the freshness budget is exceeded
  - keep the fallback bounded to this specific read failure class after `CO-296`

## User Experience
- Personas:
  - operator calling `co-status --format json` during a degraded `/ui/data.json` incident
  - maintainer validating whether the host is actually unhealthy or only the UI-backed read path is degraded
- User Journeys:
  - operator sees `/ui/data.json` time out, but still receives a clearly marked degraded JSON snapshot because `provider-intake-state.json` remains fresh
  - operator sees a fail-closed error once supervisor freshness is too old, rather than stale output

## Technical Considerations
- Architectural Notes:
  - the parent lane should keep the repair at the read-contract seam for `co-status --format json`
  - the fallback should consume supervisor truth only as a bounded degraded path, not as a new primary surface
  - the freshness decision should be explicit and machine-checkable so reviewers can tell why fallback succeeded or failed closed
- Likely parent-owned seams:
  - the `co-status --format json` read path
  - the `/ui/data.json` timeout handling path
  - the freshness gate around `provider-intake-state.json` supervisor truth

## Open Questions
- What is the minimum freshness window that still counts as acceptable supervisor truth for this degraded-read path?
- Should the degraded response carry an explicit marker showing it came from supervisor truth rather than `/ui/data.json`?
- Does the parent need one explicit stale-supervisor regression in addition to the fresh-supervisor fallback regression?

## Validation Contract
- Child lane runs only scoped docs checks: JSON parse for the touched registries, protected-term grep over the new packet files, and `git diff --check` over the declared scope.
- Parent lane owns the reproduction, focused regressions, docs-review, spec guard, and any implementation validation.
