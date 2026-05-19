---
id: 20260426-linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe
title: CO-376 co-status authenticated dataset bounds
relates_to: docs/PRD-linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe.md
risk: high
owners:
  - Codex
last_review: 2026-05-19
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe-co-status-authenticated-dataset-bounds.md`
- PRD: `docs/PRD-linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe.md`
- Task checklist: `tasks/tasks-linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe.md`
- `.agent` mirror: `.agent/task/linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe.md`
- Registry entry: `tasks/index.json`

## Traceability
- Linear issue: `CO-376` / `612a3dc3-f66f-4ba3-aea9-1282b54d93fe`
- Linear URL: https://linear.app/asabeko/issue/CO-376/co-status-authenticated-dataset-times-out-and-destabilizes-supervised
- Shared source 0 anchor: `ctx:sha256:2ad2a0ba5ecbafe9bb0b7cb2875952678949f28fbb367b10bee33ce33466e560#chunk:c000001`
- Source object id: `sha256:2ad2a0ba5ecbafe9bb0b7cb2875952678949f28fbb367b10bee33ce33466e560`
- Context dir: `../../.runs/linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe/cli/2026-04-25T17-55-01-786Z-8e218e11/memory/source-0`
- Source payload: `../../.runs/linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe/cli/2026-04-25T17-55-01-786Z-8e218e11/memory/source-0/source.txt`
- Source payload note: the shared `source-0` payload is metadata/provenance only; the substantive issue intent comes from the child-lane handoff.
- Docs packet child lane manifest: `.runs/linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe-docs-packet/cli/2026-04-25T17-57-28-787Z-d2c4e692/manifest.json`

## Summary
- Objective: bound authenticated `/ui/data.json` status dataset generation so `codex-orchestrator co-status --format json` remains responsive while provider workers and operator autopilot are active.
- Scope:
  - parent-owned source inspection and implementation in the `co-status` attach path, UI data controller/presenter, observability read model, provider workflow/operator autopilot payload shaping, and supervision posture reporting as needed
  - parent-owned focused tests and live before/after evidence for timing, response size, and supervisor restart behavior
  - parent-owned LaunchAgent entrypoint posture classification or migration path if stale
- Constraints:
  - child lane owns only the declared docs packet, checklist mirror, and `tasks/index.json` registration
  - implementation must bound status dataset generation, not merely increase attach timeouts
  - implementation must not require disabling provider workers or operator autopilot

## Issue-Shaping Contract
- User-request translation carried forward: `co-status --format json` times out because authenticated `/ui/data.json` generation processes unbounded audit/operator history while provider workers are active. The fix is a bounded dataset-generation contract with timing/size/supervision evidence, not a timeout bump or disabled-worker workaround.
- Protected terms / exact artifact and surface names:
  - `codex-orchestrator co-status --format json`
  - `co-status --format json`
  - `co-status attach`
  - authenticated `/ui/data.json`
  - hot-path generation
  - unbounded audit/operator history
  - provider workers
  - operator autopilot
  - `provider_workflow.operator_autopilot.last_result`
  - `DEFAULT_ATTACH_REQUEST_TIMEOUT_MS`
  - `control-host supervise status --format json`
  - supervisor status
  - restart count
  - LaunchAgent entrypoint posture
  - LaunchAgent `ProgramArguments`
- Nearby wrong interpretations to reject:
  - timeout-only fix
  - disabling provider workers
  - disabling operator autopilot
  - unauthenticated or stale-cached `/ui/data.json`
  - dropping provider workflow data entirely
  - skipping response-size evidence
  - skipping LaunchAgent posture because the endpoint change passes tests
- Explicit non-goals carried forward:
  - no source edits in this child lane
  - no Linear mutation from this child lane
  - no full repo validation from this child lane
  - no broad control-host dashboard rewrite unless parent evidence proves a smaller bound cannot work

## Parity / Alignment Matrix
- Current truth:
  - `co-status --format json` resolves an attach target and fetches authenticated `/ui/data.json`
  - `/ui/data.json` is served by `handleUiDataRequest(...)`, which calls `readUiDataset(...)`
  - `readUiDataset(...)` builds an operator dashboard payload from the compatibility projection
  - `provider_workflow.operator_autopilot.last_result` can include history-heavy arrays from audit/operator workflows
  - default attach request timeout is `15_000ms`
- Reference truth:
  - status endpoints should expose current operator state promptly even during active provider work
  - history-heavy data belongs behind deterministic bounds or summary/truncation fields on the hot path
  - supervision health and LaunchAgent entrypoint posture are separate but required closeout evidence
- Target truth / intended delta:
  - status dataset generation is bounded before serialization
  - current fields remain useful for operators
  - `co-status --format json` succeeds within the existing timeout budget for the representative failing case
  - before/after timings, response size, supervisor status, restart-count behavior, and LaunchAgent posture are recorded
- Explicitly out-of-scope differences:
  - raising the timeout as the primary solution
  - disabling provider workers or operator autopilot
  - hiding current provider workflow status
  - treating LaunchAgent migration as done without evidence

## Readiness Gate
- Not done if:
  - `co-status --format json` still times out against authenticated `/ui/data.json`
  - the parent fix only changes timeout values
  - validation requires provider workers or operator autopilot to be disabled
  - response size is not captured before and after
  - supervisor status or restart count is not captured before and after
  - LaunchAgent entrypoint posture or migration path is missing
- Pre-implementation issue-quality review evidence:
  - 2026-04-26: the handoff intent is not plausibly a generic attach-timeout request. It explicitly ties the failure to authenticated `/ui/data.json` hot-path generation and unbounded audit/operator history while provider workers are active, and requires performance, size, supervision, and LaunchAgent posture evidence. The micro-task path is ineligible because correctness depends on exact surface names, protected non-goals, and operator validation evidence.
- Safeguard ownership split:
  - child lane owns docs-only packet creation
  - parent lane owns source inspection, implementation, focused tests, live validation artifacts, Linear/workpad state, PR lifecycle, and merge

## Technical Requirements
- Functional requirements:
  1. Bound authenticated `/ui/data.json` dataset generation used by `co-status --format json`.
  2. Keep the endpoint authenticated, read-only, and compatible with `co-status attach`.
  3. Apply bounds to audit/operator history that can grow without limit, especially under `provider_workflow.operator_autopilot.last_result`.
  4. Preserve current operational state: counts, running/retrying/issues rows, provider workflow status, current operator autopilot summary, pending actionable items, and current error/status fields.
  5. Expose or preserve explicit truncation/summary metadata when history is omitted so operators can tell that the payload was bounded.
  6. Do not require provider workers or operator autopilot to be disabled.
  7. Do not treat `DEFAULT_ATTACH_REQUEST_TIMEOUT_MS` as the primary fix.
  8. Record LaunchAgent entrypoint posture or a migration path when `control-host supervise status --format json` or the installed LaunchAgent `ProgramArguments` indicate a stale entrypoint.
- Non-functional requirements:
  - bounded response size for representative active-provider-worker datasets
  - predictable generation latency under attach polling
  - no secret leakage in truncation metadata or diagnostics
  - no regression to supervisor restart loops
  - no change to the default auth requirements for `/ui/data.json`
- Interfaces / contracts:
  - `codex-orchestrator co-status --format json`
  - `codex-orchestrator co-status attach`
  - authenticated `GET /ui/data.json`
  - `OperatorDashboardDataset`
  - `ControlProviderWorkflowPayload`
  - `provider_workflow.operator_autopilot.last_result`
  - `control-host supervise status --format json`
  - LaunchAgent `ProgramArguments`

## Architecture & Data
- Architecture / design adjustments:
  - prefer bounding in the presenter/read-model layer before JSON serialization rather than post-processing the emitted string
  - keep bounds centralized and named so future operator-history fields do not silently reintroduce unbounded payloads
  - keep current state separate from history snapshots so active operational truth is not lost when history is truncated
  - keep attach timeout behavior as a guardrail, not the fix
- Data model changes / migrations:
  - no persistent data migration is required by the docs packet
  - parent may add response metadata such as `truncated`, `limit`, `omitted_count`, or per-section summary fields if needed
  - parent must document any LaunchAgent migration command/path if the installed entrypoint is stale
- External dependencies / integrations:
  - active control-host endpoint files: `control_endpoint.json` and `control_auth.json`
  - provider workflow/operator autopilot audit and lifecycle files
  - macOS launchd LaunchAgent when supervision is installed

## Validation Plan
- Child-lane checks:
  - `node -e "JSON.parse(require('node:fs').readFileSync('tasks/index.json','utf8'))"`
  - protected-term grep over the six declared files
  - `git diff --check --` on the six declared files plus `tasks/index.json`
- Parent-lane focused tests:
  - `npx vitest run --config vitest.config.core.ts orchestrator/tests/UiDataController.test.ts orchestrator/tests/CoStatusCliShell.test.ts orchestrator/tests/CoStatusAttachCliShell.test.ts orchestrator/tests/ObservabilityReadModel.test.ts orchestrator/tests/ProviderOperatorAutopilot.test.ts orchestrator/tests/ControlHostSupervision.test.ts`
  - narrower subsets are acceptable if the parent records why the changed seam is smaller
- Parent-lane live/manual validation:
  - before/after command timing for `codex-orchestrator co-status --format json`
  - before/after response byte size for the JSON payload
  - before/after `control-host supervise status --format json` or equivalent supervisor status/restart-count evidence
  - LaunchAgent `ProgramArguments` classification or explicit stale-entrypoint migration path
  - proof that provider workers and operator autopilot remained enabled for the representative validation
- Rollout verification:
  - parent records the exact command lines, target manifest/run, timing values, response byte counts, supervisor status, restart count, and LaunchAgent posture artifact in the task checklist/workpad before review handoff

## Open Questions
- Which field group dominates the failing payload size and generation time?
- Should the history bounds be fixed defaults, config-backed, or request-parameter-free constants to keep `/ui/data.json` deterministic?
- Does the parent need to add a separate diagnostic command for full audit/operator history, or is bounded status plus source audit paths enough?
- Is the installed LaunchAgent already on the packaged supervision entrypoint?

## Approvals
- Reviewer: docs child lane self-review for packet shape and issue-shaping contract
- Date: 2026-04-26
