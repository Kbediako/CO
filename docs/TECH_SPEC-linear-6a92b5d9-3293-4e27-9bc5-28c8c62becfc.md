---
id: 20260502-linear-6a92b5d9-3293-4e27-9bc5-28c8c62becfc
title: "CO-486 persisted goal evidence canary"
relates_to: docs/PRD-linear-6a92b5d9-3293-4e27-9bc5-28c8c62becfc.md
risk: medium
owners:
  - Codex
last_review: 2026-05-02
---

## Summary
- Objective: decide whether persisted Codex goal state should become CO provider-worker run evidence.
- Scope: canary commands/tool probes, evidence contract design, provider-worker/long-poll/hook recovery classification, docs packet, registry mirrors, and follow-up scope decision.
- Constraints: no hook/resume integration in this lane, no Linear authority replacement, no release-facing Codex pin promotion, and no broad provider-worker rewrite.

## Issue-Shaping Contract
- User-request translation carried forward: CO-486 should probe the live Codex CLI `0.128.0` goal surface and decide the evidence contract for persisted `/goal` workflows before implementation.
- Protected terms / exact artifact and surface names: persisted `/goal`, goals feature, app-server APIs, model tools, runtime continuation, TUI controls, provider-worker run evidence, hook recovery, long-poll waits, Linear remains source of truth, `codex-cli-0128:goal-evidence-canary`, `codex-orchestrator:canonical-owner-key=codex-cli-0128:goal-evidence-canary`.
- Nearby wrong interpretations to reject: goal state replaces Linear/workpad state; hook/resume integration is in scope now; this is a generic CO-466 release duplicate; goal completion alone means the issue can transition to review or done.
- Explicit non-goals carried forward: no release pin promotion, no hook/resume integration, no broad provider-worker rewrite, no replacement of Linear as workflow authority.

## Parity / Alignment Matrix
- Current truth: CO can run Codex CLI `0.128.0` locally and has `features.goals=true`; provider-worker evidence currently relies on Linear, workpad, run manifests, review telemetry, validation, PR checks, and ready-review/merge monitors.
- Reference truth: provider-worker lifecycle decisions are authorized by Linear state/workpad/PR/review/check evidence, not local thread metadata.
- Target truth / intended delta: goal state can be included as advisory evidence with strict authorization limits and reproducible probe artifacts.
- Explicitly out-of-scope differences: runtime hook/resume integration, TUI automation, cloud/release pin movement, and provider-worker authority refactors.

## Readiness Gate
- Not done if:
  - live `0.128.0` goal feature/app-server/tool probes are missing
  - evidence fields are not specified
  - provider-worker, long-poll, hook recovery, and operator-continuity classifications are missing
  - follow-up implementation scope is not classified
  - Linear/workpad authority can be bypassed by goal state
- Pre-implementation issue-quality review evidence:
  - 2026-05-02T16:15:44Z: issue is appropriately broader than a micro-task because correctness depends on protected wording, live local canary evidence, and lifecycle authority boundaries.
  - 2026-05-02T16:15:44Z: canary/design scope is intentionally separate from CO-466 release-intake; this lane consumes the already classified local `0.128.0` posture rather than re-promoting release pins.
- Safeguard ownership split:
  - Parent owns PRD, TECH_SPEC, canonical spec, registries, canary probes, Linear/workpad state, docs-review, validation, follow-up filing, and PR lifecycle.
  - Same-issue child lane `docs-checklist-scaffold` owns only `docs/ACTION_PLAN-linear-6a92b5d9-3293-4e27-9bc5-28c8c62becfc.md`, `tasks/tasks-linear-6a92b5d9-3293-4e27-9bc5-28c8c62becfc.md`, and `.agent/task/linear-6a92b5d9-3293-4e27-9bc5-28c8c62becfc.md` until accepted.

## Technical Requirements
- Functional requirements:
  1. Record installed CLI version and active goal feature posture.
  2. Generate or inspect app-server protocol evidence for goal notifications and goal state shape.
  3. Exercise direct model-tool goal state where allowed by the canary.
  4. Inspect runtime continuation command surfaces.
  5. Define the manifest/workpad evidence contract.
  6. Classify provider-worker, long-poll wait, hook recovery, and operator-continuity interactions.
  7. Decide and, if warranted, file follow-up implementation scope without implementing hook/resume behavior in this lane.
- Non-functional requirements:
  - evidence must be reproducible from local commands or tool outputs
  - contract must fail closed when goal evidence is missing, stale, paused, budget-limited, or thread-mismatched
  - no lifecycle gate may trust goal state ahead of Linear/workpad/PR/review/check truth
- Interfaces / contracts:
  - app-server protocol notifications: `thread/goal/updated`, `thread/goal/cleared`
  - generated type shape: `ThreadGoal = { threadId, objective, status, tokenBudget, tokensUsed, timeUsedSeconds, createdAt, updatedAt }`
  - allowed statuses observed in generated bindings: `active`, `paused`, `budgetLimited`, `complete`
  - model tools observed in this worker session: `get_goal`, `create_goal`, and `update_goal` lifecycle semantics

## Canary Evidence - 2026-05-02T16:15Z
- `which codex && codex --version`: `/opt/homebrew/bin/codex`, `codex-cli 0.128.0`.
- `codex features list`: `goals` is `under development` and `true`; removed `js_repl` / `js_repl_tools_only` remain false, matching CO-466 posture.
- `codex app-server --help`: app-server exposes `proxy`, `generate-ts`, and `generate-json-schema` plus `stdio://`, `unix://`, and websocket listen modes.
- `codex app-server generate-json-schema --out .runs/linear-6a92b5d9-3293-4e27-9bc5-28c8c62becfc/manual/goal-surface-json-schema`: generated schema contains `thread/goal/updated`, `thread/goal/cleared`, `ThreadGoal`, `ThreadGoalStatus`, `ThreadGoalUpdatedNotification`, and `ThreadGoalClearedNotification`.
- `codex app-server generate-ts --out .runs/linear-6a92b5d9-3293-4e27-9bc5-28c8c62becfc/manual/goal-surface-ts`: generated bindings expose `ThreadGoal`, `ThreadGoalStatus`, `ThreadGoalUpdatedNotification`, and `ThreadGoalClearedNotification`.
- `codex resume --help` and `codex exec resume --help`: runtime continuation exists for interactive and non-interactive sessions, including `--last`, explicit session id, prompt continuation, and non-interactive JSON output for `exec resume`.
- Direct model-tool canary in this provider-worker session:
  - `get_goal` initially returned no active goal.
  - `create_goal` created objective `CO-486 canary: evaluate persisted Codex goal workflows as provider-worker run evidence while preserving Linear/workpad authority`.
  - subsequent `get_goal` returned an active goal with `threadId`, `objective`, `status`, `tokensUsed`, `timeUsedSeconds`, `createdAt`, and `updatedAt`.
- `codex exec` / `codex exec resume` persistence canary:
  - initial command wrote `.runs/linear-6a92b5d9-3293-4e27-9bc5-28c8c62becfc/manual/goal-persistence/initial-events.jsonl` and `initial-final.txt`, creating thread `019de950-8d97-79e0-94e7-e7f3567d1a46` with objective `CO-486 exec persistence canary goal`.
  - resumed command re-opened the same thread and persisted session file `/Users/kbediako/.codex/sessions/2026/05/03/rollout-2026-05-03T01-31-03-019de950-8d97-79e0-94e7-e7f3567d1a46.jsonl`.
  - extracted evidence `.runs/linear-6a92b5d9-3293-4e27-9bc5-28c8c62becfc/manual/goal-persistence/resume-session-evidence.json` shows resumed `get_goal` returned the same `threadId` and objective, then `update_goal` completed it and final output reported `persistence_result: persisted`.

## Evidence Contract Decision
- Classification: persisted goal state is advisory provider-worker run evidence, not an orchestration control surface.
- Rationale:
  - goal state is scoped to a Codex thread/session and can describe operator intent, token/time budget, and continuity state
  - Linear/workpad/PR/review/check state is external workflow truth and remains the only authority for provider-worker lifecycle decisions
  - goal state can be missing, stale, paused, budget-limited, or thread-mismatched without implying issue state
  - app-server notifications provide useful evidence deltas, but notification presence does not prove validation, review, or merge readiness

## Proposed Manifest / Workpad Evidence
- Manifest field: `goal_evidence`.
- Suggested normalized shape:

```json
{
  "source": "codex-goals",
  "feature_enabled": true,
  "capture_mode": "model_tool|app_server_notification|unavailable",
  "captured_at": "ISO-8601",
  "thread_id": "string",
  "turn_id": "string|null",
  "objective": "string",
  "status": "active|paused|budgetLimited|complete",
  "token_budget": "number|null",
  "tokens_used": "number",
  "time_used_seconds": "number",
  "created_at": "number",
  "updated_at": "number",
  "authority": "advisory_only",
  "linear_authority_preserved": true,
  "not_authorized_for": [
    "linear_transition",
    "workpad_closeout",
    "pr_attachment",
    "review_handoff",
    "ready_review_success",
    "merge_closeout",
    "hook_recovery_success",
    "long_poll_terminal_status"
  ]
}
```

- Workpad summary should show only a compact line such as: `Goal evidence: advisory_only; status=active; objective=<short>; thread=<id>; captured_at=<time>; cannot authorize Linear/PR/review/merge transitions.`
- If unavailable, record `goal_evidence.source=codex-goals`, `feature_enabled=false|unknown`, `capture_mode=unavailable`, and a reason instead of omitting the field silently.

## Classification By Workflow Surface
- Provider-worker runs: record advisory snapshots when available; never admit, block, transition, attach PRs, or hand off to review solely from goal state.
- Long-poll waits: goal status can annotate operator continuity, but terminal status still comes from CI/review/cloud/orchestrator monitor APIs and manifests.
- Hook recovery: goal state can be diagnostic context for a resumed thread, but recovery success must be proven by hook/run artifacts, refreshed manifests, and Linear/workpad state.
- Runtime continuation: resume surfaces can help preserve intent across sessions; continuation must re-read Linear issue-context, workpad, branch, PR, and manifest truth before acting.
- TUI controls: useful for an operator in interactive sessions, but provider-worker automation cannot depend on TUI-only state in non-interactive runs.
- Same-issue child lanes and child streams: child evidence may include goal snapshots only when captured within that child run; parent acceptance still requires patch/manifests and Linear workpad truth.

## Follow-Up Implementation Scope
- Decision: accept a narrow follow-up implementation lane if this canary closes cleanly.
- Filed follow-up: `CO-492` / `779bc931-f6b4-4a1c-b16f-145d500aca73`, `CO: capture advisory persisted goal evidence in provider-worker manifests`, created in Backlog with a related link and `blocked_by_source`.
- Follow-up should add advisory `goal_evidence` capture to provider-worker run manifests/workpad closeout where the goal feature and tools are available.
- Follow-up must not implement hook/resume control, long-poll control, Linear transitions, review handoff, or merge decisions from goal state.
- Follow-up should include focused tests for missing/disabled/stale/thread-mismatched goal evidence and must prove existing Linear/workpad authority remains fail-closed.

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.
- Required decision table:

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Provider-worker lifecycle authority | Goal evidence may exist beside Linear/workpad truth | justify retaining fallback | CO provider-worker workflow | goal feature enabled or unavailable | existing authority predates CO-486 | 2026-05-02 | non-expiring authority contract | only replaced by a separate approved authority redesign | Linear issue-context, workpad contract, review/ready-review/merge gates, this canary |

- For `justify retaining fallback`, contract name: Linear-first lifecycle authority with optional advisory goal evidence.
- Large-refactor check: a larger refactor is not warranted in this canary lane because the canary does not split authority; it documents an additive evidence field and reserves implementation for a follow-up.

## Architecture & Data
- Architecture / design adjustments: none implemented in this lane. Proposed follow-up would capture normalized goal evidence during provider-worker evidence assembly and render a short workpad line.
- Data model changes / migrations: none in this lane. Future manifests can add optional `goal_evidence` without rewriting historical manifests.
- External dependencies / integrations: Codex CLI goal tools and app-server protocol surfaces; Linear remains the external workflow authority.

## Validation Plan
- Tests / checks:
  - live command evidence listed in `Canary Evidence`
  - docs packet and registry validation
  - docs-review child stream before implementation
  - JSON parse checks for registry files
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - standalone review and elegance pass if final diff is non-trivial
- Rollout verification: workpad records the canary decision, follow-up decision, validation state, and review/elegance result before review handoff.
- Monitoring / alerts: not applicable until implementation follow-up.

## Open Questions
- Should the follow-up capture both last-known goal snapshot and the last goal update/clear notification?
- Should a completed goal remain visible in final workpad closeout even when the provider-worker issue stays in review?
- Should goal evidence be redacted or truncated for very long objectives before workpad rendering?

## Approvals
- Docs-review: `.runs/linear-6a92b5d9-3293-4e27-9bc5-28c8c62becfc-docs-review/cli/2026-05-02T15-25-40-851Z-0acbfb39/manifest.json`; P2 persistence concern addressed with exec/resume evidence.
- Final standalone/elegance review: provider-worker handoff evidence is recorded in the Linear workpad and PR lifecycle rather than self-authorized in this tracked packet.
- Date: 2026-05-02.
