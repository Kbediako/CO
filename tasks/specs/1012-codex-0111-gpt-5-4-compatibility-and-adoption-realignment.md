---
id: 20260306-1012-codex-0111-gpt-5-4-compatibility-and-adoption-realignment
title: Codex 0.111 + GPT-5.4 Compatibility + Adoption Realignment
relates_to: docs/PRD-codex-0111-gpt-5-4-compatibility-and-adoption-realignment.md
risk: high
owners:
  - Codex
last_review: 2026-03-06
---

## Summary
- Objective: restore local ChatGPT-auth compatibility for Codex CLI `0.111.0` while updating CO to a `gpt-5.4` baseline that matches verified runtime behavior and the user's clarified subagent target.
- Scope: docs-first artifacts, local compatibility repair, repo defaults/docs/tests realignment, and validation evidence.
- Boundary: no `gpt-5.4-codex` adoption in this lane.

## Pre-Implementation Review Note
- Decision: approved for docs-first execution, then constrained compatibility implementation.
- Reasoning: the local runtime is already in a broken state for normal delegation-first orchestration, and the fix depends on an explicit contract for which model surfaces are adopted vs held.

## Technical Requirements
- Compatibility requirements:
  - `gpt-5.4` is the adopted top-level, review, and high-reasoning subagent baseline for this lane.
  - `gpt-5.4-codex` is held from ChatGPT-auth review/high-reasoning role defaults.
- Local runtime repair requirements:
  - update `review_model`,
  - update `~/.codex/agents/researcher.toml`,
  - update `~/.codex/agents/explorer-detailed.toml`,
  - update `~/.codex/agents/worker-complex.toml`,
  - if native `codex` startup reproduces `invalid type: integer ... expected struct AgentRoleToml` under `[agents]`, remove only live `max_depth` / `max_spawn_depth` from `~/.codex/config.toml` and record that workaround.
- Repo realignment requirements:
  - update starter config, defaults setup, doctor advisory, user-facing docs/templates, and affected tests,
  - add `review_model` coverage to the defaults advisory contract,
  - refresh stale version-policy text that still points to `0.107.0`.

## Validation Plan
- Tests / checks:
  - direct local runtime probes for `gpt-5.4`, `gpt-5.3-codex`, and `gpt-5.4-codex`,
  - docs-review,
  - ordered validation chain from delegation-guard through review and `pack:smoke` if downstream-facing surfaces change.
- Rollout verification:
  - local config/role snapshots before and after repair,
  - docs/task registry parity,
  - elegance review note,
  - manual simulated/mock usage summary.

## Hold Boundaries
- Keep `explorer_fast` on `gpt-5.3-codex-spark`.
- Keep RLM/alignment pins unchanged unless a later lane explicitly expands scope.
- Treat `gpt-5.4-codex` ChatGPT-auth support as a hold until upstream docs or separate evidence change the verdict.

## Approvals
- Reviewer: Codex.
- Date: 2026-03-06.
