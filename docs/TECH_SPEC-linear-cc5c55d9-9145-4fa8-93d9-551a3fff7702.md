---
id: 20260410-linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702
title: CO workflow: stop linked-worktree Linear helpers from leaking repo git identity
relates_to: docs/PRD-linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702.md
risk: high
owners:
  - Codex
last_review: 2026-04-10
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702.md`
- PRD: `docs/PRD-linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702.md`
- Task checklist: `tasks/tasks-linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702.md`

## Traceability
- Linear issue: `CO-120` / `cc5c55d9-9145-4fa8-93d9-551a3fff7702`
- Linear URL: https://linear.app/asabeko/issue/CO-120/co-workflow-stop-linked-worktree-linear-helpers-from-leaking-repo-git
- Evidence anchors:
  - `/Users/kbediako/.codex/sessions/2026/04/09/rollout-2026-04-09T08-32-53-019d6f3a-208e-7220-a6c7-2e2046309ec0.jsonl`
  - `.github/workflows/archive-automation-base.yml`

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: stop repo-owned linked-worktree helper flows from mutating shared repo git identity.
- Scope:
  - docs-first packet registration for `CO-120`
  - one small helper that enables `extensions.worktreeConfig` when needed and applies alternate git identity only with `git config --worktree`
  - update the checked-in archive automation workflow to use that helper
  - add a focused regression test and exact verification path proving the shared repo git config file gains no `[user]` override
- Constraints:
  - preserve global git identity inheritance by default
  - preserve current archive workflow behavior apart from identity isolation
  - do not rewrite historical commits or alter user-global git config
  - keep the rework reset bounded to the issue seam instead of replaying the closed PR's unrelated test-harness changes

## Technical Requirements
- Functional requirements:
  - repo-owned linked-worktree helper/archive flows must inherit global git identity by default by clearing any stale worktree-local identity override from the target linked worktree
  - when an alternate identity is explicitly requested, it must be written with `git config --worktree`
  - if `extensions.worktreeConfig` is not already enabled, the helper must enable it before the first `--worktree` identity write and treat that as the only allowed shared-config precondition
  - the checked-in archive automation workflow must use the safe worktree-local identity path rather than plain `git config user.*`
  - the repo must provide a reproducible verification path that proves the shared repo git config file does not gain a `[user]` override, while making any one-time `extensions.worktreeConfig=true` change explicit
  - the implementation must preserve the issue's root-cause framing: local linked-worktree git-config leakage, not cloud/Codex upgrade behavior
- Non-functional requirements:
  - keep the implementation minimal and easy to audit
  - fail closed when the helper receives a partial alternate identity request
  - avoid leaving a standing worktree-local identity override when no alternate identity is needed
  - keep the only allowed shared-config mutation limited to enabling `extensions.worktreeConfig` when Git requires it
  - do not widen the rework patch into unrelated CLI or test-timing changes
- Interfaces / contracts:
  - workflow seam: `.github/workflows/archive-automation-base.yml`
  - helper seam: new `scripts/` entrypoint for worktree-local git identity handling
  - regression seam: new `tests/` coverage that creates a temporary repo plus linked worktree

## Architecture & Data
- Architecture / design adjustments:
  - add a small helper script that either restores inherited identity by clearing any stale worktree-local identity override or enables `extensions.worktreeConfig` and then applies an explicit alternate identity via `git config --worktree`
  - keep the workflow callsite thin by delegating the identity semantics to the helper
  - let the regression test assert both sides of the contract: worktree-local user config exists when requested, and the helper does not add or delete shared repo-local `[user]` config
- Data model changes / migrations:
  - none
- External dependencies / integrations:
  - local `git`
  - GitHub Actions shell in `.github/workflows/archive-automation-base.yml`
  - Vitest for regression coverage

## Validation Plan
- Tests / checks:
  - audited `linear child-stream --pipeline docs-review` before code changes
  - focused `vitest` coverage for the helper contract in a temporary repo with a linked worktree
  - a documented local verification command path that inspects the shared repo git config file after helper execution
  - required repo validation floor after implementation
  - manifest-backed standalone review followed by explicit elegance review before handoff
- Rollout verification:
  - confirm the helper writes explicit alternate identity into worktree-local config only
  - confirm the shared repo git config file stays free of a repo-local `[user]` override after the linked-worktree flow
  - confirm any first-run `extensions.worktreeConfig=true` change is explicit and limited
- Monitoring / alerts:
  - rely on the focused regression test plus closeout verification commands; no runtime monitoring change is needed

## Open Questions
- Resolved 2026-04-10 for the rework reset: the previous attempt's conclusion about `extensions.worktreeConfig=true` still stands, but the new implementation must rebuild only the helper/workflow/test seam on a fresh `origin/main` base rather than carrying over unrelated test-harness edits from the closed PR.

## Approvals
- Reviewer: pending fresh `codex-orchestrator docs-review` evidence for the rework-reset packet
- Date: 2026-04-10
