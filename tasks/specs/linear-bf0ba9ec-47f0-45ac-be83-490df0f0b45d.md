---
id: 20260409-linear-bf0ba9ec-47f0-45ac-be83-490df0f0b45d
title: CO: Fix launchd-supervised control-host child runtime PATH so provider-worker launches resolve node and appserver/login probes truthfully
status: done
owner: Codex
created: 2026-04-09
last_review: 2026-05-13
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-bf0ba9ec-47f0-45ac-be83-490df0f0b45d.md
related_action_plan: docs/ACTION_PLAN-linear-bf0ba9ec-47f0-45ac-be83-490df0f0b45d.md
related_tasks:
  - tasks/tasks-linear-bf0ba9ec-47f0-45ac-be83-490df0f0b45d.md
review_notes:
  - 2026-04-09: Opened from Linear issue `CO-115` in the provider-worker workspace after rechecking live CO team states with the packaged `linear issue-context` helper, moving the issue from `Ready` to `In Progress`, recording the required same-turn `stay_serial` parallelization decision, and switching the detached workspace at `fdbead876b94fbe9894349eebcb9636e1b7caa18` onto branch `linear/co-115-launchd-provider-runtime-path`.
  - 2026-04-09: The remote `## Codex Workpad` upsert is temporarily blocked by a shared-budget Linear rate limit (`linear_rate_limited`, `requests_remaining: 0`, `requests_reset_at: 2026-04-08T18:14:22.440Z`), so the canonical workpad source is staged locally at `out/linear-bf0ba9ec-47f0-45ac-be83-490df0f0b45d/manual/workpad.md` and will be upserted in place once the budget window reopens.
  - 2026-04-09: Artifact audit confirms this is the bounded launchd child-runtime seam, not the older `CO-41` stale-refresh wedge. The current `CO-87` reproducer admitted the issue and created the child run manifest, but the provider-worker stage failed immediately at `/Users/kbediako/Code/CO/.runs/linear-885a6ce9-7766-4296-be19-57e624769d46/cli/2026-04-08T16-41-34-176Z-49e7f08a/manifest.json` with `/bin/sh: node: command not found` from the stage command recorded in `commands/01-provider-linear-worker.ndjson`.
  - 2026-04-09: Current code audit narrows the concrete seams to runtime-contract truth rather than dispatch or intake logic: `codex.orchestrator.json` still launches `providerLinearWorkerRunner.js` through bare `node`, `commandRunner.ts` injects package-root metadata but not an explicit Node executable path, and `runtime/provider.ts` plus `utils/codexCli.ts` can still classify missing executable resolution too generically for truthful launchd-owned appserver/login fallback behavior.
  - 2026-04-09: Docs-first approval is recorded via the audited child-stream manifest `.runs/linear-bf0ba9ec-47f0-45ac-be83-490df0f0b45d-co-115-docs-review/cli/2026-04-08T17-32-15-382Z-fc180ff1/manifest.json`. After the repo-supported `npm run docs:archive-tasks` trim returned `docs/TASKS.md` from `451` to `450` lines, the child stream passed `spec-guard` and `docs:check` and then failed only on the standing repo-wide `docs:freshness` baseline (`stale docs: 282`; Task Packet stale=`205`, Task Mirror stale=`41`, Report Only stale=`36`). Manual fallback is accepted and recorded in `out/linear-bf0ba9ec-47f0-45ac-be83-490df0f0b45d/manual/20260408T173215Z-docs-review-fallback.md`.
  - 2026-05-13: CO-523 live Linear audit verified CO-115 is Done/completed; reclassified this task spec as inactive done metadata for strict spec-guard evidence. Evidence: out/linear-8573da42-d9f9-44ce-a24e-224984539044/manual/20260512T1850Z-baseline/live-linear-states.json.
---

# Technical Specification

## Context
The launchd-supervised root `control-host` already runs because launchd starts it with an absolute Node path. The remaining failure is one layer deeper: once live dispatch recommends a ready issue and local intake admits it, the `provider-linear-worker` stage still shells out through bare `node`, which is not available on the launchd-owned non-interactive PATH. The resulting shell `127` error prevents real issue work from starting and produces retry or reconcile noise that hides the primary launch-contract fault. The same environment assumptions also affect runtime-provider probing, so appserver or login fallback can look healthier than the actual launch/runtime contract.

## Requirements
1. The `provider-linear-worker` child-launch path must not depend on an implicit interactive-shell PATH containing Homebrew Node.
2. The child-launch contract must use a runtime value that remains valid under launchd-owned PATH and environment, ideally inherited from the already-running parent runtime.
3. A newly admitted issue in the `CO-87` shape must either start real provider work or fail with an explicit machine-checkable runtime-parity error instead of generic shell `127` churn.
4. Appserver or login probe behavior must remain truthful under the same launchd-owned runtime assumptions.
5. Runtime-provider classification must distinguish missing executable resolution from otherwise healthy runtime fallback.
6. The repair must stay bounded to launch/runtime parity for child runs and must not reopen dispatch/bootstrap, stale-refresh, or dashboard work.
7. Focused regression or reproducer coverage must lock the non-interactive PATH or environment failure shape.

## Design
- Use a parent-owned explicit Node executable path for `provider-linear-worker` stage execution instead of ambient PATH lookup.
- Keep `commandRunner.ts` or an equivalent parent-launch seam responsible for exporting the explicit Node runtime contract into stage execution environment.
- Update the pipeline command surface so the `provider-linear-worker` stage consumes that explicit runtime value when launching `providerLinearWorkerRunner.js`.
- Tighten runtime-provider or provider-worker failure classification so missing executable resolution becomes an explicit runtime-parity proof and summary rather than a generic `command-failed` or misleading fallback narrative.
- Preserve current runtime-mode semantics when the required executables actually resolve.

## Implementation Surface
- Expected codepaths:
  - `codex.orchestrator.json`
  - `orchestrator/src/cli/services/commandRunner.ts`
  - `orchestrator/src/cli/controlHostCliShell.ts`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/src/cli/runtime/provider.ts`
  - `orchestrator/src/cli/utils/codexCli.ts`
  - `orchestrator/src/cli/control/providerLinearWorkerTruth.ts`
- Expected tests:
  - `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
  - `orchestrator/tests/RuntimeProvider.test.ts`
  - any focused launch-contract regression needed for the stage command or injected runtime env

## Protected Expectations
- Preserve the repaired live `/api/v1/dispatch` and intake path.
- Preserve the current root-host launchd contract while extending truthful executable resolution to child runs.
- Prefer explicit runtime metadata over broad PATH rewrites.
- Keep failure classification machine-checkable and bounded.

## Reject These Wrong Interpretations
- "this lane should revisit `CO-41` stale-refresh behavior before fixing launch parity"
- "dispatch/auth is still the blocker because retries are visible"
- "using bare `node` in the child stage is acceptable because the root host already has an absolute Node path"
- "runtime fallback is truthful even when the executable lookup itself fails under launchd"

## Current Truth
- `codex.orchestrator.json` still defines the `provider-linear-worker` stage command as bare `node "$CODEX_ORCHESTRATOR_PACKAGE_ROOT/dist/orchestrator/src/cli/providerLinearWorkerRunner.js"`.
- `commandRunner.ts` currently injects run/package-root metadata but not an explicit Node executable path.
- `providerLinearWorkerRunner.ts` records worker proof and failure reasons, but a shell-level `node` failure currently lands before the worker can emit a more precise runtime-parity classification.
- `runtime/provider.ts` uses `resolveCodexCliBin` for appserver/help and login-status preflight, so missing executable resolution under launchd can still collapse into generic availability or fallback narratives.

## Proposed Design
- Add a narrow parent-owned Node runtime env value sourced from the already-running process.
- Make the pipeline stage launch the worker entrypoint through that explicit executable path.
- Where runtime-provider probing or inner worker execution still encounters missing executable resolution, map that failure to an explicit runtime-parity outcome that the provider proof and summary surfaces can preserve.
- Keep the fix scoped so dispatch, intake, dashboard, and unrelated provider env/bootstrap paths remain untouched.

## Non-Goals
- Reopening `CO-41` or older refresh-lifecycle wedges without new evidence.
- Reworking launchd bootstrap credentials or live dispatch auth.
- Broad STATUS, dashboard, or retry-queue redesign.
- Changing the implementation scope of `CO-87`.

## Parity / Alignment Matrix
- Current truth:
  - the root `control-host` launches under launchd with absolute Node resolution
  - admitted child runs still launch through bare `node`
  - runtime-provider executable availability under launchd can still be reported too generically
- Reference truth:
  - launchd-supervised parent and child runs share a truthful executable-resolution contract
  - runtime probes distinguish unavailable executables from healthy fallback behavior
- Target truth / intended delta:
  - child runs launch through an explicit Node contract
  - runtime-provider failures classify missing executable resolution explicitly
  - admitted issues either start real work or fail closed with runtime-parity proof
- Explicitly out-of-scope differences:
  - stale-refresh behavior
  - dispatch/bootstrap auth work
  - dashboard redesign

## Not Done If
- The child stage still shells out through ambient bare `node`.
- The worker still fails generically instead of emitting launch/runtime parity truth when executables are unavailable.
- Runtime-provider probes still imply healthy fallback when the runtime cannot actually launch.
- The reproducer path is not locked by focused tests or proof artifacts.

## Validation Plan
- `linear child-stream --pipeline docs-review`
- Focused regressions for:
  - the explicit child Node launch contract under non-interactive PATH or environment
  - runtime-provider classification for missing executable resolution
  - provider-worker proof or summary truth for runtime-parity failures
- Reproducer cross-check against the current `CO-87` artifact and post-fix behavior
- Full repo validation floor before review handoff

## Approvals
- Reviewer: `codex-orchestrator docs-review` child stream failed only on the repo-wide `docs:freshness` stale-doc baseline after `spec-guard` and `docs:check` passed; manual fallback accepted
- Date: 2026-04-09
