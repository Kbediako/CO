# PRD - CO-486 Persisted Goal Evidence Canary

## Summary
- Problem Statement: Codex CLI `0.128.0` exposes persisted `/goal` workflows, goal model tools, app-server goal notifications, runtime continuation, and TUI controls, but CO needs a clear decision on whether goal state belongs in provider-worker run evidence.
- Desired Outcome: preserve the CO-486 canary/design decision on the current main-based Rework branch: persisted goal state is advisory-only run evidence, not Linear, workpad, PR, review, merge, hook recovery, or long-poll authority.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): restore the CO-486 docs-first packet on the Rework branch so the parent can continue from current `origin/main` while preserving the accepted advisory persisted-goal evidence classification and the existing Linear/workpad authority boundaries.
- Success criteria / acceptance: the packet names the live `0.128.0` goal/app-server/tool evidence, documents manifest/workpad evidence expectations, classifies provider-worker, long-poll, hook recovery, runtime continuation, and operator-continuity interactions, keeps `CO-492` as the optional implementation follow-up, and records that this r2 child lane is the current packet producer after the stale PR and invalid child-lane reset.
- Constraints / non-goals: no Linear replacement, no broad provider-worker rewrite, no release-facing Codex pin promotion, no hook/resume integration, no lifecycle mutation in this child lane, and no edits outside the declared packet files.

## Rework Truth - 2026-05-02
- Prior PR `#751` is closed/stale for this lane and must not be treated as the active handoff surface.
- The current rework branch is based on registry reset commit `e8a904d8c089`, which restored `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` entries for CO-486 after the Rework reset.
- The previous appserver child lane `docs-packet-rebase` is invalidated for packet production.
- Current packet producer: `docs-packet-rebase-r2` with source anchor `ctx:sha256:968e79825ece74f1535532921c7bb2fe3b53e6ab34bad59ecefe3796d897cfe3#chunk:c000001` and manifest `.runs/linear-6a92b5d9-3293-4e27-9bc5-28c8c62becfc-docs-packet-rebase-r2/cli/2026-05-02T19-51-38-188Z-83e5dfff/manifest.json`.
- Parent lane owns the authoritative Linear issue state, active `## Codex Workpad`, registries, docs-review, implementation, validation, PR lifecycle, and final handoff.

## Intent Checksum
- Exact user wording / phrases to preserve: persisted `/goal`, goals feature, app-server APIs, model tools, runtime continuation, TUI controls, provider-worker run evidence, hook recovery, long-poll waits, Linear remains source of truth.
- Protected terms / exact artifact and surface names: `codex-cli-0128:goal-evidence-canary`, `codex-orchestrator:canonical-owner-key=codex-cli-0128:goal-evidence-canary`, `CO-466`, `CO-486`, `CO-492`, `docs/PRD-linear-6a92b5d9-3293-4e27-9bc5-28c8c62becfc.md`, `docs/TECH_SPEC-linear-6a92b5d9-3293-4e27-9bc5-28c8c62becfc.md`, `docs/ACTION_PLAN-linear-6a92b5d9-3293-4e27-9bc5-28c8c62becfc.md`, `tasks/specs/linear-6a92b5d9-3293-4e27-9bc5-28c8c62becfc.md`, `tasks/tasks-linear-6a92b5d9-3293-4e27-9bc5-28c8c62becfc.md`, `.agent/task/linear-6a92b5d9-3293-4e27-9bc5-28c8c62becfc.md`.
- Nearby wrong interpretations to reject: goal state replaces Linear state/workpads; hook integration should be built before canary evidence; this is a generic CO-466 release-intake duplicate; a TUI-only goal status can authorize review/merge transitions; paused, completed, or budget-limited goal state can unblock provider-worker lifecycle gates; stale PR `#751` is still the active review surface; the invalidated `docs-packet-rebase` child lane is still authoritative.

## Parity / Alignment Matrix
- Current truth: CO-466 classified Codex CLI `0.128.0` local release posture and kept release/cloud pins separate. CO has `features.goals=true` locally, and the prior CO-486 canary captured CLI, app-server schema/type, model-tool, and exec/resume persistence evidence.
- Reference truth: Linear issue state, the persistent `## Codex Workpad`, PR attachments, review telemetry, validation manifests, and ready-review/merge loops are the current authority surfaces for provider-worker lifecycle decisions.
- Target truth / intended delta: persisted goal state can be recorded as advisory run evidence when present, with the exact authority boundary that it cannot authorize Linear state changes, PR handoff, long-poll completion, hook recovery, or merge closeout by itself.
- Explicitly out-of-scope differences: release-facing pin promotion, cloud-canary adoption, broad provider-worker rewrite, hook/resume integration, replacement of Linear/workpad authority, and parent-owned PR/Linear lifecycle mutation from this child lane.

## Not Done If
- Live Codex CLI `0.128.0` goal/app-server/tool evidence is not preserved in the packet.
- Manifest/workpad evidence expectations remain ambiguous.
- Provider-worker, long-poll, hook recovery, runtime continuation, TUI, child-lane, and operator-continuity interactions are not classified.
- Follow-up implementation scope is neither accepted nor rejected.
- Linear/workpad authority boundaries are weakened.
- Stale PR `#751`, invalidated `docs-packet-rebase`, or this child lane is treated as parent-owned PR/Linear authority.

## Goals
- Preserve the live installed Codex `0.128.0` goal feature, app-server protocol, model-tool state, and runtime continuation evidence from the CO-486 canary.
- Define the exact persisted goal evidence fields that CO may record in provider-worker run manifests and workpads.
- Decide what goal state can and cannot authorize.
- Preserve the accepted implementation follow-up decision: `CO-492` / `779bc931-f6b4-4a1c-b16f-145d500aca73` covers optional advisory provider-worker `goal_evidence` capture.

## Non-Goals
- No replacement of Linear as workflow authority.
- No broad provider-worker rewrite.
- No release-facing Codex pin promotion.
- No hook/resume integration in this canary lane.
- No PR, Linear, workpad, registry, source, test, or package edits by this child lane.
- No resurrection of PR `#751` or the invalidated `docs-packet-rebase` child lane as current authority.

## Stakeholders
- Product: CO operator workflow and continuity.
- Engineering: provider-worker orchestration, review/merge lifecycle, long-poll waits, hook recovery.
- Design: not applicable.

## Metrics & Guardrails
- Primary Success Metrics: reproducible goal-surface probe evidence remains documented; advisory/control/out-of-scope classification is explicit; follow-up scope is documented and bounded.
- Guardrails / Error Budgets: Linear remains source of truth; goal evidence cannot bypass validation, review, ready-review, merge, or workpad requirements; non-interactive provider workers do not depend on TUI-only controls.

## User Experience
- Personas: CO operator, provider worker, review shepherd, long-poll watcher.
- User Journeys:
  - A provider worker can optionally record the active goal objective/status/tokens/time as advisory evidence in the workpad and manifest.
  - An operator resuming a runtime can use goal evidence as context, but still checks Linear, workpad, PR, and manifest truth before acting.
  - A hook recovery path can mention prior goal evidence in diagnostics, but cannot recover or transition solely from goal state.

## Technical Considerations
- Architectural Notes: Goal state is thread-scoped advisory metadata. The app-server protocol exposes `thread/goal/updated` and `thread/goal/cleared` notifications, and the model-tool surface exposes create/read/complete state. That shape is useful for evidence snapshots but not lifecycle authority.
- Dependencies / Integrations: Codex CLI `0.128.0`, local ChatGPT-auth appserver posture, generated app-server schema/type bindings, current goal model tools, Linear helper/workpad surfaces.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.
- Decision: justify retaining the existing Linear/workpad authority contract while allowing only advisory goal evidence in a follow-up if accepted.
- Contract name: Linear-first provider-worker lifecycle authority with optional advisory `goal_evidence`.
- Owner / owning surface: CO provider-worker workflow and Linear helper surfaces.
- Introduced date: existing behavior predates this lane.
- Review date: 2026-05-02.
- Steady-state proof: live issue-context, workpad helper, review/ready-review/merge gates, and existing provider-worker manifests remain authoritative.
- Tests/docs that describe it as supported: repo-local `skills/linear/SKILL.md`, `skills/land/SKILL.md`, AGENTS provider-worker workflow instructions, and this packet.
- Non-expiring rationale: Linear/workpad/PR/review state is the governed provider-worker authority model. Goal state is a user-continuity aid and cannot safely replace external workflow truth.
- Large-refactor check: not triggered for this canary because no runtime integration is implemented here; any follow-up must stay additive and advisory unless a separate design lane proves a larger authority refactor.

## Open Questions
- Should advisory goal evidence be captured only when `features.goals=true`, or should manifests explicitly record `goals_unavailable` when the feature is disabled?
- Should the follow-up store raw app-server notification payloads, a normalized snapshot, or both?
- Should goal evidence be captured by provider-worker parent runs only, or also by same-issue child lanes and child streams?
- Should completed goal state remain visible in final workpad closeout after the issue moves into review?

## Approvals
- Product: pending parent closeout.
- Engineering: pending parent docs-review, validation, PR handoff, and Linear transition.
- Design: not applicable.
