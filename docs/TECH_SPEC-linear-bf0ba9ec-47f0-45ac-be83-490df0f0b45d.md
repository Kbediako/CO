---
id: 20260409-linear-bf0ba9ec-47f0-45ac-be83-490df0f0b45d
title: CO: Fix launchd-supervised control-host child runtime PATH so provider-worker launches resolve node and appserver/login probes truthfully
relates_to: docs/PRD-linear-bf0ba9ec-47f0-45ac-be83-490df0f0b45d.md
risk: high
owners:
  - Codex
last_review: 2026-04-09
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-bf0ba9ec-47f0-45ac-be83-490df0f0b45d.md`
- PRD: `docs/PRD-linear-bf0ba9ec-47f0-45ac-be83-490df0f0b45d.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-bf0ba9ec-47f0-45ac-be83-490df0f0b45d.md`
- Task checklist: `tasks/tasks-linear-bf0ba9ec-47f0-45ac-be83-490df0f0b45d.md`

## Traceability
- Linear issue: `CO-115` / `bf0ba9ec-47f0-45ac-be83-490df0f0b45d`
- Linear URL: https://linear.app/asabeko/issue/CO-115/co-fix-launchd-supervised-control-host-child-runtime-path-so-provider
- Concrete reproducer: `CO-87` / `885a6ce9-7766-4296-be19-57e624769d46`

## Summary
- Objective: make launchd-supervised child provider-worker execution and runtime-provider probing truthful under non-interactive PATH and environment constraints.
- Scope:
  - replace the bare-`node` child launch contract with an explicit launch-runtime contract that remains valid under launchd-owned PATH and environment
  - classify missing executable resolution as an explicit runtime-parity failure when real provider work still cannot start
  - keep appserver or login probe behavior truthful under the same runtime assumptions
  - add focused regression coverage and reproducible proof for the `CO-87` failure shape
- Constraints:
  - no reopening of `CO-41`, dispatch/bootstrap credential work, or dashboard/STATUS work
  - keep the fix bounded to launch/runtime parity for child runs and runtime provider probes

## Implementation Boundary
- Launch contract:
  - source the child `provider-linear-worker` Node executable from an explicit parent-owned runtime field rather than ambient PATH
  - keep the root host and child run on the same executable truth under launchd
- Runtime provider:
  - detect missing Codex CLI or runtime executables as runtime-parity failures instead of misleadingly healthy fallback or generic exec-runner failure
  - preserve current runtime mode selection semantics when the required executables actually resolve
- Proof and summary:
  - emit machine-checkable failure classification so retry or reconcile loops do not hide the primary launch/runtime fault

## Design
- Parent runtime contract:
  - inject the current Node executable path from the parent runtime into stage execution environment
  - update the `provider-linear-worker` stage command to consume that explicit path
- Runtime parity truth:
  - tighten runtime-provider preflight classification for missing executable resolution under launchd
  - preserve explicit failure surfaces at the provider-worker proof layer
- Guardrails:
  - do not mutate unrelated provider env/bootstrap seams
  - prefer explicit runtime metadata over broad PATH rewriting

## Validation
- `linear child-stream --pipeline docs-review`
- focused regressions in:
  - `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
  - `orchestrator/tests/RuntimeProvider.test.ts`
  - any additional focused launch-contract test covering the non-interactive PATH reproducer
- reproducer proof cross-check against the current `CO-87` artifact and the post-fix behavior
- full repo validation floor before review handoff

## Approvals
- Reviewer: `codex-orchestrator docs-review` child stream failed only on the repo-wide `docs:freshness` stale-doc baseline after `spec-guard` and `docs:check` passed; manual fallback accepted
- Date: 2026-04-09
- Manifest: `.runs/linear-bf0ba9ec-47f0-45ac-be83-490df0f0b45d-co-115-docs-review/cli/2026-04-08T17-32-15-382Z-fc180ff1/manifest.json`
- Review telemetry: fallback note at `out/linear-bf0ba9ec-47f0-45ac-be83-490df0f0b45d/manual/20260408T173215Z-docs-review-fallback.md`
