---
id: 20260405-attnres-fixed-model-memory-backlog-shaping
title: AttnRes-Inspired Fixed-Model Memory + Autonomy Backlog Shaping
relates_to: docs/PRD-attnres-fixed-model-memory-backlog-shaping.md
risk: high
owners:
  - Codex
last_review: 2026-04-05
---

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: audit and shape the CO backlog for AttnRes-inspired fixed-model memory/autonomy work.
- Scope: docs/specs, code surfaces, eval/metrics, issue dedupe, and dependency-ordered backlog shaping.
- Constraints: fixed-model only, no shallow audit, no duplicate issues without explicit rationale.

## Issue-Shaping Contract
- User-request translation carried forward:
  - CO should improve fixed-model autonomous issue/task completion by being more selective about how it retrieves and assembles execution history.
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
  - "memory = transcript growth"
  - "do the issue creation before the audit"
  - "this means model training"
- Explicit non-goals carried forward:
  - no retraining/fine-tuning
  - no persistence-stack rewrite
  - no implementation of the memory system in this pass

## Parity / Alignment Matrix
- Current truth: partial and fragmented coverage across autonomy/RLM docs, manifests/events, and learning/experience artifacts.
- Reference truth: AttnRes-style selective retrieval at the CO systems layer.
- Target truth / intended delta: a deduped, dependency-ordered backlog for fixed-model memory/autonomy slices.
- Explicitly out-of-scope differences: upstream model architecture changes.

## Readiness Gate
- Not done if:
  - the audit does not produce a covered/partial/missing matrix
  - backlog items lack exact surfaces, acceptance criteria, and eval hooks
  - subagent findings are not compressed into a parent-owned canonical ledger
- Pre-implementation issue-quality review evidence:
  - compare against existing docs/issues before any issue creation/update
- Safeguard ownership split:
  - parent owns canonical synthesis; subagents own exploration only

## Technical Requirements
- Functional requirements:
  - run the four mandatory audit streams
  - maintain one canonical ledger on-branch
  - produce backlog decisions only after dedupe
- Non-functional requirements (performance, reliability, security):
  - read-only exploration, evidence-backed claims, compact parent context
- Interfaces / contracts:
  - every subagent returns covered/partial/missing findings and exact evidence paths

## Architecture & Data
- Architecture / design adjustments:
  - planning-only artifacts on this branch
- Data model changes / migrations:
  - none in this pass
- External dependencies / integrations:
  - Linear, if write access remains available

## Validation Plan
- Tests / checks:
  - verify issue/artifact paths and duplicate boundaries
- Rollout verification:
  - n/a for planning pass
- Monitoring / alerts:
  - n/a

## Open Questions
- Resolved: open a sibling autonomy stream. Do not extend `0303` directly and do not create a new umbrella.

## Approvals
- Reviewer: Pending
- Date: 2026-04-05
