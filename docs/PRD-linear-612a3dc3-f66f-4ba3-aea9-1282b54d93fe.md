# PRD - CO-376 co-status authenticated dataset bounds

## Added by Docs Child Lane 2026-04-26

## Traceability
- Linear issue: `CO-376` / `612a3dc3-f66f-4ba3-aea9-1282b54d93fe`
- Linear URL: https://linear.app/asabeko/issue/CO-376/co-status-authenticated-dataset-times-out-and-destabilizes-supervised
- Task id: `linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe`
- Canonical spec: `tasks/specs/linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe-co-status-authenticated-dataset-bounds.md`
- Shared source 0 anchor: `ctx:sha256:2ad2a0ba5ecbafe9bb0b7cb2875952678949f28fbb367b10bee33ce33466e560#chunk:c000001`
- Source object id: `sha256:2ad2a0ba5ecbafe9bb0b7cb2875952678949f28fbb367b10bee33ce33466e560`
- Context dir: `../../.runs/linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe/cli/2026-04-25T17-55-01-786Z-8e218e11/memory/source-0`
- Source payload: `../../.runs/linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe/cli/2026-04-25T17-55-01-786Z-8e218e11/memory/source-0/source.txt`
- Origin manifest: `../../.runs/linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe/cli/2026-04-25T17-55-01-786Z-8e218e11/manifest.json`
- Source payload note: the shared `source-0` payload is run metadata and provenance only; the substantive issue intent is preserved from the child-lane handoff text.

## Summary
- Problem Statement: `codex-orchestrator co-status --format json` can time out while provider workers are active because the authenticated `/ui/data.json` hot path builds and serializes an unbounded status dataset, including audit/operator history such as `provider_workflow.operator_autopilot.last_result`.
- Desired Outcome: bound status dataset generation so `co-status --format json` and attach polling stay responsive under active provider workers, without merely increasing attach timeouts and without requiring provider workers or operator autopilot to be disabled.

## User Request Translation
- Preserve the issue as a status-dataset generation problem, not a network, auth, or timeout-only problem.
- The primary surface is `codex-orchestrator co-status --format json`, which fetches authenticated `/ui/data.json`.
- The suspected hot path is authenticated `/ui/data.json` generation processing unbounded audit/operator history while provider workers are active.
- The fix must bound the dataset at generation/serialization time and keep the operational status view useful.
- Validation must capture before/after timings, response size, and supervisor status/restart-count behavior.
- The parent implementation must also record LaunchAgent entrypoint posture or a migration path if the installed LaunchAgent is stale.

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `codex-orchestrator co-status --format json`
  - authenticated `/ui/data.json`
  - hot-path generation
  - unbounded audit/operator history
  - provider workers are active
  - bound status dataset generation
  - not merely increase attach timeouts
  - not require disabling provider workers/operator autopilot
  - before/after timings
  - response size
  - supervisor status/restart-count behavior
  - LaunchAgent entrypoint posture or migration path
- Protected terms / exact artifact and surface names:
  - `co-status --format json`
  - `co-status attach`
  - `/ui/data.json`
  - `uiDataController.ts`
  - `operatorDashboardPresenter.ts`
  - `observabilityReadModel.ts`
  - `provider_workflow.operator_autopilot.last_result`
  - `provider-operator-autopilot.jsonl`
  - `control-host supervise status --format json`
  - LaunchAgent `ProgramArguments`
- Nearby wrong interpretations to reject:
  - only increasing `DEFAULT_ATTACH_REQUEST_TIMEOUT_MS`
  - telling operators to disable provider workers
  - requiring operator autopilot to be disabled
  - making `/ui/data.json` unauthenticated or stale-cached as the fix
  - dropping the provider workflow/status payload entirely
  - treating response size as irrelevant if the command eventually succeeds
  - skipping LaunchAgent entrypoint posture because the dataset fix is separate

## Parity / Alignment Matrix
| Surface | Current Truth | Target Truth |
| --- | --- | --- |
| `co-status --format json` | Reads authenticated `/ui/data.json` through the attach path and can hit the request timeout while provider workers are active. | Completes within the existing attach timeout budget under representative active-provider-worker load. |
| `/ui/data.json` generation | Builds the operator dashboard dataset on demand and can serialize unbounded audit/operator history into `provider_workflow.operator_autopilot.last_result`. | Applies deterministic bounds to history-heavy fields while preserving current status, counts, latest results, pending actions, and enough truncation metadata for operators to trust the view. |
| Operational workaround | Operators may be tempted to increase timeouts or disable provider workers/operator autopilot to regain status visibility. | No timeout-only workaround or disabled-worker/autopilot requirement is needed for the normal status path. |
| Validation evidence | Timeout symptoms alone do not show whether generation time, response size, or supervision churn is fixed. | Parent records before/after timing, response bytes, supervisor status, restart count, and LaunchAgent entrypoint posture or migration path. |

## Acceptance Criteria
- `co-status --format json` remains responsive against authenticated `/ui/data.json` while provider workers are active and operator autopilot data exists.
- Status dataset generation bounds audit/operator history instead of only increasing attach/request timeouts.
- Provider workers and operator autopilot can remain enabled during the validation scenario.
- The resulting JSON still includes current operational state: running/retrying/issues counts, provider workflow status, current operator autopilot summary, pending actions, and any truncation indicators needed to explain omitted history.
- Before/after validation captures command timing and response size for the same representative status target.
- Before/after validation captures control-host supervisor status and restart-count behavior, proving the fix does not mask a restart loop or force supervision churn.
- LaunchAgent entrypoint posture is recorded, or a concrete migration path is documented if the installed LaunchAgent points at a stale entrypoint.

## Non-Goals
- No broad rewrite of the control-host UI or dashboard protocol.
- No removal of authentication from `/ui/data.json`.
- No steady-state requirement to disable provider workers, operator autopilot, or provider workflow payloads.
- No timeout-only fix.
- No child-lane source, test, Linear, workpad, or PR edits in this docs-only slice.

## Not Done If
- `co-status --format json` still times out on authenticated `/ui/data.json` under active provider-worker load.
- The parent fix only raises attach/request timeouts.
- The parent validation requires disabling provider workers or operator autopilot.
- The status payload becomes small by dropping current operator workflow state without replacement summary/truncation evidence.
- Before/after timings, response size, supervisor status, restart count, or LaunchAgent posture are missing from closeout evidence.

## Goals
- Bound authenticated status dataset generation on the hot path.
- Preserve operator-useful current status while constraining unbounded audit/operator history.
- Give operators a repeatable evidence trail for performance, response size, and supervision behavior.
- Keep the LaunchAgent entrypoint posture visible so a stale installed supervisor cannot be confused with a dataset performance fix.

## Metrics & Guardrails
- Primary Success Metrics:
  - `co-status --format json` completes within the existing request timeout for the representative active-provider-worker scenario
  - response byte size is materially bounded versus the failing baseline
  - supervisor status remains healthy or the restart-count behavior is explicitly explained
  - LaunchAgent entrypoint posture is classified as current or has a migration path
- Guardrails / Error Budgets:
  - authenticated `/ui/data.json` remains read-only and authenticated
  - current status fields remain present
  - truncation is explicit when history is omitted
  - no normal-path requirement to stop provider workers or operator autopilot

## User Experience
- Operators can run `codex-orchestrator co-status --format json` during active provider work and get a timely status payload.
- Operators can inspect whether history-heavy sections were truncated without losing the current workflow summary.
- Operators can distinguish dataset bounds from supervisor/LaunchAgent entrypoint health.

## Technical Considerations
- Current code seams to inspect in the parent lane include `coStatusCliShell.ts`, `coStatusAttachCliShell.ts`, `uiDataController.ts`, `operatorDashboardPresenter.ts`, `observabilityReadModel.ts`, `providerWorkflowConfigStore.ts`, and `controlHostSupervisionCliShell.ts`.
- `coStatusAttachCliShell.ts` currently uses a default request timeout of `15_000ms`; increasing that value alone is explicitly out of scope.
- `observabilityReadModel.ts` serializes operator autopilot history-heavy collections under `provider_workflow.operator_autopilot.last_result`; parent implementation should bound the data before the response is serialized.
- LaunchAgent posture should be checked through `control-host supervise status --format json` and/or the installed LaunchAgent `ProgramArguments`, with migration guidance if it still points at a stale wrapper or entrypoint.

## Open Questions
- Which history arrays are largest in the failing dataset: operator autopilot actions, holds, pending/resolved actions, lifecycle records, local rollout execution attempts, backlog promotion snapshots, provider worker audit metadata, or another provider workflow section?
- Should truncation limits be fixed constants, configuration-backed, or exposed as status metadata only?
- Does the current installed LaunchAgent already use the packaged `control-host supervise run` entrypoint, or does it need a migration note alongside this dataset fix?

## Approvals
- Product: Linear issue `CO-376`
- Engineering: pending parent lane acceptance, docs-review, implementation, and focused validation
- Design: N/A
