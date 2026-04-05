# PRD — AttnRes-Inspired Fixed-Model Memory + Autonomy Backlog Shaping

## Summary
- Problem Statement: CO's autonomy ceiling appears increasingly constrained by how it externalizes, retrieves, and reassembles execution history, but the current repo/docs/issue state does not yet provide a deduped, dependency-ordered backlog for a fixed-model memory initiative.
- Desired Outcome: Produce a deep audit and backlog that improves fixed-model autonomous issue/task completion through better task anchors, memory blocks, retrieval, observability, and evaluation without drifting into model retraining or upstream architecture changes.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): run a deep, orchestrator-first, subagents-first audit across docs, code, evals, and existing backlog so CO can seed the next autonomy initiative around AttnRes-style selective attention over its own execution history.
- Success criteria / acceptance:
  - complete a deep repo audit rather than a title-only scan
  - maintain one parent-owned synthesis artifact that absorbs subagent findings
  - dedupe against current issues/docs before creating or updating backlog
  - produce dependency-ordered, vertically sliceable backlog issues or ready-to-paste drafts
  - stay within fixed-model memory/autonomy scope
- Constraints / non-goals:
  - do not work on `main`
  - do not propose retraining, fine-tuning, or upstream model architecture changes
  - do not create vague umbrella issues without exact surfaces, non-goals, and `not done if` clauses

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `source 0`
  - `block memory`
  - `run memory controller`
  - `role-specific retrieval`
  - `competitive scoring`
  - `anti-dominance normalization`
  - `experience retrieval`
  - `externalized context`
- Protected terms / exact artifact and surface names:
  - remote brief reference `origin/docs/attnres-backlog-brief:docs/CODEX_BRIEF-attnres-memory-backlog.md`
  - `.runs/<task-id>/...`
  - `events.jsonl`
  - `manifest.json`
  - `rlm/state.json`
  - `packages/orchestrator`
  - `orchestrator/src/cli`
  - `packages/shared/*`
  - planner / executor / reviewer / delegated subagent prompt builders
- Nearby wrong interpretations to reject:
  - "this is a model-training initiative"
  - "memory means append more recent logs"
  - "source 0 is just a file path"
  - "block memory can be free-form prose with no drill-down"
  - "the first step is a giant rewrite instead of contract/eval slices"

## Parity / Alignment Matrix
- Current truth: CO already has externalized artifacts, role distinctions, RLM/autonomy specs, learning/experience artifacts, manifests, events, and review surfaces, but the fixed-model memory story is not yet clearly centralized or backlog-shaped.
- Reference truth: the AttnRes brief calls for selective attention over execution history at the CO systems layer rather than uniform mixed-state accumulation.
- Target truth / intended delta: a dependency-ordered backlog that makes CO behave more like it has selective attention over source anchors, phase/block memory, artifact retrieval, role-specific context assembly, bounded experience reuse, and inspectable memory decisions.
- Explicitly out-of-scope differences: foundation-model retraining, upstream Codex/LLM architecture changes, wholesale persistence-stack replacement.

## Not Done If
- The audit is shallow or limited to doc titles.
- Existing specs/issues touching the same surfaces are not deduped before backlog shaping.
- The backlog lacks exact surfaces, evaluation hooks, protected terms, or `not done if` clauses.
- The recommendation blurs fixed-model memory architecture with training research.

## Goals
- Audit current docs/code/issues against the AttnRes-inspired capability matrix.
- Map `Covered / Partial / Missing` status for the fixed-model memory initiative.
- Produce a dependency-ordered backlog proposal with precise issue bodies or drafts.
- Recommend whether this extends `0303`, becomes a sibling autonomy stream, or warrants a new umbrella.

## Non-Goals
- Implement the memory system in this planning pass.
- Change default runtime substrate solely because Symphony uses Elixir.
- Collapse unrelated autonomy/runtime/CO STATUS issues into this initiative.

## Stakeholders
- Product: CO operator / platform owner
- Engineering: Orchestrator / autonomy surfaces
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - backlog covers the full capability matrix with explicit Covered / Partial / Missing decisions
  - first three recommended implementation issues are small, dependency-ordered, and measurable
  - issue bodies make wrong implementations difficult
- Guardrails / Error Budgets:
  - zero drift into model training
  - zero duplicate backlog items against already-owned surfaces without explicit merge rationale

## User Experience
- Personas:
  - operator shaping deep autonomy work without losing alignment across many substreams
  - future implementation agents needing exact protected terms and artifact references
- User Journeys:
  - audit current autonomy/memory surfaces, preserve compressed findings centrally, then seed precise backlog issues

## Technical Considerations
- Architectural Notes:
  - this is a planning and backlog-shaping lane, not an implementation lane
  - the parent-owned synthesis artifact is the canonical source of truth across delegated streams
- Dependencies / Integrations:
  - existing autonomy docs/specs/issues
  - current Linear workflow/team/project configuration if issue creation proceeds

## Open Questions
- Resolved: this initiative should run as a sibling autonomy stream, not as a direct `0303` extension and not as a new umbrella.
- Resolved update targets: `0940`, `0959`, `0939`, and `0954`, with `0607` updated only if retrieval needs extra learning metadata.

## Approvals
- Product: Pending
- Engineering: Pending
- Design: N/A
