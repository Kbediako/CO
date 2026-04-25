# ACTION_PLAN - CO-376 co-status authenticated dataset bounds

## Summary
- Goal: give the parent lane a bounded implementation plan for keeping `co-status --format json` responsive by bounding authenticated `/ui/data.json` dataset generation under active provider-worker/operator-autopilot load.
- Scope: parent-owned source inspection, bounded dataset implementation, focused tests, before/after timing and response-size evidence, supervisor status/restart-count evidence, and LaunchAgent entrypoint posture or migration path.
- Assumptions:
  - the shared source-0 payload is metadata/provenance only
  - the substantive issue intent is preserved by the child-lane handoff
  - the smallest acceptable fix bounds dataset generation rather than changing attach timeout defaults

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
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
- Not done if:
  - status still times out under the representative active-provider-worker scenario
  - the fix is only a timeout increase
  - validation disables provider workers or operator autopilot
  - the payload drops current provider workflow/operator state without explicit truncation/summary evidence
  - timing, byte-size, supervision, restart-count, or LaunchAgent posture evidence is missing
- Pre-implementation issue-quality review:
  - accepted framing is authenticated status dataset bounds for `/ui/data.json`
  - rejected framings are timeout-only, disabled-provider-worker, disabled-operator-autopilot, unauthenticated cache, and broad dashboard rewrite

## Milestones & Sequencing
1. Parent captures the failing or representative baseline: `co-status --format json` timing, response byte size if any response completes, active provider-worker/operator-autopilot posture, supervisor status, restart count, and LaunchAgent entrypoint posture.
2. Parent identifies the unbounded history contributors in `/ui/data.json`, starting with `provider_workflow.operator_autopilot.last_result` and related audit/operator history arrays.
3. Parent implements deterministic bounds in the presenter/read-model generation path while preserving current operational state and explicit truncation/summary evidence.
4. Parent runs focused regressions for UI data, co-status attach/json, observability read model, provider operator autopilot payloads, and control-host supervision posture.
5. Parent captures after evidence with the same target: timing, response byte size, supervisor status, restart count, active provider-worker/operator-autopilot posture, and LaunchAgent entrypoint posture or migration path.

## Dependencies
- Shared source 0 anchor: `ctx:sha256:2ad2a0ba5ecbafe9bb0b7cb2875952678949f28fbb367b10bee33ce33466e560#chunk:c000001`
- Source payload note: metadata-only source payload at `../../.runs/linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe/cli/2026-04-25T17-55-01-786Z-8e218e11/memory/source-0/source.txt`
- Core parent-owned source seams:
  - `orchestrator/src/cli/coStatusCliShell.ts`
  - `orchestrator/src/cli/coStatusAttachCliShell.ts`
  - `orchestrator/src/cli/control/uiDataController.ts`
  - `orchestrator/src/cli/control/operatorDashboardPresenter.ts`
  - `orchestrator/src/cli/control/observabilityReadModel.ts`
  - `orchestrator/src/cli/control/providerWorkflowConfigStore.ts`
  - `orchestrator/src/cli/controlHostSupervisionCliShell.ts`

## Validation
- Child-lane checks:
  - `node -e "JSON.parse(require('node:fs').readFileSync('tasks/index.json','utf8'))"`
  - protected-term grep across the six declared packet/checklist files
  - `git diff --check -- docs/PRD-linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe.md tasks/specs/linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe-co-status-authenticated-dataset-bounds.md docs/ACTION_PLAN-linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe.md tasks/tasks-linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe.md .agent/task/linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe.md tasks/index.json`
- Parent checks / tests:
  - focused Vitest coverage for the touched UI data, co-status, observability read-model, operator-autopilot, and supervision surfaces
  - before/after `co-status --format json` timing
  - before/after response byte size
  - before/after supervisor status and restart count
  - LaunchAgent `ProgramArguments` posture or migration path if stale
- Rollback plan:
  - revert any dataset-bound change that drops current status, hides auth errors, requires disabled provider work, or masks supervisor restart churn

## Risks & Mitigations
- Risk: parent only increases `DEFAULT_ATTACH_REQUEST_TIMEOUT_MS`.
  - Mitigation: keep timeout-only changes rejected in acceptance and validation.
- Risk: response size shrinks by dropping operator workflow truth entirely.
  - Mitigation: require current status plus truncation/summary evidence.
- Risk: local validation succeeds because provider workers or operator autopilot were disabled.
  - Mitigation: require active-worker/autopilot posture in before/after evidence.
- Risk: a stale LaunchAgent entrypoint keeps running old code after the source fix.
  - Mitigation: require LaunchAgent posture classification or migration path in closeout.

## Approvals
- Reviewer: parent implementation completed with manifest-backed standalone review `bounded-success`; final elegance pass kept the full-fidelity operational path separate from the bounded status hot path.
- Date: 2026-04-26
