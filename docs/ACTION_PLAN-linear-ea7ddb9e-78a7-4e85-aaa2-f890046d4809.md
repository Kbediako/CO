# ACTION_PLAN - CO: prevent provider refresh restart loop from breaking co-status attach

## Added by Bootstrap 2026-04-14

## Traceability
- Linear issue: `CO-179` / `ea7ddb9e-78a7-4e85-aaa2-f890046d4809`
- Linear URL: https://linear.app/asabeko/issue/CO-179/co-prevent-provider-refresh-restart-loop-from-breaking-co-status
- Task id: `linear-ea7ddb9e-78a7-4e85-aaa2-f890046d4809`
- Source anchor: `ctx:sha256:bb067b2ac2073f849536e231da6e646a1aa470e8438514c13efbf87f6318b36b#chunk:c000001`

## Summary
- Goal: make `co-status attach` recover from artifact-backed endpoint/auth rotation after control-host restart while keeping provider refresh stuck recovery bounded and provider-worker-safe.
- Scope: docs-first packet, parent docs-review, reloadable attach target implementation, failure classification, focused endpoint-rotation/supervision tests, and parent-owned validation/handoff.
- Assumptions:
  - `control_endpoint.json` and `control_auth.json` remain the authoritative local attach locator
  - `/ui/data.json` remains the read-only attach dataset surface
  - `provider_refresh_lifecycle_stuck` / `restart_required` truth from prior lanes must remain visible
  - parent lane will run implementation, docs-review, Linear workpad, and PR lifecycle after this docs-only child packet

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `co-status attach`
  - `control_endpoint.json`
  - `control_auth.json`
  - `/ui/data.json`
  - `provider_refresh_lifecycle_stuck`
  - `restart_required`
  - `probe_timeout`
  - `provider-linear-worker`
- Not done if:
  - attach remains pinned to a stale endpoint after rotation
  - failure classes collapse into one generic dashboard error
  - restart/probe recovery loops without bounded threshold/backoff behavior
  - active provider workers are killed during control-host recovery
  - implementation widens into CO STATUS or provider scheduling redesign
- Pre-implementation issue-quality review:
  - 2026-04-14: self-review approves a bounded attach/recovery lane. Exact artifact names, error taxonomy, and provider-worker preservation are correctness requirements, so the lane must not be reduced to a generic fetch retry.

## Milestones & Sequencing
1. Parent accepts the docs-first packet, runs docs-review, and records the manifest in the checklist.
2. Inspect current attach target resolution and dashboard fetch flow in `coStatusAttachCliShell.ts` plus existing endpoint loader behavior in `delegationServer.ts`.
3. Add a reloadable attach target/session helper that can re-read `control_endpoint.json` and `control_auth.json` after recoverable fetch/probe failures.
4. Add attach fetch classification for dead/stale endpoint, raw network error, auth failure, timeout, non-OK HTTP response, invalid dataset, and current-endpoint recovery.
5. Keep dashboard rendering behavior unchanged except for consuming classified attach errors/recovery state.
6. Verify `restart_required` / `probe_timeout` supervision behavior remains finite and worker-safe; add narrow guard fixes only if focused tests expose a bounded gap.
7. Add focused regressions for stale endpoint rotation, dead port, current endpoint recovery, raw network errors, auth failure/token rotation where practical, timeout, supervision restart threshold, and active worker preservation.
8. Parent runs scoped then full validation as required, standalone review/elegance, workpad refresh, PR attach, and review handoff.

## Dependencies
- `orchestrator/src/cli/coStatusAttachCliShell.ts`
- `orchestrator/src/cli/delegationServer.ts`
- `orchestrator/src/cli/control/controlStatusDashboard.ts`
- `orchestrator/src/cli/control/controlHostSupervision.ts`
- `orchestrator/src/cli/controlHostSupervisionCliShell.ts`
- `orchestrator/src/cli/control/controlServerPublicLifecycle.ts`
- `orchestrator/src/cli/control/providerIssueHandoff.ts`
- `orchestrator/tests/CoStatusAttachCliShell.test.ts`
- `orchestrator/tests/ControlHostSupervision.test.ts`
- `orchestrator/tests/ControlServerPublicLifecycle.test.ts`
- `orchestrator/tests/ProviderIssueHandoff.test.ts`

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-ea7ddb9e-78a7-4e85-aaa2-f890046d4809 node scripts/delegation-guard.mjs`
  - `MCP_RUNNER_TASK_ID=linear-ea7ddb9e-78a7-4e85-aaa2-f890046d4809 node scripts/spec-guard.mjs --dry-run`
  - `MCP_RUNNER_TASK_ID=linear-ea7ddb9e-78a7-4e85-aaa2-f890046d4809 npx vitest run orchestrator/tests/CoStatusAttachCliShell.test.ts`
  - `MCP_RUNNER_TASK_ID=linear-ea7ddb9e-78a7-4e85-aaa2-f890046d4809 npx vitest run orchestrator/tests/ControlHostSupervision.test.ts`
  - add `ControlServerPublicLifecycle` / `ProviderIssueHandoff` focused tests only if provider refresh recovery code changes
  - parent runs `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, `node scripts/diff-budget.mjs`, and review/elegance gates before handoff
- Rollback plan:
  - revert reload-on-failure behavior if it causes extra host launches or unbounded retries
  - keep classification-only output if current-endpoint recovery proves unsafe in one attach refresh cycle
  - revert any supervision changes that broaden cleanup beyond the supervised control-host process tree

## Risks & Mitigations
- Risk: endpoint reload loops too aggressively after a dead port.
  - Mitigation: enforce a small per-cycle reload/probe budget and wait for the configured refresh interval before retrying.
- Risk: auth failure output leaks token details.
  - Mitigation: classify auth failures by status/reason only and redact token/header values from all outputs.
- Risk: provider refresh recovery reopens request burn after `restart_required`.
  - Mitigation: preserve prior stuck-refresh abort semantics and add focused tests before changing provider lifecycle code.
- Risk: restart cleanup touches provider issue workers.
  - Mitigation: target only the supervised control-host process tree and prove worker preservation in tests.

## Approvals
- Reviewer: Parent docs-review child-stream succeeded on 2026-04-14; parent manifest-backed review completed before handoff.
- Date: 2026-04-14
