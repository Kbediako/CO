# Technical Spec — AttnRes-Inspired Fixed-Model Memory + Autonomy Backlog Shaping

## Summary
- Objective: complete a deep repo audit and backlog-shaping pass for AttnRes-inspired fixed-model memory/autonomy work in CO.
- Scope: docs/spec audit, code-surface audit, eval/metrics audit, issue dedupe audit, parent synthesis ledger, dependency graph, backlog issue shaping.
- Constraints: no model training, no shallow audit, no duplicate issues without explicit merge/update rationale.

## Issue-Shaping Contract
- User-request translation carried forward: CO should behave more like it has selective attention over its own execution history through externalized memory, retrieval, and evaluation, and the planning pass must use subagents-first orchestration to keep context durable.
- Protected terms / exact artifact and surface names:
  - `source 0`
  - `block memory`
  - `run memory controller`
  - `role-specific retrieval`
  - `competitive scoring`
  - `anti-dominance normalization`
  - `experience retrieval`
  - `externalized context`
  - `.runs/<task-id>/...`
  - `events.jsonl`
  - `manifest.json`
  - `rlm/state.json`
- Nearby wrong interpretations to reject:
  - "memory = bigger transcripts"
  - "use existing docs only; no repo-wide code verification"
  - "create umbrella issues first and dedupe later"
  - "start with the biggest architecture rewrite"
- Explicit non-goals carried forward:
  - foundation-model retraining or fine-tuning
  - replacing CO persistence wholesale
  - performing implementation in this planning pass

## Parity / Alignment Matrix
- Current truth:
  - autonomy docs/specs exist across `0303`, `0940`, RLM quick wins, manifests, events, and learning/experience surfaces
  - current coverage for fixed-model memory/autonomy is likely fragmented and partially ad hoc
- Reference truth:
  - AttnRes-inspired system behavior at the CO layer means selective retrieval over execution history, not one mixed uniform state
- Target truth / intended delta:
  - deduped backlog slices for source anchors, block memory, centralized memory control, role-aware retrieval, competitive scoring, artifact drill-down, bounded experience reuse, observability, evals, and rollout safety
- Explicitly out-of-scope differences:
  - BEAM live upgrade parity
  - upstream model internals

## Readiness Gate
- Not done if:
  - docs are audited without code verification
  - code is scanned without issue/spec dedupe
  - backlog issues omit exact surfaces and eval hooks
  - parent synthesis relies on raw subagent transcript dumps
- Pre-implementation issue-quality review evidence:
  - parent must compare candidate backlog items against existing docs/issues before any creation/update
- Safeguard ownership split:
  - parent owns synthesis ledger, capability matrix, dedupe map, dependency graph, and final backlog decisions
  - subagents own read-only exploration and compressed evidence

## Technical Requirements
- Functional requirements:
  - read the brief from `origin/docs/attnres-backlog-brief`
  - create a non-`main` working branch
  - maintain a canonical parent ledger on-branch
  - run the four mandatory audit streams
  - produce covered/partial/missing matrix, dedupe map, dependency graph, and backlog recommendations
- Non-functional requirements:
  - evidence-backed conclusions only
  - concise parent synthesis with durable artifact paths
  - top-level orchestration and delegated planning/research remain on `gpt-5.4`
- Interfaces / contracts:
  - each subagent must return Covered / Partial / Missing findings, exact evidence paths, contradictions, candidate backlog items, protected terms, wrong interpretations, and priority

## Architecture & Data
- Architecture / design adjustments:
  - no runtime/code architecture changes in this pass; only planning artifacts and backlog updates
- Data model changes / migrations:
  - none required for the audit itself
- External dependencies / integrations:
  - Linear issue creation/update if write access is available

## Validation Plan
- Tests / checks:
  - verify branch isolation
  - verify cited files/issues/artifacts exist
  - verify created/updated issues are non-duplicative with current owned surfaces
- Rollout verification:
  - ensure backlog is dependency-ordered and vertically sliceable
- Monitoring / alerts:
  - not applicable for the planning pass itself

## Open Questions
- Resolved: current issue ownership is best modeled as a sibling autonomy stream. Do not extend `0303` directly and do not create a new umbrella.
- Resolved doc prerequisite: refresh `0940` policy/event claims and stale `0303` status assumptions before implementation starts so new issue acceptance criteria inherit truthful baselines.

## Approvals
- Reviewer: Pending
- Date: 2026-04-05
