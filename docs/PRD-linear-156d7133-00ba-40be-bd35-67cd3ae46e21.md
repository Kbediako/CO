# PRD - Reconcile Shared Local Checkout to origin/main After Autonomous Merge Closeout

## Added by Bootstrap 2026-03-28

## Traceability
- Linear issue: `CO-25` / `156d7133-00ba-40be-bd35-67cd3ae46e21`
- Linear URL: https://linear.app/asabeko/issue/CO-25/co-reconcile-shared-local-checkout-to-originmain-after-autonomous

## Summary
- Problem Statement: CO’s autonomous Linear lanes already merge latest `origin/main` into the per-issue branch before review handoff, but the merge-closeout contract stops after the remote PR lands. That leaves the shared local checkout at `/Users/kbediako/Code/CO` stale unless an operator manually fast-forwards it, and the final issue/workpad status does not say whether the root checkout was reconciled or intentionally skipped.
- Desired Outcome: Extend the provider-worker merge-closeout contract so merged Linear lanes inspect the shared local checkout, refresh the local `origin/main` tracking ref to the actual remote head, fast-forward only when that checkout is safe to mutate, and otherwise record an explicit skip reason plus before/after root-checkout state in the same workpad closeout.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): Finish `CO-25` by making post-merge Linear closeout truthful for the operator’s shared local checkout without weakening workspace isolation or mutating unsafe root state.
- Success criteria / acceptance:
  - after a merged lane reaches terminal closeout, the worker inspects the shared root checkout at `/Users/kbediako/Code/CO`
  - if that checkout is on `main` and clean, the worker refreshes the local `origin/main` tracking ref from remote `main` and then attempts a fast-forward to it
  - if the checkout is dirty, on another branch, or otherwise unsafe to mutate, the worker records the explicit skip reason instead of forcing sync
  - final closeout evidence includes before/after `git status --short --branch` or an equivalent machine-checkable summary
  - the same workpad closeout remains truthful about whether the shared root is aligned or intentionally left untouched
- Constraints / non-goals:
  - keep scope on the shared root checkout only
  - keep the per-issue workspace execution model unchanged
  - do not reset, discard, stash, or otherwise override local root-checkout changes
  - do not widen this lane into a generic control-host workspace-management rewrite

## Goals
- Add an explicit shared-root reconciliation step to merged provider-worker closeout before the issue moves to `Done`.
- Require the reconciliation step to refresh the local shared-root `origin/main` ref instead of relying on a stale remote-tracking branch.
- Keep shared-root mutation fail-closed and conditional on a clean `main` checkout.
- Require same-workpad before/after root state evidence or an explicit skip reason for every merged closeout.
- Cover the new merge-closeout contract with focused prompt/skill regression tests.

## Non-Goals
- Changing the per-issue workspace isolation model.
- Forcing synchronization when the shared root is dirty, detached, or on the wrong branch.
- Adding generic post-merge git automation outside the provider-worker merge-closeout path.

## Stakeholders
- Product: CO operator / provider-worker owner
- Engineering: Codex
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - merged provider-worker closeout explicitly reports whether the shared root was aligned or skipped
  - safe root-checkout sync is attempted only when the shared root is on `main` and clean
  - skip paths remain explicit and audit-friendly instead of silent
- Guardrails / Error Budgets:
  - never reset or discard local root-checkout changes
  - never mutate the shared root when it is on the wrong branch or otherwise unsafe
  - keep the change limited to provider-worker merge-closeout prompts/skills/tests unless a smaller truthful contract proves insufficient

## User Experience
- Personas: CO operator watching autonomous merge closeout; provider worker executing the final merged handoff
- User Journeys:
  - a merged provider-worker lane reaches final closeout, observes that `/Users/kbediako/Code/CO` is clean on `main`, fast-forwards it, and records before/after status in the same workpad comment before moving the issue to `Done`
  - a merged lane finds the shared root dirty or on another branch, records the exact skip reason and leaves the checkout untouched
  - an operator later reads the final workpad and can tell whether the shared root is aligned or intentionally unchanged without inspecting local git state manually

## Technical Considerations
- Architectural Notes:
  - the active seam is the provider-worker contract in `orchestrator/src/cli/providerLinearWorkerRunner.ts` plus the repo-local `skills/linear/SKILL.md` and `skills/land/SKILL.md`
  - current prompt/skill wording already requires pre-review branch sync but currently says only “move the issue to `Done`” after merge
  - the shared root checkout lives outside the per-issue worktree at `/Users/kbediako/Code/CO`
  - live merged-closeout validation showed the first implementation was still too weak: `git fetch origin main` updated `FETCH_HEAD` but left the shared-root `origin/main` ref stale, so the contract must name a tracking-ref refresh command that makes the later `merge --ff-only origin/main` truthful
- Dependencies / Integrations:
  - git CLI for `status`, `fetch`, and fast-forward-only sync in the shared root
  - Linear workpad closeout discipline from the existing provider-worker helper surface

## Open Questions
- Whether the shared-root closeout evidence should stay workpad-only or also appear in an auxiliary audit payload. Default to workpad/prompt contract only unless implementation evidence shows that is not durable enough.

## Approvals
- Product: Self-approved from Linear scope and guardrails
- Engineering: Pending docs-review + implementation validation
- Design: N/A
