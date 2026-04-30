---
id: 20260428-linear-9f955ebd-e00b-46ad-b25c-280029328841
title: CO-417 recover stale provider-worker proof locks during active appserver runs
relates_to: docs/PRD-linear-9f955ebd-e00b-46ad-b25c-280029328841.md
risk: high
owners:
  - Codex
last_review: 2026-04-28
---

This mirror tracks `tasks/specs/linear-9f955ebd-e00b-46ad-b25c-280029328841.md`.

## Summary
- Objective: Keep active appserver provider-worker proof/read-model updates from freezing behind stale `provider-linear-worker-proof.json.lock` files while preserving lock safety.
- Scope: Provider proof lock acquisition, lock metadata/diagnostics, stale recovery or fail-closed classification, live proof update persistence, focused tests, and CO-415/CO-400-style replay/fixture evidence.
- Constraints: Preserve visible proof persistence failures, avoid manual lock deletion as a fix, preserve concurrent-writer safety, and keep unrelated provider-intake/control-host UI timeout work out of scope.

## Issue-Shaping Contract
- User-request translation carried forward: A live appserver worker can continue heartbeating while proof writes freeze behind a stale proof lock. The fix must make that lock lifecycle recoverable or explicitly classified without hiding the error or weakening provider proof requirements.
- Protected terms / exact artifact and surface names: `provider-linear-worker-proof.json`, `provider-linear-worker-proof.json.lock`, `Failed to acquire provider-linear-worker proof lock after 50 attempts`, appserver provider worker, manifest heartbeat, CO-415, CO-403, CO-400, stale lock, live proof update.
- Nearby wrong interpretations to reject: Manual lock deletion; treating manifest heartbeat as sufficient read-model progress; reopening CO-403 without source/replay evidence; suppressing stderr warnings without a replacement diagnostic; broad control-host/provider-intake redesign.
- Explicit non-goals carried forward: No weakening proof/read-model requirements, no best-effort silent proof writes, no removal of lock protection, no unrelated UI timeout or provider-intake freshness work.

## Technical Requirements
- Reproduce or fixture a stale proof-lock shape where manifest `heartbeat_at` remains fresh while `provider-linear-worker-proof.json` updates fail after repeated lock attempts.
- Extend `provider-linear-worker-proof.json.lock` payloads or acquisition diagnostics with owner/age metadata sufficient for safe classification and operator diagnosis.
- Configure the active provider proof write path to recover stale locks or fail closed with a precise classification when recovery is unsafe.
- Preserve live-lock keepalive or equivalent freshness for active writers.
- Keep proof write failures visible in stderr/logs unless recovery succeeds, and replace spam with an actionable diagnostic when recovery is refused.
- Add regression coverage for proof updates after stale recovery/classification and for active writer preservation.

## Validation Plan
- Focused lock tests for metadata payload, legacy token compatibility, stale recovery, acquisition lock behavior, and active writer preservation.
- Focused provider-worker regression for CO-415-style live proof update after stale lock recovery/classification.
- Replay/fixture assertion that manifest heartbeat freshness does not mask stale proof updates.
- Required gates: delegation guard, spec guard, build, lint, test, docs checks, docs freshness, repo stewardship, diff budget, standalone review, elegance pass.
