---
id: 20260410-linear-dd3f4c83-17cf-4668-afb4-978977beb37d
title: CO: roll out the shipped CO-117 control-host supervision path so the live host stops bypassing it
relates_to: docs/PRD-linear-dd3f4c83-17cf-4668-afb4-978977beb37d.md
risk: high
owners:
  - Codex
last_review: 2026-04-10
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-dd3f4c83-17cf-4668-afb4-978977beb37d.md`
- PRD: `docs/PRD-linear-dd3f4c83-17cf-4668-afb4-978977beb37d.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-dd3f4c83-17cf-4668-afb4-978977beb37d.md`
- Task checklist: `tasks/tasks-linear-dd3f4c83-17cf-4668-afb4-978977beb37d.md`

## Traceability
- Linear issue: `CO-141` / `dd3f4c83-17cf-4668-afb4-978977beb37d`
- Linear URL: https://linear.app/asabeko/issue/CO-141/co-roll-out-the-shipped-co-117-control-host-supervision-path-so-the
- Legacy runtime artifacts called out in the issue:
  - `/Users/kbediako/.local/bin/co-control-host-supervisor.sh`
  - `/Users/kbediako/Library/LaunchAgents/com.kbediako.co.control-host.plist`

## Summary
- Objective: make the already-shipped `CO-117` supervision surface the real rollout/runtime path on this host and for supported operator workflows.
- Scope:
  - classify legacy shim rollout versus managed packaged rollout in `status`
  - add a bounded migration or install path that replaces the legacy LaunchAgent without manual plist editing
  - ensure the supported operator entrypoint actually exposes `control-host supervise ...`
  - document and validate the upgrade path from an existing shim install
- Constraints:
  - preserve the current supervision runtime semantics from `CO-117`
  - do not reopen queue-management, merge-policy, or unrelated provider-flow work
  - do not assume a single install form such as global npm is the only supported operator path

## Implementation Boundary
- Runtime truth:
  - distinguish at least `legacy_shim`, `managed_supervision`, and `not_installed` states, plus any mixed or drift condition required for fail-closed reporting
  - capture which LaunchAgent program or program-arguments path currently owns the root-host launch contract
- Migration contract:
  - the canonical rollout path must replace or supersede the legacy shim-backed LaunchAgent
  - migration must render or reuse managed support-dir artifacts instead of requiring a human to edit `~/Library/LaunchAgents`
  - preserve current health-poll and unhealthy-restart semantics
- Operator entrypoint contract:
  - the blessed CLI artifact for supported environments must expose the shipped `control-host supervise` family
  - rollout must not depend on a stale ambient global install that lacks the shipped command surface
- Docs contract:
  - provider onboarding or adjacent operator docs must include the concrete upgrade path for a legacy host baseline

## Design
- Status path:
  - inspect the managed config/state/plist paths already defined by `CO-117`
  - inspect the live LaunchAgent payload to detect whether launchd still points at the legacy shim or at the managed supervision runner
  - report rollout classification and active-path truth in JSON and text output
- Install or migration path:
  - treat the legacy shim LaunchAgent as a supported migration baseline rather than an unrelated external artifact
  - replace the shim-owned LaunchAgent with the managed LaunchAgent and support-dir artifacts in one bounded CLI flow
  - ensure restart or restart-required semantics remain aligned with the existing runner contract
- Entry-point truth:
  - verify which checked-in or packaged CLI surface operators should invoke for this rollout lane
  - if needed, route install or migration through a managed launcher or bootstrap path that pins the correct CLI entrypoint instead of relying on ambient global PATH drift

## Validation
- `linear child-stream --pipeline docs-review`
- Focused regressions for:
  - rollout-mode classification and status formatting
  - legacy-shim migration or install behavior
  - LaunchAgent rendering and/or migration helpers
  - any supported operator-entrypoint resolution touched by the rollout change
- Host-level before/after verification for:
  - operator command surface
  - launchd plist or print output
  - active process lineage
  - managed support-dir config and state
- Full repo validation floor before review handoff

## Approvals
- Reviewer: docs-review child stream manifest `.runs/linear-dd3f4c83-17cf-4668-afb4-978977beb37d-co-141-docs-review/cli/2026-04-10T07-01-12-520Z-3922c49d/manifest.json` passed `spec-guard` and `docs:check`, then failed only on the repo-wide `docs:freshness` stale-doc baseline; fallback note: `out/linear-dd3f4c83-17cf-4668-afb4-978977beb37d/manual/20260410T070112Z-docs-review-fallback.md`
- Date: 2026-04-10
