---
id: linear-213f6858-ab77-40b9-b80a-f5e5bdde4b37
title: CO-450 Codex binary provenance in doctor
relates_to: docs/PRD-linear-213f6858-ab77-40b9-b80a-f5e5bdde4b37.md
risk: medium
owners:
  - Codex
last_review: 2026-05-01
---

## Summary
- Objective: Extend `codex-orchestrator doctor` so active CLI and Codex.app bundled CLI provenance are visible independently.
- Scope: `orchestrator/src/cli/doctor.ts`, Codex CLI utility code, focused doctor tests, and task mirrors.
- Constraints: Read-only probing; no binary switching, app mutation, managed CLI mutation, checkout-posture rewrite, or release-promotion decision.

## Issue-Shaping Contract
- User-request translation carried forward: Operators need to know whether doctor audited `/opt/homebrew/bin/codex`, a `CODEX_CLI_BIN` override, managed CLI, or the Codex.app bundle binary.
- Protected terms / exact artifact and surface names: `command -v codex`, `/opt/homebrew/bin/codex`, `/Applications/Codex.app/Contents/Resources/codex`, `codex --version`, `CODEX_CLI_BIN`, `codex-orchestrator doctor`, active Codex binary, app bundle binary, binary provenance, version drift.
- Nearby wrong interpretations to reject: auto-switching, blocking on drift alone, overwrite of `CODEX_CLI_BIN`, managed CLI changes, or conflating binary drift with stale checkout posture.
- Explicit non-goals carried forward: no replacement/migration, no always-match requirement, no destructive cleanup, no version promotion.

## Technical Requirements
- Add structured doctor result fields for:
  - active command
  - active executable path
  - active `--version` output
  - app-bundle executable path/status/version
  - advisory drift status/message
- Use existing active command resolution as source of truth.
- Resolve bare `codex` through shell `command -v` for reporting only; do not change execution selection.
- Run version probes with bounded timeout and return unavailable details instead of throwing.
- Compare raw version strings only when both versions are available.

## Validation Plan
- Focused tests:
  - no app bundle: app bundle status is absent and summary is non-noisy
  - matching versions: drift status ok and no advisory wording
  - divergent versions: drift status advisory and summary names both versions/paths
  - bare `codex` on `PATH`: active audited path resolves through `command -v`
  - explicit `CODEX_CLI_BIN`: active audited path is the override and managed selection remains unchanged
- Repo gates before handoff: delegation guard, spec guard, build, lint, test, docs:check, docs:freshness, repo:stewardship, diff-budget, `codex-orchestrator review`, elegance review, and `pack:smoke`.

## Lineage
- Checkout-posture lineage: binary drift must stay separate from stale checkout warnings.
- Release-intake lineage: doctor output becomes safer evidence for future release audits by naming the executable behind `codex --version`.
