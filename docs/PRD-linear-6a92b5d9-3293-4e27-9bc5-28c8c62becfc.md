# PRD - CO-486 Persisted Goal Evidence Canary

## Summary
- Problem Statement: Codex CLI `0.128.0` exposes persisted `/goal` workflows, goal model tools, app-server goal notifications, runtime continuation, and TUI controls, but CO has not decided whether goal state should become provider-worker run evidence.
- Desired Outcome: complete a focused canary/design pass that classifies persisted goal state as advisory evidence, orchestration authority, or out of scope before any hook/resume integration is implemented.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): run live `0.128.0` probes and define a CO evidence contract for persisted goals so provider-worker runs, long-poll waits, hook recovery, and operator continuity can consume goal state without replacing Linear state or workpads.
- Success criteria / acceptance: live goal/app-server/tool surface is probed; manifest/workpad evidence expectations are documented; provider-worker, long-poll, and hook recovery interaction is classified; follow-up implementation scope is explicitly accepted or rejected; Linear/workpad authority remains preserved.
- Constraints / non-goals: no Linear replacement, no broad provider-worker rewrite, no release-facing Codex pin promotion, and no hook/resume integration beyond canary scaffolding and design evidence.

## Intent Checksum
- Exact user wording / phrases to preserve: persisted `/goal`, goals feature, app-server APIs, model tools, runtime continuation, TUI controls, provider-worker run evidence, hook recovery, long-poll waits, Linear remains source of truth.
- Protected terms / exact artifact and surface names: `codex-cli-0128:goal-evidence-canary`, `codex-orchestrator:canonical-owner-key=codex-cli-0128:goal-evidence-canary`, `CO-466`, `CO-486`, `docs/PRD-linear-6a92b5d9-3293-4e27-9bc5-28c8c62becfc.md`, `docs/TECH_SPEC-linear-6a92b5d9-3293-4e27-9bc5-28c8c62becfc.md`, `docs/ACTION_PLAN-linear-6a92b5d9-3293-4e27-9bc5-28c8c62becfc.md`, `tasks/specs/linear-6a92b5d9-3293-4e27-9bc5-28c8c62becfc.md`, `tasks/tasks-linear-6a92b5d9-3293-4e27-9bc5-28c8c62becfc.md`, `.agent/task/linear-6a92b5d9-3293-4e27-9bc5-28c8c62becfc.md`.
- Nearby wrong interpretations to reject: goal state replaces Linear state/workpads; hook integration should be built before canary evidence; this is a generic CO-466 release-intake duplicate; a TUI-only goal status can authorize review/merge transitions; paused or budget-limited goal state can unblock provider-worker lifecycle gates.

## Parity / Alignment Matrix
- Current truth: CO-466 classified Codex CLI `0.128.0` local release posture and kept release/cloud pins intentionally separate. CO has `features.goals=true` locally, but provider-worker manifests and workpads do not yet have a goal evidence contract.
- Reference truth: Linear issue state, the persistent `## Codex Workpad`, PR attachments, review telemetry, validation manifests, and ready-review/merge loops are the current authority surfaces for provider-worker lifecycle decisions.
- Target truth / intended delta: persisted goal state can be recorded as advisory run evidence when present, with the exact authority boundary that it cannot authorize Linear state changes, PR handoff, long-poll completion, hook recovery, or merge closeout by itself.
- Explicitly out-of-scope differences: release-facing pin promotion, cloud-canary adoption, broad provider-worker rewrite, hook/resume integration, and replacement of Linear/workpad authority.

## Not Done If
- Live Codex CLI `0.128.0` goal/app-server/tool evidence is not captured.
- Manifest/workpad evidence expectations remain ambiguous.
- Provider-worker, long-poll, hook recovery, and operator-continuity interactions are not classified.
- Follow-up implementation scope is neither accepted nor rejected.
- Linear/workpad authority boundaries are weakened.

## Goals
- Probe the live installed Codex `0.128.0` goal feature, app-server protocol, model-tool state, and runtime continuation surfaces with reproducible commands or direct tool evidence.
- Define the exact persisted goal evidence fields that CO may record in provider-worker run manifests and workpads.
- Decide what goal state can and cannot authorize.
- Determine whether a follow-up implementation lane should add advisory goal snapshots to provider-worker evidence. Decision: yes, created `CO-492` / `779bc931-f6b4-4a1c-b16f-145d500aca73` in Backlog with `blocked_by_source`.

## Non-Goals
- No replacement of Linear as workflow authority.
- No broad provider-worker rewrite.
- No release-facing Codex pin promotion.
- No hook/resume integration in this canary lane.
- No runtime behavior change unless canary evidence reveals a narrow docs-only correction.

## Stakeholders
- Product: CO operator workflow and continuity.
- Engineering: provider-worker orchestration, review/merge lifecycle, long-poll waits, hook recovery.
- Design: not applicable.

## Metrics & Guardrails
- Primary Success Metrics: reproducible goal-surface probe evidence; a clear advisory/control/out-of-scope classification; documented follow-up scope or rejection.
- Guardrails / Error Budgets: Linear remains source of truth; goal evidence cannot bypass validation, review, ready-review, merge, or workpad requirements; non-interactive provider workers do not depend on TUI-only controls.

## User Experience
- Personas: CO operator, provider worker, review shepherd, long-poll watcher.
- User Journeys:
  - A provider worker can optionally record the active goal objective/status/tokens/time as evidence in the workpad and manifest.
  - An operator resuming a runtime can use goal evidence as context, but still checks Linear, workpad, PR, and manifest truth before acting.
  - A hook recovery path can mention prior goal evidence in diagnostics, but cannot recover or transition solely from goal state.

## Technical Considerations
- Architectural Notes: Goal state is thread-scoped advisory metadata. The app-server protocol exposes `thread/goal/updated` and `thread/goal/cleared` notifications, and the model-tool surface exposes create/read/complete state. That shape is useful for evidence snapshots but not lifecycle authority.
- Dependencies / Integrations: Codex CLI `0.128.0`, local ChatGPT-auth appserver posture, generated app-server schema/type bindings, current goal model tools, Linear helper/workpad surfaces.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.
- Decision: justify retaining the existing Linear/workpad authority contract while adding only advisory goal evidence in a follow-up if accepted.
- Contract name: Linear-first provider-worker lifecycle authority.
- Owner / owning surface: CO provider-worker workflow and Linear helper surfaces.
- Introduced date: existing behavior predates this lane.
- Review date: 2026-05-03.
- Steady-state proof: live issue-context, workpad helper, review/ready-review/merge gates, and existing provider-worker manifests remain authoritative.
- Tests/docs that describe it as supported: repo-local `skills/linear/SKILL.md`, `skills/land/SKILL.md`, AGENTS provider-worker workflow instructions, and this packet.
- Non-expiring rationale: Linear/workpad/PR/review state is the governed provider-worker authority model. Goal state is a user-continuity aid and cannot safely replace external workflow truth.
- Large-refactor check: not triggered for this canary because no runtime integration is implemented here; any follow-up must stay additive and advisory unless a separate design lane proves a larger authority refactor.

## Open Questions
- Should advisory goal evidence be captured only when `features.goals=true`, or should manifests explicitly record `goals_unavailable` when the feature is disabled?
- Should the follow-up store raw app-server notification payloads, a normalized snapshot, or both?
- Should goal evidence be captured by provider-worker parent runs only, or also by same-issue child lanes and child streams?
- Implementation follow-up created: `CO-492` / `779bc931-f6b4-4a1c-b16f-145d500aca73` for advisory-only provider-worker manifest/workpad `goal_evidence` capture.

## Approvals
- Product: pending parent closeout.
- Engineering: pending docs-review and final validation.
- Design: not applicable.
