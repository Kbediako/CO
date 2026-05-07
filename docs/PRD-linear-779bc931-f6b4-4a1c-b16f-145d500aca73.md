# PRD - CO-492 advisory persisted goal evidence capture

## Traceability
- Linear issue: `CO-492` / `779bc931-f6b4-4a1c-b16f-145d500aca73`.
- Task id: `linear-779bc931-f6b4-4a1c-b16f-145d500aca73`.
- Source anchor: `ctx:sha256:aeaf7bb89eb5a370f39d4f1098e89c80b5da6a6a29b77b1972ececf1cdb811f6#chunk:c000001`.
- Prompt manifest: `.runs/linear-779bc931-f6b4-4a1c-b16f-145d500aca73-docs-packet/cli/2026-05-06T23-13-09-726Z-85d46883/manifest.json`.

## Summary
- Problem Statement: CO-486 proved persisted `/goal` state is useful provider-worker run evidence, but current provider-worker manifests and the workpad summary do not have a narrow, governed place to capture optional advisory goal context.
- Desired Outcome: define a bounded implementation contract for optional manifest `goal_evidence` and compact workpad summary capture while preserving that Linear remains source of truth and `authority=advisory_only` for all goal-derived data.

## User Request Translation
- User intent / needs: create the CO-492 docs-first packet and registry mirrors only, carrying forward the CO-486 advisory-only persisted goal evidence boundary before parent implementation starts.
- Success criteria / acceptance: the packet preserves protected terms, defines the optional `goal_evidence` evidence shape and workpad rendering expectations, and explicitly rejects goal state as authority for Linear transitions, PR attachment, review handoff, ready-review success, merge closeout, hook recovery success, long-poll terminal status, hook/resume control integration, or TUI automation.
- Constraints / non-goals: docs phase only; no implementation code or tests; no Linear mutation helpers; no parent workpad, PR lifecycle, review, or validation ownership in this child lane.

## Intent Checksum
- Exact terms to preserve: persisted `/goal`, goals feature, app-server APIs, model tools, provider-worker run evidence, manifest `goal_evidence`, workpad summary, `advisory_only`, Linear remains source of truth.
- Protected authority phrase: `authority=advisory_only`.
- Nearby wrong interpretations to reject: persisted goal state replaces Linear or workpad truth; a completed goal can move an issue to review or Done; a goal objective can attach or close a PR; hook/resume control integration is part of this issue; TUI automation is required for provider-worker evidence capture; missing goal state is a blocker.

## Parity / Alignment Matrix

| Surface | Current truth | Target truth / intended delta | Explicitly out of scope |
| --- | --- | --- | --- |
| CO-486 canary | Persisted `/goal` state is advisory provider-worker run evidence only. | CO-492 implements that decision without reopening the authority question. | Reclassifying goal state as workflow authority. |
| Provider-worker manifests | No governed optional `goal_evidence` field is defined for current runs. | Add optional manifest `goal_evidence` with `authority=advisory_only`, capture provenance, and fail-closed authority limits. | Historical manifest migration or lifecycle decisions from goal state. |
| Workpad summary | Workpads can mention goal context only as prose if manually added. | Render a compact advisory line that points to captured goal evidence without becoming the source of truth. | Workpad closeout authorization from goal status. |
| app-server APIs / model tools | Goal APIs and model tools can expose current thread goal state when available. | Use them only as capture sources for provider-worker run evidence. | Hook/resume control integration or TUI automation. |

## Not Done If
- Goal state can authorize or unblock a Linear transition, PR attachment, review handoff, ready-review success, merge closeout, hook recovery success, long-poll terminal status, hook/resume control integration, or TUI automation.
- Missing, disabled, stale, unavailable, paused, budget-limited, complete, or thread-mismatched goal evidence blocks provider-worker lifecycle progress by itself.
- `goal_evidence` lacks `authority=advisory_only` or omits that Linear remains source of truth.
- The workpad summary becomes the only proof instead of a concise pointer to manifest evidence.
- This child lane edits implementation code, tests, Linear state, the authoritative workpad, PR state, or review lifecycle surfaces.

## Goals
- Define the optional provider-worker manifest `goal_evidence` contract.
- Define compact workpad summary wording for captured goal evidence.
- Preserve CO-486 advisory-only authority boundaries.
- Give the parent implementation lane exact protected wording and non-goals.

## Non-Goals
- No hook/resume control integration.
- No TUI automation.
- No Linear transition, PR attachment, review handoff, ready-review, merge closeout, hook recovery, or long-poll control from goal state.
- No historical manifest rewrite.
- No broad provider-worker lifecycle redesign.
- No docs-only completion for the eventual implementation issue.

## Metrics & Guardrails
- Primary success metrics: provider-worker manifests can include `goal_evidence` when available; workpad summaries can show the advisory state; lifecycle decisions still require Linear/workpad/PR/review/check evidence.
- Guardrails: Linear remains source of truth; `goal_evidence` is optional and advisory; unavailable capture records a reason instead of fabricating evidence.

## Technical Considerations
- Architectural notes: the evidence should be captured close to provider-worker run evidence assembly, not in Linear transition code. The workpad summary should consume already-captured evidence and never perform authority decisions.
- Dependencies / integrations: Codex goals feature, app-server APIs, model tools, provider-worker run manifest writing, and workpad summary rendering.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes, because `goal_evidence` is optional and must tolerate disabled, unavailable, stale, or mismatched goal surfaces.
- Decision: justify retaining the Linear-first lifecycle authority contract while adding optional advisory goal evidence.
- Contract name: Linear-first provider-worker lifecycle authority with optional advisory `goal_evidence`.
- Owner / owning surface: CO provider-worker workflow.
- Introduced date: 2026-05-07.
- Review date: 2026-05-07.
- Non-expiring rationale: optional goal evidence can be absent or unavailable as a supported no-op state because goal evidence is not required for workflow authority.
- Large-refactor check: no larger authority refactor is warranted for this issue; the intended change is additive evidence capture and explicitly rejects authority expansion.
- Minor-seam decision: retain the optional unavailable/non-current goal-evidence seam as a supported no-op evidence path, not as lifecycle authority.
- Owning surface: provider-worker manifest and workpad evidence capture.
- Steady-state proof: Linear/workpad/PR/review/check evidence remains authoritative while `goal_evidence` only records advisory state or reason.
- Tests/docs: focused provider-worker manifest/workpad tests, command-runner manifest persistence tests, and the CO-492 docs packet.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Provider-worker run evidence | Goal evidence may be unavailable, stale, disabled, or thread-mismatched beside authoritative Linear/workpad state. | justify retaining fallback | CO-492 | goals feature or capture source unavailable or non-matching | 2026-05-07 | 2026-05-07 | non-expiring supported no-op | only replaced by a separate approved authority redesign | focused provider-worker manifest/workpad tests plus docs gates |

## Open Questions
- Should parent implementation capture only the current goal snapshot or also the most recent app-server goal notification?
- Should completed goals render in the workpad summary after the run reaches review, or only in the manifest?
- Should long objectives be truncated in the workpad while preserved in the manifest?

## Approvals
- Product: parent-owned.
- Engineering: parent-owned implementation, validation, review, and PR lifecycle.
- Design: not applicable.
