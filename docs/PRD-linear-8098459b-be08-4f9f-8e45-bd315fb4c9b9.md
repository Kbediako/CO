# PRD - CO-408 durable child-lane decision lineage

## Traceability
- Linear issue: `CO-408` / `8098459b-be08-4f9f-8e45-bd315fb4c9b9`
- Linear URL: https://linear.app/asabeko/issue/CO-408/co-add-durable-child-lane-decision-lineage-for-provider-worker
- Task id: `linear-8098459b-be08-4f9f-8e45-bd315fb4c9b9`
- Source issue: `CO-403` / `c8e3a464-ec50-4fa4-aff5-d8a780626600`
- Canonical spec: `tasks/specs/linear-8098459b-be08-4f9f-8e45-bd315fb4c9b9.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-8098459b-be08-4f9f-8e45-bd315fb4c9b9.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-8098459b-be08-4f9f-8e45-bd315fb4c9b9.md`
- Task checklist: `tasks/tasks-linear-8098459b-be08-4f9f-8e45-bd315fb4c9b9.md`
- Packet note: this PR only creates the CO-408 traceability packet and registry mirrors. CO-408 implementation remains Backlog/Ready-gated until the packet lands.
- Linear note: this packet lane does not transition Linear state, claim the provider-worker WIP slot, create workpads, relaunch child lanes, or change PR lifecycle state.

## Immediate Traceability
- Backlog hold being cleared later: `backlog_head_follow_up_traceability_pending`.
- Missing packet files created here:
  - `docs/PRD-linear-8098459b-be08-4f9f-8e45-bd315fb4c9b9.md`
  - `docs/TECH_SPEC-linear-8098459b-be08-4f9f-8e45-bd315fb4c9b9.md`
  - `docs/ACTION_PLAN-linear-8098459b-be08-4f9f-8e45-bd315fb4c9b9.md`
  - `tasks/specs/linear-8098459b-be08-4f9f-8e45-bd315fb4c9b9.md`
  - `tasks/tasks-linear-8098459b-be08-4f9f-8e45-bd315fb4c9b9.md`
  - `.agent/task/linear-8098459b-be08-4f9f-8e45-bd315fb4c9b9.md`
- Required mirrors updated here:
  - `tasks/index.json`
  - `docs/TASKS.md`
  - `docs/docs-freshness-registry.json`
- Source lineage: CO-403 intentionally keeps provider-worker retry recovery fail-closed when a child lane launch predates the latest ordinary `parallelize_now` audit row by more than a narrow timestamp-skew window. CO-408 exists so a future runtime can support arbitrary launch-before-decision ordering through durable lineage instead of wider timestamp tolerance.

## Summary
- Problem Statement: CO-403 protects retry recovery from stale older child lanes by requiring recovered same-issue child-lane launches to align with the latest prior `parallelize_now` decision inside a narrow timestamp window. That is conservative and correct for the current PR, but it cannot support future runtime ordering where the child launch may be recorded before the parent decision audit row unless durable parent turn and decision lineage exists.
- Desired Outcome: child-lane records or companion audit entries carry durable lineage tying each same-issue child lane to the parent turn and `parallelize_now` decision it satisfies. Provider-worker retry recovery uses that lineage first, falls back to bounded timestamp inference only when lineage is absent and explicitly safe, and continues to fail closed for stale older child lanes.

## User Request Translation
- User intent / needs: Create the missing traceability packet for `CO-408` so the backlog hold can be cleared later without opening implementation work. The later implementation must add first-class lineage or equivalent proof tying same-issue child-lane records to their parent turn and parallelization decision, then update provider-worker retry recovery to prefer lineage over broad timestamp tolerance.
- Success criteria / acceptance:
  - child-lane records or companion audit entries carry durable parent turn and parallelization decision lineage sufficient to identify the decision they satisfy
  - retry recovery uses lineage first and only falls back to bounded timestamp inference where lineage is absent and explicitly safe
  - tests cover valid launch-before-decision recovery with durable lineage and stale older unrelated child-lane rejection
  - `co-status` and proof surfaces expose the recovered lineage truthfully for reviewer diagnosis
- Constraints / non-goals:
  - do not remove CO-403 recovery enforcement
  - do not count any successful child lane by stream alone
  - do not increase timestamp tolerance without durable lineage
  - do not weaken pending parent acceptance checks
  - do not change CO-403 behavior or broaden one-second ordering tolerance in this packet lane
  - do not relaunch duplicate child lanes to paper over missing lineage
  - do not modify unrelated provider current-state authority or PR review handoff behavior

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `provider-worker retry recovery`
  - `same-issue child lane`
  - `parallelize_now`
  - `recover_child_lane:<stream>`
  - `recover_run:<run_id>`
  - `latest prior decision lineage`
  - `stale older child lane`
  - `fail closed`
  - `backlog_head_follow_up_traceability_pending`
- Protected terms / exact artifact and surface names:
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/src/cli/providerLinearChildLaneRunner.ts`
  - `orchestrator/src/cli/providerLinearChildStreamShell.ts`
  - `orchestrator/src/cli/coStatusCliShell.ts`
  - `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
  - `orchestrator/tests/ProviderLinearChildLaneRunner.test.ts`
  - `provider-linear-worker-proof.json`
  - `parallelization_launch_missing`
  - `pending parent acceptance`
  - parent turn lineage
  - parallelization decision lineage
  - decision audit row
  - timestamp inference
  - narrow timestamp-skew window
- Nearby wrong interpretations to reject:
  - "durable lineage" means weakening CO-403 fail-closed enforcement
  - a matching stream name alone proves the child lane satisfies the current decision
  - increasing the timestamp tolerance is an acceptable substitute for lineage
  - missing lineage should be repaired by relaunching duplicate no-op child lanes
  - this packet should implement provider-worker code, tests, or `co-status` changes

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| Provider-worker retry recovery | CO-403 accepts recovered child-lane proof only when it aligns with the active/latest prior `parallelize_now` decision under narrow timestamp inference. | Retry recovery must stay conservative and fail closed for stale older child lanes. | Recovery prefers durable parent turn and decision lineage, with bounded timestamp inference only as a safe legacy fallback. | Removing CO-403 enforcement or broadening timestamp tolerance in this packet. |
| Same-issue child-lane audit records | Current records can prove issue/stream/run facts but may not durably identify the parent turn and decision satisfied by the child. | A future runtime needs arbitrary launch-before-decision ordering without misattributing older child lanes. | Records or companion audit entries carry a stable lineage key linking the child lane to the parent turn and `parallelize_now` decision. | Relaunching duplicate child lanes to create fresh evidence. |
| Recovery markers | `recover_child_lane:<stream>` and `recover_run:<run_id>` are useful diagnostics but not enough by themselves to prove decision lineage. | Diagnostic markers must not become broad acceptance shortcuts. | Recovery markers are paired with latest prior decision lineage or equivalent durable proof before satisfying enforcement. | Counting any successful child lane by stream alone. |
| Proof and status surfaces | Proof/status can show recovered child-lane state but need clearer lineage truth for reviewer diagnosis. | Operators and reviewers need to see why a retry recovered or failed closed. | `provider-linear-worker-proof.json` and `co-status` expose the recovered parent turn and decision lineage, or explicitly classify safe legacy timestamp fallback. | Unrelated provider current-state authority or PR review handoff behavior. |
| Tests | CO-403 covers conservative retry recovery and stale older child-lane rejection through timestamp-bounded behavior. | New lineage support needs direct positive and negative coverage. | Tests prove valid launch-before-decision recovery with durable lineage and stale older unrelated child-lane rejection. | Reopening CO-403 behavior or one-second tolerance in the current PR. |

## Not Done If
- CO-408 can leave Backlog without this packet and registry mirrors.
- The future implementation counts a same-issue child lane by stream alone.
- A stale older child lane can satisfy a newer `parallelize_now` decision.
- Timestamp tolerance is widened without durable parent turn and parallelization decision lineage.
- Pending parent acceptance checks are weakened.
- `recover_child_lane:<stream>` or `recover_run:<run_id>` markers are treated as sufficient proof without latest prior decision lineage.
- Proof or `co-status` surfaces hide whether recovery used durable lineage or safe legacy timestamp inference.
- This packet PR changes provider-worker source, tests, Linear state, workpads, provider WIP slots, or PR handoff behavior.

## Goals
- Create the CO-408 docs-first packet and required registry mirrors.
- Preserve the CO-403 follow-up scope exactly: durable decision lineage for provider-worker retry recovery.
- Define the target lineage contract before implementation starts.
- Keep the future implementation fail-closed for stale older child lanes and missing/ambiguous lineage.
- Make proof/status reviewer diagnosis part of acceptance.

## Non-Goals
- No provider-worker implementation in this packet PR.
- No CO-403 behavior change or timestamp tolerance broadening in this packet PR.
- No Linear transition, workpad mutation, WIP-slot claim, or PR lifecycle mutation for CO-408.
- No duplicate same-issue child-lane relaunch to compensate for missing lineage.
- No unrelated provider current-state authority, control-host, docs freshness ownership, or review handoff work.

## Stakeholders
- Product: CO operators relying on fail-closed provider-worker retry recovery.
- Engineering: provider-worker runner, same-issue child-lane runner, child-stream shell, proof/status projection, and review validation owners.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics:
  - six CO-408 packet/checklist files exist
  - `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` register the packet
  - required docs validation parses and accepts the packet
  - later implementation can leave Backlog/Ready gating with the lineage contract intact
- Guardrails / Error Budgets:
  - zero provider-worker source/test edits in this packet lane
  - zero Linear state transitions
  - zero timestamp-tolerance expansion without durable lineage
  - zero weakening of pending parent acceptance checks

## Technical Considerations
- Candidate durable lineage fields include a stable parent turn id, parent run id, `parallelize_now` decision id, decision audit timestamp, decision stream, child-lane stream, child run id, issue id, and acceptance state. The future implementation can use an equivalent proof shape if it preserves the same ability to identify the exact decision satisfied.
- Retry recovery should evaluate durable lineage before timestamp inference. Legacy timestamp inference should be allowed only when records predate lineage support and the existing narrow skew check still proves the recovery is explicitly safe.
- `co-status` and `provider-linear-worker-proof.json` should expose whether recovery was accepted through durable lineage, safe legacy timestamp inference, or rejected as stale/ambiguous.

## Validation Plan
- Packet lane:
  - JSON parse checks for edited registries
  - protected-term scan over CO-408 packet files
  - `git diff --check`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - scoped diff/status review to confirm only packet and mirror files changed
- Parent implementation lane:
  - docs-review before implementation
  - focused provider-worker retry recovery tests for valid launch-before-decision lineage
  - negative tests for stale older unrelated child lane, stream-only match, missing lineage, and unsafe timestamp inference
  - proof/status projection tests showing accepted lineage or explicit safe fallback
  - normal parent validation, review, elegance, PR, and Linear handoff gates

## Open Questions
- Should the durable decision lineage live directly on child-lane records, on companion audit entries, or on both for redundancy?
- What stable parent turn identifier should survive retry/resume boundaries without depending on wall-clock ordering?
- Should legacy timestamp inference produce a deprecation warning once all active records carry lineage?

## Approvals
- Product: pending parent CO-408 lane
- Engineering: pending docs-review / implementation review
- Design: N/A
