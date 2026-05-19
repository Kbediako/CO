# PRD - CO-548 decouple targeted provider-worker nudge from broad dispatch pilot

## Traceability
- Linear issue: `CO-548` / `cd213b8a-5bc4-46d1-88ec-f99e5ca2c7b6`
- Linear URL: https://linear.app/asabeko/issue/CO-548/co-decouple-targeted-provider-worker-nudge-from-broad-dispatch-pilot
- Task registry id: `20260517-linear-cd213b8a-5bc4-46d1-88ec-f99e5ca2c7b6`
- MCP Task ID: `linear-cd213b8a-5bc4-46d1-88ec-f99e5ca2c7b6`
- Source evidence: live `control-host recover --issue-id a08ba13b-1c9a-43ed-beec-f63a0547b721` skipped with `dispatch_source_disabled` for CO-543 even though the configured Linear source binding exists and no broad dispatch pilot should be enabled as an operator workaround.

## Summary
- Problem Statement: explicit targeted `recover`, `relaunch`, and `nudge` operations are routed through the same source setup gate as broad Linear webhook/dispatch admission. When `dispatch_pilot.enabled=false`, the control host refuses the targeted issue-by-id lookup with `dispatch_source_disabled`, leaving accepted/no-run claims such as CO-543 stuck in Ready with no launch token.
- Desired Outcome: targeted provider-worker recovery can resolve one explicitly requested Linear issue by id through the configured Linear source binding while broad dispatch-pilot admission and queue sweeps remain disabled unless separately enabled.

## User Request Translation
- User intent / needs: recover the root cause behind targeted worker launch failures instead of turning on broad dispatch, hand-editing provider-intake state, or treating the limitation as an acceptable fallback.
- Success criteria / acceptance:
  - `control-host recover|relaunch|nudge --issue-id <linear-id>` can resolve a configured Linear issue by id when `dispatch_pilot.enabled=false`.
  - Broad `resolveTrackedIssue` webhook admission and `resolveTrackedIssues` queue sweeps still return `dispatch_source_disabled` while the pilot is disabled.
  - Kill switch, missing source, malformed source, and missing Linear binding remain fail-closed for targeted recovery.
  - Accepted/no-run pending-revalidation claims can be reclaimed through explicit recovery when live issue state is runnable.
  - CO-546 revalidation behavior remains intact and separate from explicit recovery.
- Constraints / non-goals:
  - Do not enable broad dispatch-pilot admission by default.
  - Do not change queue-wide selection, WIP cap, or worker admission policy.
  - Do not bypass source binding, workspace/team/project filtering, or kill-switch safety.
  - Do not manually mutate `provider-intake-state.json`.

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `dispatch_source_disabled`
  - `control-host recover`
  - `recover|relaunch|nudge`
  - `dispatch_pilot.enabled=false`
  - configured Linear source binding
  - no broad dispatch pilot
- Protected terms / exact artifact and surface names:
  - `ProviderIssueHandoff`
  - `createControlHostTrackedIssueResolvers`
  - `resolveLinearWebhookSourceSetup`
  - `resolveLinearConfiguredSourceSetup`
  - `resolveTrackedIssue`
  - `resolveTrackedIssues`
  - `resolveRevalidationTrackedIssue`
  - `control-host provider-worker recover`
- Nearby wrong interpretations to reject:
  - enabling the dispatch pilot to make targeted recovery work
  - routing broad queue sweeps through configured-source reads
  - weakening Linear source filters
  - adding an unbounded retry or fallback launch path

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth | Target truth | Explicitly out-of-scope differences |
| --- | --- | --- | --- | --- |
| Explicit targeted recovery | Uses the broad webhook source setup and skips with `dispatch_source_disabled` when the pilot is disabled. | Operator-selected issue-by-id recovery is not broad queue admission. | Uses configured Linear source binding for one explicit issue id while retaining source safety checks. | Queue-wide dispatch or webhook admission changes. |
| Broad dispatch/webhook admission | Disabled when `dispatch_pilot.enabled=false`. | Disabled broad dispatch must stay disabled. | Still returns `dispatch_source_disabled` for broad `resolveTrackedIssue` and `resolveTrackedIssues` paths. | Turning on dispatch pilot or changing queue selection. |
| Existing-claim revalidation | CO-546 uses configured source binding for revalidation. | Revalidation is distinct from explicit recovery. | CO-548 adds a recovery-specific resolver without regressing CO-546. | Rehydrate/revalidation classification changes. |
| Source-truth failure | Kill switch or missing binding must fail closed. | Safety gates remain authoritative. | Targeted recovery honors kill switch and binding errors. | Launching without verified Linear source scope. |

## Not Done If
- `control-host recover` still skips targeted runnable issues solely because `dispatch_pilot.enabled=false`.
- Broad queue sweeps start working while dispatch pilot is disabled.
- The fix bypasses kill switch or Linear source binding errors.
- CO-543 can only be launched by manually editing provider-intake state.
- CO-546 revalidation behavior is changed or duplicated.

## Goals
- Add a recovery-specific issue-by-id resolver path.
- Keep broad dispatch admission disabled.
- Preserve source binding and kill-switch safety.
- Add regression tests for disabled-pilot targeted recovery.

## Non-Goals
- No broad dispatch pilot rollout.
- No provider-intake state surgery.
- No queue-wide admission redesign.
- No CO-546 revalidation rewrite.

## Stakeholders
- Product: CO operators who need targeted recovery for accepted/no-run issues without admitting the whole backlog.
- Engineering: control-host, provider-intake, and Linear source-binding maintainers.
- Design: N/A.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- `remove fallback`: targeted recovery must not depend on broad dispatch-pilot enablement.
- Large-refactor check: a broad control-host dispatch rewrite is not required. Existing source setup helpers already separate configured source binding from enabled admission; this lane wires explicit recovery to that existing configured-source authority.
- Minor-seam decision: acceptable because the new seam narrows authority by action class and removes the operational fallback of enabling broad dispatch or hand-editing claims.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Targeted recovery source binding | Explicit recover/relaunch/nudge is blocked by broad `dispatch_pilot.enabled=false`. | `remove fallback` | CO-548 | Operator invokes targeted recovery for one Linear issue id. | Existing shared resolver wiring | 2026-05-17 | This issue | Recovery uses configured source binding while broad dispatch stays disabled. | ControlHostCliShell and ProviderIssueHandoff regression tests. |
| Broad dispatch disabled posture | Queue sweeps are disabled unless pilot is enabled. | `justify retaining fallback` | Control-host dispatch pilot | `dispatch_pilot.enabled=false`. | Existing dispatch-pilot safety contract | 2026-05-17 | Durable safety contract | Separate reviewed dispatch rollout enables broad admission. | Regression proves broad paths still skip. |

- Contract name: dispatch-pilot broad admission disabled posture.
- Owning surface: control-host dispatch pilot.
- Steady-state proof: broad issue discovery remains disabled unless the pilot is explicitly enabled.
- Tests/docs: focused resolver and recovery tests plus this docs packet.
- Non-expiring rationale: durable operator safety contract, not a temporary fallback.

## Validation Plan
- Focused `ControlHostCliShell` resolver test proving recovery uses configured source binding while broad dispatch remains disabled.
- Focused `ProviderIssueHandoff` test proving explicit `recover`, `relaunch`, and `nudge` reclaim accepted/no-run pending-revalidation claims through the recovery resolver.
- `git diff --check`, JSON parse, `node scripts/spec-guard.mjs --dry-run`, build, focused tests, and review handoff as scope requires.
