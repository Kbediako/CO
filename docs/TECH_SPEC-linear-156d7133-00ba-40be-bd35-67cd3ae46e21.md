---
id: 20260328-linear-156d7133-00ba-40be-bd35-67cd3ae46e21
title: Reconcile Shared Local Checkout to origin/main After Autonomous Merge Closeout
relates_to: docs/PRD-linear-156d7133-00ba-40be-bd35-67cd3ae46e21.md
risk: high
owners:
  - Codex
last_review: 2026-03-28
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-156d7133-00ba-40be-bd35-67cd3ae46e21.md`
- PRD: `docs/PRD-linear-156d7133-00ba-40be-bd35-67cd3ae46e21.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-156d7133-00ba-40be-bd35-67cd3ae46e21.md`
- Task checklist: `tasks/tasks-linear-156d7133-00ba-40be-bd35-67cd3ae46e21.md`

## Traceability
- Linear issue: `CO-25` / `156d7133-00ba-40be-bd35-67cd3ae46e21`
- Linear URL: https://linear.app/asabeko/issue/CO-25/co-reconcile-shared-local-checkout-to-originmain-after-autonomous

## Summary
- Objective: require autonomous merged closeout to inspect the shared CO root checkout, refresh the local shared-root `origin/main` ref to the actual remote head, fast-forward only when safe, and otherwise record an explicit skip reason in the final workpad closeout.
- Scope:
  - docs-first registration for `CO-25`
  - provider-worker prompt updates for first-turn and continuation guidance
  - repo-local `linear` / `land` skill updates for merged closeout behavior
  - focused prompt-contract regressions
- Constraints:
  - keep the change limited to merge-closeout contract wording and evidence expectations
  - never require resetting or discarding local root-checkout state
  - preserve the per-issue workspace isolation model
  - record the explicit delegation override because this worker run cannot spawn subagents

## Technical Requirements
- Functional requirements:
  - merged closeout must inspect `/Users/kbediako/Code/CO` before transitioning the issue to `Done`
  - merged closeout must capture before/after `git status --short --branch` or an equivalent machine-checkable summary in the same workpad comment
  - merged closeout must refresh the local shared-root `origin/main` tracking ref from remote `main` before it uses `origin/main` as the fast-forward target
  - merged closeout must attempt a fast-forward-only sync to `origin/main` when the shared root is on `main` and clean
  - merged closeout must skip mutation and record an explicit reason when the root is dirty, detached, on another branch, or otherwise unsafe
  - first-turn and continuation worker prompts must say this explicitly
  - repo-local merge shepherding guidance must say this explicitly
- Non-functional requirements (performance, reliability, security):
  - do not interfere with per-issue workspaces or other active lanes
  - keep the sync step fail-closed and operator-auditable
  - keep the new contract reviewable by changing only the prompt/skill/test surfaces unless a smaller truthful change proves insufficient
- Interfaces / contracts:
  - provider-worker prompt contract in `providerLinearWorkerRunner.ts`
  - repo-local workflow contracts in `skills/linear/SKILL.md` and `skills/land/SKILL.md`
  - workpad closeout contract for merged lanes

## Architecture & Data
- Architecture / design adjustments:
  - extend `Merging` guidance in the provider-worker prompts so “move to Done” becomes “refresh the shared-root tracking ref, reconcile or explicitly skip the shared root, then move to Done”
  - extend the `linear` and `land` skills to carry the same contract for workpad evidence, tracking-ref refresh, and safe-sync gating
  - keep workpad evidence in the existing single-comment closeout surface instead of adding a new reporting channel
- Data model changes / migrations:
  - none expected; the workpad remains the operator-facing evidence surface
- External dependencies / integrations:
  - git CLI for shared-root status/tracking-ref refresh/fast-forward commands
  - existing Linear workpad update helper

## Validation Plan
- Tests / checks:
  - docs-review before implementation
  - focused provider-worker prompt regression updates
  - required repo validation floor after implementation
- Rollout verification:
  - confirm merged closeout instructions explicitly mention safe shared-root sync or skip reasoning before `Done`
  - confirm merged closeout instructions explicitly update the local shared-root `origin/main` ref before `merge --ff-only origin/main`
  - confirm workpad closeout instructions require before/after root state evidence
- Monitoring / alerts:
  - operator truth comes from the final workpad closeout; no new monitoring surface is required for this bounded lane

## Open Questions
- If prompt/skill wording alone proves too soft in practice, a follow-up lane may need stronger automation or audit artifacts, but this packet should stop at the smallest truthful contract change.

## Approvals
- Reviewer: docs-review approved via `.runs/linear-156d7133-00ba-40be-bd35-67cd3ae46e21/cli/2026-03-28T00-11-01-669Z-43ecf1c4/manifest.json`
- Date: 2026-03-28
