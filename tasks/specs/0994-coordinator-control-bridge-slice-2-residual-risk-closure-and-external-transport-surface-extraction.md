---
id: 20260303-0994-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction
title: Coordinator Control Bridge Slice 2 + Residual Risk Closure + External Transport-Surface Extraction
relates_to: docs/PRD-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction.md
risk: high
owners:
  - Codex
last_review: 2026-03-03
---

## Summary
- Objective: continue 0993 lineage with a docs-first follow-up that closes residual risk and freezes extraction/transport decisions before implementation.
- Scope: docs/task registration + mirror updates + docs-review evidence + standalone review checkpoint for this stream.
- Constraints: do not edit `orchestrator/src` in this stream.

## Pre-Implementation Review Note
- Decision: approved for docs-only execution.
- Reasoning: residual risk and external transport boundary decisions require explicit documentation before delegated implementation.

## Technical Requirements
- Functional requirements:
  - Define explicit residual risk closure objectives from 0993 follow-up scope.
  - Define codex-autorunner extraction lane with clear include/exclude boundaries.
  - Define Discord/Telegram interactive-surface decision criteria and hold/default behavior.
  - Define mandatory standalone/elegance review cadence for delegated implementation streams.
  - Capture docs-review manifest evidence before implementation edits.
  - Capture one standalone review checkpoint for this docs stream.
- Non-functional requirements:
  - Preserve CO as execution/control/scheduler authority.
  - Preserve deterministic traceability and auditability across any future transport surface.
  - Keep decision criteria objective, testable, and reversible.
- Interfaces / contracts:
  - Extraction lane contracts must preserve canonical control intent/audit fields.
  - Transport-surface policy contracts must encode explicit go/no-go states.
  - Delegated implementation streams must produce recurring review evidence paths.

## Residual Risk Closure Objectives
- Objective 1: close authority-boundary ambiguity between CO core and extracted transport adapters.
- Objective 2: close operator-surface ambiguity for external interaction channels.
- Objective 3: close review-discipline ambiguity for delegated implementation streams.
- Objective 4: close audit-trace ambiguity when control intents originate from external transport surfaces.

## Codex-Autorunner Extraction Lane
### In scope
- Transport ingress adapter layer.
- Payload normalization and schema validation at transport edge.
- Transport-auth wrapper checks before forwarding to CO core.
- Status projection formatting for transport-facing responses.

### Out of scope
- Scheduler lifecycle ownership.
- Core control-state truth.
- Run manifest authority and persistence ownership.
- Direct mutation paths that bypass CO core control APIs.

### Invariants
- CO remains sole authority for run-state transitions.
- Adapter failures are fail-closed with explicit error signaling.
- Intent/audit trace fields remain intact end-to-end.

## Discord/Telegram Interactive-Surface Decision Criteria
- Security criteria:
  - scoped tokens/session context, expiration, replay protection, revocation.
- Reliability criteria:
  - deterministic retry behavior, observable delivery failures, no silent intent drops.
- Interaction criteria:
  - command-to-control mapping is unambiguous and constrained to approved actions.
- Auditability criteria:
  - per interaction: actor, intent_id, task_id, run_id, manifest_path, action, result timestamps.
- Blast-radius criteria:
  - feature-flag rollout, kill-switch, and rollback path validated before broad enablement.
- Decision rule:
  - all criteria must pass for GO; any failed criterion keeps transport surface in HOLD state.

## Findings Artifact + GO/HOLD Outcome (Implementation Stream 0994)
- Artifact path: `docs/findings/0994-codex-autorunner-extraction-and-transport-go-hold.md`.
- Decision outcomes:
  - codex-autorunner extraction lane: GO (bounded extraction scope only).
  - Discord surface: HOLD.
  - Telegram surface: HOLD.
- Residual-risk closure evidence embedded in the artifact:
  - implementation-gate test-stage env scrub.
  - forced deterministic gate review execution env.

## Mandatory Standalone/Elegance Review Cadence for Delegated Implementation Streams
- Kickoff checkpoint (mandatory): standalone review after stream kickoff planning and before first implementation burst.
- Burst checkpoint (mandatory): standalone review after each meaningful coding chunk.
- Pre-handoff checkpoint (mandatory): standalone review before stream handoff/merge recommendation.
- Elegance checkpoint (mandatory): elegance/minimality pass after standalone findings are addressed for non-trivial diffs.
- Evidence discipline:
  - every checkpoint records artifact paths in stream checklist notes.
  - unresolved P0 findings and high-signal P1 findings are hard-stop.

## Architecture & Data
- Architecture / design adjustments:
  - introduce transport adapter extraction lane only.
  - preserve CO core control authority and manifest ownership.
- Data model changes / migrations (planned):
  - none in this docs stream.
  - future implementation must preserve existing trace chain fields and add only adapter metadata fields when required.
- External dependencies / integrations:
  - potential Discord/Telegram APIs remain decision-gated and disabled by default.

## Validation Plan
- Docs stream validation:
  - `npx codex-orchestrator start docs-review --format json --no-interactive --task 0994-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction`
  - `TASK=0994-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction NOTES="Goal: docs-only 0994 standalone checkpoint | Summary: review docs consistency and required section coverage | Risks: stale mirrors or scope creep" npm run review`
- Implementation stream validation (future):
  - ordered gates 1-10 plus mandatory delegated standalone/elegance cadence checkpoints.

## Open Questions
- Should codex-autorunner extraction lane include transport-specific rate-limit state, or should that remain fully external?
- If Discord and Telegram satisfy all criteria independently, should enablement be staged one transport at a time or can they launch together?

## Approvals
- Reviewer: Codex.
- Date: 2026-03-03.
